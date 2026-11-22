/* FOCO Web Studio — motor de interacción
   Lenis (scroll suave) + GSAP / ScrollTrigger / SplitText */
import { initShader } from './shader.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const root = document.documentElement;
// el movimiento es parte del producto: solo se apaga con ?quieto en la URL
const reduced = new URLSearchParams(location.search).has('quieto');
const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
const isTransition = root.classList.contains('is-transition');
const gsap = window.gsap;
gsap.registerPlugin(window.ScrollTrigger, window.SplitText);
const { ScrollTrigger, SplitText } = window;
const EXPO = 'expo.out';

/* ---------------- scroll suave ---------------- */
let lenis = null;
if (!reduced && window.Lenis) {
  lenis = new window.Lenis({ lerp: 0.085, smoothWheel: true, wheelMultiplier: 1 });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add(t => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
  lenis.stop();
}
const scrollTo = (target, opts = {}) => lenis ? lenis.scrollTo(target, { duration: 1.6, easing: t => 1 - Math.pow(1 - t, 4), ...opts }) : (typeof target === 'number' ? window.scrollTo({ top: target, behavior: 'smooth' }) : target.scrollIntoView({ behavior: 'smooth' }));

/* ---------------- loader y transiciones ---------------- */
const wipe = $('.wipe');
const wipeTitle = $('.wipe__title');
function runLoader() {
  return new Promise(resolve => {
    const loader = $('.loader');
    if (!loader || reduced) { loader && loader.remove(); return resolve(); }
    if (isTransition) {
      loader.remove();
      sessionStorage.removeItem('foco-t');
      const tl = gsap.timeline({ onComplete: () => { root.classList.remove('is-transition'); resolve(); } });
      tl.set(wipeTitle, { opacity: 1 })
        .to(wipeTitle, { opacity: 0, filter: 'blur(12px)', duration: .45, ease: 'power2.in' }, .1)
        .to('.wipe span', { scaleY: 0, transformOrigin: 'top', duration: .8, ease: 'expo.inOut', stagger: .05 }, .25);
      setTimeout(resolve, 420);   // la portada entra mientras las cortinas suben
      return;
    }
    const canvas = $('.loader__canvas');
    const sh = canvas ? initShader(canvas, { palette: 'night', seed: 2.3, speed: 2.2 }) : null;
    const count = $('.loader__count');
    const n = { v: 0 };
    const letters = $$('.loader__word span');
    const tl = gsap.timeline({
      onComplete: () => { sh && sh.destroy && sh.destroy(); loader.remove(); }
    });
    tl.from('.loader__ring', { scale: .4, opacity: 0, duration: 1.4, ease: EXPO }, 0)
      .from(letters, { opacity: 0, filter: 'blur(24px)', yPercent: 30, scale: 1.25, duration: 1.1, ease: 'power3.out', stagger: .09 }, .1)
      .from('.loader__top > *, .loader__meta > span', { opacity: 0, y: 12, duration: .8, ease: EXPO, stagger: .06 }, .2)
      .to(n, { v: 100, duration: 1.7, ease: 'power2.inOut', onUpdate: () => { count.textContent = String(Math.round(n.v)).padStart(3, '0'); } }, 0)
      .to('.loader__bar', { scaleX: 1, duration: 1.7, ease: 'power2.inOut' }, 0)
      .to('.loader__ring', { scale: 2.6, opacity: 0, duration: 1, ease: 'expo.in' }, 1.6)
      .to(letters, { yPercent: -110, opacity: 0, duration: .7, ease: 'expo.in', stagger: .05 }, 1.75)
      .add(() => resolve(), 2.25)
      .to(loader, { clipPath: 'inset(0 0 100% 0)', duration: 1.1, ease: 'expo.inOut' }, 2.15);
  });
}
function bindTransitions() {
  $$('a[href]').forEach(a => {
    const href = a.getAttribute('href');
    if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:') || a.target === '_blank') return;
    const url = new URL(href, location.href);
    if (url.origin !== location.origin) return;
    a.addEventListener('click', e => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
      if (url.pathname === location.pathname) { if (url.hash) return; e.preventDefault(); scrollTo(0); return; }
      e.preventDefault();
      closeMenu();
      sessionStorage.setItem('foco-t', '1');
      wipeTitle.innerHTML = '';
      const t = document.createElement('span'); t.textContent = a.dataset.title || a.textContent.trim().split('\n')[0] || 'FOCO'; wipeTitle.append(t);
      gsap.timeline({ onComplete: () => { location.href = url.href; } })
        .set('.wipe span', { transformOrigin: 'bottom' })
        .to('.wipe span', { scaleY: 1, duration: .7, ease: 'expo.inOut', stagger: .05 })
        .fromTo(wipeTitle, { opacity: 0, filter: 'blur(14px)', scale: 1.08 }, { opacity: 1, filter: 'blur(0px)', scale: 1, duration: .5, ease: 'power3.out' }, .45);
    });
  });
  addEventListener('pageshow', e => { if (e.persisted) { gsap.set('.wipe span', { scaleY: 0 }); gsap.set(wipeTitle, { opacity: 0 }); } });
}

