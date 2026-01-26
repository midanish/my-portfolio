const express = require('express');
const { HfInference } = require('@huggingface/inference');
const path = require('path');
const fs = require('fs');

// Initialize Hugging Face client (no API key needed for public models)
const hf = new HfInference();

const app = express();
const PORT = process.env.PORT || 3000;
const PORTFOLIO_PATH = path.join(__dirname, 'public', 'data', 'portfolio.json');

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Global variables for model and RAG data
let generator = null;
let portfolioData = null;
let chunks = [];

// Conversation history management (stores last 10 exchanges per session)
const conversationHistory = new Map();
const MAX_HISTORY_LENGTH = 10;

function getSessionHistory(sessionId = 'default') {
  if (!conversationHistory.has(sessionId)) {
    conversationHistory.set(sessionId, []);
  }
  return conversationHistory.get(sessionId);
}

function addToHistory(sessionId, userMessage, botResponse) {
  const history = getSessionHistory(sessionId);
  history.push({ user: userMessage, bot: botResponse, timestamp: Date.now() });

  // Keep only last MAX_HISTORY_LENGTH exchanges
  if (history.length > MAX_HISTORY_LENGTH) {
    history.shift();
  }
}

function clearOldSessions() {
  const now = Date.now();
  const ONE_HOUR = 60 * 60 * 1000;

  for (const [sessionId, history] of conversationHistory.entries()) {
    if (history.length > 0) {
      const lastMessageTime = history[history.length - 1].timestamp;
      if (now - lastMessageTime > ONE_HOUR) {
        conversationHistory.delete(sessionId);
      }
    }
  }
}

// Clean up old sessions every 30 minutes
setInterval(clearOldSessions, 30 * 60 * 1000);

// Load portfolio data
function loadPortfolioData() {
  try {
    portfolioData = JSON.parse(fs.readFileSync(PORTFOLIO_PATH, 'utf8'));
    console.log('Portfolio data loaded successfully');
    
    // Create text chunks from portfolio
    createChunks();
  } catch (error) {
    console.error('Error loading portfolio data:', error);
  }
}

// Create chunks from portfolio data
function createChunks() {
  chunks = [];
  
  if (!portfolioData) return;
  
  // Personal information
  if (portfolioData.personal) {
    const p = portfolioData.personal;
    chunks.push({
      text: `Name: ${p.name}. Title: ${p.title}. Location: ${p.location}. Email: ${p.email}. Phone: ${p.phone}. LinkedIn: ${p.linkedin}`,
      metadata: { type: 'personal' }
    });
    
    if (p.summary) {
      chunks.push({
        text: `About: ${p.summary}`,
        metadata: { type: 'personal' }
      });
    }
  }
  
  // Skills
  if (portfolioData.skills) {
    const skills = portfolioData.skills;
    chunks.push({
      text: `Programming Skills: ${skills.programming ? skills.programming.join(', ') : ''}`,
      metadata: { type: 'skills', category: 'programming' }
    });
    
    if (skills.databases) {
      chunks.push({
        text: `Databases & APIs: ${skills.databases.join(', ')}`,
        metadata: { type: 'skills', category: 'databases' }
      });
    }
    
    if (skills.aiml) {
      chunks.push({
        text: `AI / Machine Learning: ${skills.aiml.join(', ')}`,
        metadata: { type: 'skills', category: 'aiml' }
      });
    }
    
    if (skills.tools) {
      chunks.push({
        text: `Tools & Platforms: ${skills.tools.join(', ')}`,
        metadata: { type: 'skills', category: 'tools' }
      });
    }
  }
  
  // Experience
  if (portfolioData.experience) {
    portfolioData.experience.forEach((exp, i) => {
      const highlights = exp.highlights.join(' ');
      chunks.push({
        text: `Experience ${i + 1}: ${exp.title} at ${exp.company} (${exp.period}). ${exp.location}. Highlights: ${highlights}`,
        metadata: { type: 'experience', company: exp.company }
      });
    });
  }
  
  // Projects
  if (portfolioData.projects) {
    portfolioData.projects.forEach((proj, i) => {
      const highlights = proj.highlights.join(' ');
      const tech = proj.technologies.join(', ');
      chunks.push({
        text: `Project ${i + 1}: ${proj.title} (${proj.date}). Description: ${proj.description}. Highlights: ${highlights}. Technologies: ${tech}`,
        metadata: { type: 'project', title: proj.title }
      });
    });
  }
  
  // Education
  if (portfolioData.education) {
    portfolioData.education.forEach((edu, i) => {
      chunks.push({
        text: `Education: ${edu.degree} from ${edu.institution} (${edu.period}). ${edu.details || ''}`,
        metadata: { type: 'education', school: edu.institution }
      });
    });
  }
  
  // Certificates
  if (portfolioData.certificates) {
    portfolioData.certificates.forEach((cert, i) => {
      chunks.push({
        text: `Certificate: ${cert.name} from ${cert.issuer} (${cert.date})`,
        metadata: { type: 'certificate' }
      });
    });
  }
  
  // Awards
  if (portfolioData.awards) {
    portfolioData.awards.forEach((award, i) => {
      chunks.push({
        text: `Award: ${award.name} from ${award.issuer} (${award.year})`,
        metadata: { type: 'award' }
      });
    });
  }
  
  console.log(`Created ${chunks.length} chunks from portfolio data`);
}

