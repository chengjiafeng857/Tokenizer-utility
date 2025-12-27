from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from transformers import AutoTokenizer
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Optional
import functools

app = FastAPI()

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all for dev
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class TokenizeRequest(BaseModel):
    text: str
    model_id: str = Field(..., description="Hugging Face Model ID")

class TokenInfo(BaseModel):
    id: int
    text: str
    start: Optional[int] = None
    end: Optional[int] = None

class TokenizeResponse(BaseModel):
    tokens: List[TokenInfo]

# Simple in-memory cache for tokenizers
# We use lru_cache on a helper function
@functools.lru_cache(maxsize=10)
def get_tokenizer(model_id: str):
    print(f"Loading tokenizer: {model_id}")
    try:
        return AutoTokenizer.from_pretrained(model_id, trust_remote_code=True)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to load model {model_id}: {str(e)}")

class TokenDecodeRequest(BaseModel):
    ids: List[int]
    model_id: str = Field(..., description="Hugging Face Model ID")

class TokenDecodeResponse(BaseModel):
    text: str
    tokens: List[TokenInfo]

@app.post("/api/tokenize", response_model=TokenizeResponse)
async def tokenize(request: TokenizeRequest):
    try:
        tokenizer = get_tokenizer(request.model_id)
        
        # Tokenize with offsets
        encoding = tokenizer(request.text, return_offsets_mapping=True, add_special_tokens=True)
        
        input_ids = encoding["input_ids"]
        offset_mapping = encoding.get("offset_mapping")
        
        tokens = []
        for i, token_id in enumerate(input_ids):
             token_text = tokenizer.decode([token_id], skip_special_tokens=False)
             start, end = None, None
             if offset_mapping and i < len(offset_mapping):
                 start, end = offset_mapping[i]
            
             tokens.append(TokenInfo(
                 id=token_id,
                 text=token_text,
                 start=start,
                 end=end
             ))
             
        return TokenizeResponse(tokens=tokens)

    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/decode", response_model=TokenDecodeResponse)
async def decode(request: TokenDecodeRequest):
    try:
        tokenizer = get_tokenizer(request.model_id)
        
        # We need to reconstruct text AND get offsets for each token.
        # Iterative strategy: decode(0..i) vs decode(0..i+1)
        
        all_ids = request.ids
        tokens = []
        full_text = ""
        
        # Optimization: encode is fast, decode is slower. 
        # But for UI purposes (hundreds of tokens), N decodes is acceptable (~ms).
        
        for i, token_id in enumerate(all_ids):
            # Special handling for -100 (padding)
            if token_id == -100:
                display_text = "(padding)"
                # We can append it to full_text so it's visible and highlightable
                start = len(full_text)
                full_text += display_text
                end = len(full_text)
                
                tokens.append(TokenInfo(
                    id=token_id,
                    text=display_text,
                    start=start,
                    end=end
                ))
                continue

            # Decode up to this token
            # Note: We must exclude -100s from the list passed to tokenizer.decode
            # because tokenizer might crash or produce weird artifacts with -100.
            # We need a cleaned list of IDs for accurate context decoding.
            
            # This makes iterative decoding tricky if we have interspersed -100s.
            # Simpler approach: Maintain a separate list of 'active' IDs for decoding context.
            pass # We need to refactor the loop slightly.
            
        # Refactored Loop with Padding Aggregation
        valid_ids_so_far = []
        tokens = []
        full_text = ""
        
        i = 0
        while i < len(all_ids):
            token_id = all_ids[i]
            
            if token_id == -100:
                # Count consecutive -100
                count = 0
                j = i
                while j < len(all_ids) and all_ids[j] == -100:
                    count += 1
                    j += 1
                
                # Create group span
                display_text = f"(padding x {count})"
                start = len(full_text)
                full_text += display_text
                end = len(full_text)
                
                # Add tokens for each padding ID (sharing the same text span)
                for k in range(count):
                    tokens.append(TokenInfo(
                        id=-100,
                        text="(padding)",
                        start=start,
                        end=end
                    ))
                
                i = j # Advance main loop
                
            else:
                # Normal token
                # Calculate span by diffing cumulative decode
                prev_text = tokenizer.decode(valid_ids_so_far, skip_special_tokens=False)
                valid_ids_so_far.append(token_id)
                curr_text = tokenizer.decode(valid_ids_so_far, skip_special_tokens=False)
                
                diff = curr_text[len(prev_text):]
                
                start = len(full_text)
                full_text += diff
                end = len(full_text)
                
                # Single token representation
                single_decode = tokenizer.decode([token_id], skip_special_tokens=False)
                
                tokens.append(TokenInfo(
                    id=token_id,
                    text=single_decode,
                    start=start,
                    end=end
                ))
                
                i += 1

        return TokenDecodeResponse(text=full_text, tokens=tokens)

    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