/* ---------------- cursor ---------------- */
function cursor() {
  const c = $('.cursor'); if (!c || !fine || reduced) { c && c.remove(); return; }
  root.classList.add('has-cursor');
  const dot = $('.cursor__dot', c), ring = $('.cursor__ring', c), label = $('.cursor__label', c);
  const dx = gsap.quickTo(dot, 'x', { duration: .12, ease: 'power3' }), dy = gsap.quickTo(dot, 'y', { duration: .12, ease: 'power3' });
  const rx = gsap.quickTo(ring, 'x', { duration: .55, ease: 'power3' }), ry = gsap.quickTo(ring, 'y', { duration: .55, ease: 'power3' });
  addEventListener('pointermove', e => { dx(e.clientX); dy(e.clientY); rx(e.clientX); ry(e.clientY); });
  document.addEventListener('pointerleave', () => c.classList.add('is-hidden'));
  document.addEventListener('pointerenter', () => c.classList.remove('is-hidden'));
  document.addEventListener('pointerover', e => {
    const lab = e.target.closest('[data-cursor]');
    const link = e.target.closest('a, button, input, textarea, label, select');
    c.classList.toggle('is-label', !!lab);
    c.classList.toggle('is-link', !lab && !!link);
    if (lab) label.textContent = lab.dataset.cursor;
  });
}

/* ---------------- header, menú, progreso ---------------- */
function header() {
  const h = $('.header'); if (!h) return;
  let last = 0;
  const onScroll = y => {
    h.classList.toggle('is-scrolled', y > 40);
    if (!document.body.classList.contains('menu-open')) h.classList.toggle('is-hidden', y > last && y > 400);
    last = y;
  };
  if (lenis) lenis.on('scroll', ({ scroll }) => onScroll(scroll)); else addEventListener('scroll', () => onScroll(scrollY), { passive: true });
  gsap.to('.progress', { scaleX: 1, ease: 'none', scrollTrigger: { start: 0, end: 'max', scrub: .3 } });
}
let menuTl = null;
function closeMenu() { if (document.body.classList.contains('menu-open')) toggleMenu(); }
function toggleMenu() {
  const open = !document.body.classList.contains('menu-open');
  document.body.classList.toggle('menu-open', open);
  $('.burger').setAttribute('aria-expanded', String(open));
  if (open) {
    lenis && lenis.stop();
    gsap.set('.menu', { visibility: 'visible' });
    menuTl = gsap.timeline()
      .to('.menu', { clipPath: 'inset(0 0 0% 0)', duration: .9, ease: 'expo.inOut' })
      .from('.menu__links a span', { yPercent: 110, duration: .9, ease: EXPO, stagger: .06 }, .35)
      .from('.menu__foot', { opacity: 0, y: 20, duration: .6 }, .6);
  } else {
    lenis && lenis.start();
    gsap.to('.menu', { clipPath: 'inset(0 0 100% 0)', duration: .8, ease: 'expo.inOut', onComplete: () => gsap.set('.menu', { visibility: 'hidden' }) });
  }
}

/* ---------------- tema claro / oscuro por sección ---------------- */
function themes() {
  $$('[data-theme]').forEach(sec => {
    ScrollTrigger.create({
      trigger: sec.parentElement.classList.contains('pin-spacer') ? sec.parentElement : sec, start: 'top 55%', end: 'bottom 55%',
      onToggle: self => { if (self.isActive) document.body.classList.toggle('theme-light', sec.dataset.theme === 'light'); }
    });
  });
}

/* ---------------- textos ---------------- */
function texts() {
  $$('[data-split="lines"]').forEach(el => SplitText.create(el, {
    type: 'lines', mask: 'lines', autoSplit: true, linesClass: 'ln',
    onSplit: self => gsap.from(self.lines, { yPercent: 110, duration: 1.3, ease: EXPO, stagger: .09, scrollTrigger: { trigger: el, start: 'top 88%', once: true } })
  }));
  $$('[data-split="words"]').forEach(el => SplitText.create(el, {
    type: 'words', mask: 'words', autoSplit: true,
    onSplit: self => gsap.from(self.words, { yPercent: 110, duration: 1.1, ease: EXPO, stagger: .035, scrollTrigger: { trigger: el, start: 'top 88%', once: true } })
  }));
  $$('[data-split="chars"]').forEach(el => SplitText.create(el, {
    type: 'chars', autoSplit: true,
    onSplit: self => gsap.from(self.chars, { opacity: 0, filter: 'blur(14px)', yPercent: 35, duration: 1.1, ease: 'power3.out', stagger: .03, scrollTrigger: { trigger: el, start: 'top 88%', once: true } })
  }));
  // manifiesto: cada palabra se enciende al pasar por el centro de la pantalla
  $$('[data-fill]').forEach(el => {
    const split = SplitText.create(el, { type: 'words', wordsClass: 'w' });
    const words = split.words;
    ScrollTrigger.create({
      trigger: el, start: 'top 78%', end: 'bottom 42%', scrub: true,
      onUpdate: self => { const k = Math.round(self.progress * words.length); words.forEach((w, i) => w.classList.toggle('on', i < k)); }
    });
  });
  $$('[data-fade]').forEach(el => gsap.to(el, { opacity: 1, y: 0, duration: 1.2, ease: EXPO, delay: +el.dataset.fade || 0, scrollTrigger: { trigger: el, start: 'top 90%', once: true } }));
}

