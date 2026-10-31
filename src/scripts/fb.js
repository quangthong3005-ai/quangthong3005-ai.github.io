// Lazy Firebase helper for the public pages (loaded only when a page needs data).
import { firebaseConfig } from './firebase-config.js'
export async function open() {
  if (!firebaseConfig.apiKey) throw new Error('no firebase')
  const [{ initializeApp, getApps }, f] = await Promise.all([import('firebase/app'), import('firebase/firestore')])
  const app = getApps()[0] || initializeApp(firebaseConfig)
  return { db: f.getFirestore(app), f }
}
export const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e }
export const safeUrl = (u) => { try { const x = new URL(u); return /^https?:$/.test(x.protocol) ? x.href : '' } catch { return '' } }
export async function applyTexts(docId) {
  const { db, f } = await open()
  const s = await f.getDoc(f.doc(db, 'site', docId))
  if (!s.exists()) return
  const t = s.data()
  document.querySelectorAll('[data-text]').forEach((n) => { const v = t[n.dataset.text]; if (typeof v === 'string' && v.trim()) n.textContent = v })
}
export async function list(col) {
  const { db, f } = await open()
  const snap = await f.getDocs(f.query(f.collection(db, col), f.orderBy('order')))
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}
