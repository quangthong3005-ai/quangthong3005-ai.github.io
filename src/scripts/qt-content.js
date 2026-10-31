// Content edited in the portfolio admin: texts, extra videos and extra gallery photos.
// Loaded on idle; the page already looks complete without it.
import { firebaseConfig } from './firebase-config.js'

async function open() {
  if (!firebaseConfig.apiKey) throw new Error('no firebase')
  const [{ initializeApp, getApps }, f] = await Promise.all([import('firebase/app'), import('firebase/firestore')])
  const app = getApps()[0] || initializeApp(firebaseConfig)
  return { db: f.getFirestore(app), f }
}
const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e }

export function ytId(v) {
  const m = String(v || '').trim().match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([\w-]{11})|^([\w-]{11})$/)
  return m ? (m[1] || m[2]) : ''
}

;(async () => {
  let ctx
  try { ctx = await open() } catch { return }
  const { db, f } = ctx
  const [texts, vids, pics] = await Promise.allSettled([
    f.getDoc(f.doc(db, 'site', 'qt')),
    f.getDocs(f.query(f.collection(db, 'qtvideos'), f.orderBy('createdAt', 'desc'))),
    f.getDocs(f.query(f.collection(db, 'qtphotos'), f.orderBy('createdAt', 'desc'))),
  ])
  if (texts.status === 'fulfilled' && texts.value.exists()) {
    const t = texts.value.data()
    document.querySelectorAll('[data-text]').forEach((n) => { const v = t[n.dataset.text]; if (typeof v === 'string' && v.trim()) n.textContent = v })
  }
  const vbox = document.getElementById('qtVideos')
  if (vbox && vids.status === 'fulfilled') {
    vids.value.forEach((d) => {
      const { ytId: id, title } = d.data()
      if (!id) return
      const b = el('button', 'yt'); b.type = 'button'; b.setAttribute('aria-label', 'Play ' + (title || 'video'))
      b.style.backgroundImage = 'url(https://i.ytimg.com/vi/' + encodeURIComponent(id) + '/hqdefault.jpg)'
      b.append(el('span', 'pl'), el('span', 't', title || 'Video'))
      b.addEventListener('click', () => {
        const i = document.createElement('iframe')
        i.src = 'https://www.youtube-nocookie.com/embed/' + encodeURIComponent(id) + '?autoplay=1&rel=0'
        i.allow = 'autoplay; encrypted-media; picture-in-picture'; i.allowFullscreen = true; i.title = title || 'Video'
        b.replaceChildren(i); b.style.cursor = 'default'
      }, { once: true })
      vbox.append(b)
    })
  }
  const gbox = document.getElementById('qtGal')
  if (gbox && pics.status === 'fulfilled') {
    pics.value.forEach((d) => {
      const p = d.data(); if (!p.src || !String(p.src).startsWith('data:image/')) return
      const fig = el('figure'); const img = document.createElement('img')
      img.src = p.src; img.alt = p.caption || 'Photo'; img.loading = 'lazy'; img.decoding = 'async'
      fig.append(img); if (p.caption) fig.append(el('figcaption', '', p.caption))
      gbox.append(fig)
    })
  }
})()
