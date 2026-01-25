// Portfolio SPA Application - macOS Style
(function() {
  'use strict';

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

  // Set current year
  elements.currentYear.textContent = new Date().getFullYear();

  // Update menu bar time and date
  function updateMenuBar() {
    const now = new Date();
    const timeOptions = { hour: 'numeric', minute: '2-digit', hour12: true };
    const dateOptions = { weekday: 'short', month: 'short', day: 'numeric' };

    elements.menuTime.textContent = now.toLocaleTimeString('en-US', timeOptions);
    elements.menuDate.textContent = now.toLocaleDateString('en-US', dateOptions);
  }

  // Update time every minute
  updateMenuBar();
  setInterval(updateMenuBar, 60000);

  // Theme toggle functionality
  function initTheme() {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    if (savedTheme) {
      document.documentElement.setAttribute('data-theme', savedTheme);
    } else if (!prefersDark) {
      document.documentElement.setAttribute('data-theme', 'light');
    }
  }

  function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';

    document.documentElement.setAttribute('data-theme', newTheme === 'dark' ? '' : 'light');
    localStorage.setItem('theme', newTheme);
  }

  function handleThemeToggle() {
    if (elements.themeToggle) {
      elements.themeToggle.addEventListener('click', toggleTheme);
    }
  }

  // Initialize theme immediately
  initTheme();

  // Fetch portfolio data
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

  // Render hero section
  function renderHero(personal) {
    elements.heroName.textContent = personal.name;
    typeWriter(elements.heroTitle, personal.title);
    elements.heroLocation.textContent = personal.location;
  }

  // Typewriter effect
  function typeWriter(element, text, speed = 40) {
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

  // Render about section
  function renderAbout(personal) {
    elements.aboutText.textContent = personal.summary;
  }

  // Skill icons mapping with brand colors
  const skillData = {
    'Python': { icon: '<svg viewBox="0 0 24 24"><path fill="#3776AB" d="M14.25.18l.9.2.73.26.59.3.45.32.34.34.25.34.16.33.1.3.04.26.02.2-.01.13V8.5l-.05.63-.13.55-.21.46-.26.38-.3.31-.33.25-.35.19-.35.14-.33.1-.3.07-.26.04-.21.02H8.77l-.69.05-.59.14-.5.22-.41.27-.33.32-.27.35-.2.36-.15.37-.1.35-.07.32-.04.27-.02.21v3.06H3.17l-.21-.03-.28-.07-.32-.12-.35-.18-.36-.26-.36-.36-.35-.46-.32-.59-.28-.73-.21-.88-.14-1.05-.05-1.23.06-1.22.16-1.04.24-.87.32-.71.36-.57.4-.44.42-.33.42-.24.4-.16.36-.1.32-.05.24-.01h.16l.06.01h8.16v-.83H6.18l-.01-2.75-.02-.37.05-.34.11-.31.17-.28.25-.26.31-.23.38-.2.44-.18.51-.15.58-.12.64-.1.71-.06.77-.04.84-.02 1.27.05z"/><path fill="#FFD43B" d="M14.25.18l.9.2.73.26.59.3.45.32.34.34.25.34.16.33.1.3.04.26.02.2-.01.13V8.5l-.05.63-.13.55-.21.46-.26.38-.3.31-.33.25-.35.19-.35.14-.33.1-.3.07-.26.04-.21.02H8.77l-.69.05-.59.14-.5.22-.41.27-.33.32-.27.35-.2.36-.15.37-.1.35-.07.32-.04.27-.02.21v3.06H3.17l-.21-.03-.28-.07-.32-.12-.35-.18-.36-.26-.36-.36-.35-.46-.32-.59-.28-.73-.21-.88-.14-1.05-.05-1.23.06-1.22.16-1.04.24-.87.32-.71.36-.57.4-.44.42-.33.42-.24.4-.16.36-.1.32-.05.24-.01h.16l.06.01h8.16v-.83H6.18l-.01-2.75-.02-.37.05-.34.11-.31.17-.28.25-.26.31-.23.38-.2.44-.18.51-.15.58-.12.64-.1.71-.06.77-.04.84-.02 1.27.05z" transform="translate(0,12) scale(1,-1)"/></svg>', color: '#3776AB' },
    'JavaScript': { icon: '<svg viewBox="0 0 24 24"><path fill="#F7DF1E" d="M0 0h24v24H0V0z"/><path fill="#000" d="M22.034 18.276c-.175-1.095-.888-2.015-3.003-2.873-.736-.345-1.554-.585-1.797-1.14-.091-.33-.105-.51-.046-.705.15-.646.915-.84 1.515-.66.39.12.75.42.976.9 1.034-.676 1.034-.676 1.755-1.125-.27-.42-.404-.601-.586-.78-.63-.705-1.469-1.065-2.834-1.034l-.705.089c-.676.165-1.32.525-1.71 1.005-1.14 1.291-.811 3.541.569 4.471 1.365 1.02 3.361 1.244 3.616 2.205.24 1.17-.87 1.545-1.966 1.41-.811-.18-1.26-.586-1.755-1.336l-1.83 1.051c.21.48.45.689.81 1.109 1.74 1.756 6.09 1.666 6.871-1.004.029-.09.24-.705.074-1.65z"/></svg>', color: '#F7DF1E' },
    'C#': { icon: '<svg viewBox="0 0 24 24"><rect width="24" height="24" rx="12" fill="#9B4F96"/><path fill="#fff" d="M12 6.5c1.5 0 2.5.5 3 1.2v2.3c-.7-.4-1.6-.6-2.5-.6-1.3 0-2.3.7-2.7 1.8-.4 1.2-.2 2.6.7 3.5.8.7 2 .7 2.8.2v2.3c-.7.5-1.7.8-2.8.8-2 0-3.5-1.3-3.5-3.5 0-2 1.5-3.5 3.5-3.5z"/></svg>', color: '#9B4F96' },
    'C/C++': { icon: '<svg viewBox="0 0 24 24"><rect width="24" height="24" rx="12" fill="#00599C"/><path fill="#fff" d="M12 7.5L7.5 12l4.5 4.5 4.5-4.5L12 7.5zm0 2.5l2 2-2 2-2-2 2-2z"/></svg>', color: '#00599C' },
    'PyTorch': { icon: '<svg viewBox="0 0 24 24"><path fill="#EE4C2C" d="M12.005 0L4.952 7.053a9.865 9.865 0 000 14.022 9.866 9.866 0 0014.022 0c3.984-3.9 3.986-10.205.085-14.023l-1.744 1.743c2.904 2.905 2.904 7.634 0 10.538s-7.634 2.904-10.538 0-2.904-7.634 0-10.538l4.647-4.646.583-.665z"/></svg>', color: '#EE4C2C' },
    'TensorFlow': { icon: '<svg viewBox="0 0 24 24"><rect width="24" height="24" rx="12" fill="#FF6F00"/><path fill="#fff" d="M12.5 4L5 8v8l7.5 4 7.5-4V8L12.5 4zm-1 2.5l5 2.7-5 2.8-5-2.8 5-2.7zm0 6.3l5-2.8v5.6l-5 2.8v-5.6zm-6-2.1l5 2.8v5.6l-5-2.8v-5.6z"/></svg>', color: '#FF6F00' },
    'OpenCV': { icon: '<svg viewBox="0 0 24 24"><rect width="24" height="24" rx="4" fill="#5E3178"/><circle cx="12" cy="12" r="4" fill="#fff"/><path fill="#fff" d="M12 4a8 8 0 100 16 8 8 0 000-16zm0 14a6 6 0 110-12 6 6 0 010 12z"/></svg>', color: '#5E3178' },
    'Docker': { icon: '<svg viewBox="0 0 24 24"><path fill="#2496ED" d="M13.983 11.078h2.119a.186.186 0 00.186-.185V9.006a.186.186 0 00-.186-.186h-2.119a.185.185 0 00-.185.185v1.888c0 .102.083.185.185.185m-2.954-5.43h2.118a.186.186 0 00.186-.186V3.574a.186.186 0 00-.186-.185h-2.118a.185.185 0 00-.185.185v1.888c0 .102.082.185.185.186m2.954 2.715h2.119a.185.185 0 00.185-.186V6.278a.186.186 0 00-.185-.186h-2.119a.186.186 0 00-.186.186v1.888c0 .102.083.185.186.186m-2.954-2.715h2.118a.186.186 0 00.186-.186V3.574a.186.186 0 00-.186-.185h-2.118a.185.185 0 00-.185.185v1.888c0 .102.082.185.185.186m-2.93 0h2.12a.185.185 0 00.184-.185V3.574a.185.185 0 00-.184-.185h-2.12a.185.185 0 00-.184.185v1.888c0 .102.082.185.185.186m5.884 5.43h2.119a.185.185 0 00.185-.185V9.006a.186.186 0 00-.185-.186h-2.119a.186.186 0 00-.186.186v1.888c0 .102.083.185.186.185m-2.954 0h2.118a.186.186 0 00.186-.185V9.006a.186.186 0 00-.186-.186h-2.118a.186.186 0 00-.186.186v1.888c0 .102.083.185.186.185m-2.93 0h2.12a.186.186 0 00.184-.185V9.006a.186.186 0 00-.184-.186h-2.12a.185.185 0 00-.184.186v1.888c0 .102.082.185.184.185m-2.964 0h2.119a.186.186 0 00.186-.185V9.006a.186.186 0 00-.186-.186H6.034a.186.186 0 00-.186.186v1.888c0 .102.083.185.186.185m-2.885 5.43H23.91a1.09 1.09 0 00.267-.035c.23-.065.436-.204.595-.393a1.22 1.22 0 00.273-.769c0-.221-.06-.434-.166-.617a1.222 1.222 0 00-.652-.523 1.18 1.18 0 00-.317-.06H3.15c-.253 0-.492.082-.687.23a1.235 1.235 0 00-.462.938c0 .23.07.447.192.635.122.189.295.333.497.422.151.067.313.102.477.102z"/></svg>', color: '#2496ED' },
    'Git': { icon: '<svg viewBox="0 0 24 24"><path fill="#F05032" d="M23.546 10.93L13.067.452c-.604-.603-1.582-.603-2.188 0L8.708 2.627l2.76 2.76c.645-.215 1.379-.07 1.889.441.516.515.658 1.258.438 1.9l2.658 2.66c.645-.223 1.387-.078 1.9.435.721.72.721 1.884 0 2.604-.719.719-1.881.719-2.6 0-.539-.541-.674-1.337-.404-1.996L12.86 8.955v6.525c.176.086.342.203.488.348.713.721.713 1.883 0 2.6-.719.721-1.889.721-2.609 0-.719-.719-.719-1.879 0-2.598.182-.18.387-.316.605-.406V8.835c-.217-.091-.424-.222-.6-.401-.545-.545-.676-1.342-.396-2.009L7.636 3.7.45 10.881c-.6.605-.6 1.584 0 2.189l10.48 10.477c.604.604 1.582.604 2.186 0l10.43-10.43c.605-.603.605-1.582 0-2.187"/></svg>', color: '#F05032' },
    'MySQL': { icon: '<svg viewBox="0 0 24 24"><path fill="#4479A1" d="M12 6c-4.418 0-8 1.343-8 3s3.582 3 8 3 8-1.343 8-3-3.582-3-8-3zm0 7c-4.418 0-8 1.343-8 3s3.582 3 8 3 8-1.343 8-3-3.582-3-8-3zm0 7c-4.418 0-8 1.343-8 3s3.582 3 8 3 8-1.343 8-3-3.582-3-8-3z"/></svg>', color: '#4479A1' },
    'Node.js': { icon: '<svg viewBox="0 0 24 24"><path fill="#339933" d="M11.998 24c-.321 0-.641-.084-.922-.247l-2.936-1.737c-.438-.245-.224-.332-.08-.383.585-.203.703-.25 1.328-.604.065-.037.151-.023.218.017l2.256 1.339c.082.045.197.045.272 0l8.795-5.076c.082-.047.134-.141.134-.238V6.921c0-.099-.053-.192-.137-.242l-8.791-5.072c-.081-.047-.189-.047-.271 0L3.075 6.68C2.99 6.729 2.936 6.825 2.936 6.921v10.15c0 .097.054.189.139.235l2.409 1.392c1.307.654 2.108-.116 2.108-.89V7.787c0-.142.114-.253.256-.253h1.115c.139 0 .255.112.255.253v10.021c0 1.745-.95 2.745-2.604 2.745-.508 0-.909 0-2.026-.551L2.28 18.675c-.57-.329-.922-.945-.922-1.604V6.921c0-.659.353-1.275.922-1.603l8.795-5.082c.557-.315 1.296-.315 1.848 0l8.794 5.082c.57.329.924.944.924 1.603v10.15c0 .659-.354 1.273-.924 1.604l-8.794 5.078C12.643 23.916 12.324 24 11.998 24z"/></svg>', color: '#339933' },
    'Computer Vision': { icon: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#0078D4"/><circle cx="12" cy="12" r="4" fill="#fff"/></svg>', color: '#0078D4' },
    'Deep Learning': { icon: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#FF6B35"/><circle cx="12" cy="12" r="3" fill="#fff"/><circle cx="6" cy="8" r="2" fill="#fff"/><circle cx="18" cy="8" r="2" fill="#fff"/><circle cx="6" cy="16" r="2" fill="#fff"/><circle cx="18" cy="16" r="2" fill="#fff"/></svg>', color: '#FF6B35' },
    'NLP': { icon: '<svg viewBox="0 0 24 24"><rect width="24" height="24" rx="4" fill="#4285F4"/><path fill="#fff" d="M18 7H6c-1.1 0-2 .9-2 2v6c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V9c0-1.1-.9-2-2-2zm-1 8H7v-2h10v2zm0-4H7V9h10v2z"/></svg>', color: '#4285F4' },
    'LLM': { icon: '<svg viewBox="0 0 24 24"><rect width="24" height="24" rx="4" fill="#8E44AD"/><path fill="#fff" d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zm0 8c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3z"/></svg>', color: '#8E44AD' },
    'RAG': { icon: '<svg viewBox="0 0 24 24"><rect width="24" height="24" rx="4" fill="#E74C3C"/><path fill="#fff" d="M9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/></svg>', color: '#E74C3C' },
    'Generative AI': { icon: '<svg viewBox="0 0 24 24"><rect width="24" height="24" rx="4" fill="#9B59B6"/><path fill="#fff" d="M12 7l-5 5 5 5 5-5-5-5zm0 3l2 2-2 2-2-2 2-2z"/></svg>', color: '#9B59B6' },
    'YOLOv8': { icon: '<svg viewBox="0 0 24 24"><rect width="24" height="24" rx="4" fill="#EF4444"/><rect x="5" y="5" width="5" height="5" rx="1" fill="#fff"/><rect x="14" y="5" width="5" height="5" rx="1" fill="#fff"/><rect x="5" y="14" width="5" height="5" rx="1" fill="#fff"/><rect x="14" y="14" width="5" height="5" rx="1" fill="#fff"/></svg>', color: '#EF4444' },
    'Pandas': { icon: '<svg viewBox="0 0 24 24"><rect width="24" height="24" rx="4" fill="#150458"/><rect x="5" y="4" width="4" height="6" rx="1" fill="#fff"/><rect x="11" y="9" width="4" height="6" rx="1" fill="#fff"/><rect x="17" y="6" width="4" height="6" rx="1" fill="#fff"/><rect x="5" y="14" width="4" height="6" rx="1" fill="#fff"/></svg>', color: '#150458' },
    'Keras': { icon: '<svg viewBox="0 0 24 24"><rect width="24" height="24" rx="4" fill="#D00000"/><path fill="#fff" d="M8 7v10h3V7H8zm5 0v10h3V7h-3z"/></svg>', color: '#D00000' },
    'MATLAB': { icon: '<svg viewBox="0 0 24 24"><rect width="24" height="24" rx="4" fill="#E77F22"/><path fill="#fff" d="M12 7l-5 5 5 5 5-5-5-5z"/></svg>', color: '#E77F22' },
    'Arduino IDE': { icon: '<svg viewBox="0 0 24 24"><rect width="24" height="24" rx="4" fill="#00979D"/><path fill="#fff" d="M12 6l-6 6 6 6 6-6-6-6zm0 3l3 3-3 3-3-3 3-3z"/></svg>', color: '#00979D' },
    '.NET': { icon: '<svg viewBox="0 0 24 24"><rect width="24" height="24" rx="4" fill="#512BD4"/><path fill="#fff" d="M12 7l-5 5 5 5 5-5-5-5z"/></svg>', color: '#512BD4' },
    'WPF': { icon: '<svg viewBox="0 0 24 24"><rect width="24" height="24" rx="4" fill="#00BCF2"/><path fill="#fff" d="M12 7l-5 5 5 5 5-5-5-5z"/></svg>', color: '#00BCF2' },
    'WinForms': { icon: '<svg viewBox="0 0 24 24"><rect width="24" height="24" rx="4" fill="#0078D7"/><path fill="#fff" d="M12 7l-5 5 5 5 5-5-5-5z"/></svg>', color: '#0078D7' },
    'MVVM': { icon: '<svg viewBox="0 0 24 24"><rect width="24" height="24" rx="4" fill="#7B83EB"/><path fill="#fff" d="M12 7l-5 5 5 5 5-5-5-5z"/></svg>', color: '#7B83EB' },
    'Assembly Language': { icon: '<svg viewBox="0 0 24 24"><rect width="24" height="24" rx="4" fill="#6E4C13"/><path fill="#fff" d="M12 7l-5 5 5 5 5-5-5-5z"/></svg>', color: '#6E4C13' },
    'PowerFX': { icon: '<svg viewBox="0 0 24 24"><rect width="24" height="24" rx="4" fill="#742774"/><path fill="#fff" d="M12 7l-5 5 5 5 5-5-5-5z"/></svg>', color: '#742774' },
    'Oracle SQL Database': { icon: '<svg viewBox="0 0 24 24"><rect width="24" height="24" rx="4" fill="#F80000"/><ellipse cx="12" cy="8" rx="6" ry="2" fill="#fff"/><path fill="#fff" d="M6 8v4c0 1.1 2.7 2 6 2s6-.9 6-2V8M6 12v4c0 1.1 2.7 2 6 2s6-.9 6-2v-4"/></svg>', color: '#F80000' },
    'SQL Server': { icon: '<svg viewBox="0 0 24 24"><rect width="24" height="24" rx="4" fill="#CC2927"/><path fill="#fff" d="M12 7c-3.3 0-6 1.3-6 3s2.7 3 6 3 6-1.3 6-3-2.7-3-6-3zm0 7c-3.3 0-6-1.3-6-3v3c0 1.7 2.7 3 6 3s6-1.3 6-3v-3c0 1.7-2.7 3-6 3z"/></svg>', color: '#CC2927' },
    'Microsoft Graph API': { icon: '<svg viewBox="0 0 24 24"><rect width="24" height="24" rx="4" fill="#0078D4"/><path fill="#fff" d="M12 7l-5 5 5 5 5-5-5-5z"/></svg>', color: '#0078D4' },
    'REST API Development': { icon: '<svg viewBox="0 0 24 24"><rect width="24" height="24" rx="4" fill="#38B2AC"/><path fill="#fff" d="M12 7l-5 5 5 5 5-5-5-5z"/></svg>', color: '#38B2AC' },
    'Halcon': { icon: '<svg viewBox="0 0 24 24"><rect width="24" height="24" rx="4" fill="#0068B5"/><path fill="#fff" d="M12 7l-5 5 5 5 5-5-5-5z"/></svg>', color: '#0068B5' },
    'CVAT': { icon: '<svg viewBox="0 0 24 24"><rect width="24" height="24" rx="4" fill="#5C6BC0"/><path fill="#fff" d="M12 7l-5 5 5 5 5-5-5-5z"/></svg>', color: '#5C6BC0' },
    'Roboflow': { icon: '<svg viewBox="0 0 24 24"><rect width="24" height="24" rx="4" fill="#FF4D4D"/><path fill="#fff" d="M12 7l-5 5 5 5 5-5-5-5z"/></svg>', color: '#FF4D4D' },
    'Predictive Modeling': { icon: '<svg viewBox="0 0 24 24"><rect width="24" height="24" rx="4" fill="#667EEA"/><path fill="#fff" d="M12 7l-5 5 5 5 5-5-5-5z"/></svg>', color: '#667EEA' },
    'Supervised/Unsupervised Learning': { icon: '<svg viewBox="0 0 24 24"><rect width="24" height="24" rx="4" fill="#9F7AEA"/><path fill="#fff" d="M12 7l-5 5 5 5 5-5-5-5z"/></svg>', color: '#9F7AEA' },
    'Prompt Engineering': { icon: '<svg viewBox="0 0 24 24"><rect width="24" height="24" rx="4" fill="#48BB78"/><path fill="#fff" d="M12 7l-5 5 5 5 5-5-5-5z"/></svg>', color: '#48BB78' },
    'Microsoft Visual Studio 2022': { icon: '<svg viewBox="0 0 24 24"><rect width="24" height="24" rx="4" fill="#68217A"/><path fill="#fff" d="M12 7l-5 5 5 5 5-5-5-5z"/></svg>', color: '#68217A' },
    'Visual Studio Code': { icon: '<svg viewBox="0 0 24 24"><rect width="24" height="24" rx="4" fill="#007ACC"/><path fill="#fff" d="M8 7l-2 5 2 5h8l2-5-2-5H8z"/></svg>', color: '#007ACC' },
    'Microsoft Power Platform': { icon: '<svg viewBox="0 0 24 24"><rect width="24" height="24" rx="4" fill="#742774"/><path fill="#fff" d="M12 7l-5 5 5 5 5-5-5-5z"/></svg>', color: '#742774' },
    'Microsoft 365': { icon: '<svg viewBox="0 0 24 24"><rect width="24" height="24" rx="4" fill="#EA3E23"/><path fill="#fff" d="M12 7l-5 5 5 5 5-5-5-5z"/></svg>', color: '#EA3E23' },
    'Android Studio': { icon: '<svg viewBox="0 0 24 24"><rect width="24" height="24" rx="4" fill="#3DDC84"/><path fill="#fff" d="M12 6l-2 4h4l-2-4zm-4 5l-2 4h12l-2-4H8z"/></svg>', color: '#3DDC84' },
    'Google Colab': { icon: '<svg viewBox="0 0 24 24"><rect width="24" height="24" rx="4" fill="#FF9F00"/><path fill="#fff" d="M12 7l-5 5 5 5 5-5-5-5z"/></svg>', color: '#FF9F00' },
    'Jupyter Notebook': { icon: '<svg viewBox="0 0 24 24"><rect width="24" height="24" rx="4" fill="#F37626"/><path fill="#fff" d="M7 8l3 4-3 4M10 8l3 4-3 4M13 8l3 4-3 4M16 8l3 4-3 4"/></svg>', color: '#F37626' },
    'AutoCAD': { icon: '<svg viewBox="0 0 24 24"><rect width="24" height="24" rx="4" fill="#E41E26"/><path fill="#fff" d="M12 7l-5 5 5 5 5-5-5-5z"/></svg>', color: '#E41E26' },
    'SolidWorks': { icon: '<svg viewBox="0 0 24 24"><rect width="24" height="24" rx="4" fill="#E4002B"/><path fill="#fff" d="M12 7l-5 5 5 5 5-5-5-5z"/></svg>', color: '#E4002B' },
    'Adobe Illustrator': { icon: '<svg viewBox="0 0 24 24"><rect width="24" height="24" rx="4" fill="#FF9A00"/><path fill="#fff" d="M7 7l-2 5 2 5h10l2-5-2-5H7zm3 3h4l2 4-2 4h-4l-2-4 2-4z"/></svg>', color: '#FF9A00' },
    'IBM Watson': { icon: '<svg viewBox="0 0 24 24"><rect width="24" height="24" rx="4" fill="#0F62FE"/><path fill="#fff" d="M12 7l-5 5 5 5 5-5-5-5z"/></svg>', color: '#0F62FE' },
    'Raspberry Pi 4': { icon: '<svg viewBox="0 0 24 24"><rect width="24" height="24" rx="4" fill="#C51A4A"/><path fill="#fff" d="M12 7l-5 5 5 5 5-5-5-5z"/></svg>', color: '#C51A4A' },
    'SCADA': { icon: '<svg viewBox="0 0 24 24"><rect width="24" height="24" rx="4" fill="#2C3E50"/><path fill="#fff" d="M12 7l-5 5 5 5 5-5-5-5z"/></svg>', color: '#2C3E50' },
    'PLC': { icon: '<svg viewBox="0 0 24 24"><rect width="24" height="24" rx="4" fill="#34495E"/><path fill="#fff" d="M12 7l-5 5 5 5 5-5-5-5z"/></svg>', color: '#34495E' }
  };

  // Render skills by category
  function renderSkills(skills) {
    const categories = [
      { title: 'Programming', skills: skills.programming, icon: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-8 9z"/></svg>' },
      { title: 'Databases & APIs', skills: skills.databases, icon: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>' },
      { title: 'AI / Machine Learning', skills: skills.aiml, icon: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>' },
      { title: 'Tools & Platforms', skills: skills.tools, icon: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>' }
    ];

    let html = '';
    categories.forEach((category, catIndex) => {
      if (category.skills.length === 0) return;

      html += `
        <div class="skills-category fade-in" style="animation-delay: ${0.1 * catIndex}s">
          <div class="skills-category-header">
            <div class="skills-category-icon">
              ${category.icon}
            </div>
            <h3 class="skills-category-title">${category.title}</h3>
          </div>
          <div class="skills-category-grid">
            ${category.skills.map((skill, index) => {
              const skillInfo = skillData[skill] || { icon: '', color: '#666' };
              return `
                <div class="skill-card fade-in" style="animation-delay: ${0.05 * index}s">
                  <div class="skill-card-icon" style="background-color: ${skillInfo.color}">
                    ${skillInfo.icon}
                  </div>
                  <span class="skill-card-name">${skill}</span>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;
    });

    elements.skillsGrid.innerHTML = html;
  }

  // Render experience timeline
  function renderExperience(experience) {
    const html = experience.map((exp, index) => `
      <div class="timeline-item fade-in" style="animation-delay: ${0.1 * index}s">
        <div class="timeline-header">
          <div>
            <h3 class="timeline-title">${exp.title}</h3>
            <span class="timeline-company">${exp.company}</span>
          </div>
          <div>
            <span class="timeline-period">${exp.period}</span>
          </div>
        </div>
        <ul class="timeline-highlights">
          ${exp.highlights.slice(0, 3).map(h => `<li>${h}</li>`).join('')}
        </ul>
      </div>
    `).join('');
    elements.experienceTimeline.innerHTML = html;
  }

  // Render projects section
  function renderProjects(projects) {
    const html = projects.map((project, index) => `
      <div class="project-card fade-in" style="animation-delay: ${0.1 * index}s">
        <div class="project-header">
          <div class="project-icon">
            <svg viewBox="0 0 24 24"><path d="M20 6h-8l-2-2H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm0 12H4V8h16v10z" fill="currentColor"/></svg>
          </div>
          <h3 class="project-title">${project.title}</h3>
          <span class="project-date">${project.date}</span>
        </div>
        <div class="project-body">
          <p class="project-description">${project.description}</p>
          <ul class="project-highlights">
            ${project.highlights.slice(0, 2).map(h => `<li>${h}</li>`).join('')}
          </ul>
          <div class="project-tech">
            ${project.technologies.slice(0, 4).map(tech => `<span class="tech-tag">${tech}</span>`).join('')}
          </div>
        </div>
      </div>
    `).join('');
    elements.projectsGrid.innerHTML = html;
  }

  // Render education section
  function renderEducation(education) {
    const html = education.map(edu => `
      <div class="education-item">
        <div class="education-degree">${edu.degree}</div>
        <div class="education-school">${edu.institution}</div>
        <div class="education-period">${edu.period}</div>
      </div>
    `).join('');
    elements.educationContent.innerHTML = html;
  }

  // Render certificates section
  function renderCertificates(certificates) {
    const html = certificates.slice(0, 3).map(cert => `
      <div class="certificate-item">
        <div class="certificate-name">${cert.name}</div>
        <div class="certificate-issuer">${cert.issuer}</div>
        <div class="certificate-date">${cert.date}</div>
      </div>
    `).join('');
    elements.certificatesContent.innerHTML = html;
  }

  // Render awards section
  function renderAwards(awards) {
    const html = awards.slice(0, 3).map(award => `
      <div class="award-item">
        <div class="award-name">${award.name}</div>
        <div class="award-issuer">${award.issuer}</div>
        <div class="award-year">${award.year}</div>
      </div>
    `).join('');
    elements.awardsContent.innerHTML = html;
  }

  // Render contact section with icons
  function renderContact(personal) {
    const html = `
      <a href="mailto:${personal.email}" class="contact-item">
        <div class="contact-icon">
          <svg viewBox="0 0 24 24"><path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>
        </div>
        <span class="contact-label">Email</span>
      </a>
      <a href="tel:${personal.phone}" class="contact-item">
        <div class="contact-icon">
          <svg viewBox="0 0 24 24"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>
        </div>
        <span class="contact-label">Phone</span>
      </a>
      <a href="${personal.linkedin}" target="_blank" rel="noopener noreferrer" class="contact-item">
        <div class="contact-icon">
          <svg viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
        </div>
        <span class="contact-label">LinkedIn</span>
      </a>
    `;
    elements.contactLinks.innerHTML = html;
  }

  // Handle dock active state
  function handleDockNavigation() {
    const dockItems = document.querySelectorAll('.dock-item');
    const sections = document.querySelectorAll('section[id]');

    // Update active state on scroll
    window.addEventListener('scroll', () => {
      const scrollY = window.pageYOffset;

      sections.forEach(section => {
        const sectionHeight = section.offsetHeight;
        const sectionTop = section.offsetTop - 150;
        const sectionId = section.getAttribute('id');

        if (scrollY >= sectionTop && scrollY < sectionTop + sectionHeight) {
          dockItems.forEach(item => {
            item.classList.remove('active');
            if (item.getAttribute('href') === `#${sectionId}`) {
              item.classList.add('active');
            }
          });
        }
      });
    });

    // Smooth scroll for dock items
    dockItems.forEach(item => {
      item.addEventListener('click', function(e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    });
  }

  // Initialize smooth scroll
  function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', function(e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
          target.scrollIntoView({ behavior: 'smooth' });
        }
      });
    });
  }

  // Initialize the application
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

    // Initialize UI interactions
    handleThemeToggle();
    handleDockNavigation();
    initSmoothScroll();
  }

  // Start the application when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
