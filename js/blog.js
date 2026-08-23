// Client-side category filter for /blog/. Pure progressive enhancement — every card
// is already in the static HTML and crawlable without JS; this only toggles visibility.
document.addEventListener('DOMContentLoaded', () => {
  const buttons = document.querySelectorAll('.blg-filter-btn');
  const cards = document.querySelectorAll('.blg-card');

  buttons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const filter = btn.dataset.filter;

      buttons.forEach((b) => b.classList.remove('is-active'));
      btn.classList.add('is-active');

      cards.forEach((card) => {
        const show = filter === 'all' || card.dataset.category === filter;
        card.style.display = show ? '' : 'none';
      });
    });
  });
});
