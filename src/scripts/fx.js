// Shared light-weight effects for the portfolio pages (no libraries).
// reveal on scroll, scroll progress bar, pause animations off-screen, pointer glow, tilt cards, typing terminal.
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
const fine = matchMedia('(pointer: fine)').matches
const $$ = (s, r = document) => [...r.querySelectorAll(s)]

// 1) reveal (also exposed so content added later from the database animates in too)
const io = !reduce && 'IntersectionObserver' in window
  ? new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target) } }), { rootMargin: '0px 0px -8% 0px', threshold: 0.08 })
  : null
window.fxReveal = (root = document) => $$('.rv:not(.in)', root).forEach((e) => (io ? io.observe(e) : e.classList.add('in')))
window.fxReveal()

// 2) pause heavy loops while the hero is off screen
const hero = document.querySelector('[data-hero]')
if (hero && 'IntersectionObserver' in window) new IntersectionObserver(([e]) => document.body.classList.toggle('paused', !e.isIntersecting)).observe(hero)

// 3) scroll progress (transform only)
const bar = document.getElementById('bar')
if (bar) {
  let tick = false
  const upd = () => { tick = false; const h = document.documentElement.scrollHeight - innerHeight; bar.style.transform = 'scaleX(' + (h > 0 ? scrollY / h : 0) + ')' }
  addEventListener('scroll', () => { if (!tick) { tick = true; requestAnimationFrame(upd) } }, { passive: true }); upd()
}

// 4) pointer glow that follows the mouse inside the hero
const glow = document.getElementById('glow')
if (glow && hero && fine && !reduce) {
  let x = 0, y = 0, raf = 0
  hero.addEventListener('pointermove', (e) => { const r = hero.getBoundingClientRect(); x = e.clientX - r.left; y = e.clientY - r.top; if (!raf) raf = requestAnimationFrame(() => { raf = 0; glow.style.transform = 'translate(' + (x - 200) + 'px,' + (y - 200) + 'px)' }) }, { passive: true })
}

// 5) tilt cards
if (fine && !reduce) $$('.tilt').forEach((c) => {
  c.addEventListener('pointermove', (e) => { const r = c.getBoundingClientRect(); const px = (e.clientX - r.left) / r.width - .5, py = (e.clientY - r.top) / r.height - .5; c.style.setProperty('--ry', (px * 8).toFixed(2) + 'deg'); c.style.setProperty('--rx', (-py * 8).toFixed(2) + 'deg'); c.style.setProperty('--mx', (px * 100 + 50) + '%'); c.style.setProperty('--my', (py * 100 + 50) + '%') }, { passive: true })
  c.addEventListener('pointerleave', () => { c.style.setProperty('--ry', '0deg'); c.style.setProperty('--rx', '0deg') })
})

// 6) typing terminal: <pre data-type='["line 1","line 2"]'>
$$('[data-type]').forEach((pre) => {
  let lines = []; try { lines = JSON.parse(pre.dataset.type) } catch { /* ignore */ }
  if (!lines.length) return
  if (reduce) { pre.textContent = lines.join('\n'); return }
  let li = 0, ci = 0, out = ''
  const step = () => {
    if (li >= lines.length) return
    const L = lines[li]
    if (ci <= L.length) { pre.textContent = out + L.slice(0, ci) + '▌'; ci++; setTimeout(step, L.startsWith('$') ? 45 : 8) }
    else { out += L + '\n'; li++; ci = 0; setTimeout(step, 420) }
  }
  setTimeout(step, 700)
})

// 7) contact boxes (data-contact): small module, Firebase is only loaded when a message is saved
$$('form[data-contact]').forEach((f) => import('./qt-contact.js').then((m) => m.wire(f)))

// 8) content edited in the admin (texts, projects, plugins...) is loaded when the browser is idle
const pages = { dev: () => import('./dev-data.js'), audio: () => import('./audio-data.js') }
const pg = document.body.dataset.page
if (pg && pages[pg]) { const go = () => pages[pg]().catch(() => {}); 'requestIdleCallback' in window ? requestIdleCallback(go, { timeout: 1500 }) : setTimeout(go, 600) }
