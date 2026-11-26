/* Progressive enhancement only: every link and image works without this file. */
(() => {
  document.documentElement.classList.add('js');

  // The masthead menus retain native details/summary keyboard behavior.
  document.querySelectorAll('.nav-menu, .nav-games').forEach(menu => {
    const summary = menu.querySelector('summary');
    menu.addEventListener('keydown', e => {
      if (e.key === 'Escape' && menu.open) {
        menu.open = false;
        summary.focus();
      }
    });
    menu.addEventListener('focusout', e => {
      if (e.relatedTarget && !menu.contains(e.relatedTarget)) menu.open = false;
    });
    document.addEventListener('pointerdown', e => { if (!menu.contains(e.target)) menu.open = false; });
    menu.querySelectorAll('a').forEach(a => a.addEventListener('click', e => {
      if (!e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey) {
        menu.open = false;
        summary.focus({ preventScroll: true });
      }
    }));
  });

  const mast = document.querySelector('.mast');
  const compact = matchMedia('(max-width: 860px)');
  const chapterMenus = [...document.querySelectorAll('.chapters')].map(nav => {
    const toggle = nav.querySelector('.chapter-toggle');
    const label = nav.querySelector('.chapter-current');
    const items = [...nav.querySelectorAll('.chapter-links a')].map(link => ({
      link, section: document.getElementById(link.hash.slice(1))
    })).filter(item => item.section);
    const close = () => toggle.setAttribute('aria-expanded', 'false');

    toggle.addEventListener('click', () => {
      const opening = toggle.getAttribute('aria-expanded') === 'false';
      toggle.setAttribute('aria-expanded', String(opening));
      if (opening) {
        // Bring a bar opened low in the viewport up so all its links can be reached.
        const offset = nav.getBoundingClientRect().top - mast.getBoundingClientRect().bottom;
        if (offset > 1) window.scrollBy({ top: offset, behavior: 'instant' });
      }
    });
    nav.addEventListener('keydown', e => {
      if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
        close();
        toggle.focus({ preventScroll: true });
      }
    });
    nav.addEventListener('focusout', e => {
      if (e.relatedTarget && !nav.contains(e.relatedTarget)) close();
    });
    document.addEventListener('pointerdown', e => { if (!nav.contains(e.target)) close(); });
    compact.addEventListener('change', close);
    items.forEach(({ link, section }) => link.addEventListener('click', e => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      close();
      section.tabIndex = -1;
      section.focus({ preventScroll: true });
    }));
    return { nav, items, label, active: null };
  });

  if (chapterMenus.length) {
    let frame = 0;
    const updateChapters = () => {
      frame = 0;
      const menu = chapterMenus.find(({ nav }) => nav.getClientRects().length);
      if (!menu || !menu.items.length) return;
      const boundary = Math.max(mast.offsetHeight + menu.nav.offsetHeight,
        parseFloat(getComputedStyle(menu.items[0].section).scrollMarginTop) || 0) + 2;
      let current = null;
      for (const item of menu.items) {
        if (item.section.getBoundingClientRect().top > boundary) break;
        current = item;
      }
      if (menu.active === current) return;
      menu.active?.link.removeAttribute('aria-current');
      current?.link.setAttribute('aria-current', 'location');
      menu.label.textContent = current ? current.link.textContent : '';
      menu.active = current;
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(updateChapters); };
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    window.addEventListener('load', schedule);
    window.addEventListener('hashchange', schedule);
    schedule();
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
  const viewport = viewer.querySelector('#viewer-viewport');
  const sizeButton = viewer.querySelector('[data-size]');
  let group = [], index = 0, opener = null;
  const setFullSize = enabled => {
    viewport.classList.toggle('full-size', enabled);
    viewport.tabIndex = enabled ? 0 : -1;
    sizeButton.textContent = enabled ? 'Fit to window' : 'View full size';
    viewport.scrollTo(0, 0);
  };
  const updateSizeButton = () => {
    if (!viewer.open) return;
    sizeButton.hidden = !viewport.classList.contains('full-size') &&
      img.naturalWidth <= viewport.clientWidth && img.naturalHeight <= viewport.clientHeight;
  };
  img.addEventListener('load', updateSizeButton);
  window.addEventListener('resize', updateSizeButton);
  sizeButton.addEventListener('click', () => {
    const enabled = !viewport.classList.contains('full-size');
    setFullSize(enabled);
    updateSizeButton();
    if (enabled) viewport.focus({ preventScroll: true });
  });
  const paint = () => {
    const link = group[index];
    const alt = link.querySelector('img')?.alt || link.dataset.title;
    setFullSize(false);
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
    const page = link.closest('.page') || document;
    group = [...page.querySelectorAll(`[data-gallery="${link.dataset.gallery}"]`)];
    index = group.indexOf(link);
    paint();
    viewer.showModal();
    updateSizeButton();
    viewer.querySelector('[data-close]').focus();
  }));
  prev.addEventListener('click', () => step(-1));
  next.addEventListener('click', () => step(1));
  viewer.querySelector('[data-close]').addEventListener('click', () => viewer.close());
  viewer.addEventListener('keydown', e => {
    if (e.target === viewport && viewport.classList.contains('full-size')) return;
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); step(e.key === 'ArrowRight' ? 1 : -1); }
  });
  viewer.addEventListener('click', e => { if (e.target === viewer) viewer.close(); });
  viewer.addEventListener('close', () => { img.removeAttribute('src'); opener?.focus({ preventScroll: true }); });
})();
