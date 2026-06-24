const express = require('express');
const { HfInference } = require('@huggingface/inference');
const path = require('path');
const fs = require('fs');

// Load environment variables from a local .env file (zero-dependency loader).
// .env is gitignored — keep secrets like HF_TOKEN here for local development.
// Real env vars (e.g. set by the shell or Cloudflare) always take precedence.
(function loadDotEnv() {
  try {
    const envPath = path.join(__dirname, '.env');
    if (!fs.existsSync(envPath)) return;
    for (const rawLine of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) continue;
      const eq = line.indexOf('=');
      if (eq === -1) continue;
      const key = line.slice(0, eq).trim();
      let val = line.slice(eq + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (key && !(key in process.env)) process.env[key] = val;
    }
  } catch (err) {
    console.warn('Could not read .env file:', err.message);
  }
})();

// Initialize Hugging Face client. Provide a token via HF_TOKEN (or
// HUGGINGFACE_API_KEY / HF_API_KEY) to enable the LLM; without one the bot
// gracefully falls back to grounded retrieval responses.
const HF_TOKEN = process.env.HF_TOKEN || process.env.HUGGINGFACE_API_KEY || process.env.HF_API_KEY || undefined;
const CHAT_MODEL = process.env.CHAT_MODEL || 'zai-org/GLM-4.7-Flash';
const hf = new HfInference(HF_TOKEN);

const app = express();
const PORT = process.env.PORT || 3000;
const PORTFOLIO_PATH = path.join(__dirname, 'public', 'data', 'portfolio.json');

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Global variables for model and RAG data
let generator = null;
let portfolioData = null;
let chunks = [];
let knowledgeBase = ''; // full portfolio compiled into grounded context for the LLM

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

    // Create text chunks (used by the retrieval fallback)
    createChunks();
    // Compile the whole portfolio into a single grounded context for the LLM
    knowledgeBase = buildKnowledgeBase();
  } catch (error) {
    console.error('Error loading portfolio data:', error);
  }
}