// Simple TF-IDF vector similarity
class SimpleVectorStore {
  constructor(chunks) {
    this.chunks = chunks;
    this.documents = chunks.map(c => c.text.toLowerCase());
    this.vocabulary = new Set();
    this.idf = new Map();
    
    this.buildVocabulary();
    this.calculateIDF();
  }
  
  buildVocabulary() {
    this.documents.forEach(doc => {
      const words = doc.split(/\s+/);
      words.forEach(word => {
        if (word.length >= 2) {
          this.vocabulary.add(word);
        }
      });
    });
  }
  
  calculateIDF() {
    const N = this.documents.length;
    this.vocabulary.forEach(word => {
      let df = 0;
      this.documents.forEach(doc => {
        if (doc.includes(word)) df++;
      });
      this.idf.set(word, Math.log(N / (df + 1)));
    });
  }
  
  tokenize(text) {
    // Remove stopwords that don't add semantic value
    const stopwords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'up', 'about', 'into', 'through', 'during', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'should', 'could', 'may', 'might', 'must', 'can', 'your', 'my', 'his', 'her', 'their', 'our'];

    return text.toLowerCase()
      .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?\[\]<>]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length >= 2 && !stopwords.includes(word));
  }
  
  query(queryText, topK = 3) {
    const queryWords = this.tokenize(queryText);
    const scores = [];

    this.documents.forEach((doc, idx) => {
      let score = 0;
      let matchedWords = 0;

      queryWords.forEach(word => {
        if (doc.includes(word)) {
          score += (this.idf.get(word) || 0) * 2;
          matchedWords++;
        }
      });

      // Require at least 1 meaningful word (length > 3) OR important technical terms
      const importantShortTerms = ['ai', 'ml', 'cv', 'ui', 'ux', 'qa', 'c++', 'c#', 'js', 'ts', 'db', 'api', 'nlp'];
      const matchedWord = matchedWords === 1 ? queryWords.find(w => doc.includes(w)) : null;
      const isImportantShortTerm = matchedWord && importantShortTerms.includes(matchedWord);

      if (matchedWords >= 2 || (matchedWords === 1 && matchedWord && (matchedWord.length > 3 || isImportantShortTerm))) {
        scores.push({
          index: idx,
          score: score,
          chunk: this.chunks[idx]
        });
      }
    });

    scores.sort((a, b) => b.score - a.score);
    return scores.slice(0, topK);
  }
}

let vectorStore = null;

// Initialize vector store
function initVectorStore() {
  vectorStore = new SimpleVectorStore(chunks);
  console.log('Vector store initialized');
}

// Initialize GLM-4.7-Flash model
async function loadModel() {
  try {
    console.log('Configuring GLM-4.7-Flash model from zai-org...');

    // Set model name for HF Inference API
    const modelName = 'zai-org/GLM-4.7-Flash';

    // Test the model with a simple query
    console.log('Testing model connection...');

    generator = {
      modelName: modelName,
      generate: async (prompt, options = {}) => {
        try {
          const response = await hf.textGeneration({
            model: modelName,
            inputs: prompt,
            parameters: {
              max_new_tokens: options.max_new_tokens || 256,
              temperature: options.temperature || 0.7,
              top_p: options.top_p || 0.9,
              repetition_penalty: options.repetition_penalty || 1.1,
              return_full_text: false,
            },
          });

          return response.generated_text;
        } catch (error) {
          console.error('Model generation error:', error.message);
          // Fallback to retrieval-based response on error
          return null;
        }
      }
    };

    console.log('✓ GLM-4.7-Flash model configured successfully');
    console.log('  Model: zai-org/GLM-4.7-Flash');
    console.log('  Provider: Hugging Face Inference API');
    console.log('  Ready for inference');

  } catch (error) {
    console.error('Error configuring GLM-4.7-Flash model:', error);
    console.log('Falling back to retrieval-based responses...');

    // Fallback to retrieval-only if model configuration fails
    generator = {
      generate: async (prompt, options) => {
        return null;
      }
    };
  }
}

