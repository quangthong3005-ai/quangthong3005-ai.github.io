// Developer page: texts, projects, skills and experience edited in the admin.
// If the database has none of an item type, the built-in HTML stays as it is.
import { applyTexts, list, el, safeUrl } from './fb.js'

applyTexts('dev').catch(() => {})
const pad = (n) => String(n).padStart(2, '0')

list('devskills').then((skills) => {
  if (!skills.length) return
  document.getElementById('devChips').replaceChildren(...skills.map((s) => el('li', 'chip', s.name)))
  const row = () => { const d = el('div'); skills.forEach((s) => d.append(el('span', '', s.name))); return d }
  document.getElementById('devRibbon').replaceChildren(row(), row())
}).catch(() => {})

list('devprojects').then((items) => {
  if (!items.length) return
  const box = document.getElementById('devCards')
  box.replaceChildren(...items.map((p, i) => {
    const c = el('article', 'card tilt rv' + (i % 3 ? ' d' + (i % 3) : ''))
    if (p.image && String(p.image).startsWith('data:image/')) { const im = el('img', 'pimg'); im.src = p.image; im.alt = ''; im.loading = 'lazy'; c.append(im) }
    c.append(el('div', 'n', pad(i + 1)), el('h3', '', p.title), el('p', '', p.desc || ''))
    if (p.tech) c.append(el('small', '', 'Tech: ' + p.tech))
    const href = safeUrl(p.link)
    if (href) { const a = el('a', 'lk', p.linkLabel || 'View project'); a.href = href; a.target = '_blank'; a.rel = 'noopener'; c.append(a) }
    return c
  }))
  window.fxReveal && window.fxReveal(box)
}).catch(() => {})

list('devexp').then((items) => {
  if (!items.length) return
  const box = document.getElementById('devTl')
  box.replaceChildren(...items.map((x, i) => { const li = el('li', 'rv' + (i % 3 ? ' d' + (i % 3) : '')); li.append(el('small', '', x.period || ''), el('h3', '', x.title), el('p', '', x.text || '')); return li }))
  window.fxReveal && window.fxReveal(box)
}).catch(() => {})