// Compile the entire portfolio into a compact, well-structured knowledge base.
// The portfolio is small, so we give the model everything (no lossy retrieval)
// — this lets it answer synthesis questions (fit, strengths, comparisons) accurately.
function buildKnowledgeBase() {
  if (!portfolioData) return '';
  const p = portfolioData.personal || {};
  const s = portfolioData.skills || {};
  const out = [];

  out.push('# Profile');
  if (p.name) out.push(`Name: ${p.name}`);
  if (p.title) out.push(`Title: ${p.title}`);
  if (p.location) out.push(`Location: ${p.location}`);
  out.push(`Contact: ${[p.email && `email ${p.email}`, p.phone && `phone ${p.phone}`, p.linkedin && `LinkedIn ${p.linkedin}`].filter(Boolean).join(' | ')}`);
  if (p.summary) out.push(`\nProfessional summary: ${p.summary}`);

  out.push('\n# Skills');
  if (s.programming) out.push(`Programming languages & frameworks: ${s.programming.join(', ')}`);
  if (s.databases) out.push(`Databases & APIs: ${s.databases.join(', ')}`);
  if (s.aiml) out.push(`AI / Machine Learning: ${s.aiml.join(', ')}`);
  if (s.tools) out.push(`Tools & Platforms: ${s.tools.join(', ')}`);

  if (Array.isArray(portfolioData.experience) && portfolioData.experience.length) {
    out.push('\n# Work Experience');
    portfolioData.experience.forEach(e => {
      out.push(`\n## ${e.title} — ${e.company} (${e.period})${e.location ? `, ${e.location}` : ''}`);
      (e.highlights || []).forEach(h => out.push(`- ${h}`));
    });
  }

  if (Array.isArray(portfolioData.projects) && portfolioData.projects.length) {
    out.push('\n# Projects');
    portfolioData.projects.forEach(pr => {
      out.push(`\n## ${pr.title} (${pr.date})`);
      if (pr.description) out.push(pr.description);
      (pr.highlights || []).forEach(h => out.push(`- ${h}`));
      if (pr.technologies) out.push(`Technologies: ${pr.technologies.join(', ')}`);
    });
  }

  if (Array.isArray(portfolioData.education) && portfolioData.education.length) {
    out.push('\n# Education');
    portfolioData.education.forEach(ed => out.push(`- ${ed.degree}, ${ed.institution} (${ed.period}).${ed.details ? ' ' + ed.details : ''}`));
  }

  if (Array.isArray(portfolioData.certificates) && portfolioData.certificates.length) {
    out.push('\n# Certificates');
    portfolioData.certificates.forEach(c => out.push(`- ${c.name} — ${c.issuer} (${c.date})`));
  }

  if (Array.isArray(portfolioData.awards) && portfolioData.awards.length) {
    out.push('\n# Awards');
    portfolioData.awards.forEach(a => out.push(`- ${a.name} — ${a.issuer} (${a.year})`));
  }

  return out.join('\n');
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

// Configure the chat model (chat-completions API via Hugging Face router)
async function loadModel() {
  try {
    console.log(`Configuring chat model: ${CHAT_MODEL}`);
    console.log(`  Auth: ${HF_TOKEN ? 'HF token detected' : 'no token (LLM disabled — using grounded retrieval fallback)'}`);

    generator = {
      modelName: CHAT_MODEL,
      // messages: [{ role, content }]  →  returns assistant text, or null on failure
      generate: async (messages, options = {}) => {
        try {
          const res = await hf.chatCompletion({
            model: CHAT_MODEL,
            messages,
            max_tokens: options.max_tokens || 600,
            temperature: options.temperature ?? 0.6,
            top_p: options.top_p ?? 0.9,
            // GLM-4.x is a reasoning model: without this it spends the whole
            // token budget "thinking" and returns empty content. Disable it so
            // the answer lands directly in message.content (faster + cheaper).
            chat_template_kwargs: { enable_thinking: false },
          });
          const msg = res?.choices?.[0]?.message || {};
          return (msg.content && msg.content.trim()) || null;
        } catch (error) {
          console.error('Chat completion error:', error.message);
          return null;
        }
      }
    };

    console.log('✓ Chat model configured');
    console.log(`  Model: ${CHAT_MODEL}`);
    console.log('  Provider: Hugging Face router (chat completions)');
    console.log('  Ready for inference');
  } catch (error) {
    console.error('Error configuring chat model:', error);
    console.log('Falling back to retrieval-based responses...');
    generator = { generate: async () => null };
  }
}

// System prompt: persona, grounding rules, allowed synthesis, scope, and style.
function buildSystemPrompt() {
  const name = (portfolioData && portfolioData.personal && portfolioData.personal.name) || 'the portfolio owner';
  const first = name.split(' ').includes('Iqmal') ? 'Iqmal' : name.split(' ')[0];
  return `You are the AI assistant on ${name}'s personal portfolio website. You help visitors (often recruiters and hiring managers) learn about ${first}, an AI / machine-vision engineer and semiconductor process engineer.

Ground every answer ONLY in the PROFILE DATA below. You MAY reason over and synthesize those facts — summarize strengths, assess fit for a role, compare projects, infer transferable skills — but never invent specifics that aren't supported (no fabricated employers, dates, metrics, titles, or technologies). If a detail genuinely isn't in the data, say you don't have that information and offer what you can cover instead.

Style:
- Warm, confident, and professional. Refer to him as "${first}" (third person).
- Concise by default (2–5 sentences). Use light markdown: **bold** for key terms and bullet lists when enumerating skills, roles, or projects.
- For recruiter-style questions (fit, strengths, "why hire him", summary), give a direct, grounded, persuasive answer drawn from the data.
- For follow-ups, use the conversation so far to resolve references like "it", "that role", "more".

Scope: only discuss ${first}, his background, and his work. If asked something clearly unrelated (weather, math, general trivia, coding help, world facts), briefly and politely decline and redirect to what you can help with. Greetings and small pleasantries are fine.

PROFILE DATA:
${knowledgeBase}`;
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

// Generate a response: full-context chat completion with multi-turn history,
// and a grounded retrieval fallback when the LLM is unavailable.
async function generateResponse(query, sessionId = 'default') {
  try {
    if (!generator) {
      return 'I apologize, but the assistant is still starting up. Please try again in a moment.';
    }

    const history = getSessionHistory(sessionId);
    const { intent } = classifyIntent(query);

    // Try the LLM first: full portfolio context + recent conversation as turns.
    let response = null;
    if (typeof generator.generate === 'function') {
      const messages = [{ role: 'system', content: buildSystemPrompt() }];
      history.slice(-5).forEach(h => {
        messages.push({ role: 'user', content: h.user });
        messages.push({ role: 'assistant', content: h.bot });
      });
      messages.push({ role: 'user', content: query });

      const generated = await generator.generate(messages, { max_tokens: 512, temperature: 0.6 });
      if (generated && generated.trim().length > 1) {
        response = generated.trim();
      }
    }

    // Fallback: grounded retrieval when the LLM is unavailable or errored.
    if (!response) {
      if (intent === 'greeting') {
        response = "Hi! I'm Iqmal's portfolio assistant. Ask me about his skills, experience, projects, education, or whether he'd fit a role you have in mind.";
      } else if (vectorStore) {
        const relevantChunks = vectorStore.query(query, 4);
        response = relevantChunks.length
          ? generateResponseFromChunks(query, relevantChunks, intent, history)
          : "I can tell you about Iqmal's skills, work experience, projects, education, certificates, and awards — what would you like to know?";
      } else {
        response = "I can tell you about Iqmal's skills, work experience, projects, and education — what would you like to know?";
      }
    }

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