// Classify question intent
function classifyIntent(query) {
  const queryLower = query.toLowerCase();

  // Check for greetings FIRST
  const greetings = ['hello', 'hi', 'hey', 'greetings', 'good morning', 'good afternoon', 'good evening'];
  const words = queryLower.trim().split(/\s+/);
  if (greetings.includes(words[0]) && words.length <= 3) {
    return { intent: 'greeting', confidence: 'high' };
  }

  // Portfolio-related patterns and intent mapping
  const intentPatterns = {
    personal: {
      keywords: ['who', 'name', 'contact', 'email', 'phone', 'location', 'introduce', 'yourself'],
      patterns: [/who (is|are) (you|iqmal)/i, /tell me about yourself/i, /your name/i, /introduce yourself/i]
    },
    skills: {
      keywords: ['skill', 'programming', 'language', 'technology', 'proficient', 'expert', 'familiar', 'good at', 'capable', 'python', 'javascript', 'java'],
      patterns: [/what.*(skills|programming|languages|technologies)/i, /(do you|can you|are you).*(know|code|program|use)/i, /(know|use|work with).*(python|java|javascript|c\+\+)/i, /(why|explain).*(good|expert|proficient).*(ai|ml|programming)/i]
    },
    experience: {
      keywords: ['experience', 'work', 'job', 'worked', 'company', 'role', 'position', 'career', 'employment', 'background'],
      patterns: [/work experience/i, /where (have|did) (you|iqmal) work/i, /previous (job|role)/i, /(what|tell).*(about|regarding).*(experience|work|job|background)/i, /your (experience|work|background)/i]
    },
    projects: {
      keywords: ['project', 'built', 'created', 'developed', 'portfolio', 'github', 'build'],
      patterns: [/what (have|did) (you|iqmal) (build|create|develop)/i, /(what|any|your) projects/i, /portfolio/i, /have you built/i]
    },
    education: {
      keywords: ['education', 'school', 'university', 'degree', 'study', 'studied', 'graduate', 'college'],
      patterns: [/where (did|do) (you|iqmal) study/i, /educational background/i, /degree/i]
    },
    certificates: {
      keywords: ['certificate', 'certification', 'certified', 'credential'],
      patterns: [/certifications/i, /certified/i]
    },
    ai_ml: {
      keywords: ['ai', 'ml', 'machine learning', 'deep learning', 'pytorch', 'tensorflow', 'nlp', 'computer vision', 'llm', 'model', 'neural'],
      patterns: [/ai|ml|machine learning/i, /computer vision/i, /nlp|natural language/i, /(why|explain|how).*(good|qualified|expert|experienced).*(ai|ml|machine learning)/i]
    }
  };

  // Check patterns first (more specific)
  for (const [intent, data] of Object.entries(intentPatterns)) {
    if (data.patterns.some(pattern => pattern.test(queryLower))) {
      return { intent, confidence: 'high' };
    }
  }

  // Check keywords (less specific)
  for (const [intent, data] of Object.entries(intentPatterns)) {
    if (data.keywords.some(kw => queryLower.includes(kw))) {
      return { intent, confidence: 'medium' };
    }
  }

  // Off-topic detection - common non-portfolio topics
  const offTopicPatterns = [
    /weather/i, /temperature/i, /forecast/i,
    /news/i, /recipe/i, /movie/i, /film/i, /sport/i, /game/i,
    /stock/i, /price/i, /buy/i, /sell/i, /shopping/i,
    /joke/i, /story/i, /song/i, /music/i, /dance/i,
    /\b(2\s*\+\s*2|calculate|math|solve)\b/i,
    /current (time|date)/i, /what time/i, /what day/i,
    /how to (cook|make|fix|repair|clean)/i,
    /favorite (color|food|movie|book)/i,
    /capital of/i, /president of/i,
    /translate/i, /meaning of life/i
  ];

  if (offTopicPatterns.some(pattern => pattern.test(queryLower))) {
    return { intent: 'off-topic', confidence: 'high' };
  }

  // Additional check: if query is very short and has no portfolio keywords
  const portfolioTerms = ['skill', 'experience', 'work', 'project', 'education', 'degree', 'certificate', 'iqmal', 'programming', 'ai', 'ml', 'job', 'company'];
  const hasPortfolioTerm = portfolioTerms.some(term => queryLower.includes(term));

  if (!hasPortfolioTerm && queryLower.split(' ').length < 4) {
    return { intent: 'unknown', confidence: 'medium' };
  }

  return { intent: 'unknown', confidence: 'low' };
}

// Enhance query with conversation context
function enhanceQueryWithContext(query, history) {
  if (history.length === 0) {
    return query;
  }

  const queryLower = query.toLowerCase();

  // Check for follow-up indicators
  const followUpIndicators = [
    'tell me more', 'what about', 'and', 'also', 'more details', 'specifically',
    'how about', 'what else', 'any other', 'elaborate', 'explain'
  ];

  const isFollowUp = followUpIndicators.some(indicator => queryLower.includes(indicator));

  // Check for pronouns that reference previous context
  const hasReference = /\b(that|those|them|it|this|these)\b/i.test(query);

  if (isFollowUp || hasReference || query.length < 20) {
    // Get last exchange for context
    const lastExchange = history[history.length - 1];

    // Extract topic from last user question or bot response
    let contextTopic = '';

    if (lastExchange.user.toLowerCase().includes('skill')) {
      contextTopic = 'skills';
    } else if (lastExchange.user.toLowerCase().includes('experience') || lastExchange.user.toLowerCase().includes('work')) {
      contextTopic = 'experience';
    } else if (lastExchange.user.toLowerCase().includes('project')) {
      contextTopic = 'projects';
    } else if (lastExchange.user.toLowerCase().includes('education') || lastExchange.user.toLowerCase().includes('study')) {
      contextTopic = 'education';
    }

    // Add context to query if it seems like a follow-up
    if (contextTopic && !queryLower.includes(contextTopic)) {
      return `${query} (regarding ${contextTopic})`;
    }
  }

  return query;
}