/* ---------------- números ---------------- */
function counters() {
  $$('[data-count]').forEach(el => {
    const end = parseFloat(el.dataset.count), dec = +(el.dataset.decimals || 0), n = { v: 0 };
    el.textContent = (0).toFixed(dec);
    gsap.to(n, { v: end, duration: 2.4, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 88%', once: true },
      onUpdate: () => { el.textContent = n.v.toFixed(dec).replace('.', ','); } });
  });
}

/* ---------------- imágenes: parallax y expansión ---------------- */
function images() {
  $$('[data-parallax]').forEach(fig => {
    const img = $('img', fig);
    gsap.fromTo(fig, { clipPath: 'inset(12% 10% 12% 10% round 28px)' }, { clipPath: 'inset(0% 0% 0% 0% round 28px)', ease: 'none', scrollTrigger: { trigger: fig, start: 'top bottom', end: 'center 55%', scrub: 1 } });
    if (img) gsap.fromTo(img, { yPercent: -10, scale: 1.25 }, { yPercent: 10, scale: 1.02, ease: 'none', scrollTrigger: { trigger: fig, start: 'top bottom', end: 'bottom top', scrub: 1 } });
  });
  $$('.expand').forEach(sec => {
    const tl = gsap.timeline({ scrollTrigger: { trigger: sec, start: 'top top', end: 'bottom bottom', scrub: 1 } });
    tl.to($('.expand__frame', sec), { clipPath: 'inset(0% 0% 0% 0% round 0px)', ease: 'power2.inOut' }, 0)
      .to($('.expand__frame img', sec), { scale: 1, ease: 'power2.inOut' }, 0)
      .fromTo($('.expand__text', sec), { scale: .82, opacity: .2 }, { scale: 1, opacity: 1, ease: 'power2.out' }, 0)
      .from($$('.expand__side span', sec), { opacity: 0, y: 20, stagger: .1 }, .5);
  });
  $$('[data-bgshift]').forEach(el => gsap.to(el, { yPercent: 18, ease: 'none', scrollTrigger: { trigger: el.parentElement, start: 'top top', end: 'bottom top', scrub: true } }));
}

/* ---------------- marquesina sensible a la velocidad ---------------- */
function marquees() {
  $$('[data-marquee]').forEach(m => {
    const track = $('.marquee__track', m);
    track.append(...[...track.children].map(n => n.cloneNode(true)));
    const dir = m.dataset.marquee === 'right' ? 1 : -1;
    const tl = gsap.fromTo(track, { xPercent: dir < 0 ? 0 : -50 }, { xPercent: dir < 0 ? -50 : 0, duration: 32, ease: 'none', repeat: -1 });
    if (lenis) lenis.on('scroll', ({ velocity }) => { gsap.to(tl, { timeScale: (velocity < 0 ? -1 : 1) * (1 + Math.min(Math.abs(velocity) * .12, 5)), duration: .3, overwrite: true }); });
    m.addEventListener('pointerenter', () => gsap.to(tl, { timeScale: .25, duration: .6 }));
    m.addEventListener('pointerleave', () => gsap.to(tl, { timeScale: 1, duration: .6 }));
  });
}

/* ---------------- scroll horizontal y tarjetas apiladas ---------------- */
function pinned() {
  const mm = gsap.matchMedia();
  mm.add('(min-width: 901px)', () => {
    $$('[data-hscroll]').forEach(sec => {
      const track = $('.hscroll__track', sec);
      const dist = () => track.scrollWidth - innerWidth;
      const tween = gsap.to(track, { x: () => -dist(), ease: 'none', scrollTrigger: { trigger: sec, start: 'top top', end: () => '+=' + dist(), pin: true, scrub: 1, invalidateOnRefresh: true, anticipatePin: 1 } });
      $$('.hcard', sec).forEach(card => gsap.from(card, { rotate: 3, yPercent: 8, ease: 'none', scrollTrigger: { trigger: card, containerAnimation: tween, start: 'left right', end: 'left 40%', scrub: true } }));
    });
  });
  const cards = $$('.stack__card');
  cards.forEach((card, i) => {
    const next = cards[i + 1]; if (!next) return;
    gsap.to(card, { scale: .92, filter: 'brightness(.72)', ease: 'none', scrollTrigger: { trigger: next, start: 'top 85%', end: 'top 18%', scrub: true } });
  });
  // línea de tiempo del proceso
  $$('.timeline').forEach(tlEl => {
    gsap.to($('.timeline__line i', tlEl), { scaleY: 1, ease: 'none', scrollTrigger: { trigger: tlEl, start: 'top 60%', end: 'bottom 60%', scrub: true } });
    $$('.step', tlEl).forEach(st => ScrollTrigger.create({ trigger: st, start: 'top 60%', onEnter: () => st.classList.add('is-active'), onLeaveBack: () => st.classList.remove('is-active') }));
  });
}

