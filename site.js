/* Progressive enhancement only: every link and image works without this file. */
(() => {
  document.documentElement.classList.add('js');

  // Mobile menu: close on Escape or outside tap.
  const menu = document.querySelector('.nav-menu');
  if (menu) {
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && menu.open) { menu.open = false; menu.querySelector('summary').focus(); } });
    document.addEventListener('pointerdown', e => { if (!menu.contains(e.target)) menu.open = false; });
    menu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => { menu.open = false; }));
  }

  // Reveal on scroll.
  const items = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const io = new IntersectionObserver(entries => {
      for (const entry of entries) if (entry.isIntersecting) { entry.target.classList.add('in'); io.unobserve(entry.target); }
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    items.forEach(el => io.observe(el));
    // The single-file edition shows pages that started hidden; re-observe them when shown.
    window.gg = { observe: root => root.querySelectorAll('.reveal:not(.in)').forEach(el => { io.unobserve(el); io.observe(el); }) };
  } else {
    items.forEach(el => el.classList.add('in'));
  }

  // Image viewer with per-gallery arrows.
  const viewer = document.getElementById('viewer');
  if (!viewer || !viewer.showModal) return;
  const img = viewer.querySelector('#viewer-image');
  const title = viewer.querySelector('#viewer-title');
  const caption = viewer.querySelector('#viewer-caption');
  const prev = viewer.querySelector('[data-prev]');
  const next = viewer.querySelector('[data-next]');
  let group = [], index = 0, opener = null;
  const paint = () => {
    const link = group[index];
    const alt = link.querySelector('img')?.alt || link.dataset.title;
    img.src = link.href; img.alt = alt;
    title.textContent = link.dataset.title;
    caption.textContent = group.length > 1 ? `${index + 1} / ${group.length} · ${alt}` : alt;
    prev.disabled = next.disabled = group.length < 2;
  };
  const step = d => { index = (index + group.length + d) % group.length; paint(); };
  document.querySelectorAll('[data-gallery]').forEach(link => link.addEventListener('click', e => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    opener = link;
    group = [...document.querySelectorAll(`[data-gallery="${link.dataset.gallery}"]`)];
    index = group.indexOf(link);
    paint();
    viewer.showModal();
    viewer.querySelector('[data-close]').focus();
  }));
  prev.addEventListener('click', () => step(-1));
  next.addEventListener('click', () => step(1));
  viewer.querySelector('[data-close]').addEventListener('click', () => viewer.close());
  viewer.addEventListener('keydown', e => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); step(e.key === 'ArrowRight' ? 1 : -1); }
  });
  viewer.addEventListener('click', e => { if (e.target === viewer) viewer.close(); });
  viewer.addEventListener('close', () => { img.removeAttribute('src'); opener?.focus({ preventScroll: true }); });
})();
