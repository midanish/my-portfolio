// Cloudflare Pages Function for portfolio data
export async function onRequest(context) {
  try {
    // In Cloudflare Pages, we'll serve the static JSON file
    // The portfolio.json should be in the public/data directory
    const portfolioData = {
      "personal": {
        "name": "Muhammad Iqmal Danish bin Hasnan",
        "title": "AI Specialist Apprentice | Vision Engineer | Process Engineer",
        "location": "Cheras, Selangor, Malaysia",
        "email": "midanish2k@gmail.com",
        "phone": "+60122948142",
        "linkedin": "https://www.linkedin.com/in/iqmal-danish",
        "summary": "Process Engineer with 1 year of experience in semiconductor manufacturing and 1 year of hands-on experience in Machine Vision and AI development, spanning industrial inspection systems and applied computer vision solutions. Strong background in Python, C/C++, C#, and AI/ML frameworks including PyTorch, TensorFlow, OpenCV, and Halcon, with practical exposure to defect detection, vision automation, and end-to-end system integration in production environments. Seeking to transition into an AI Engineer role, where industrial domain knowledge and applied AI expertise can be leveraged to deliver scalable, real-world intelligent systems."
      },
      // Note: In production, you should import this from the JSON file
      // For now, we'll fetch it from the static file
    };

    // Fetch the portfolio.json from the static assets
    const url = new URL('/data/portfolio.json', context.request.url);
    const response = await fetch(url);
    const data = await response.json();

    return new Response(JSON.stringify(data), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to load portfolio data' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
}
