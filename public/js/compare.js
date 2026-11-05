// Comparison page: one question -> POST /api/compare -> two answer panels.
(function () {
  const form = document.getElementById('askForm');
  const input = document.getElementById('question');
  const btn = document.getElementById('askBtn');
  const status = document.getElementById('status');
  const panels = { hybrid_rag: document.getElementById('panelA'), structure_rag: document.getElementById('panelB') };

  function esc(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

  // Light markdown + turn [section.id] citations into small chips.
  function render(text) {
    let html = esc(text);
    html = html.replace(/\*\*([^*]+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\[([a-z0-9_]+(?:\.[a-z0-9_]+)+)\]/g, '<span class="cite" title="Source section">$1</span>');
    return html.replace(/\n/g, '<br>');
  }

  function setPanel(panel, r, sourceVersion) {
    const answer = panel.querySelector('.answer');
    const meta = panel.querySelector('.meta');
    const list = panel.querySelector('.evidence ol');
    answer.classList.remove('loading');
    answer.classList.toggle('refusal', /^\s*not supported/i.test(r.answer || ''));
    answer.innerHTML = render(r.answer || '');
    const ids = r.selected_leaf_ids || r.retrieved_ids || [];
    const bits = [
      `<span><b>${(r.latency_ms / 1000).toFixed(1)} s</b> response</span>`,
      `<span><b>${r.tokens}</b> tokens</span>`,
      `<span>${r.selected_leaf_ids ? 'sections chosen' : 'sections retrieved'}: <b>${ids.length}</b></span>`,
      `<span>knowledge base <b>${esc(sourceVersion)}</b></span>`,
    ];
    if (r.router && r.router !== 'llm') bits.push('<span>router fell back to embedding search</span>');
    if (r.invalidCitations && r.invalidCitations.length) bits.push(`<span>${r.invalidCitations.length} invalid citation(s) removed</span>`);
    meta.innerHTML = bits.join('');
    list.innerHTML = (r.evidence || []).map(e =>
      `<li><span class="path">${esc(e.section_id)} · ${esc(e.path)}</span>${esc(e.text)}</li>`).join('');
  }

  function setLoading() {
    Object.values(panels).forEach(p => {
      const a = p.querySelector('.answer');
      a.classList.add('loading');
      a.classList.remove('refusal');
      a.textContent = 'Retrieving evidence and writing an answer…';
      p.querySelector('.meta').innerHTML = '';
      p.querySelector('.evidence ol').innerHTML = '';
      p.querySelector('.evidence').open = false;
    });
  }

  async function ask(question) {
    btn.disabled = true;
    status.classList.remove('error');
    status.textContent = 'Both bots are working on the same question…';
    setLoading();
    try {
      const res = await fetch('/api/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'The comparison could not run right now. Please try again.');
      setPanel(panels.hybrid_rag, data.results.hybrid_rag, data.source_version);
      setPanel(panels.structure_rag, data.results.structure_rag, data.source_version);
      status.textContent = 'Done. Open “Evidence” to see what each bot was given.';
    } catch (e) {
      status.classList.add('error');
      status.textContent = e.message;
      Object.values(panels).forEach(p => { const a = p.querySelector('.answer'); a.classList.remove('loading'); a.textContent = ''; });
    } finally {
      btn.disabled = false;
    }
  }

  form.addEventListener('submit', e => {
    e.preventDefault();
    const q = input.value.trim();
    if (q) ask(q);
  });
  document.getElementById('examples').addEventListener('click', e => {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    input.value = chip.textContent;
    ask(input.value);
  });
})();