/* ---------------- interacciones de puntero ---------------- */
function pointer() {
  if (!fine || reduced) return;
  $$('[data-magnetic]').forEach(el => {
    const s = +(el.dataset.magnetic || .35);
    const x = gsap.quickTo(el, 'x', { duration: .6, ease: 'elastic.out(1,.4)' }), y = gsap.quickTo(el, 'y', { duration: .6, ease: 'elastic.out(1,.4)' });
    el.addEventListener('pointermove', e => { const b = el.getBoundingClientRect(); x((e.clientX - b.left - b.width / 2) * s); y((e.clientY - b.top - b.height / 2) * s); });
    el.addEventListener('pointerleave', () => { x(0); y(0); });
  });
  $$('.tcard').forEach(card => {
    card.addEventListener('pointermove', e => {
      const b = card.getBoundingClientRect(), px = (e.clientX - b.left) / b.width, py = (e.clientY - b.top) / b.height;
      card.style.setProperty('--gx', px * 100 + '%'); card.style.setProperty('--gy', py * 100 + '%');
      gsap.to(card, { rotateY: (px - .5) * 10, rotateX: (.5 - py) * 10, transformPerspective: 900, duration: .6, ease: 'power3' });
    });
    card.addEventListener('pointerleave', () => gsap.to(card, { rotateX: 0, rotateY: 0, duration: 1, ease: 'elastic.out(1,.5)' }));
  });
  // imagen flotante sobre la lista de servicios
  $$('[data-hover-reveal]').forEach(list => {
    const box = $('.reveal-img'); if (!box) return;
    const imgs = $$('img', box);
    const x = gsap.quickTo(box, 'x', { duration: .7, ease: 'power3' }), y = gsap.quickTo(box, 'y', { duration: .7, ease: 'power3' });
    const rot = gsap.quickTo(box, 'rotation', { duration: .8, ease: 'power3' });
    let lx = 0;
    list.addEventListener('pointermove', e => { x(e.clientX - box.offsetWidth / 2); y(e.clientY - box.offsetHeight / 2); rot(gsap.utils.clamp(-12, 12, (e.clientX - lx) * .8)); lx = e.clientX; });
    list.addEventListener('pointerenter', () => gsap.to(box, { opacity: 1, scale: 1, duration: .6, ease: EXPO }));
    list.addEventListener('pointerleave', () => gsap.to(box, { opacity: 0, scale: .6, duration: .5, ease: 'power3' }));
    $$('.hlist__row', list).forEach((row, i) => row.addEventListener('pointerenter', () => {
      imgs.forEach((im, k) => im.classList.toggle('on', k === i % imgs.length));
      gsap.fromTo(imgs[i % imgs.length], { scale: 1.3 }, { scale: 1.05, duration: 1, ease: EXPO });
    }));
  });
  // lente sobre el titular de la portada
  $$('.hero__title').forEach(t => {
    const lens = $('.lens', t); if (!lens) return;
    const r = { v: 0 };
    t.addEventListener('pointermove', e => { const b = t.getBoundingClientRect(); lens.style.setProperty('--mx', e.clientX - b.left + 'px'); lens.style.setProperty('--my', e.clientY - b.top + 'px'); });
    const set = () => lens.style.setProperty('--lr', r.v + 'px');
    t.addEventListener('pointerenter', () => gsap.to(r, { v: 170, duration: .8, ease: EXPO, onUpdate: set }));
    t.addEventListener('pointerleave', () => gsap.to(r, { v: 0, duration: .6, ease: 'power3', onUpdate: set }));
  });
}