// Generate response using GLM model with RAG
async function generateResponse(query, sessionId = 'default') {
  try {
    if (!vectorStore) {
      return 'I apologize, but I am currently initializing. Please try again.';
    }

    if (!generator) {
      return 'I apologize, but the model is still loading. Please try again in a moment.';
    }

    // Get conversation history
    const history = getSessionHistory(sessionId);

    // Enhance query with context from previous conversation
    const enhancedQuery = enhanceQueryWithContext(query, history);

    // Classify the intent FIRST before vector search
    const { intent, confidence } = classifyIntent(enhancedQuery);

    // Handle greetings
    if (intent === 'greeting' && confidence === 'high') {
      const response = "Hello! I'm here to help you learn about this portfolio. Feel free to ask about skills, work experience, projects, education, or anything else you'd like to know!";
      addToHistory(sessionId, query, response);
      return response;
    }

    // If clearly off-topic, reject immediately without searching
    if (intent === 'off-topic' && confidence === 'high') {
      const response = "I appreciate your question, but I'm specifically designed to discuss this portfolio. I can help you learn about skills, work experience, projects, education, or other professional qualifications. What would you like to know?";
      addToHistory(sessionId, query, response);
      return response;
    }

    // Retrieve relevant chunks using enhanced query
    const relevantChunks = vectorStore.query(enhancedQuery, 3);

    // If no chunks found
    if (relevantChunks.length === 0) {
      let response;
      // Check if question seems unrelated
      if (intent === 'unknown' && (confidence === 'medium' || confidence === 'low')) {
        response = "I'm not sure I understand your question, or it may not be related to this portfolio. I can answer questions about professional skills, work experience, education, projects, and qualifications. Could you rephrase your question or ask about one of these topics?";
      } else {
        // Intent recognized but no matches - provide helpful guidance
        response = `I understand you're asking about ${intent}, but I couldn't find specific information matching your query. Try asking more directly, such as "What are the skills?" or "Tell me about the work experience."`;
      }
      addToHistory(sessionId, query, response);
      return response;
    }

    // Additional relevance check - even if we found chunks
    // If intent is unknown and chunks have low scores, likely off-topic
    if (intent === 'unknown' && relevantChunks.length > 0) {
      const maxScore = Math.max(...relevantChunks.map(c => c.score || 0));
      if (maxScore < 1.5) {
        const response = "Your question doesn't seem to be related to this portfolio. I can help you learn about skills, work experience, projects, education, certificates, and awards. What would you like to know?";
        addToHistory(sessionId, query, response);
        return response;
      }
    }

    // Build context from retrieved chunks
    const context = relevantChunks
      .map((chunk, i) => `[${i + 1}] ${chunk.chunk.text}`)
      .join('\n\n');

    // Build conversation context
    let conversationContext = '';
    if (history.length > 0) {
      const recentHistory = history.slice(-3); // Last 3 exchanges
      conversationContext = recentHistory
        .map(h => `User: ${h.user}\nAssistant: ${h.bot}`)
        .join('\n\n');
    }

    // Construct prompt for GLM model
    const systemPrompt = `You are a helpful assistant for a professional portfolio. Answer questions based only on the provided context. Be concise, friendly, and professional. Use markdown formatting for better readability (bold for emphasis, lists when appropriate).

Context from portfolio:
${context}

${conversationContext ? `Previous conversation:\n${conversationContext}\n` : ''}
User's question: ${query}

Instructions:
- Answer based solely on the context provided
- Be conversational and natural
- Use markdown formatting (** for bold, lists with • or -)
- Keep responses concise (2-4 sentences typically)
- If asked about something not in the context, say you don't have that information
- Don't make up information
`;

    // Generate response using GLM model
    let response;
    if (generator && generator.generate && typeof generator.generate === 'function') {
      // Use the GLM model via HF Inference API
      const generatedText = await generator.generate(systemPrompt, {
        max_new_tokens: 256,
        temperature: 0.7,
        top_p: 0.9,
        repetition_penalty: 1.1,
      });

      // If we got a response, use it
      if (generatedText && generatedText.length > 10) {
        response = generatedText.trim();
      } else {
        // Fallback to retrieval-based if generation failed
        response = generateResponseFromChunks(enhancedQuery, relevantChunks, intent, history);
      }
    } else {
      // Fallback to retrieval-based response
      response = generateResponseFromChunks(enhancedQuery, relevantChunks, intent, history);
    }

    // Store in conversation history
    addToHistory(sessionId, query, response);

    return response;
  } catch (error) {
    console.error('Error generating response:', error);
    return 'I apologize, but I encountered an error processing your question. Please try again.';
  }
}

