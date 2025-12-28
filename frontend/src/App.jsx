
import { useState, useEffect, useRef, useCallback } from 'react';
import './App.css';

function App() {
  const [text, setText] = useState('Hello world. This is a test of the tokenizer.');
  const [modelId, setModelId] = useState('Qwen/Qwen3-0.6B');
  const [status, setStatus] = useState(null); // { status: 'ready', message: '...' }
  const [tokens, setTokens] = useState([]);
  const [hoveredTokenIndex, setHoveredTokenIndex] = useState(null);
  const [hoveredCharIndex, setHoveredCharIndex] = useState(null);
  const [activeTokenIndex, setActiveTokenIndex] = useState(null);

  const [mode, setMode] = useState('tokenize'); // 'tokenize' | 'decode'

  // New state for what is visualized on the left panel (decoded text vs input text)
  const [visualizedText, setVisualizedText] = useState('');

  useEffect(() => {
    // Initial load
    loadModel(modelId);
  }, []);

  // Sync visualized text with input in tokenize mode
  useEffect(() => {
    if (mode === 'tokenize') {
      setVisualizedText(text);
    }
  }, [text, mode]);

  const loadModel = async (id) => {
    setStatus({ status: 'ready', message: `Model set to ${id} (Mode: ${mode})` });
  };

  const processInput = useCallback(async (inputVal) => {
    if (!inputVal) {
      setTokens([]);
      setVisualizedText('');
      // If we are already ready/idle, don't clear the status message (e.g. Model loaded)
      // If we were processing or erroring, reset to Ready.
      setStatus(prev => {
        if (!prev || prev.status === 'progress' || prev.status === 'error') {
          return { status: 'ready', message: 'Ready' };
        }
        return prev;
      });
      return;
    }

    try {
      // setStatus({ status: 'progress', message: 'Processing...' });

      let url = 'https://unvermiculated-goodheartedly-granville.ngrok-free.dev/api/tokenize';
      let body = { text: inputVal, model_id: modelId };

      if (mode === 'decode') {
        url = 'https://unvermiculated-goodheartedly-granville.ngrok-free.dev/api/decode';
        // Parse IDs from string
        // Parse IDs from string: split by comma, sanitize each chunk
        // "1503}" -> "1503"
        const ids = inputVal.split(',')
          .map(s => s.replace(/[^\d-]/g, '').trim()) // Remove non-digit/minus chars
          .filter(s => s.length > 0) // Remove empty resulting strings
          .map(Number)
          .filter(n => !isNaN(n));

        if (ids.length === 0 && inputVal.trim()) {
          return;
        }

        body = { ids: ids, model_id: modelId };
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to process');
      }

      const data = await response.json();
      setTokens(data.tokens);

      if (mode === 'decode') {
        setVisualizedText(data.text);
      }

    } catch (err) {
      console.error(err);
      setStatus({ status: 'error', message: err.message });
    }
  }, [modelId, mode]);

  // Trigger processing with debouncing
  useEffect(() => {
    if (status?.status === 'ready' || status?.status === 'progress' || status?.status === 'error') {
      const timer = setTimeout(() => {
        processInput(text);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [text, mode, processInput, status?.status]);

  // Handle hover on token
  const handleTokenEnter = (index) => {
    setHoveredTokenIndex(index);
  };

  const handleTokenLeave = () => {
    setHoveredTokenIndex(null);
  };

  // Handle hover on text char
  const handleCharEnter = (index) => {
    setHoveredCharIndex(index);
    // Find which token covers this char
    const tokenIndex = tokens.findIndex(t => t.start <= index && index < t.end);
    if (tokenIndex !== -1) {
      setHoveredTokenIndex(tokenIndex);
    }
  };

  const handleCharLeave = () => {
    setHoveredCharIndex(null);
    setHoveredTokenIndex(null);
  };

  // Tooltip State
  const [tooltip, setTooltip] = useState(null); // { x, y, content }

  const handleTooltipEnter = (e, content) => {
    if (!content) return;
    const rect = e.target.getBoundingClientRect();
    setTooltip({
      x: rect.left + rect.width / 2,
      y: rect.top,
      content: content
    });
  };

  const handleTooltipLeave = () => {
    setTooltip(null);
  };

  // Combined handlers
  const onTokenEnter = (e, index, text) => {
    handleTokenEnter(index);
    handleTooltipEnter(e, text);
  }
  const onTokenLeave = () => {
    handleTokenLeave();
    handleTooltipLeave();
  }

  const onCharEnter = (e, index, token) => {
    handleCharEnter(index);
    handleTooltipEnter(e, token ? `ID: ${token.id}` : null);
  }
  const onCharLeave = () => {
    handleCharLeave();
    handleTooltipLeave();
  }

  // Click handlers for sync scrolling
  const scrollToId = (id) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const onTokenClick = (e, index) => {
    e.stopPropagation();
    if (activeTokenIndex === index) {
      setActiveTokenIndex(null);
      setHoveredTokenIndex(null); // Clear hover so highlight disappears immediately
      return;
    }
    setActiveTokenIndex(index);
    const token = tokens[index];
    if (token && typeof token.start === 'number') {
      scrollToId(`char-${token.start}`);
    }
  };

  const onCharClick = (e, index, token) => {
    e.stopPropagation();
    // If this char belongs to a token, select that token
    const tokenIndex = tokens.findIndex(t => t.start <= index && index < t.end);
    if (tokenIndex !== -1) {
      if (activeTokenIndex === tokenIndex) {
        setActiveTokenIndex(null);
        setHoveredTokenIndex(null); // Clear hover so highlight disappears immediately
      } else {
        setActiveTokenIndex(tokenIndex);
        scrollToId(`token-${tokenIndex}`);
      }
    } else {
      setActiveTokenIndex(null);
    }
  };

  // Deselect when clicking empty space
  const handleContainerClick = () => {
    setActiveTokenIndex(null);
  };


  return (
    <div className="container" onClick={handleContainerClick}>
      {tooltip && (
        <div style={{
          position: 'fixed',
          top: tooltip.y,
          left: tooltip.x,
          transform: 'translate(-50%, -100%)',
          marginTop: '-8px',
          backgroundColor: '#333',
          color: 'white',
          padding: '4px 8px',
          borderRadius: '4px',
          fontSize: '0.9rem', // Slightly larger than typical tiny tooltip
          pointerEvents: 'none',
          zIndex: 9999,
          whiteSpace: 'pre', // Preserve formatting if any
          boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
          border: '1px solid #444'
        }}>
          {tooltip.content}
        </div>
      )}

      <header>
        <h1>Tokenizer Explorer</h1>
        <div className="input-group">
          <input
            type="text"
            value={modelId}
            onChange={(e) => setModelId(e.target.value)}
            placeholder="Hugging Face Model ID (e.g. roberta-base)"
          />
          <select value={mode} onChange={(e) => {
            const newMode = e.target.value;
            setMode(newMode);
            setTokens([]);
            setVisualizedText('');
            setText('');
            setStatus({ status: 'ready', message: `Model set to ${modelId} (Mode: ${newMode})` });
          }} style={{ padding: '0.75rem', borderRadius: '6px', border: '1px solid #30363d', background: '#0d1117', color: 'white' }}>
            <option value="tokenize">Text → IDs</option>
            <option value="decode">IDs → Text</option>
          </select>
          <button onClick={() => loadModel(modelId)}>Load Model</button>
        </div>
        {status && (
          <div className={`status ${status.status === 'error' ? 'error' : ''}`}>
            {status.status === 'progress' ? `Processing...` : status.message}
          </div>
        )}
      </header>

      <main>
        <section className="card">
          <h2>{mode === 'tokenize' ? 'Input Text' : 'Input Token IDs (comma separated)'}</h2>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={mode === 'tokenize' ? "Type something..." : "101, 7592, 102..."}
          />
        </section>

        <section className="card">
          <h2>Visualization</h2>
          <div className="visualization-grid">
            <div className="text-panel">
              <h3>{mode === 'tokenize' ? 'Text View' : 'Reconstructed Text'}</h3>
              <div className="text-viewer">
                {(typeof visualizedText === 'string' ? visualizedText : '').split('').map((char, index) => {
                  // Check if this char is part of the hovered token
                  // Find which token owns this char for tooltip
                  const token = tokens.find(t => index >= t.start && index < t.end);

                  // Highlight logic
                  const isActive = activeTokenIndex !== null &&
                    tokens[activeTokenIndex] &&
                    index >= tokens[activeTokenIndex].start &&
                    index < tokens[activeTokenIndex].end;

                  const isHighlighted = (hoveredTokenIndex !== null &&
                    tokens[hoveredTokenIndex] &&
                    index >= tokens[hoveredTokenIndex].start &&
                    index < tokens[hoveredTokenIndex].end) || isActive;

                  return (
                    <span
                      key={index}
                      id={`char-${index}`}
                      className={`char ${isHighlighted ? 'active' : ''}`}
                      onMouseEnter={(e) => onCharEnter(e, index, token)}
                      onMouseLeave={onCharLeave}
                      onClick={(e) => onCharClick(e, index, token)}
                    >
                      {char}
                    </span>
                  );
                })}
              </div>
            </div>

            <div className="token-panel">
              <h3>Token IDs ({tokens.length})</h3>
              <div className="token-display">
                {tokens.map((token, index) => {
                  const isHighlighted = hoveredTokenIndex === index || activeTokenIndex === index;

                  return (
                    <div
                      key={index}
                      id={`token-${index}`}
                      className={`token-chip ${isHighlighted ? 'active' : ''}`}
                      onMouseEnter={(e) => onTokenEnter(e, index, token.text)}
                      onMouseLeave={onTokenLeave}
                      onClick={(e) => onTokenClick(e, index)}
                    >
                      {token.id}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section >
      </main >
    </div >
  );
}

export default App;
