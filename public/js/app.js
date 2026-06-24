// Portfolio SPA Application — "Inference Desk" (macOS detection-feed theme)
(function() {
  'use strict';

  document.documentElement.classList.add('js');

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  // DOM Elements
  const elements = {
    heroName: document.getElementById('heroName'),
    heroTitle: document.getElementById('heroTitle'),
    heroLocation: document.getElementById('heroLocation'),
    aboutText: document.getElementById('aboutText'),
    skillsGrid: document.getElementById('skillsGrid'),
    experienceTimeline: document.getElementById('experienceTimeline'),
    projectsGrid: document.getElementById('projectsGrid'),
    educationContent: document.getElementById('educationContent'),
    certificatesContent: document.getElementById('certificatesContent'),
    awardsContent: document.getElementById('awardsContent'),
    contactLinks: document.getElementById('contactLinks'),
    currentYear: document.getElementById('currentYear'),
    themeToggle: document.getElementById('themeToggle'),
    menuDate: document.getElementById('menuDate'),
    menuTime: document.getElementById('menuTime'),
    dock: document.getElementById('dock')
  };

  if (elements.currentYear) elements.currentYear.textContent = new Date().getFullYear();

  // Menu bar clock (mono, blinking colon)
  function updateMenuBar() {
    const now = new Date();
    let h = now.getHours();
    const m = now.getMinutes().toString().padStart(2, '0');
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    elements.menuTime.innerHTML = `${h}<span class="colon">:</span>${m} ${ampm}`;
    elements.menuDate.textContent = now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  }
  updateMenuBar();
  setInterval(updateMenuBar, 30000);

  // ---- Theme ---------------------------------------------------------------
  function initTheme() {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (savedTheme) {
      document.documentElement.setAttribute('data-theme', savedTheme === 'light' ? 'light' : '');
    } else if (!prefersDark) {
      document.documentElement.setAttribute('data-theme', 'light');
    }
  }

  function calibrationWipe() {
    if (prefersReducedMotion) return;
    const wipe = document.createElement('div');
    wipe.className = 'calibration-wipe';
    document.body.appendChild(wipe);
    setTimeout(() => wipe.remove(), 520);
  }

  function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    calibrationWipe();
    document.documentElement.setAttribute('data-theme', newTheme === 'dark' ? '' : 'light');
    localStorage.setItem('theme', newTheme);
  }

  function handleThemeToggle() {
    if (elements.themeToggle) elements.themeToggle.addEventListener('click', toggleTheme);
  }

  initTheme();

  // ---- Data ----------------------------------------------------------------
  async function fetchPortfolioData() {
    try {
      const response = await fetch('/api/portfolio');
      if (!response.ok) throw new Error('Failed to fetch portfolio data');
      return await response.json();
    } catch (error) {
      console.error('Error fetching portfolio data:', error);
      return null;
    }
  }

  // ---- Hero ----------------------------------------------------------------
  function renderHero(personal) {
    elements.heroName.textContent = personal.name;
    typeWriter(elements.heroTitle, personal.title);
    elements.heroLocation.innerHTML =
      `<span class="live-dot"></span>${personal.location}<span class="live-tag mono">● LIVE</span>`;
  }

  function typeWriter(element, text, speed = 38) {
    if (prefersReducedMotion) { element.textContent = text; return; }
    let i = 0;
    element.textContent = '';
    function type() {
      if (i < text.length) {
        element.textContent += text.charAt(i);
        i++;
        setTimeout(type, speed);
      }
    }
    setTimeout(type, 500);
  }

  function renderAbout(personal) {
    elements.aboutText.textContent = personal.summary;
  }


  // ---- Skill icons ---------------------------------------------------------
  // Real brand logos are inlined locally from public/js/skill-icons.js
  // (Simple Icons, monochrome → theme-adaptive via currentColor). Concepts with
  // no real logo get a clean, intentional symbolic line-icon — never a fake square.
  const SYM = {
    code: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M9.4 16.6 4.8 12l4.6-4.6L8 6l-6 6 6 6zm5.2 0L19.2 12l-4.6-4.6L16 6l6 6-6 6z"/></svg>',
    chip: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="7" y="7" width="10" height="10" rx="1.5"/><path stroke-linecap="round" d="M10 4v3M14 4v3M10 17v3M14 17v3M4 10h3M4 14h3M17 10h3M17 14h3"/></svg>',
    window: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="4" width="18" height="16" rx="2"/><path stroke-linecap="round" d="M3 8h18"/></svg>',
    braces: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M8 4C6 4 6 8 4 12c2 4 2 8 4 8M16 4c2 0 2 4 4 8-2 4-2 8-4 8"/></svg>',
    fx: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M5 19c3 0 3-14 7-14M3 11h7M14 9l6 6M20 9l-6 6"/></svg>',
    eye: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg>',
    nodes: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><circle cx="5" cy="6" r="2"/><circle cx="5" cy="18" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="6" r="2"/><circle cx="19" cy="18" r="2"/><path d="M7 6l3 5M7 18l3-5M14 11l3-4M14 13l3 4"/></svg>',
    chat: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path stroke-linejoin="round" d="M4 5h16v11H8l-4 4V5Z"/><path stroke-linecap="round" d="M8 9h8M8 12h5"/></svg>',
    sparkle: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l1.8 5.2L19 9l-5.2 1.8L12 16l-1.8-5.2L5 9l5.2-1.8L12 2Z"/><path d="M19 14l.9 2.6L22 17.5l-2.1.9L19 21l-.9-2.6L16 17.5l2.1-.9L19 14Z"/></svg>',
    docsearch: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path stroke-linejoin="round" d="M6 3h8l4 4v6"/><path stroke-linecap="round" d="M6 3v18h7"/><circle cx="17" cy="17" r="3"/><path stroke-linecap="round" d="M19.2 19.2 22 22"/></svg>',
    trend: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 17l5-5 4 4 8-8"/><path d="M16 8h5v5"/></svg>',
    bbox: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M3 7V4h3M21 7V4h-3M3 17v3h3M21 17v3h-3"/><circle cx="12" cy="12" r="3"/></svg>',
    cube: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"><path d="M12 2l9 5v10l-9 5-9-5V7l9-5Z"/><path d="M12 12l9-5M12 12v10M12 12 3 7"/></svg>',
    gauge: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M4 18a8 8 0 1 1 16 0"/><path d="M12 18l4-5"/></svg>',
    database: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><ellipse cx="12" cy="5" rx="7" ry="3"/><path d="M5 5v14c0 1.7 3.1 3 7 3s7-1.3 7-3V5M5 12c0 1.7 3.1 3 7 3s7-1.3 7-3"/></svg>',
    terminal: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 9l3 3-3 3M13 15h4"/></svg>',
    pen: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19l7-7-4-4-7 7-1 5 5-1Z"/><path d="M14.5 6.5l3 3"/></svg>',
    ms: '<svg viewBox="0 0 24 24"><path fill="#F25022" d="M3 3h8v8H3z"/><path fill="#7FBA00" d="M13 3h8v8h-8z"/><path fill="#00A4EF" d="M3 13h8v8H3z"/><path fill="#FFB900" d="M13 13h8v8h-8z"/></svg>'
  };

  const SKILL_SYMBOLS = {
    'C#': SYM.code, 'Visual Studio Code': SYM.code, 'Microsoft Visual Studio 2022': SYM.code,
    'MATLAB': SYM.fx, 'PowerFX': SYM.fx,
    'Assembly Language': SYM.chip, 'PLC': SYM.chip,
    'SCADA': SYM.gauge,
    'WPF': SYM.window, 'WinForms': SYM.window, 'MVVM': SYM.window,
    'REST API Development': SYM.braces, 'Microsoft Graph API': SYM.braces,
    'Computer Vision': SYM.eye,
    'Deep Learning': SYM.nodes, 'Supervised/Unsupervised Learning': SYM.nodes,
    'NLP': SYM.chat, 'LLM': SYM.chat,
    'Prompt Engineering': SYM.terminal,
    'Generative AI': SYM.sparkle,
    'RAG': SYM.docsearch,
    'Predictive Modeling': SYM.trend,
    'YOLOv8': SYM.bbox, 'Halcon': SYM.bbox, 'CVAT': SYM.bbox,
    'AutoCAD': SYM.cube, 'SolidWorks': SYM.cube,
    'SQL Server': SYM.database, 'Oracle SQL Database': SYM.database,
    'Adobe Illustrator': SYM.pen, 'IBM Watson': SYM.nodes,
    'Microsoft 365': SYM.ms, 'Microsoft Power Platform': SYM.ms
  };

  function skillIconHTML(skill) {
    const brand = window.SKILL_BRAND_ICONS && window.SKILL_BRAND_ICONS[skill];
    const svg = brand
      ? `<svg viewBox="0 0 24 24" fill="currentColor"><path d="${brand}"/></svg>`
      : (SKILL_SYMBOLS[skill] || SYM.code);
    return `<span class="skill-icon" aria-hidden="true">${svg}</span>`;
  }

  // ---- Skills --------------------------------------------------------------
  function renderSkills(skills) {
    const categories = [
      { title: 'Programming', skills: skills.programming, icon: '<svg viewBox="0 0 24 24"><path d="M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0l4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z" fill="currentColor"/></svg>' },
      { title: 'Databases & APIs', skills: skills.databases, icon: '<svg viewBox="0 0 24 24"><path d="M12 3C7.58 3 4 4.79 4 7s3.58 4 8 4 8-1.79 8-4-3.58-4-8-4zM4 9v3c0 2.21 3.58 4 8 4s8-1.79 8-4V9c0 2.21-3.58 4-8 4s-8-1.79-8-4zm0 5v3c0 2.21 3.58 4 8 4s8-1.79 8-4v-3c0 2.21-3.58 4-8 4s-8-1.79-8-4z" fill="currentColor"/></svg>' },
      { title: 'AI / Machine Learning', skills: skills.aiml, icon: '<svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-5.5-2.5l7.51-3.49L17.5 6.5 9.99 9.99 6.5 17.5zm5.5-6.6c.61 0 1.1.49 1.1 1.1s-.49 1.1-1.1 1.1-1.1-.49-1.1-1.1.49-1.1 1.1-1.1z" fill="currentColor"/></svg>' },
      { title: 'Tools & Platforms', skills: skills.tools, icon: '<svg viewBox="0 0 24 24"><path d="M22.7 19l-9.1-9.1c.9-2.3.4-5-1.5-6.9-2-2-5-2.4-7.4-1.3L9 6 6 9 1.6 4.7C.4 7.1.9 10.1 2.9 12.1c1.9 1.9 4.6 2.4 6.9 1.5l9.1 9.1c.4.4 1 .4 1.4 0l2.3-2.3c.5-.4.5-1.1.1-1.4z" fill="currentColor"/></svg>' }
    ];

    let html = '';
    categories.forEach(category => {
      if (!category.skills || category.skills.length === 0) return;
      html += `
        <div class="skills-category">
          <h3 class="skills-category-title">
            <span class="category-icon" aria-hidden="true">${category.icon}</span>
            ${category.title}
            <span class="skill-count">${category.skills.length}</span>
          </h3>
          <div class="skills-category-grid">
            ${category.skills.map(skill => `
                <span class="skill-tag" data-skill="${skill}">
                  ${skillIconHTML(skill)}
                  <span class="skill-name">${skill}</span>
                </span>`).join('')}
          </div>
        </div>`;
    });
    elements.skillsGrid.innerHTML = html;
  }

  // ---- Experience ----------------------------------------------------------
  function monogramFor(company) {
    const c = company.toLowerCase();
    if (c.includes('nxp')) return 'NXP';
    if (c.includes('greatech')) return 'GTI';
    if (c.includes('aerodyne')) return 'AER';
    return company.split(/\s+/).slice(0, 3).map(w => w[0]).join('').toUpperCase();
  }

  function resultFor(company) {
    const c = company.toLowerCase();
    if (c.includes('nxp')) return { text: '>99.6% QFN yield', highlight: true };
    if (c.includes('greatech')) return { text: 'HALCON pharmaceutical vision systems', highlight: false };
    if (c.includes('aerodyne')) return { text: 'YOLOv8 real-time defect classification', highlight: false };
    return null;
  }

  function formatPeriod(period) {
    return '[' + period.replace(/\s*-\s*Present/i, ' → now').replace(/\s*-\s*/, ' → ') + ']';
  }

  function renderExperience(experience) {
    const items = experience.map((exp, index) => {
      const result = resultFor(exp.company);
      const resultLine = result
        ? `<div class="timeline-result mono ${result.highlight ? 'is-highlight' : ''}">${result.text}</div>`
        : '';
      return `
        <div class="timeline-item" data-role-index="${index}">
          <span class="timeline-monogram">${monogramFor(exp.company)}</span>
          <div class="timeline-header">
            <div>
              <h3 class="timeline-title">${exp.title}</h3>
              <span class="timeline-company">${exp.company}</span>
            </div>
            <span class="timeline-period">${formatPeriod(exp.period)}</span>
          </div>
          ${resultLine}
          <ul class="timeline-highlights">
            ${exp.highlights.slice(0, 3).map(h => `<li>${h}</li>`).join('')}
          </ul>
        </div>`;
    }).join('');
    elements.experienceTimeline.innerHTML = `<span class="signal-trace" aria-hidden="true"></span>${items}`;
  }

  // ---- Projects ------------------------------------------------------------
  // Real metrics only (sourced from portfolio.json) — no fabrication.
  function projectMeta(title) {
    const t = title.toLowerCase();
    if (t.includes('rag chatbot')) return { confidence: 'rag-bot · GLM-4.7-Flash', status: 'Live', featured: true };
    if (t.includes('food image classification')) return { confidence: 'food-cls · 95% acc', status: 'Live' };
    if (t.includes('biometric fingerprint')) return { confidence: 'auth · $5k saved', status: 'Demo' };
    if (t.includes('storage management')) return { confidence: 'inventory · −90% err', status: 'Case study' };
    if (t.includes('dental caries')) return { confidence: 'caries · 80% acc', status: 'Demo' };
    return { confidence: null, status: 'Case study' };
  }

  function renderProjects(projects) {
    const corners = '<span class="card-detect" aria-hidden="true"><i class="db-corner tl"></i><i class="db-corner tr"></i><i class="db-corner bl"></i><i class="db-corner br"></i></span>';

    const html = projects.map(project => {
      const t = project.title.toLowerCase();
      const meta = projectMeta(project.title);
      const isRagChatbot = t.includes('rag chatbot');
      const isFoodClassification = t.includes('food image classification');
      const isBiometricProject = t.includes('biometric fingerprint');
      const isDentalProject = t.includes('dental caries');

      let button = '';
      if (isRagChatbot) {
        button = `
          <div class="project-preview">
            <button class="preview-button primary" onclick="openChatFromProject()" title="Try the chatbot">
              <svg viewBox="0 0 24 24" width="18" height="18"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" fill="currentColor"/></svg>
              <span>Try Live Demo</span>
            </button>
          </div>`;
      } else if (isFoodClassification) {
        button = `
          <div class="project-preview">
            <a href="https://food-image-classification.streamlit.app" target="_blank" rel="noopener noreferrer" class="preview-button primary preview-link-btn" title="Open Streamlit app">
              <svg viewBox="0 0 24 24" width="18" height="18"><path d="M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z" fill="currentColor"/></svg>
              <span>Open Live App</span>
            </a>
          </div>`;
      } else if (isBiometricProject) {
        button = `
          <div class="project-preview">
            <button class="preview-button ghost preview-video-btn" onclick="openVideoPreview('face-recognition')" title="Watch demo video">
              <svg viewBox="0 0 24 24" width="18" height="18"><path d="M8 5v14l11-7z" fill="currentColor"/></svg>
              <span>Watch Demo Video</span>
            </button>
          </div>`;
      } else if (isDentalProject) {
        button = `
          <div class="project-preview">
            <button class="preview-button ghost preview-video-btn" onclick="openVideoPreview('dental-caries')" title="Watch demo video">
              <svg viewBox="0 0 24 24" width="18" height="18"><path d="M8 5v14l11-7z" fill="currentColor"/></svg>
              <span>Watch Demo Video</span>
            </button>
          </div>`;
      }

      const confidenceTag = meta.confidence ? `<span class="confidence-tag mono">${meta.confidence}</span>` : '';

      return `
        <div class="project-card">
          ${corners}
          <div class="project-header">
            <span class="status-pill mono" data-status="${meta.status}">${meta.status}</span>
            <div class="project-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24"><path d="M20 6h-8l-2-2H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm0 12H4V8h16v10z" fill="currentColor"/></svg>
            </div>
            ${confidenceTag}
            <h3 class="project-title">${project.title}</h3>
            <span class="project-date mono">${project.date}</span>
          </div>
          <div class="project-body">
            <p class="project-description">${project.description}</p>
            <ul class="project-highlights">
              ${project.highlights.slice(0, 2).map(h => `<li>${h}</li>`).join('')}
            </ul>
            <div class="project-tech">
              ${project.technologies.slice(0, 4).map(tech => `<span class="tech-tag">${tech}</span>`).join('')}
            </div>
            ${button}
          </div>
        </div>`;
    }).join('');
    elements.projectsGrid.innerHTML = html;
  }

  function renderEducation(education) {
    elements.educationContent.innerHTML = education.map(edu => `
      <div class="education-item">
        <div class="education-degree">${edu.degree}</div>
        <div class="education-school">${edu.institution}</div>
        <div class="education-period">${edu.period}</div>
      </div>`).join('');
  }

  function renderCertificates(certificates) {
    elements.certificatesContent.innerHTML = certificates.slice(0, 3).map(cert => `
      <div class="certificate-item">
        <div class="certificate-name">${cert.name}</div>
        <div class="certificate-issuer">${cert.issuer}</div>
        <div class="certificate-date">${cert.date}</div>
      </div>`).join('');
  }

  function renderAwards(awards) {
    elements.awardsContent.innerHTML = awards.slice(0, 3).map(award => `
      <div class="award-item">
        <div class="award-name">${award.name}</div>
        <div class="award-issuer">${award.issuer}</div>
        <div class="award-year">${award.year}</div>
      </div>`).join('');
  }

  function renderContact(personal) {
    const handle = (personal.linkedin || '').replace(/^https?:\/\/(www\.)?linkedin\.com\//, '');
    elements.contactLinks.innerHTML = `
      <a href="mailto:${personal.email}" class="contact-item primary">
        <div class="contact-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg></div>
        <span class="contact-tag">EMAIL</span>
        <span class="contact-label">${personal.email}</span>
      </a>
      <a href="tel:${personal.phone}" class="contact-item">
        <div class="contact-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg></div>
        <span class="contact-tag">PHONE</span>
        <span class="contact-label">${personal.phone}</span>
      </a>
      <a href="${personal.linkedin}" target="_blank" rel="noopener noreferrer" class="contact-item">
        <div class="contact-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg></div>
        <span class="contact-tag">LINKEDIN</span>
        <span class="contact-label">${handle || 'LinkedIn'}</span>
      </a>`;
  }

  // ---- Scroll reveal + one-shot section triggers ---------------------------
  function setupReveal() {
    const windows = Array.from(document.querySelectorAll('.macos-window'));
    if (prefersReducedMotion || !('IntersectionObserver' in window)) {
      windows.forEach(w => w.classList.add('in-view'));
      return;
    }
    const observer = new IntersectionObserver((entries, obs) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
          if (entry.target.id === 'about') runCountUp(entry.target);
          obs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    windows.forEach(w => observer.observe(w));

    // Safety net: reveal anything still hidden after load.
    window.addEventListener('load', () => {
      setTimeout(() => windows.forEach(w => w.classList.add('in-view')), 2500);
    });
  }

  // Apply the reserved amber highlight to percentage stats at load — independent
  // of the count-up animation, so it holds under prefers-reduced-motion too.
  function markHighlightStats() {
    document.querySelectorAll('.stat-value').forEach(el => {
      if (el.textContent.includes('%')) {
        const card = el.closest('.stat-card');
        if (card) card.classList.add('is-highlight');
      }
    });
  }

  // ---- Stat count-up -------------------------------------------------------
  function runCountUp(scope) {
    if (prefersReducedMotion) return;
    scope.querySelectorAll('.stat-value').forEach(el => {
      if (el.dataset.counted) return;
      const raw = el.textContent.trim();
      const match = raw.match(/^([\d.]+)(.*)$/);
      if (!match) return;
      el.dataset.counted = '1';
      const target = parseFloat(match[1]);
      const suffix = match[2];
      const decimals = (match[1].split('.')[1] || '').length;
      const card = el.closest('.stat-card');
      const duration = 1400;
      const start = performance.now();
      function tick(now) {
        const p = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        el.textContent = (target * eased).toFixed(decimals) + suffix;
        if (p < 1) {
          requestAnimationFrame(tick);
        } else {
          el.textContent = raw; // restore exact original string
          if (card && card.classList.contains('is-highlight')) {
            card.classList.add('flash');
            setTimeout(() => card.classList.remove('flash'), 700);
          }
        }
      }
      requestAnimationFrame(tick);
    });
  }

  // ---- Cursor spotlight on project cards (desktop only) --------------------
  function setupSpotlight() {
    if (!finePointer || prefersReducedMotion) return;
    document.addEventListener('mousemove', (e) => {
      const card = e.target.closest && e.target.closest('.project-card');
      if (!card) return;
      requestAnimationFrame(() => {
        const r = card.getBoundingClientRect();
        card.style.setProperty('--mx', (e.clientX - r.left) + 'px');
        card.style.setProperty('--my', (e.clientY - r.top) + 'px');
      });
    });
  }

  // ---- Touch reveal of project "detection" payoff --------------------------
  function setupTouchProjectReveal() {
    if (finePointer || prefersReducedMotion || !('IntersectionObserver' in window)) return;
    const obs = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view-card');
          obs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.55 });
    document.querySelectorAll('.project-card').forEach(c => obs.observe(c));
  }

  // ---- Layer 3: gated neural-graph background canvas -----------------------
  function initBgCanvas() {
    const canvas = document.getElementById('bgCanvas');
    if (!canvas) return;
    const eligible = !prefersReducedMotion
      && finePointer
      && (navigator.hardwareConcurrency || 4) >= 4
      && window.innerWidth >= 768;
    if (!eligible) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w, h, nodes, running = true, lastDraw = 0;

    function accentColor() {
      return getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#00E5C7';
    }
    let color = accentColor();

    function resize() {
      w = window.innerWidth; h = window.innerHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.min(28, Math.round(w * h / 52000));
      nodes = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.18,
        vy: (Math.random() - 0.5) * 0.18
      }));
    }

    function draw(now) {
      if (!running) return;
      requestAnimationFrame(draw);
      if (now - lastDraw < 33) return; // ~30fps
      lastDraw = now;
      ctx.clearRect(0, 0, w, h);
      for (const n of nodes) {
        n.x += n.vx; n.y += n.vy;
        if (n.x < 0 || n.x > w) n.vx *= -1;
        if (n.y < 0 || n.y > h) n.vy *= -1;
      }
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const dist = Math.hypot(dx, dy);
          if (dist < 130) {
            ctx.globalAlpha = (1 - dist / 130) * 0.16;
            ctx.strokeStyle = color;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.stroke();
          }
        }
      }
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = color;
      for (const n of nodes) {
        ctx.beginPath();
        ctx.arc(n.x, n.y, 1.4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    resize();
    canvas.classList.add('on');
    requestAnimationFrame(draw);

    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(resize, 200);
    });
    document.addEventListener('visibilitychange', () => {
      running = !document.hidden;
      if (running) requestAnimationFrame(draw);
    });
    // stop drawing if the user enables reduced-motion after load
    const rmq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onReducedMotion = (m) => {
      if (m.matches) { running = false; canvas.classList.remove('on'); }
      else { running = true; canvas.classList.add('on'); requestAnimationFrame(draw); }
    };
    if (rmq.addEventListener) rmq.addEventListener('change', onReducedMotion);
    else if (rmq.addListener) rmq.addListener(onReducedMotion);
    // re-read accent if theme switches
    if (elements.themeToggle) {
      elements.themeToggle.addEventListener('click', () => setTimeout(() => { color = accentColor(); }, 60));
    }
  }

  // ---- Dock + smooth scroll ------------------------------------------------
  function handleDockNavigation() {
    const dockItems = document.querySelectorAll('.dock-item');
    const sections = document.querySelectorAll('section[id]');
    let ticking = false;

    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const scrollY = window.pageYOffset;
        sections.forEach(section => {
          const sectionTop = section.offsetTop - 150;
          if (scrollY >= sectionTop && scrollY < sectionTop + section.offsetHeight) {
            const id = section.getAttribute('id');
            dockItems.forEach(item => item.classList.toggle('active', item.getAttribute('href') === `#${id}`));
          }
        });
        ticking = false;
      });
    }
    window.addEventListener('scroll', onScroll, { passive: true });

    dockItems.forEach(item => {
      item.addEventListener('click', function(e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
  }

  function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', function(e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) target.scrollIntoView({ behavior: 'smooth' });
      });
    });
  }

  // ---- Mouse-tracking spotlight (whole-page, follows cursor) ---------------
  function setupGlobalSpotlight() {
    if (prefersReducedMotion || !finePointer) return;
    const spot = document.createElement('div');
    spot.className = 'spotlight';
    spot.setAttribute('aria-hidden', 'true');
    document.body.appendChild(spot);
    let raf = null, x = window.innerWidth / 2, y = window.innerHeight * 0.3;
    window.addEventListener('mousemove', (e) => {
      x = e.clientX; y = e.clientY;
      if (!raf) raf = requestAnimationFrame(() => {
        raf = null;
        spot.style.setProperty('--sx', x + 'px');
        spot.style.setProperty('--sy', y + 'px');
      });
    }, { passive: true });
  }

  // ---- 3D tilt-on-hover for cards ------------------------------------------
  function bindTilt(el) {
    const isProject = el.classList.contains('project-card');
    const max = isProject ? 6 : 8;          // degrees
    const lift = isProject ? 6 : 4;         // px
    let raf = null, rx = 0, ry = 0;
    el.style.transformStyle = 'preserve-3d';
    el.addEventListener('mousemove', (e) => {
      const r = el.getBoundingClientRect();
      const cx = (e.clientX - r.left) / r.width - 0.5;
      const cy = (e.clientY - r.top) / r.height - 0.5;
      rx = -cy * max; ry = cx * max;
      if (!raf) raf = requestAnimationFrame(() => {
        raf = null;
        el.style.transform = `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg) translateY(-${lift}px)`;
      });
    });
    el.addEventListener('mouseleave', () => { el.style.transform = ''; });
  }
  function setupTilt() {
    if (prefersReducedMotion || !finePointer) return;
    document.querySelectorAll('.project-card, .stat-card, .contact-item').forEach(bindTilt);
  }

  // ---- Init ----------------------------------------------------------------
  async function init() {
    const data = await fetchPortfolioData();
    if (data) {
      renderHero(data.personal);
      renderAbout(data.personal);
      renderSkills(data.skills);
      renderExperience(data.experience);
      renderProjects(data.projects);
      renderEducation(data.education);
      renderCertificates(data.certificates);
      renderAwards(data.awards);
      renderContact(data.personal);
    } else {
      console.error('Failed to load portfolio data');
    }

    markHighlightStats();
    handleThemeToggle();
    handleDockNavigation();
    initSmoothScroll();
    setupReveal();
    setupSpotlight();
    setupGlobalSpotlight();
    setupTilt();
    setupTouchProjectReveal();
    initBgCanvas();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

// Global function to open chat from project card
function openChatFromProject() {
  if (window.openChatWidget) window.openChatWidget();
}

// Global function to open video preview modal
function openVideoPreview(videoType) {
  const modal = document.getElementById('videoModal');
  const video = document.getElementById('demoVideo');
  const videoSource = document.getElementById('videoSource');
  const videoTitle = document.getElementById('videoModalTitle');

  const videos = {
    'dental-caries': { url: 'https://pub-0396d1c2d9f348bb8a9fb783dcf9df54.r2.dev/demo/dental-caries.mp4', title: 'Dental Caries Detection Demo' },
    'face-recognition': { url: 'https://pub-0396d1c2d9f348bb8a9fb783dcf9df54.r2.dev/demo/face-recognition.mp4', title: 'Face Recognition Demo' }
  };
  const selectedVideo = videos[videoType] || videos['dental-caries'];

  if (modal && video && videoSource) {
    videoSource.src = selectedVideo.url;
    if (videoTitle) videoTitle.textContent = selectedVideo.title;
    video.load();
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    setTimeout(() => { video.play().catch(err => console.log('Video autoplay prevented:', err)); }, 300);
  }
}

function closeVideoPreview() {
  const modal = document.getElementById('videoModal');
  const video = document.getElementById('demoVideo');
  if (modal) {
    modal.classList.remove('active');
    document.body.style.overflow = '';
    if (video) { video.pause(); video.currentTime = 0; }
  }
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeVideoPreview();
});

