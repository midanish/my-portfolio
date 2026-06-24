// Cloudflare Pages Function for the portfolio chat API.
// Smarter version: feeds the whole portfolio as grounded context and uses the
// chat-completions API. Set an HF token in the Pages env (HF_TOKEN) to enable
// the LLM; otherwise it falls back to a grounded keyword response.
// Note: stateless (single-turn). For multi-turn memory, back it with Cloudflare KV.

export async function onRequestPost(context) {
  try {
    const { message } = await context.request.json();

    if (!message) {
      return json({ error: 'Message is required' }, 400);
    }

    // Fetch portfolio data for grounding
    const portfolioUrl = new URL('/data/portfolio.json', context.request.url);
    const portfolioData = await (await fetch(portfolioUrl)).json();

    const knowledgeBase = buildKnowledgeBase(portfolioData);
    const messages = [
      { role: 'system', content: buildSystemPrompt(portfolioData, knowledgeBase) },
      { role: 'user', content: message },
    ];

    let response_text = await generateWithHuggingFace(messages, context.env);

    // Fallback to a grounded retrieval response if the model is unavailable.
    if (!response_text || response_text.trim().length < 2) {
      response_text = generateSimpleResponse(message, portfolioData);
    }

    return json({ response: response_text, sessionId: 'cloudflare-session' });
  } catch (error) {
    console.error('Chat error:', error);
    return json({
      error: 'Failed to process message',
      response: 'I apologize, but I encountered an error. Please try again.',
    }, 500);
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  });
}

// Compile the whole portfolio into grounded context (it's small — no lossy retrieval).
function buildKnowledgeBase(data) {
  if (!data) return '';
  const p = data.personal || {};
  const s = data.skills || {};
  const out = ['# Profile'];
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

  if (Array.isArray(data.experience) && data.experience.length) {
    out.push('\n# Work Experience');
    data.experience.forEach(e => {
      out.push(`\n## ${e.title} — ${e.company} (${e.period})${e.location ? `, ${e.location}` : ''}`);
      (e.highlights || []).forEach(h => out.push(`- ${h}`));
    });
  }

  if (Array.isArray(data.projects) && data.projects.length) {
    out.push('\n# Projects');
    data.projects.forEach(pr => {
      out.push(`\n## ${pr.title} (${pr.date})`);
      if (pr.description) out.push(pr.description);
      (pr.highlights || []).forEach(h => out.push(`- ${h}`));
      if (pr.technologies) out.push(`Technologies: ${pr.technologies.join(', ')}`);
    });
  }

  if (Array.isArray(data.education) && data.education.length) {
    out.push('\n# Education');
    data.education.forEach(ed => out.push(`- ${ed.degree}, ${ed.institution} (${ed.period}).${ed.details ? ' ' + ed.details : ''}`));
  }
  if (Array.isArray(data.certificates) && data.certificates.length) {
    out.push('\n# Certificates');
    data.certificates.forEach(c => out.push(`- ${c.name} — ${c.issuer} (${c.date})`));
  }
  if (Array.isArray(data.awards) && data.awards.length) {
    out.push('\n# Awards');
    data.awards.forEach(a => out.push(`- ${a.name} — ${a.issuer} (${a.year})`));
  }
  return out.join('\n');
}

function buildSystemPrompt(data, knowledgeBase) {
  const name = (data && data.personal && data.personal.name) || 'the portfolio owner';
  const first = name.split(' ').includes('Iqmal') ? 'Iqmal' : name.split(' ')[0];
  return `You are the AI assistant on ${name}'s personal portfolio website. You help visitors (often recruiters) learn about ${first}, an AI / machine-vision engineer and semiconductor process engineer.

Ground every answer ONLY in the PROFILE DATA below. You MAY reason over and synthesize those facts (summarize strengths, assess fit for a role, compare projects, infer transferable skills) but never invent specifics that aren't supported. If a detail genuinely isn't in the data, say so and offer what you can cover.

Style: warm, confident, concise (2–5 sentences). Refer to him as "${first}". Use light markdown (**bold**, bullet lists). For recruiter-style questions, give a direct, grounded answer. Only discuss ${first} and his work; politely decline clearly unrelated questions. Greetings are fine.

PROFILE DATA:
${knowledgeBase}`;
}

// Call the Hugging Face chat-completions router.
async function generateWithHuggingFace(messages, env = {}) {
  const token = env.HF_TOKEN || env.HUGGINGFACE_API_KEY || env.HF_API_KEY;
  if (!token) return null; // no key → use grounded fallback
  const model = env.CHAT_MODEL || 'zai-org/GLM-4.7-Flash';
  try {
    const res = await fetch('https://router.huggingface.co/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: 600,
        temperature: 0.6,
        top_p: 0.9,
        // GLM-4.x is a reasoning model — disable thinking so the answer lands
        // in message.content instead of being consumed by the reasoning trace.
        chat_template_kwargs: { enable_thinking: false },
      }),
    });
    const data = await res.json();
    if (data.error) {
      console.error('HF API error:', data.error);
      return null;
    }
    const content = data?.choices?.[0]?.message?.content;
    return (content && content.trim()) || null;
  } catch (error) {
    console.error('HF API call failed:', error);
    return null;
  }
}

// Grounded fallback when the LLM is unavailable.
function generateSimpleResponse(query, data) {
  const q = query.toLowerCase();
  const p = data.personal || {};

  if (/\b(hi|hello|hey|greetings)\b/.test(q)) {
    return `Hi! I'm ${(p.name || '').split(' ')[0] || 'the'} portfolio assistant. Ask me about skills, experience, projects, education, or fit for a role.`;
  }
  if (q.includes('skill') || q.includes('tech') || q.includes('stack')) {
    const prog = (data.skills?.programming || []).slice(0, 6).join(', ');
    const ai = (data.skills?.aiml || []).slice(0, 6).join(', ');
    return `**Programming:** ${prog}.\n**AI/ML:** ${ai}.`;
  }
  if (q.includes('experience') || q.includes('work') || q.includes('job') || q.includes('career')) {
    return (data.experience || []).slice(0, 3)
      .map(e => `- **${e.title}**, ${e.company} (${e.period})`).join('\n') || 'No experience data available.';
  }
  if (q.includes('project')) {
    return (data.projects || []).slice(0, 4)
      .map(pr => `- **${pr.title}** — ${pr.description}`).join('\n') || 'No project data available.';
  }
  if (q.includes('education') || q.includes('degree') || q.includes('study') || q.includes('university')) {
    const e = (data.education || [])[0];
    return e ? `**${e.degree}**, ${e.institution} (${e.period}).` : 'No education data available.';
  }
  if (q.includes('certificate') || q.includes('certification')) {
    return (data.certificates || []).slice(0, 4).map(c => `- ${c.name} — ${c.issuer} (${c.date})`).join('\n') || 'No certificate data available.';
  }
  if (q.includes('award')) {
    return (data.awards || []).slice(0, 4).map(a => `- ${a.name} — ${a.issuer} (${a.year})`).join('\n') || 'No award data available.';
  }
  if (q.includes('contact') || q.includes('email') || q.includes('reach') || q.includes('hire')) {
    return `You can reach ${p.name || 'him'} at **${p.email || ''}**${p.linkedin ? ` or on [LinkedIn](${p.linkedin})` : ''}.`;
  }
  return p.summary
    ? `${p.summary}\n\nAsk me about skills, experience, projects, education, or fit for a role.`
    : "I can help with skills, work experience, projects, education, and qualifications. What would you like to know?";
}
