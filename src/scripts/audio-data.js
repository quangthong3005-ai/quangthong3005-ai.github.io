// Audio plugin page: texts and plugin cards edited in the admin.
import { applyTexts, list, el, safeUrl } from './fb.js'

applyTexts('audio').catch(() => {})
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16))
const mix = (a, b, t) => '#' + hex(a).map((v, i) => Math.round(v + (hex(b)[i] - v) * t).toString(16).padStart(2, '0')).join('')
// violet -> 660066 -> CC00FF across the cards
const colour = (i, n) => { const t = n > 1 ? i / (n - 1) : 0; return t < .5 ? mix('#8b5cf6', '#660066', t * 2) : mix('#660066', '#CC00FF', (t - .5) * 2) }

list('plugins').then((items) => {
  if (!items.length) return
  const box = document.getElementById('plCards')
  box.replaceChildren(...items.map((p, i) => {
    const c = el('article', 'card tilt rv' + (i % 3 ? ' d' + (i % 3) : '')); c.style.setProperty('--c', colour(i, items.length))
    if (p.image && String(p.image).startsWith('data:image/')) { const im = el('img', 'pimg'); im.src = p.image; im.alt = p.name || ''; im.loading = 'lazy'; im.decoding = 'async'; c.append(im) }
    else { const d = el('div', 'dial'); d.setAttribute('aria-hidden', 'true'); d.append(el('i')); c.append(d) }
    c.append(el('p', 'tag', p.tag || 'Plugin'), el('h3', '', p.name), el('p', '', p.desc || ''))
    const href = safeUrl(p.link)
    if (href) { const a = el('a', 'plink', (p.linkLabel || 'Learn more') + ' →'); a.href = href; a.target = '_blank'; a.rel = 'noopener'; c.append(a) }
    return c
  }))
  window.fxReveal && window.fxReveal(box)
}).catch(() => {})
