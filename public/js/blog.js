// Category filter for /blog/. Cards on the page are static HTML (crawlable without JS).
// Picking a category loads every matching post from /blog/posts-index.json, so the filter
// spans all pages rather than only the 20 cards rendered on the current one.
// Also honours /blog/?category=<slug> so a post's category link lands on a filtered view.
document.addEventListener('DOMContentLoaded', () => {
  const buttons = document.querySelectorAll('.blg-filter-btn');
  const grid = document.querySelector('.blg-hub-grid');
  if (!buttons.length || !grid) return;

  const pager = document.querySelector('.blg-pagination');
  const originalGrid = grid.innerHTML;
  const norm = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '_');
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = (iso) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
  let posts = null;

  const labelFor = {};
  buttons.forEach((b) => { labelFor[norm(b.dataset.filter)] = b.textContent.trim(); });

  function setActive(btn) {
    buttons.forEach((b) => b.classList.remove('is-active'));
    btn.classList.add('is-active');
  }

  async function apply(btn) {
    setActive(btn);
    const filter = btn.dataset.filter;
    if (filter === 'all') {
      grid.innerHTML = originalGrid;
      if (pager) pager.style.display = '';
      return;
    }
    try {
      if (!posts) posts = await (await fetch('/blog/posts-index.json')).json();
    } catch (e) {
      // Fall back to filtering whatever cards are on this page.
      grid.querySelectorAll('.blg-card').forEach((c) => { c.style.display = norm(c.dataset.category) === norm(filter) ? '' : 'none'; });
      return;
    }
    const want = norm(filter);
    grid.innerHTML = posts.filter((p) => norm(p.category) === want).map((p) => `
    <a class="blg-card" href="${esc(p.url)}" data-category="${esc(p.category)}">
      <h3>${esc(p.title)}</h3>
      <span class="blg-card-meta"><span class="blg-card-cat">${esc(labelFor[want] || p.category)}</span> <span class="lrn-sep">·</span> <time datetime="${esc(p.published)}">${fmt(p.published)}</time></span>
      <p>${esc(p.excerpt)}</p>
    </a>`).join('');
    if (pager) pager.style.display = 'none';
  }

  buttons.forEach((btn) => btn.addEventListener('click', () => apply(btn)));

  const wanted = new URLSearchParams(location.search).get('category');
  if (wanted) {
    const match = [...buttons].find((b) => norm(b.dataset.filter) === norm(wanted));
    if (match) apply(match);
  }
});