/* ---------------- portada: diafragma, líneas topográficas ---------------- */
const irisState = { r: 0, rot: -1.4, ox: 0, oy: 0, grow: 0, hover: 0 };
function iris() {
  const host = $('.iris'); if (!host) return;
  const light = $('.iris__light', host), svg = $('.iris__svg', host);
  const blades = $('.iris__blades', svg), ring = $('.iris__ring', svg), ring2 = $('.iris__ring2', svg), ticks = $('.iris__ticks', svg), clip = $('.iris__clip', svg);
  const topo = $('.topo'); const hero = host.closest('.hero2');
  const N = 7, s = irisState;
  let W = 0, H = 0, wide = true;
  const topoPaths = [];
  const size = () => {
    W = host.clientWidth; H = host.clientHeight; wide = innerWidth > 900;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    if (topo) { topo.setAttribute('viewBox', `0 0 ${W} ${H}`); if (!topoPaths.length) for (let k = 0; k < 16; k++) { const p = document.createElementNS('http://www.w3.org/2000/svg', 'path'); topo.append(p); topoPaths.push(p); } }
  };
  size(); addEventListener('resize', size);
  const base = () => Math.min(W, H) * (wide ? .26 : .3);
  const render = time => {
    const X = W * (wide ? .58 : .5) + s.ox, Y = H * (wide ? .56 : .5) + s.oy;
    const diag = Math.hypot(W, H);
    const R = base() * s.r * (1 + .03 * Math.sin(time * 1.2) + .1 * s.hover) + s.grow * diag;
    const rot = s.rot + time * .06;
    const pts = [];
    for (let i = 0; i < N; i++) { const a = rot + i * Math.PI * 2 / N; pts.push([X + R * Math.cos(a), Y + R * Math.sin(a)]); }
    light.style.clipPath = `polygon(${pts.map(p => `${p[0].toFixed(1)}px ${p[1].toFixed(1)}px`).join(',')})`;
    const Ro = Math.max(base() * 1.5 * Math.min(1, s.r * 1.4), R * 1.02) + s.grow * diag * .2;
    let d = '';
    for (let i = 0; i < N; i++) {
      const p = pts[i], q = pts[(i + 1) % N];
      const dx = p[0] - q[0], dy = p[1] - q[1], L = Math.hypot(dx, dy) || 1;
      d += `M${p[0].toFixed(1)} ${p[1].toFixed(1)}L${(p[0] + dx / L * Ro * 2).toFixed(1)} ${(p[1] + dy / L * Ro * 2).toFixed(1)}`;
    }
    blades.setAttribute('d', d);
    for (const c of [clip, ring]) { c.setAttribute('cx', X); c.setAttribute('cy', Y); c.setAttribute('r', Ro); }
    ring2.setAttribute('cx', X); ring2.setAttribute('cy', Y); ring2.setAttribute('r', Ro * 1.06);
    let t = ''; const tr = -time * .04;
    for (let i = 0; i < 90; i++) { const a = tr + i * Math.PI * 2 / 90, l = i % 10 === 0 ? 16 : 7; const r1 = Ro * 1.1, r2 = r1 + l; t += `M${(X + r1 * Math.cos(a)).toFixed(1)} ${(Y + r1 * Math.sin(a)).toFixed(1)}L${(X + r2 * Math.cos(a)).toFixed(1)} ${(Y + r2 * Math.sin(a)).toFixed(1)}`; }
    ticks.setAttribute('d', s.r > .02 ? t : '');
    // líneas topográficas que respiran alrededor del diafragma
    topoPaths.forEach((p, k) => {
      const rk = base() * .9 + k * Math.min(W, H) * .07; let dd = '';
      for (let j = 0; j <= 72; j++) {
        const a = j / 72 * Math.PI * 2;
        const rr = rk * (1 + .09 * Math.sin(3 * a + k * .7 + time * .25) + .05 * Math.sin(5 * a - k + time * .18));
        dd += (j ? 'L' : 'M') + (X + rr * Math.cos(a) * 1.25).toFixed(1) + ' ' + (Y + rr * Math.sin(a)).toFixed(1);
      }
      p.setAttribute('d', dd + 'Z');
    });
  };
  gsap.ticker.add(() => render(gsap.ticker.time));
  if (!hero) return;
  const ox = gsap.quickTo(s, 'ox', { duration: 1.2, ease: 'power3' }), oy = gsap.quickTo(s, 'oy', { duration: 1.2, ease: 'power3' });
  hero.addEventListener('pointermove', e => {
    const b = hero.getBoundingClientRect(), px = (e.clientX - b.left) / b.width - .5, py = (e.clientY - b.top) / b.height - .5;
    ox(px * 60); oy(py * 40);
    const X = W * (wide ? .58 : .5) + s.ox, Y = H * (wide ? .56 : .5) + s.oy;
    const inside = Math.hypot(e.clientX - b.left - X, e.clientY - b.top - Y) < base() * s.r;
    gsap.to(s, { hover: inside ? 1 : 0, duration: .8, ease: EXPO, overwrite: 'auto' });
  });
  hero.addEventListener('pointerleave', () => { ox(0); oy(0); gsap.to(s, { hover: 0, duration: .8 }); });
  // al bajar, el diafragma se abre hasta llenar la pantalla y el logo se aleja
  gsap.to(s, { grow: .75, ease: 'power2.in', scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: 1 } });
  gsap.to('.hero2__mark', { yPercent: -35, opacity: .2, ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true } });
  gsap.to('.hero2__slogan, .hero2__meta', { yPercent: -60, ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true } });
}
/* ---------------- portada: lámpara estilo Luxo, gira a cámara, zoom a la bombilla y paso a blanco ----------------
   La cabeza se dibuja con geometría en cada fotograma (no con transformaciones), así nunca se separa del brazo.
   face: 0 = de perfil mirando abajo a la izquierda · 1 = mirando de frente a cámara */
