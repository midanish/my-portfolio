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

2. **Start the server**:
   ```bash
   npm start
   ```

3. **Open in browser**:
   ```
   http://localhost:3000
   ```

## RAG Chat System

The chat system uses an advanced semantic RAG approach with Transformers.js:

### Current Implementation

- **Semantic Intent Classification**: Intelligent pattern matching to understand question intent (skills, experience, projects, education, etc.)
- **TF-IDF Vector Retrieval**: Efficient vector similarity search for retrieving relevant chunks with stopword filtering
- **Smart Guardrails**: Multi-layer filtering system that:
  - Detects and politely rejects off-topic questions (weather, jokes, general knowledge, etc.)
  - Handles greetings appropriately
  - Provides context-aware responses based on question intent
  - Validates relevance even after vector search
- **Context-Aware Response Generation**: Introduces responses based on detected intent (e.g., "Here are the relevant skills:" for skills questions)

### To Enable Full GLM-4.7-Flash-GGUF Model

To use the unsloth/GLM-4.7-Flash-GGUF model for more sophisticated responses:

#### Option 1: Using Transformers.js (When GLM is Supported)

Transformers.js (@xenova/transformers) is a JavaScript port of Hugging Face Transformers. It supports many models, but GLM-4.7 support may be limited.

Update `server.js` `loadModel()` function:

```javascript
const { pipeline } = require('@xenova/transformers');

async function loadModel() {
  try {
    // Load text generation pipeline
    generator = await pipeline('text-generation', 'unsloth/GLM-4.7-Flash-GGUF', {
      quantized: true,
      dtype: 'q4',  // Use quantized version
    });
    
    console.log('GLM model loaded successfully');
  } catch (error) {
    console.error('Error loading model:', error);
    console.log('Falling back to retrieval-based responses...');
  }
}
```

#### Option 2: Using Python Backend with llama-cpp-python

If Transformers.js doesn't support GLM-4.7, use Python:

1. **Install Python dependencies**:
   ```bash
   pip install llama-cpp-python flask flask-cors
   ```

2. **Create Python backend** (`backend.py`):
   ```python
   from flask import Flask, request, jsonify
   from flask_cors import CORS
   from llama_cpp import Llama
   
   app = Flask(__name__)
   CORS(app)
   
   # Load GLM model
   llm = Llama.from_pretrained(
       repo_id="unsloth/GLM-4.7-Flash-GGUF",
       filename="BF16/GLM-4.7-Flash-BF16-00001-of-00002.gguf",
   )
   
   @app.route('/api/generate', methods=['POST'])
   def generate():
       data = request.json
       prompt = data.get('prompt')
       
       # Generate response
       output = llm(prompt, max_tokens=300)
       
       return jsonify({'response': output})
   
   if __name__ == '__main__':
       app.run(port=5000)
   ```

3. **Update Node.js server** to call Python backend for generation:
   ```javascript
   async function generateWithPython(prompt) {
     const response = await fetch('http://localhost:5000/api/generate', {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({ prompt }),
     });
     const data = await response.json();
     return data.response;
   }
   ```

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
