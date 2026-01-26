# Conversation Context Feature

## Overview

The portfolio AI now maintains conversation context across multiple messages, allowing for natural follow-up questions and contextual understanding.

## Features Implemented

### ✅ Working Features

1. **Session Management**
   - Each user gets a unique session ID stored in localStorage
   - Conversation history maintained for up to 10 exchanges per session
   - Automatic cleanup of inactive sessions after 1 hour

2. **Context-Aware Follow-ups**
   - Understands phrases like "tell me more", "what about", "what else"
   - References previous topics in the conversation
   - Enhances queries with context from recent exchanges

3. **Semantic Intent Recognition**
   - Skills questions: "What programming languages do you know?"
   - Experience questions: "Tell me about your work"
   - ML capability: "Do you know machine learning?"
   - Education: "Where did you study?"

4. **Guardrails**
   - Politely rejects off-topic questions (weather, jokes, etc.)
   - Maintains context even after off-topic attempts
   - Handles greetings appropriately

## How It Works

```
User: "What skills do you have?"
Bot: "I have experience with Python, C/C++, C#, JavaScript..."

User: "What about machine learning?"  ← Context switch
Bot: "Yes! I have significant experience in AI and machine learning..."

User: "Tell me more"  ← Uses previous context
Bot: [Provides more ML details]

User: "What is the weather?"  ← Off-topic
Bot: "I appreciate your question, but I'm specifically designed..."

User: "Where did you study?"  ← Back to portfolio
Bot: [Education information]
```

## API Changes

### Request Format
```json
{
  "message": "What skills do you have?",
  "sessionId": "session_1234567890_abc123"  // Optional
}
```

### Response Format
```json
{
  "response": "I have experience with...",
  "relevant_chunks": ["chunk1", "chunk2"],
  "sessionId": "session_1234567890_abc123",
  "conversationLength": 3
}
```

## Frontend Integration

The frontend (`public/js/app.js`) now:
- Generates and stores session IDs in localStorage
- Includes sessionId in every chat request
- Maintains conversation continuity across page refreshes (same session)

## Testing Conversation Context

```bash
# Test multi-turn conversation
SESSION_ID="test_$(date +%s)"

# Turn 1
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d "{\"message\":\"What skills do you have?\",\"sessionId\":\"$SESSION_ID\"}"

# Turn 2 (follow-up)
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d "{\"message\":\"Tell me more about AI\",\"sessionId\":\"$SESSION_ID\"}"

# Turn 3 (topic switch)
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d "{\"message\":\"What about your experience?\",\"sessionId\":\"$SESSION_ID\"}"

# Turn 4 (context reference)
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d "{\"message\":\"Tell me more\",\"sessionId\":\"$SESSION_ID\"}"
```

## Current Limitations & Future Improvements

### Known Issues
1. Very vague follow-ups like "What else?" may not always resolve context correctly
2. Specific technology queries (e.g., "Can you code in Python?") sometimes match incorrect chunks
3. Education queries occasionally return experience data instead

### Planned Enhancements
- [ ] Improved entity extraction for specific technologies
- [ ] Better handling of vague pronouns ("it", "that", "this")
- [ ] Multi-turn clarification dialogs
- [ ] Export conversation history
- [ ] Better handling of very long conversations

## Architecture

```
User Query + SessionID
    ↓
Get Conversation History (last 10 exchanges)
    ↓
Enhance Query with Context
(e.g., "Tell me more" → "Tell me more about experience")
    ↓
Intent Classification
    ↓
Vector Search with Enhanced Query
    ↓
Generate Response
    ↓
Store in Conversation History
    ↓
Return Response
```

## Key Benefits

1. **Natural Conversations**: Users can ask follow-up questions without repeating context
2. **Topic Switching**: Smooth transitions between different portfolio topics
3. **Context Retention**: Maintains understanding across multiple exchanges
4. **Persistent Sessions**: Conversation continues even after page refresh
5. **Privacy**: Session data stored in-memory, automatically cleared after inactivity