let lampIntro = null;
function lamp() {
  const hero = $('.hero2'), box = $('.lamp'); if (!hero || !box) return;
  const svg = $('svg', box), NS = 'http://www.w3.org/2000/svg';
  const q = c => $('.' + c, svg);
  const body = q('lamp__body'), mouth = q('lamp__mouth'), rim = q('lamp__rim'), bulb = q('lamp__bulb'), glow = q('lamp__glow'), spec = q('lamp__spec');
  const beam = q('lamp__beam'), pool = q('lamp__pool'), vents = q('lamp__vents'), springs = q('lamp__springs');
  const beamGrad = $('#lm-beam', svg);
  const flash = $('.lampflash', hero), topo = $('.topo', hero);
  // muelles en espiral entre los brazos
  const coil = (x1, y1, x2, y2, n) => {
    const dx = x2 - x1, dy = y2 - y1, ang = Math.atan2(dy, dx) * 180 / Math.PI + 90;
    for (let i = 0; i <= n; i++) { const e = document.createElementNS(NS, 'ellipse'); const cx = x1 + dx * i / n, cy = y1 + dy * i / n; e.setAttribute('cx', cx); e.setAttribute('cy', cy); e.setAttribute('rx', 9); e.setAttribute('ry', 3.2); e.setAttribute('transform', `rotate(${ang} ${cx} ${cy})`); springs.append(e); }
  };
  coil(403, 622, 427, 538, 13); coil(426, 413, 382, 349, 11);
  const ventPath = document.createElementNS(NS, 'path'); ventPath.setAttribute('stroke', '#7f95b7'); ventPath.setAttribute('stroke-width', '5'); ventPath.setAttribute('stroke-linecap', 'round'); vents.append(ventPath);

  const H = [334, 278];
  const lerp = (a, b, t) => a + (b - a) * t, clamp = gsap.utils.clamp(0, 1);
  const norm = v => { const l = Math.hypot(v[0], v[1]) || 1; return [v[0] / l, v[1] / l]; };
  const A0 = Math.atan2(.8, -.6), DF = norm([-.06, 1]);
  const L = { face: 0, look: -.55, mouse: 0, on: 0 };
  const P = (p, v, k) => [p[0] + v[0] * k, p[1] + v[1] * k];
  const f = n => n.toFixed(1);
  const geo = () => {
    const a = A0 + L.look + L.mouse, d0 = [Math.cos(a), Math.sin(a)];
    const dir = norm([lerp(d0[0], DF[0], L.face), lerp(d0[1], DF[1], L.face)]);
    const len = lerp(150, 36, L.face), C = P(H, dir, len), u = [dir[1], -dir[0]];
    const rx = 100, ry = lerp(56, 100, L.face);
    const bulbC = P(C, dir, -ry * .18 * (1 - L.face));
    return { dir, len, C, u, rx, ry, bulbC };
  };
  const render = () => {
    const { dir, len, C, u, rx, ry, bulbC } = geo();
    const rot = Math.atan2(u[1], u[0]) * 180 / Math.PI;
    const P1 = P(C, u, rx), P2 = P(C, u, -rx), Q = P(H, dir, -lerp(16, 4, L.face)), w = lerp(46, 82, L.face);
    const K1 = P(P1, dir, -len * .7), K2 = P(Q, u, w), K3 = P(Q, u, -w), K4 = P(P2, dir, -len * .7);
    body.setAttribute('d', `M${f(P1[0])} ${f(P1[1])}C${f(K1[0])} ${f(K1[1])} ${f(K2[0])} ${f(K2[1])} ${f(Q[0])} ${f(Q[1])}C${f(K3[0])} ${f(K3[1])} ${f(K4[0])} ${f(K4[1])} ${f(P2[0])} ${f(P2[1])}A${rx} ${f(ry)} ${f(rot)} 0 0 ${f(P1[0])} ${f(P1[1])}Z`);
    for (const el of [mouth, rim]) { el.setAttribute('cx', f(C[0])); el.setAttribute('cy', f(C[1])); el.setAttribute('rx', rx); el.setAttribute('ry', f(ry)); el.setAttribute('transform', `rotate(${f(rot)} ${f(C[0])} ${f(C[1])})`); }
    const br = lerp(44, 56, L.face);
    bulb.setAttribute('cx', f(bulbC[0])); bulb.setAttribute('cy', f(bulbC[1])); bulb.setAttribute('r', f(br));
    glow.setAttribute('cx', f(bulbC[0])); glow.setAttribute('cy', f(bulbC[1]));
    spec.setAttribute('cx', f(bulbC[0] - br * .32)); spec.setAttribute('cy', f(bulbC[1] - br * .32));
    // ranuras de ventilación en la parte trasera de la campana
    let vd = ''; const V = P(Q, dir, len * .32);
    for (let k = -1; k <= 1; k++) { const c = P(V, u, k * 17), s1 = P(c, dir, -7), s2 = P(c, dir, 7); vd += `M${f(s1[0])} ${f(s1[1])}L${f(s2[0])} ${f(s2[1])}`; }
    ventPath.setAttribute('d', vd); vents.setAttribute('opacity', f(clamp(1 - L.face * 1.8)));
    // haz de luz
    const far = 820, F1 = P(P(P1, dir, far), u, far * .42), F2 = P(P(P2, dir, far), u, -far * .42);
    beam.setAttribute('d', `M${f(P1[0])} ${f(P1[1])}L${f(F1[0])} ${f(F1[1])}L${f(F2[0])} ${f(F2[1])}L${f(P2[0])} ${f(P2[1])}Z`);
    beamGrad.setAttribute('x1', f(C[0])); beamGrad.setAttribute('y1', f(C[1])); const G = P(C, dir, far); beamGrad.setAttribute('x2', f(G[0])); beamGrad.setAttribute('y2', f(G[1]));
    const light = L.on * (1 - L.face);
    beam.setAttribute('opacity', f(light)); pool.setAttribute('opacity', f(light));
    bulb.setAttribute('opacity', f(.18 + .82 * L.on)); glow.setAttribute('opacity', f(L.on)); spec.setAttribute('opacity', f(.3 + .7 * L.on));
  };
  render();
  lampIntro = () => gsap.timeline()
    .to(L, { look: 0, duration: 1.8, ease: 'elastic.out(1, .4)' }, 0)
    .to(L, { keyframes: [{ on: .9, duration: .06 }, { on: .1, duration: .08 }, { on: 1, duration: .05 }, { on: .35, duration: .1 }, { on: 1, duration: .14 }] }, .6);
  let zooming = false;
  const mouse = gsap.quickTo(L, 'mouse', { duration: 1.1, ease: 'power3' });
  hero.addEventListener('pointermove', e => {
    if (zooming) return;
    const b = box.getBoundingClientRect();
    const dx = (e.clientX - (b.left + b.width * .55)) / innerWidth, dy = (e.clientY - (b.top + b.height * .4)) / innerHeight;
    mouse(gsap.utils.clamp(-.32, .32, -dx * .9 + dy * .5));
  });
  hero.addEventListener('pointerleave', () => { if (!zooming) mouse(0); });
  // líneas topográficas alrededor de la bombilla
  const topoPaths = [];
  const sizeTopo = () => { topo.setAttribute('viewBox', `0 0 ${hero.clientWidth} ${hero.clientHeight}`); if (!topoPaths.length) for (let k = 0; k < 14; k++) { const p = document.createElementNS(NS, 'path'); topo.append(p); topoPaths.push(p); } };
  if (topo) { sizeTopo(); addEventListener('resize', sizeTopo); }
  const bulbPos = () => { const r = bulb.getBoundingClientRect(), h = hero.getBoundingClientRect(); return [r.left + r.width / 2 - h.left, r.top + r.height / 2 - h.top]; };
  gsap.ticker.add(() => {
    render();
    if (!topo || zooming) return;
    const [X, Y] = bulbPos(), t = gsap.ticker.time, m = Math.min(hero.clientWidth, hero.clientHeight);
    topoPaths.forEach((p, k) => {
      const rk = m * .14 + k * m * .075; let d = '';
      for (let j = 0; j <= 72; j++) { const a = j / 72 * Math.PI * 2, rr = rk * (1 + .09 * Math.sin(3 * a + k * .7 + t * .25) + .05 * Math.sin(5 * a - k + t * .18)); d += (j ? 'L' : 'M') + (X + rr * Math.cos(a) * 1.25).toFixed(1) + ' ' + (Y + rr * Math.sin(a)).toFixed(1); }
      p.setAttribute('d', d + 'Z');
    });
  });
  // origen del zoom: la bombilla cuando la lámpara ya mira de frente
  const front = (() => { const s = { ...L }; L.face = 1; L.look = 0; L.mouse = 0; const g = geo(); Object.assign(L, s); return g.bulbC; })();
  const origin = `${(front[0] / 600 * 100).toFixed(2)}% ${(front[1] / 760 * 100).toFixed(2)}%`;
  const setFlash = r => { const [X, Y] = bulbPos(); flash.style.setProperty('--fx', X + 'px'); flash.style.setProperty('--fy', Y + 'px'); flash.style.setProperty('--fr', r + 'px'); };
  const fr = { v: 0 };
  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: hero, start: 'top top', end: '+=180%', pin: true, scrub: 1, anticipatePin: 1,
      onEnter: () => { zooming = true; mouse(0); }, onLeaveBack: () => { zooming = false; },
      onUpdate: self => { document.body.classList.toggle('theme-light', self.progress > .93); }
    }
  });
  tl.to('.hero2__mark, .hero2__slogan, .hero2__meta, .hero2__desc, .hero2__cta', { opacity: 0, y: -50, filter: 'blur(10px)', stagger: .03, duration: .25, ease: 'power2.in' }, 0)
    .to(topo, { opacity: 0, duration: .25 }, 0)
    // 1) gira la cabeza hasta mirarte, con un pequeño rebote
    .to(L, { face: 1, look: 0, mouse: 0, on: 1, duration: .34, ease: 'back.out(1.5)' }, .02)
    // 2) la cámara entra en la bombilla
    .to(box, { scale: 28, transformOrigin: origin, duration: .62, ease: 'power3.in' }, .38)
    // 3) la luz lo llena todo de blanco
    .to(fr, { v: Math.hypot(innerWidth, innerHeight) * 1.4, duration: .4, ease: 'power2.in', onUpdate: () => setFlash(fr.v) }, .6)
    .to(flash, { opacity: 1, duration: .2, ease: 'none' }, .6);
}