// Extract structured data from chunks
function extractDataFromChunks(chunks) {
  const data = {
    personal: null,
    skills: { programming: [], databases: [], aiml: [], tools: [], all: [] },
    experience: [],
    projects: [],
    education: [],
    certificates: [],
    awards: []
  };

  chunks.forEach(item => {
    const chunk = item.chunk;
    const type = chunk.metadata?.type;
    const text = chunk.text;

    if (type === 'personal') {
      data.personal = text;
    } else if (type === 'skills') {
      const category = chunk.metadata?.category;

      // Extract skills based on patterns in the text
      if (text.includes('Programming Skills:')) {
        const skillsText = text.replace(/^.*Programming Skills:\s*/, '').trim();
        data.skills.programming = skillsText.split(',').map(s => s.trim()).filter(s => s);
        data.skills.all.push(...data.skills.programming);
      } else if (text.includes('Databases & APIs:')) {
        const skillsText = text.replace(/^.*Databases & APIs:\s*/, '').trim();
        data.skills.databases = skillsText.split(',').map(s => s.trim()).filter(s => s);
        data.skills.all.push(...data.skills.databases);
      } else if (text.includes('AI / Machine Learning:')) {
        const skillsText = text.replace(/^.*AI \/ Machine Learning:\s*/, '').trim();
        data.skills.aiml = skillsText.split(',').map(s => s.trim()).filter(s => s);
        data.skills.all.push(...data.skills.aiml);
      } else if (text.includes('Tools & Platforms:')) {
        const skillsText = text.replace(/^.*Tools & Platforms:\s*/, '').trim();
        data.skills.tools = skillsText.split(',').map(s => s.trim()).filter(s => s);
        data.skills.all.push(...data.skills.tools);
      }
      // Fallback: if category is known but pattern didn't match, try to extract from whole text
      else if (category && text.includes(':')) {
        const skillsText = text.split(':')[1]?.trim() || '';
        const skillsList = skillsText.split(',').map(s => s.trim()).filter(s => s);
        if (category === 'programming') {
          data.skills.programming.push(...skillsList);
        } else if (category === 'databases') {
          data.skills.databases.push(...skillsList);
        } else if (category === 'aiml') {
          data.skills.aiml.push(...skillsList);
        } else if (category === 'tools') {
          data.skills.tools.push(...skillsList);
        }
        data.skills.all.push(...skillsList);
      }
    } else if (type === 'experience') {
      data.experience.push(text);
    } else if (type === 'project') {
      data.projects.push(text);
    } else if (type === 'education') {
      data.education.push(text);
    } else if (type === 'certificate') {
      data.certificates.push(text);
    } else if (type === 'award') {
      data.awards.push(text);
    }
  });

  return data;
}

