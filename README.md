# Portfolio with RAG Chat System

A macOS Sequoia-styled portfolio website with an AI-powered chatbot that answers questions about the resume using Retrieval-Augmented Generation (RAG) with Transformers.js.

## Features

- **macOS Sequoia Design**: Beautiful glassmorphism UI with light/dark theme support
- **RAG Chat System**: AI chatbot that only answers questions based on portfolio data
- **Transformers.js Integration**: Uses Hugging Face Transformers.js for model inference
- **Vector Search**: TF-IDF based vector similarity for retrieving relevant information
- **Guardrails**: Ensures bot never answers questions outside of portfolio scope
- **Responsive**: Works on all devices

## Tech Stack

- **Frontend**: HTML5, CSS3, JavaScript
- **Backend**: Node.js, Express
- **AI/ML**: @xenova/transformers (JavaScript port of Hugging Face Transformers)
- **RAG**: Custom TF-IDF vector store
- **UI**: macOS Sequoia glassmorphism design

## Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **(Optional) Enable the AI assistant** — set a Hugging Face token so the
   chatbot can use the LLM. Without it, the bot still answers using a grounded
   fallback, but the LLM gives much smarter, synthesized answers:
   ```bash
   # PowerShell:  $env:HF_TOKEN = "hf_xxx"
   # bash:        export HF_TOKEN=hf_xxx
   # Optional:    set CHAT_MODEL to override the default (zai-org/GLM-4.7-Flash)
   ```
   Get a free token at https://huggingface.co/settings/tokens.

3. **Start the server**:
   ```bash
   npm start
   ```
   On boot it logs whether a token was detected (`Auth: HF token detected` vs
   `no token … using grounded retrieval fallback`).

4. **Open in browser**:
   ```
   http://localhost:3000
   ```

## Deployment (Cloudflare Pages — Git auto-build)

Deployed on Cloudflare Pages with **Git integration**: pushing to `main`
triggers an automatic Cloudflare build & deploy — no GitHub Action needed.

Cloudflare Pages project settings:
- **Production branch:** `main`
- **Build command:** *(none — static site)*
- **Build output directory:** `public`
- **Functions:** auto-detected from the `/functions` directory

**Chatbot token (runtime):** the chat Function reads `HF_TOKEN` from the Pages
environment. Set it in Cloudflare → Workers & Pages → **my-portfolio → Settings
→ Environment variables → Production** → add `HF_TOKEN` (and optionally
`CHAT_MODEL`), then redeploy. Without it, the bot uses its grounded fallback.

For local dev, the token comes from your `.env` instead (see Setup).

## AI Chat System

The assistant answers questions about the portfolio using a grounded LLM:

### How it works

1. **Full-portfolio grounding** — the entire `portfolio.json` is compiled into a
   compact knowledge base and passed to the model as context. Because the
   portfolio is small, there's no lossy retrieval step, so the bot never "misses"
   a fact and can answer synthesis questions ("Is he a fit for an AI role?",
   "What's his strongest project?", "Summarize his experience").
2. **Chat completions** — uses the Hugging Face chat-completions API
   (`hf.chatCompletion`, model `CHAT_MODEL`, default `zai-org/GLM-4.7-Flash`)
   with a system prompt that enforces grounding (no fabrication), an inviting
   recruiter-friendly tone, markdown formatting, and on-topic scope.
3. **Multi-turn memory** — the last few exchanges per session are sent as real
   message turns, so follow-ups like "tell me more" resolve naturally.
4. **Grounded fallback** — if no `HF_TOKEN` is set or the API errors, it falls
   back to a TF-IDF retrieval response built from the same data, so the chat
   always works.

> Set `HF_TOKEN` to enable the LLM (see Setup). Override the model with
> `CHAT_MODEL` if you prefer a different served model (e.g. `zai-org/GLM-4.6`).
> The Cloudflare function (`functions/api/chat.js`) mirrors this and reads
> `HF_TOKEN` from the Pages environment.

## Chat API