// Chat Widget — expandable (drag-resize / minimize / maximize), animated, interactive
(function() {
  'use strict';

  const toggle = document.getElementById('chatToggle');
  const win = document.getElementById('chatWindow');
  const header = document.getElementById('chatHeader');
  const closeBtn = document.getElementById('chatClose');
  const minBtn = document.getElementById('chatMin');
  const maxBtn = document.getElementById('chatMax');
  const resizeH = document.getElementById('chatResize');
  const chatMessages = document.getElementById('chatMessages');
  const chatInput = document.getElementById('chatInput');
  const chatSend = document.getElementById('chatSend');
  const suggest = document.getElementById('chatSuggest');
  if (!win || !toggle) return;

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let isOpen = false, isTyping = false, state = 'compact';

  // ---- size / state -------------------------------------------------------
  const MINW = 320, MINH = 380;
  const maxW = () => Math.min(960, window.innerWidth - 40);
  const maxH = () => window.innerHeight - 120;
  let userSize = loadSize();
  function loadSize() { try { const s = JSON.parse(localStorage.getItem('chatSize') || 'null'); if (s && s.w && s.h) return s; } catch (e) {} return { w: 400, h: 560 }; }
  function saveSize() { localStorage.setItem('chatSize', JSON.stringify(userSize)); }
  function clampUser() { userSize.w = Math.max(MINW, Math.min(userSize.w, maxW())); userSize.h = Math.max(MINH, Math.min(userSize.h, maxH())); }

  function applySize() {
    win.classList.toggle('maximized', state === 'max');
    win.classList.toggle('minimized', state === 'min');
    if (state === 'max') {
      // centered modal — CSS (.maximized) owns position + size
      win.style.removeProperty('width');
      win.style.removeProperty('height');
    } else if (state === 'min') {
      win.style.width = userSize.w + 'px';
      win.style.height = (header.offsetHeight || 49) + 'px';
    } else {
      clampUser();
      win.style.width = userSize.w + 'px';
      win.style.height = userSize.h + 'px';
    }
    maxBtn.setAttribute('aria-label', state === 'max' ? 'Restore chat' : 'Expand chat');
  }
  function setState(s) {
    state = (state === s && s !== 'compact') ? 'compact' : s;
    applySize();
    if (state !== 'min' && !reduce) setTimeout(() => chatInput && chatInput.focus(), 60);
  }

  function open() {
    isOpen = true; state = 'compact';
    win.classList.add('open');   // display:flex via CSS
    applySize();
    toggle.style.display = 'none';
    setTimeout(() => chatInput && chatInput.focus(), reduce ? 0 : 320);
  }
  function close() {
    isOpen = false;
    win.classList.remove('open'); // display:none via CSS
    toggle.style.display = 'flex';
  }

  toggle.addEventListener('click', open);
  closeBtn.addEventListener('click', (e) => { e.stopPropagation(); close(); });
  minBtn.addEventListener('click', (e) => { e.stopPropagation(); setState('min'); });
  maxBtn.addEventListener('click', (e) => { e.stopPropagation(); setState('max'); });
  header.addEventListener('click', () => { if (state === 'min') setState('compact'); });
  window.addEventListener('resize', () => { if (isOpen) applySize(); });
  window.openChatWidget = open;

  // ---- drag-to-resize (top-left corner) -----------------------------------
  if (resizeH) {
    let sx, sy, sw, sh, dragging = false;
    resizeH.addEventListener('pointerdown', (e) => {
      if (state !== 'compact') return;
      dragging = true; sx = e.clientX; sy = e.clientY; sw = win.offsetWidth; sh = win.offsetHeight;
      win.classList.add('resizing'); resizeH.setPointerCapture(e.pointerId); e.preventDefault();
    });
    resizeH.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      userSize.w = Math.max(MINW, Math.min(sw + (sx - e.clientX), maxW()));
      userSize.h = Math.max(MINH, Math.min(sh + (sy - e.clientY), maxH()));
      win.style.width = userSize.w + 'px'; win.style.height = userSize.h + 'px';
    });
    const endDrag = () => { if (!dragging) return; dragging = false; win.classList.remove('resizing'); saveSize(); };
    resizeH.addEventListener('pointerup', endDrag);
    resizeH.addEventListener('pointercancel', endDrag);
  }

  // ---- messaging ----------------------------------------------------------
  let sessionId = localStorage.getItem('chatSessionId') || ('session_' + Date.now() + '_' + Math.random().toString(36).slice(2, 11));
  localStorage.setItem('chatSessionId', sessionId);

  function parseMarkdown(text) {
    const esc = (str) => { const d = document.createElement('div'); d.textContent = str; return d.innerHTML; };
    let html = esc(text);
    html = html.replace(/\*\*([^*]+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/(?<!\*)\*([^*]+?)\*(?!\*)/g, '<em>$1</em>');
    html = html.replace(/\n/g, '<br>');
    return html;
  }
  function addMessage(content, type = 'user') {
    const m = document.createElement('div'); m.className = `message ${type}`;
    const c = document.createElement('div'); c.className = 'message-content';
    if (type === 'assistant') c.innerHTML = parseMarkdown(content); else c.textContent = content;
    m.appendChild(c); chatMessages.appendChild(m); chatMessages.scrollTop = chatMessages.scrollHeight;
    return m;
  }
  function showTyping() {
    isTyping = true;
    const t = document.createElement('div'); t.className = 'message assistant message-typing'; t.id = 'typingIndicator';
    t.innerHTML = '<div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div>';
    chatMessages.appendChild(t); chatMessages.scrollTop = chatMessages.scrollHeight;
  }
  function hideTyping() { isTyping = false; const t = document.getElementById('typingIndicator'); if (t) t.remove(); }
  function hideSuggest() { if (suggest) suggest.classList.add('gone'); }

  async function sendMessage(text) {
    const message = (text != null ? text : chatInput.value).trim();
    if (!message || isTyping) return;
    if (state === 'min') setState('compact');
    addMessage(message, 'user');
    chatInput.value = '';
    hideSuggest();
    showTyping();
    try {
      const r = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message, sessionId }) });
      const data = await r.json();
      if (data.sessionId) { sessionId = data.sessionId; localStorage.setItem('chatSessionId', sessionId); }
      hideTyping();
      if (data.response) addMessage(data.response, 'assistant');
    } catch (err) {
      console.error('Error sending message:', err);
      hideTyping();
      addMessage('Sorry, I hit an error reaching the assistant. Please try again.', 'assistant');
    }
  }

  if (suggest) suggest.querySelectorAll('.suggest-chip').forEach((b) => b.addEventListener('click', () => sendMessage(b.textContent)));
  if (chatSend) chatSend.addEventListener('click', () => sendMessage());
  if (chatInput) chatInput.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } });
})();