function bigrows() {
  $$('.bigrows').forEach(sec => {
    $$('[data-row]', sec).forEach(row => {
      const dir = +row.dataset.row;
      gsap.fromTo(row, { xPercent: dir < 0 ? 0 : -30 }, { xPercent: dir < 0 ? -30 : 0, ease: 'none', scrollTrigger: { trigger: sec, start: 'top bottom', end: 'bottom top', scrub: 1 } });
    });
    const img = $('.bigrows__img', sec);
    gsap.fromTo(img, { rotate: -8, scale: .7, clipPath: 'inset(30% 10% 30% 10% round 24px)' }, { rotate: 4, scale: 1, clipPath: 'inset(0% 0% 0% 0% round 24px)', ease: 'none', scrollTrigger: { trigger: sec, start: 'top bottom', end: 'center center', scrub: 1 } });
    gsap.fromTo($('img', img), { yPercent: -12 }, { yPercent: 0, ease: 'none', scrollTrigger: { trigger: sec, start: 'top bottom', end: 'bottom top', scrub: 1 } });
    const path = $('.bigrows__scribble path', sec);
    if (path) {
      const L = path.getTotalLength();
      gsap.set(path, { strokeDasharray: L, strokeDashoffset: L });
      gsap.to(path, { strokeDashoffset: 0, ease: 'none', scrollTrigger: { trigger: sec, start: 'top 55%', end: 'center 35%', scrub: 1 } });
    }
  });
}

