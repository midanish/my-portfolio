// Cloudflare Pages Function for chat API
// Note: For production, consider using Cloudflare KV for session storage

export async function onRequestPost(context) {
  try {
    const { message } = await context.request.json();

    if (!message) {
      return new Response(JSON.stringify({ error: 'Message is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Fetch portfolio data for RAG
    const portfolioUrl = new URL('/data/portfolio.json', context.request.url);
    const portfolioResponse = await fetch(portfolioUrl);
    const portfolioData = await portfolioResponse.json();

    // Simple keyword-based context retrieval
    const context_chunks = getRelevantContext(message, portfolioData);

    // Build prompt
    const systemPrompt = `You are a helpful assistant for a professional portfolio. Answer questions based only on the provided context. Be concise, friendly, and professional.

Context from portfolio:
${context_chunks}

User's question: ${message}

Instructions:
- Answer based solely on the context provided
- Be conversational and natural
- Keep responses concise (2-4 sentences)
- If information not in context, say you don't have that information`;

    // Call Hugging Face API (GLM-4.7-Flash)
    let response_text = await generateWithHuggingFace(systemPrompt);

    // Fallback to simple retrieval-based response if model fails
    if (!response_text || response_text.length < 10) {
      response_text = generateSimpleResponse(message, portfolioData);
    }

    return new Response(JSON.stringify({
      response: response_text,
      sessionId: 'cloudflare-session'
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });

  } catch (error) {
    console.error('Chat error:', error);
    return new Response(JSON.stringify({
      error: 'Failed to process message',
      response: 'I apologize, but I encountered an error. Please try again.'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// Handle OPTIONS for CORS
export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

// Get relevant context from portfolio data
function getRelevantContext(query, data) {
  const queryLower = query.toLowerCase();
  let context = [];

  // Check for personal info
  if (queryLower.includes('who') || queryLower.includes('name') || queryLower.includes('contact')) {
    context.push(`Name: ${data.personal.name}`);
    context.push(`Title: ${data.personal.title}`);
    context.push(`Summary: ${data.personal.summary}`);
  }

  // Check for skills
  if (queryLower.includes('skill') || queryLower.includes('programming') || queryLower.includes('python') || queryLower.includes('ai')) {
    if (data.skills.programming) {
      context.push(`Programming: ${data.skills.programming.slice(0, 8).join(', ')}`);
    }
    if (data.skills.aiml) {
      context.push(`AI/ML: ${data.skills.aiml.slice(0, 8).join(', ')}`);
    }
  }

  // Check for experience
  if (queryLower.includes('experience') || queryLower.includes('work') || queryLower.includes('job')) {
    data.experience?.slice(0, 2).forEach(exp => {
      context.push(`${exp.title} at ${exp.company} (${exp.period})`);
    });
  }

  // Check for projects
  if (queryLower.includes('project') || queryLower.includes('built')) {
    data.projects?.slice(0, 2).forEach(proj => {
      context.push(`Project: ${proj.title} - ${proj.description}`);
    });
  }

  // Check for education
  if (queryLower.includes('education') || queryLower.includes('degree') || queryLower.includes('study')) {
    data.education?.forEach(edu => {
      context.push(`${edu.degree} from ${edu.institution} (${edu.period})`);
    });
  }

  // If no specific match, include summary
  if (context.length === 0) {
    context.push(data.personal.summary);
  }

  return context.join('\n');
}

// Call Hugging Face API
async function generateWithHuggingFace(prompt) {
  try {
    const response = await fetch(
      'https://api-inference.huggingface.co/models/zai-org/GLM-4.7-Flash',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Note: For production, use environment variables for API keys
          // 'Authorization': `Bearer ${context.env.HF_API_KEY}`
        },
        body: JSON.stringify({
          inputs: prompt,
          parameters: {
            max_new_tokens: 256,
            temperature: 0.7,
            top_p: 0.9,
            repetition_penalty: 1.1,
            return_full_text: false,
          },
        }),
      }
    );

    const data = await response.json();

    if (data.error) {
      console.error('HF API error:', data.error);
      return null;
    }

    return data[0]?.generated_text || data.generated_text || null;
  } catch (error) {
    console.error('HF API call failed:', error);
    return null;
  }
}

// Simple fallback response generator
function generateSimpleResponse(query, data) {
  const queryLower = query.toLowerCase();

  if (queryLower.includes('hello') || queryLower.includes('hi')) {
    return "Hello! I'm here to help you learn about this portfolio. Feel free to ask about skills, experience, projects, or education.";
  }

  if (queryLower.includes('skill')) {
    const skills = data.skills.programming?.slice(0, 5).join(', ') || 'various technologies';
    return `I have experience with ${skills}, among other technologies. I also specialize in AI/ML technologies.`;
  }

  if (queryLower.includes('experience') || queryLower.includes('work')) {
    const latestJob = data.experience?.[0];
    if (latestJob) {
      return `Currently working as ${latestJob.title} at ${latestJob.company}. I have professional experience across multiple roles in AI, vision engineering, and semiconductor manufacturing.`;
    }
  }

  if (queryLower.includes('project')) {
    return `I've worked on several projects including a RAG chatbot, food image classification, and biometric authentication systems. Would you like to know more about specific projects?`;
  }

  if (queryLower.includes('education')) {
    const edu = data.education?.[0];
    if (edu) {
      return `I earned a ${edu.degree} from ${edu.institution}.`;
    }
  }

  return "I can help you learn about skills, work experience, projects, education, and professional qualifications. What would you like to know?";
}
