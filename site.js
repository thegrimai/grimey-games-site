/* Progressive enhancement only: every link and image works without this file. */
(() => {
  document.documentElement.classList.add('js');

  // A nested 404 uses a site-root base for its assets. Keep its skip link on the requested URL.
  if (document.querySelector('base[href]')) {
    const mainURL = new URL(location.href);
    mainURL.hash = 'main';
    document.querySelector('.skip').href = mainURL.href;
  }

  // Start both halves of the logo on the same frame, even on a cold load.
  const studioHero = document.querySelector('.studio-home');
  const skull = studioHero?.querySelector('.hero-mask img');
  if (skull?.decode && document.fonts && matchMedia('(prefers-reduced-motion: no-preference) and (forced-colors: none)').matches) {
    studioHero.dataset.logoIntro = 'waiting';
    const showStill = () => { delete studioHero.dataset.logoIntro; };
    const fallback = setTimeout(showStill, 2500);
    Promise.all([skull.decode(), document.fonts.load('1em "Germania One"', 'Grimey Games')])
      .then(() => {
        if (studioHero.dataset.logoIntro === 'waiting') studioHero.dataset.logoIntro = 'ready';
      }, showStill)
      .finally(() => clearTimeout(fallback));
  }

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

  // The gallery backdrop follows mouse hover and keyboard focus.
  const shelf = document.querySelector('.doors');
  if (shelf) {
    const scenes = shelf.querySelector('.door-scenes');
    const hover = matchMedia('(any-hover: hover)');
    const cards = Array.from(shelf.querySelectorAll('.door'), article => ({
      article, link: article.querySelector('.door-go'), image: article.querySelector('.door-art img'), scene: null
    }));
    let active = null, hovered = null, focused = null;

    function makeScene(card) {
      const image = new Image();
      image.alt = '';
      image.className = 'door-scene';
      image.classList.toggle('pixel', card.image.classList.contains('pixel'));
      image.src = card.image.currentSrc || card.image.src;
      scenes.append(image);
      return image;
    }

    function paint() {
      const shown = active && active.image.naturalWidth && active.article.getClientRects().length ? active : null;
      if (shown) {
        const palette = getComputedStyle(shown.article);
        document.body.style.setProperty('--scene-accent', palette.getPropertyValue('--door-accent'));
        document.body.style.setProperty('--scene-panel', palette.getPropertyValue('--door-panel'));
        if (!shown.scene) shown.scene = makeScene(shown);
      } else {
        document.body.style.removeProperty('--scene-accent');
        document.body.style.removeProperty('--scene-panel');
      }
      document.body.toggleAttribute('data-game-preview', Boolean(shown));
      for (const card of cards) {
        card.article.classList.toggle('is-preview', card === shown);
        card.scene?.classList.toggle('is-active', card === shown);
      }
    }

    function select(card) {
      if (active === card) return;
      active = card;
      paint();
    }
    function clear() { hovered = focused = null; select(null); }
    for (const card of cards) {
      card.image.addEventListener('load', () => { if (active === card) paint(); });
      card.article.addEventListener('pointerenter', event => {
        if (event.pointerType === 'touch' || !hover.matches) return;
        hovered = card;
        select(card);
      });
      card.article.addEventListener('pointerleave', () => {
        if (hovered === card) { hovered = null; select(focused); }
      });
      card.link.addEventListener('focus', () => {
        if (card.link.matches(':focus-visible')) { focused = card; select(card); }
      });
      card.link.addEventListener('blur', () => {
        if (focused === card) { focused = null; select(hovered); }
      });
    }
    document.addEventListener('pointerdown', event => { if (event.pointerType === 'touch') clear(); }, {passive:true});
    window.addEventListener('blur', clear);
    window.addEventListener('pagehide', clear);
    window.addEventListener('hashchange', () => { if (!shelf.getClientRects().length) clear(); });
    hover.addEventListener('change', () => { if (!hover.matches) { hovered = null; select(focused); } });
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