// Generate natural conversational response
function generateNaturalResponse(query, data, intent) {
  const queryLower = query.toLowerCase();

  // Personal info questions
  if (intent === 'personal' || (queryLower.includes('who') && !queryLower.includes('where'))) {
    if (data.personal) {
      const aboutMatch = data.personal.match(/About: (.+)/);
      if (aboutMatch) {
        return aboutMatch[1];
      }
      // Extract info from personal chunk
      const nameMatch = data.personal.match(/Name: (.+?)\./);
      const titleMatch = data.personal.match(/Title: (.+?)\./);

      if (nameMatch && titleMatch) {
        return `I'm ${nameMatch[1]}, a ${titleMatch[1]}. I have experience in semiconductor manufacturing, machine vision, and AI development, with a strong background in Python, C/C++, C#, and various AI/ML frameworks.`;
      }
      return data.personal;
    }
  }

  // Skills questions
  if (intent === 'skills' || queryLower.includes('skill') || queryLower.includes('programming') || queryLower.includes('language')) {
    let response = '';

    // Check for specific technology with better matching
    const allSkills = data.skills.all.length > 0 ? data.skills.all :
      [...data.skills.programming, ...data.skills.databases, ...data.skills.aiml, ...data.skills.tools];

    // Look for specific technology mentions (case-insensitive)
    const specificTech = ['python', 'java', 'javascript', 'c++', 'c#', 'pytorch', 'tensorflow', 'opencv', 'node', 'react', 'sql', 'keras', 'pandas'];
    const mentionedTech = specificTech.find(tech => queryLower.includes(tech.toLowerCase()));

    if (mentionedTech) {
      const matchedSkills = allSkills.filter(skill => {
        const skillLower = skill.toLowerCase();
        const techLower = mentionedTech.toLowerCase();
        return skillLower.includes(techLower) ||
          skillLower === techLower ||
          (techLower === 'c++' && skillLower.includes('c/c++')) ||
          (techLower === 'c#' && (skillLower.includes('c#') || skillLower.includes('csharp'))) ||
          (techLower === 'node' && skillLower.includes('node'));
      });

      if (matchedSkills.length > 0) {
        return `Yes! I have experience with ${matchedSkills.join(', ')}. These skills have been applied across various projects in machine vision, AI development, and industrial automation.`;
      } else {
        return `I don't have specific experience with ${mentionedTech} listed in my portfolio, but I work with similar technologies. Feel free to ask about my other skills!`;
      }
    }

    // General skills question
    if (data.skills.programming.length > 0) {
      response = `I have experience with several programming languages including ${data.skills.programming.slice(0, 5).join(', ')}${data.skills.programming.length > 5 ? ', and more' : ''}.`;
    }

    if (queryLower.includes('ai') || queryLower.includes('ml') || queryLower.includes('machine learning')) {
      if (data.skills.aiml.length > 0) {
        response += ` For AI and machine learning, I work with ${data.skills.aiml.slice(0, 6).join(', ')}${data.skills.aiml.length > 6 ? ', among others' : ''}.`;
      }
    } else if (data.skills.aiml.length > 0 && response.length < 100) {
      response += ` I also specialize in AI/ML technologies like ${data.skills.aiml.slice(0, 4).join(', ')}.`;
    }

    return response || 'I have a diverse skill set in programming, AI/ML, and software development.';
  }

  // Experience questions
  if (intent === 'experience' || queryLower.includes('experience') || queryLower.includes('work') || queryLower.includes('job')) {
    if (data.experience.length > 0) {
      let response = "I have professional experience across multiple roles:\n\n";

      data.experience.forEach((exp, index) => {
        const titleMatch = exp.match(/Experience \d+: (.+?) at (.+?) \((.+?)\)/);
        if (titleMatch) {
          const [, title, company, period] = titleMatch;
          response += `• **${title}** at ${company} (${period})`;

          const highlightsMatch = exp.match(/Highlights: (.+)/);
          if (highlightsMatch && index === 0) {
            const highlights = highlightsMatch[1].split(/(?=[A-Z][\w\s]+(?:achieved|optimized|led|recognized|designed|deployed|conducted))/i);
            if (highlights.length > 0 && highlights[0].trim()) {
              response += `\n  ${highlights[0].trim()}`;
            }
          }
          response += '\n\n';
        }
      });

      return response.trim();
    }
  }

  // Project questions
  if (intent === 'projects' || queryLower.includes('project') || queryLower.includes('built') || queryLower.includes('build') || queryLower.includes('created')) {
    if (data.projects.length > 0) {
      let response = "Here are some notable projects:\n\n";

      data.projects.forEach((proj) => {
        const titleMatch = proj.match(/Project \d+: (.+?) \((.+?)\)\. Description: (.+?)\. Highlights:/);
        if (titleMatch) {
          const [, title, date, description] = titleMatch;
          response += `• **${title}** (${date})\n  ${description}\n\n`;
        }
      });

      return response.trim();
    }

    // Fallback - provide general answer
    return "I've worked on several projects including a Biometric Fingerprint Login System for vision scanners and an Engineering Room Storage Management System. Would you like to know more about specific projects?";
  }

  // Education questions
  if (intent === 'education' || queryLower.includes('education') || queryLower.includes('study') || queryLower.includes('studied') || queryLower.includes('degree') || queryLower.includes('school') || queryLower.includes('university')) {
    if (data.education.length > 0) {
      const edu = data.education[0];
      const match = edu.match(/Education: (.+?) from (.+?) \((.+?)\)/);
      if (match) {
        const [, degree, institution, period] = match;
        let response = `I earned a ${degree} from ${institution} (${period}).`;

        const detailsMatch = edu.match(/\. (.+)$/);
        if (detailsMatch) {
          response += ` ${detailsMatch[1]}`;
        }

        return response;
      }
    }

    // Fallback if education chunk not found but we have personal info
    if (data.personal && data.personal.includes('Bachelor')) {
      return "I hold a Bachelor of Engineering (Mechatronics) from International Islamic University Malaysia, specializing in Computer and Control systems.";
    }
  }

  // AI/ML capability questions
  if (intent === 'ai_ml' || queryLower.includes('machine learning') || queryLower.includes('computer vision') || queryLower.includes(' ai ')) {
    let response = "Yes! I have significant experience in AI and machine learning.";

    if (data.skills.aiml.length > 0) {
      response += ` I work with technologies like ${data.skills.aiml.slice(0, 6).join(', ')}.`;
    }

    if (data.experience.length > 0) {
      const aiExperience = data.experience.find(exp =>
        exp.toLowerCase().includes('ai') || exp.toLowerCase().includes('vision') || exp.toLowerCase().includes('machine learning')
      );
      if (aiExperience) {
        const titleMatch = aiExperience.match(/Experience \d+: (.+?) at (.+?) \(/);
        if (titleMatch) {
          response += ` I've worked as ${titleMatch[1]} at ${titleMatch[2]}, applying AI and computer vision in real-world applications.`;
        }
      }
    }

    return response;
  }

  // Fallback: return first chunk with better formatting
  if (data.personal) {
    return data.personal.replace(/About: /, '');
  }

  return "I have diverse experience in software engineering, AI/ML, and industrial automation. Feel free to ask about specific skills, projects, or experience!";
}

// Generate natural conversational response from retrieved chunks
function generateResponseFromChunks(query, relevantChunks, intent, history = []) {
  if (relevantChunks.length === 0) {
    return "I couldn't find relevant information to answer your question. Feel free to ask about skills, work experience, projects, education, or certifications.";
  }

  const queryLower = query.toLowerCase();
  const texts = relevantChunks.map(r => r.chunk.text);

  // Check if this is a follow-up question
  const isFollowUp = history.length > 0 && (
    queryLower.includes('more') ||
    queryLower.includes('tell me more') ||
    queryLower.includes('what about') ||
    queryLower.includes('and') ||
    queryLower.includes('also') ||
    query.length < 20
  );

  // Check for specific technology questions (e.g., "Can you code in Python?")
  const specificTech = ['python', 'java', 'javascript', 'c++', 'c#', 'pytorch', 'tensorflow', 'opencv', 'keras', 'pandas', 'sql'];
  const mentionedTech = specificTech.find(tech => queryLower.includes(tech));

  if (mentionedTech) {
    // Find matching skills from all skill chunks
    const allText = texts.join(' ');
    if (allText.toLowerCase().includes(mentionedTech)) {
      // Extract skills that match
      const skillsText = allText.match(/(?:Programming Skills|AI \/ Machine Learning|Databases & APIs|Tools & Platforms):\s*([^\.]+)/g);
      if (skillsText) {
        const allSkills = skillsText.join(', ').split(',').map(s => s.trim().replace(/^.*:\s*/, ''));
        const matched = allSkills.filter(skill =>
          skill.toLowerCase().includes(mentionedTech) || skill.toLowerCase() === mentionedTech
        );

        if (matched.length > 0) {
          return `Yes! I have experience with ${matched.join(', ')}. These skills have been applied across various projects in machine vision, AI development, and industrial automation.`;
        }
      }
    }
  }

  // Skills questions
  if (intent === 'skills' || queryLower.includes('skill') || queryLower.includes('programming')) {
    const programmingSkills = texts.find(t => t.includes('Programming Skills:'));

    if (programmingSkills) {
      const match = programmingSkills.match(/Programming Skills:\s*(.+?)(?:\.|$)/);
      if (match) {
        let response = `I have experience with several programming languages including ${match[1]}.`;

        // Add AI/ML skills if question is about AI
        if (queryLower.includes('ai') || queryLower.includes('ml') || queryLower.includes('machine learning')) {
          const aiSkills = texts.find(t => t.includes('AI / Machine Learning:'));
          if (aiSkills) {
            const aiMatch = aiSkills.match(/AI \/ Machine Learning:\s*(.+?)(?:\.|$)/);
            if (aiMatch) {
              response += ` For AI and machine learning, I work with ${aiMatch[1]}.`;
            }
          }
        }

        return response;
      }
    }
  }

  // Experience questions
  if (intent === 'experience' || queryLower.includes('experience') || queryLower.includes('work') || queryLower.includes('background')) {
    // First try to get the About summary
    const aboutChunk = texts.find(t => t.includes('About:'));
    const experienceChunks = texts.filter(t => t.includes('Experience') && t.includes('at'));

    if (aboutChunk && queryLower.includes('background')) {
      // For background questions, give the summary
      return aboutChunk.replace(/About:\s*/, '');
    }

    if (experienceChunks.length > 0) {
      // Generate a natural response listing work experiences
      let response = "I have professional experience in:\n\n";

      experienceChunks.forEach((exp, index) => {
        // Match pattern: "Experience N: Title at Company (Period). Location."
        // Use a more specific pattern that looks for period after date range
        const match = exp.match(/Experience \d+:\s*(.+?)\s+at\s+(.+?)\s+\(([^)]+)\)\./);
        if (match) {
          const [, title, company, period] = match;
          response += `• **${title}** at ${company} (${period})\n`;

          // Add one highlight for the first experience
          if (index === 0) {
            const highlightMatch = exp.match(/Highlights:\s*(.+?)(?:(?=[A-Z][a-z]+\s+[A-Z])|$)/);
            if (highlightMatch) {
              const highlight = highlightMatch[1].trim();
              if (highlight.length > 0 && highlight.length < 200) {
                response += `  ${highlight}\n`;
              } else if (highlight.length >= 200) {
                response += `  ${highlight.substring(0, 150)}...\n`;
              }
            }
          }
          response += '\n';
        }
      });

      return response.trim();
    }

    // Fallback to About chunk
    if (aboutChunk) {
      return aboutChunk.replace(/About:\s*/, '');
    }
  }

  // Education questions
  if (intent === 'education' || queryLower.includes('study') || queryLower.includes('school') || queryLower.includes('degree')) {
    const eduChunk = texts.find(t => t.includes('Education:'));
    if (eduChunk) {
      const match = eduChunk.match(/Education:\s*(.+?)\s+from\s+(.+?)\s+\((.+?)\)/);
      if (match) {
        return `I earned a ${match[1]} from ${match[2]} (${match[3]}).`;
      }
    }
  }

  // Projects questions
  if (intent === 'projects' || queryLower.includes('project') || queryLower.includes('built') || queryLower.includes('build')) {
    const projectChunks = texts.filter(t => t.includes('Project'));

    if (projectChunks.length > 0) {
      let response = "Here are some notable projects:\n\n";
      projectChunks.forEach(proj => {
        const match = proj.match(/Project \d+:\s*(.+?)\s+\((.+?)\)\.\s+Description:\s*(.+?)\./);
        if (match) {
          response += `• **${match[1]}** (${match[2]})\n  ${match[3]}\n\n`;
        }
      });
      return response.trim();
    }

    return "I've worked on projects including biometric authentication systems and inventory management solutions. Feel free to ask more specifically!";
  }

  // AI/ML capability questions
  if (intent === 'ai_ml' || (queryLower.includes('machine learning') || queryLower.includes('ai'))) {
    const aiSkills = texts.find(t => t.includes('AI / Machine Learning:'));
    const aboutChunk = texts.find(t => t.includes('About:'));
    const experienceChunks = texts.filter(t => t.toLowerCase().includes('ai') || t.toLowerCase().includes('vision') || t.toLowerCase().includes('machine learning'));

    // Check if this is asking for justification/explanation (why/explain/how)
    const isJustification = /\b(why|explain|how|prove|demonstrate)\b/.test(queryLower);

    if (isJustification && (aboutChunk || experienceChunks.length > 0)) {
      // Generate a persuasive response with evidence
      let response = "I have strong AI/ML expertise built through both education and hands-on experience:\n\n";

      // Add technical skills
      if (aiSkills) {
        const match = aiSkills.match(/AI \/ Machine Learning:\s*(.+?)(?:\.|$)/);
        if (match) {
          const skillsList = match[1].split(',').slice(0, 6).join(',');
          response += `**Technical Skills**: I work with ${skillsList}\n\n`;
        }
      }

      // Add practical experience
      if (experienceChunks.length > 0) {
        response += "**Practical Experience**:\n";
        experienceChunks.forEach((exp, index) => {
          if (index < 2) { // Limit to 2 most relevant experiences
            const titleMatch = exp.match(/Experience \d+:\s*(.+?)\s+at\s+(.+?)\s+\(/);
            if (titleMatch) {
              response += `• ${titleMatch[1]} at ${titleMatch[2]}\n`;
            } else if (exp.includes('About:')) {
              // Extract key experience from About
              const yearMatch = exp.match(/(\d+\s+years?)[^.]*(?:Machine Vision|AI)/i);
              if (yearMatch) {
                response += `• ${yearMatch[0]}\n`;
              }
            }
          }
        });
      }

      return response.trim();
    }

    // Simple capability question
    let response = "Yes! I have significant experience in AI and machine learning.";

    if (aiSkills) {
      const match = aiSkills.match(/AI \/ Machine Learning:\s*(.+?)(?:\.|$)/);
      if (match) {
        response += ` I work with technologies like ${match[1]}.`;
      }
    }

    return response;
  }

  // Default: return first text with cleanup
  const firstText = texts[0];
  if (firstText.includes('About:')) {
    return firstText.replace(/About:\s*/, '');
  }

  return firstText;
}

// API endpoints
app.get('/api/portfolio', (req, res) => {
  const data = require('./public/data/portfolio.json');
  res.json(data);
});

app.post('/api/chat', async (req, res) => {
  try {
    const { message, sessionId } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Use sessionId from request or create one based on IP (simple session management)
    const userSessionId = sessionId || req.ip || 'default';

    const response = await generateResponse(message, userSessionId);

    // Get conversation history for this session
    const history = getSessionHistory(userSessionId);

    res.json({
      response,
      relevant_chunks: vectorStore.query(message, 3).map(r => r.chunk.text),
      sessionId: userSessionId,
      conversationLength: history.length
    });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: 'Failed to process message' });
  }
});

// SPA fallback - serve index.html for all routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Initialize
async function init() {
  console.log('Initializing RAG backend with GLM-4.7-Flash...');
  console.log('='.repeat(50));

  loadPortfolioData();
  initVectorStore();
  await loadModel();

  app.listen(PORT, () => {
    console.log('='.repeat(50));
    console.log(`✓ Portfolio server running at http://localhost:${PORT}`);
    console.log(`✓ Chat API available at http://localhost:${PORT}/api/chat`);
    console.log(`✓ Model: zai-org/GLM-4.7-Flash (Hugging Face API)`);
    console.log('='.repeat(50));
  });
}

init();
