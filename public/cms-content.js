(function () {
  const grid = document.querySelector('.content-grid');
  if (!grid) return;

  const esc = s => String(s || '').replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

  function render(posts) {
    if (!posts.length) return;
    grid.innerHTML = posts.map(p => {
      const tags = Array.isArray(p.tags) ? p.tags : [];
      const cat  = tags[0] || 'Conteúdo';
      const kind = tags[1] || 'Ensaio';
      const mins = (p.read_minutes || 1).toString().padStart(2, '0') + ' min';
      const bg   = p.image_url
        ? `style="background-image:url('${esc(p.image_url)}');background-size:cover;background-position:center;"`
        : '';
      return `
        <a class="article" href="/article.html?id=${esc(p.id)}">
          <div class="thumb" ${bg}><span class="cat">${esc(cat)}</span></div>
          <h3>${esc(p.title)}</h3>
          <div class="meta"><span>${esc(kind)}</span><span>${esc(mins)}</span></div>
        </a>`;
    }).join('');
  }

  fetch('/api/posts?limit=6', { headers: { accept: 'application/json' } })
    .then(r => r.ok ? r.json() : null)
    .then(d => { if (d && d.posts) render(d.posts); })
    .catch(() => {});
})();
