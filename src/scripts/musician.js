// Lightweight page script for musician.html (replaces ScrollReveal here to keep the page fast).
// 1) reveal-on-scroll with one IntersectionObserver
// 2) pause the continuous animations while the hero is off screen
// 3) load the schedule (and Firebase) only when the page is idle
const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches

const items = document.querySelectorAll('.rv')
if (reduce || !('IntersectionObserver' in window)) {
  items.forEach((el) => el.classList.add('in'))
} else {
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target) } })
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 })
  items.forEach((el) => io.observe(el))
}

const hero = document.querySelector('.hero')
if (hero && 'IntersectionObserver' in window) {
  new IntersectionObserver(([e]) => document.body.classList.toggle('paused', !e.isIntersecting)).observe(hero)
}

const startSchedule = () => { import('./qt-schedule.js'); import('./qt-content.js') }
if ('requestIdleCallback' in window) requestIdleCallback(startSchedule, { timeout: 1500 })
else setTimeout(startSchedule, 600)

const cf = document.getElementById('qtContact')
if (cf) cf.addEventListener('submit', (e) => { e.preventDefault(); import('./qt-contact.js').then((m) => m.sendMessage(cf, document.getElementById('qtNote'))) })
