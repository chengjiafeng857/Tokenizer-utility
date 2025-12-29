# Tokenizer Utility

A powerful, interactive web application for exploring and visualizing how Large Language Model (LLM) tokenizers work. This tool allows users to input text or token IDs and see the corresponding tokenization or reconstruction in real-time, with synchronized highlighting and detailed token information.

demon：https://tokenizer-utility.pages.dev/


## Features

- **Dual Modes**:
  - **Tokenize**: Convert raw text into tokens and their corresponding IDs.
  - **Decode**: Reconstruct text from a sequence of token IDs.
- **Model Support**: Dynamically load any tokenizer from Hugging Face (e.g., `bert-base-uncased`, `gpt2`, `Qwen/Qwen3-0.6B`).
- **Interactive Visualization**:
  - **Synchronized Scrolling**: Clicking a token scrolls to the corresponding text, and vice-versa.
  - **Bi-directional Highlighting**: Hover over text to see the matching token, or hover over a token to see the matching text character(s).
  - **Selection Toggling**: Click to persist highlights; click again to deselect.
- **Layout Stability**: Responsive grid layout that maintains stability even when input is cleared or content changes.
- **Secure API Proxying**: Configured to work behind a secure proxy (e.g., ngrok) to resolve Mixed Content issues when deployed on HTTPS platforms like Cloudflare Pages.

## Tech Stack

### Frontend

- **React**: UI library for building the interactive interface.
- **Vite**: Fast build tool and development server.
- **CSS**: Custom styling with a dark-mode optimized theme (`index.css`).
- **Cloudflare Pages**: Deployment target (with proxy functions supported).

### Backend

- **FastAPI**: High-performance Python web framework for the API.
- **Hugging Face Transformers**: Library for loading and using tokenizer models.
- **uv**: Blazing fast Python package and project manager.
- **Uvicorn**: ASGI server for running FastAPI.

## Project Structure

```bash
Tokenizer-utility/
├── backend/                # Python FastAPI backend
│   ├── main.py             # API endpoints and logic
│   ├── pyproject.toml      # Backend dependencies (uv)
│   └── ...
├── frontend/               # React Vite frontend
│   ├── src/                # Source code (App.jsx, index.css)
│   ├── vite.config.js      # Vite configuration (Proxy setup)
│   ├── functions/          # Cloudflare Pages Functions (if needed for API proxy)
│   └── ...
└── README.md               # This file
```

## Getting Started

### Prerequisites

- **Node.js**: v18+
- **Python**: v3.12+
- **uv**: [Python package manager](https://github.com/astral-sh/uv)

### 1. Backend Setup

The backend handles the actual tokenization logic using Python libraries.

```bash
cd backend
# Install dependencies and run the server
uv run uvicorn main:app --reload --port 8000
```

The API will be available at `http://localhost:8000` (or your remote IP/ngrok URL).

### 2. Frontend Setup

The frontend provides the user interface.

```bash
cd frontend
# Install dependencies
npm install

# Start the development server
npm run dev
```

Open your browser at `http://localhost:5173`.

### 3. Configuration

- **API URL**: by default, the frontend interacts with the backend via `vite.config.js` proxy during development.
- **Production**: In `src/App.jsx`, the API URL is set to point to your deployed backend (e.g., via ngrok or a static IP). Ensure this URL is correct for your production environment.

## Deployment

### Frontend

The frontend is optimized for deployment on **Cloudflare Pages**.

- Build command: `npm run build`
- Output directory: `dist`

### Backend

The backend can be hosted on any server capable of running Python/FastAPI (e.g., AWS EC2, DigitalOcean Droplet, or a specialized instruction runner).

- Ensure port 8000 is open or tunnelled securely (e.g., via **ngrok**).

## License

[MIT License](LICENSE)