### POST /api/chat

Send a message to get a response:

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"What are Iqmal skills?"}'
```

Response:
```json
{
  "response": "Programming Skills: Python, C/C++, C#, JavaScript...",
  "relevant_chunks": [
    "Programming Skills: Python, C/C++, C#, JavaScript...",
    "AI / Machine Learning: PyTorch, TensorFlow..."
  ]
}
```

## Guardrails & Semantic Understanding

The chat system includes advanced guardrails and semantic understanding:

### Features

1. **Semantic Intent Recognition**: Understands various phrasings of the same question
   - "What skills do you have?" / "Can you code in Python?" / "What programming languages?"
   - "Tell me about your experience" / "Where have you worked?" / "What's your background?"

2. **Off-Topic Detection**: Politely rejects non-portfolio questions
   - Weather, news, jokes, general knowledge, math problems, etc.
   - Multiple pattern matching layers for comprehensive detection

3. **Context-Aware Responses**: Tailors response introduction based on question intent
   - Skills questions → "Here are the relevant skills:"
   - Experience questions → "Here is the relevant work experience:"
   - Education questions → "Here is the educational background:"

4. **Greeting Handling**: Responds appropriately to greetings (Hello, Hi, Hey, etc.)

5. **No Hallucinations**: Never makes up information not in the portfolio data

### Examples

**Portfolio Question (Accepted)**:
```
User: "Can you do machine learning?"
Bot: "Here are the relevant skills:

AI / Machine Learning: Pandas, PyTorch, TensorFlow, Keras, OpenCV..."
```

**Off-Topic Question (Rejected)**:
```
User: "What's the weather like today?"
Bot: "I appreciate your question, but I'm specifically designed to discuss this portfolio.
I can help you learn about skills, work experience, projects, education, or other
professional qualifications. What would you like to know?"
```

**Greeting**:
```
User: "Hello"
Bot: "Hello! I'm here to help you learn about this portfolio. Feel free to ask about
skills, work experience, projects, education, or anything else you'd like to know!"
```

## Data Source

The RAG system learns from: `data/portfolio.json`

Chunks are created from:
- Personal information
- Skills (programming, databases, AI/ML, tools)
- Experience/Work history
- Projects
- Education
- Certificates
- Awards

## Testing

Test the semantic AI and guardrails:

```bash
# Test 1: Skills question with various phrasings
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"What skills do you have?"}'

curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"Can you code in Python?"}'

# Test 2: Experience question
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"Tell me about your experience"}'

# Test 3: Education question
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"Where did you study?"}'

# Test 4: Off-topic question (should be politely rejected)
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"What is the weather today?"}'

curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"Tell me a joke"}'

# Test 5: Greeting
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"Hello"}'

# Test 6: Semantic understanding of AI/ML capabilities
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"Do you know machine learning?"}'
```

## Architecture

```
User Query
    ↓
Intent Classification
(Greeting / Personal / Skills / Experience / Projects / Education / Off-topic)
    ↓
Off-topic Check → [REJECT with polite message]
    ↓
Greeting Check → [Return greeting message]
    ↓
Vector Search (TF-IDF with stopword filtering)
    ↓
Retrieve Top-K Chunks
    ↓
Relevance Validation (Score threshold check)
    ↓
Context-Aware Response Generation
(Intent-based introduction + Retrieved chunks)
    ↓
Answer
```

## Future Enhancements

- [ ] Full GLM-4.7-Flash-GGUF model integration when supported by Transformers.js
- [ ] Add streaming responses
- [ ] Implement more advanced embeddings (sentence-transformers via Transformers.js)
- [ ] Add conversation memory/context
- [ ] Improve vector store with FAISS (if available for Node.js)
- [ ] Add multi-turn conversation support

## License

MIT

## Credits

- **UI**: macOS Sequoia design language
- **Transformers**: @xenova/transformers (JavaScript port of Hugging Face Transformers)
- **Model**: unsloth/GLM-4.7-Flash-GGUF (when fully integrated)