/* ---------------- portada: entrada ---------------- */
function intro() {
  const heroT = $('.hero__title, .phero');
  if (heroT) heroT.classList.add('is-ready');
  const tl = gsap.timeline({ defaults: { ease: EXPO } });
  if ($('.hero2')) {
    tl.from('.hero2__word span', { yPercent: 105, opacity: 0, filter: 'blur(18px)', duration: 1.6, stagger: .08 }, 0)
      .from('.hero2__sub i', { scaleX: 0, duration: 1.4 }, .5)
      .from('.hero2__sub span', { opacity: 0, letterSpacing: '1em', duration: 1.6 }, .5)
      .add(() => lampIntro && lampIntro(), .2);
    $$('[data-intro-lines]').forEach(p => { const s = SplitText.create(p, { type: 'lines', mask: 'lines' }); tl.from(s.lines, { yPercent: 110, duration: 1.4, stagger: .1 }, .45); });
  }
  $$('.hero__title h1, .phero h1').forEach(h => {
    const s = SplitText.create(h, { type: 'chars,lines', mask: 'lines' });
    tl.from(s.chars, { yPercent: 115, filter: 'blur(10px)', duration: 1.5, stagger: .028 }, 0);
  });
  tl.from('[data-intro]', { opacity: 0, y: 36, duration: 1.2, stagger: .08 }, .35)
    .from('.header__bar > *', { opacity: 0, y: -20, duration: 1, stagger: .08 }, .2);
  if ($('.phero__bg img')) tl.from('.phero__bg img', { scale: 1.3, duration: 2.2, ease: 'expo.out' }, 0);
}

/* ---------------- FAQ, formulario, reloj, varios ---------------- */
function faq() {
  $$('.faq__item').forEach(item => {
    const q = $('.faq__q', item), a = $('.faq__a', item);
    q.addEventListener('click', () => {
      const open = !item.classList.contains('is-open');
      item.classList.toggle('is-open', open); q.setAttribute('aria-expanded', String(open));
      gsap.to(a, { height: open ? 'auto' : 0, duration: .8, ease: 'expo.inOut', onComplete: () => ScrollTrigger.refresh() });
    });
  });
}
function form() {
  const f = $('form[data-endpoint]'); if (!f) return;
  const status = $('.form__status', f);
  f.addEventListener('submit', async e => {
    e.preventDefault();
    let bad = [];
    $$('[required]', f).forEach(inp => {
      const err = $('#' + inp.getAttribute('aria-describedby'));
      const ok = inp.type === 'email' ? /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(inp.value.trim()) : inp.value.trim().length > 1;
      inp.setAttribute('aria-invalid', String(!ok)); if (err) err.textContent = ok ? '' : err.dataset.msg;
      if (!ok) bad.push(inp);
    });
    if (bad.length) { status.textContent = bad.length === 1 ? 'Revisa 1 campo.' : `Revisa ${bad.length} campos.`; bad[0].focus(); return; }
    const btn = $('button[type="submit"]', f); btn.disabled = true; status.textContent = 'Enviando…';
    try {
      const res = await fetch(f.dataset.endpoint, { method: 'POST', body: new FormData(f), headers: { Accept: 'application/json' } });
      if (!res.ok) throw new Error(res.status);
      f.reset(); status.textContent = 'Recibido. Te escribimos por correo con tu presupuesto.';
      gsap.fromTo(status, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: .8, ease: EXPO });
    } catch { status.textContent = 'No se ha podido enviar. Inténtalo de nuevo o escríbenos por correo.'; }
    finally { btn.disabled = false; }
  });
}
function clock() {
  const els = $$('[data-clock]'); if (!els.length) return;
  const fmt = new Intl.DateTimeFormat('es-ES', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Madrid' });
  const tick = () => { els.forEach(el => { el.textContent = fmt.format(new Date()); }); }; tick(); setInterval(tick, 15000);
}
function misc() {
  $$('[data-top]').forEach(b => b.addEventListener('click', e => { e.preventDefault(); scrollTo(0); }));
  $$('a[href^="#"]').forEach(a => a.addEventListener('click', e => { const t = $(a.getAttribute('href')); if (t) { e.preventDefault(); scrollTo(t, { offset: -40 }); } }));
  const burger = $('.burger'); if (burger) burger.addEventListener('click', toggleMenu);
  $$('.footer__word').forEach(w => gsap.from($$('span', w), { yPercent: 100, duration: 1.4, ease: EXPO, stagger: .08, scrollTrigger: { trigger: w, start: 'top 95%', once: true } }));
  const year = $('[data-year]'); if (year) year.textContent = new Date().getFullYear();
}
function shaders() {
  const hero = $('.hero__bg canvas'); if (hero) initShader(hero, { palette: 'night', seed: 1.4, lens: true, speed: reduced ? 0 : 1 });
  const ir = $('.iris__light canvas'); if (ir) initShader(ir, { palette: 'deep', seed: 2.3, speed: reduced ? 0 : 1.4 });
  const cta = $('.cta__bg canvas'); if (cta) initShader(cta, { palette: 'deep', seed: 6.2, lens: true, speed: reduced ? 0 : 1.2 });
}

/* ---------------- arranque ---------------- */
(async function boot() {
  root.classList.add('js');
  bindTransitions(); cursor(); misc(); clock(); faq(); form();
  try { await Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 1500))]); } catch {}
  shaders();
  if (reduced) { lamp(); if (lampIntro) lampIntro().progress(1); root.classList.add('is-quiet'); $$('.hero__title, .phero').forEach(t => t.classList.add('is-ready')); }
  else { header(); lamp(); pinned(); images(); bigrows(); themes(); texts(); counters(); marquees(); pointer(); }
  await runLoader();
  lenis && lenis.start();
  root.classList.add('is-loaded');
  if (!reduced) intro();
  addEventListener('load', () => ScrollTrigger.refresh());
  setTimeout(() => ScrollTrigger.refresh(), 600);
})();
