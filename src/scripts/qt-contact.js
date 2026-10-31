// Contact box shared by the three portfolio pages (site name in data-site on the form).
// Every message is saved to Firestore (admin Data tab) and can be sent by: this site, email app, Gmail, Zalo or WhatsApp.
import { firebaseConfig } from './firebase-config.js'
const EMAIL = 'quangthong3005@gmail.com'
const PHONE = '0775525482'
const INTL = '84' + PHONE.slice(1)
const SUBJECT = { portfolio: 'Hi Quang Thong, I want to connect about music', developer: 'Hi, I want to connect with you for work', audio: 'Hi, I want to talk about an audio plugin project' }

const cut = (v, n) => String(v || '').trim().slice(0, n)
function read(form) { const d = new FormData(form); return { name: cut(d.get('name'), 80), contact: cut(d.get('contact'), 120), message: cut(d.get('message'), 2000) } }
const text = (v) => 'Hello Quang Thong,\n\n' + v.message + '\n\nName: ' + v.name + '\nContact: ' + v.contact

async function save(site, v, via) {
  try {
    if (!firebaseConfig.apiKey) return false
    const [{ initializeApp, getApps }, a, f] = await Promise.all([import('firebase/app'), import('firebase/auth'), import('firebase/firestore')])
    const app = getApps()[0] || initializeApp(firebaseConfig)
    const auth = a.getAuth(app)
    if (!auth.currentUser) await a.signInAnonymously(auth)
    await f.addDoc(f.collection(f.getFirestore(app), 'requests'), { name: v.name, contact: v.contact, type: '', date: '', place: '', message: v.message, via, site, createdAt: f.serverTimestamp() })
    return true
  } catch { return false }
}

async function go(form, note, via) {
  const site = form.dataset.site || 'portfolio'
  const v = read(form)
  if (!v.name || !v.contact || !v.message) { note.textContent = 'Please fill in your name, how to reach you and a message.'; return }
  const subject = SUBJECT[site] || SUBJECT.portfolio
  const body = text(v)
  // open the other app first (needs the click), then save the copy in the background
  if (via === 'email') window.location.href = 'mailto:' + EMAIL + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body)
  else if (via === 'gmail') window.open('https://mail.google.com/mail/?view=cm&fs=1&to=' + EMAIL + '&su=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body), '_blank', 'noopener')
  else if (via === 'whatsapp') window.open('https://wa.me/' + INTL + '?text=' + encodeURIComponent(body), '_blank', 'noopener')
  else if (via === 'zalo') { try { await navigator.clipboard.writeText(body) } catch { /* ignore */ } window.open('https://zalo.me/' + PHONE, '_blank', 'noopener') }
  const btns = form.querySelectorAll('button'); btns.forEach((b) => { b.disabled = true })
  note.textContent = via === 'form' ? 'Sending...' : 'Saving a copy...'
  const ok = await save(site, v, via)
  btns.forEach((b) => { b.disabled = false })
  if (via === 'form') {
    if (ok) { form.reset(); note.textContent = 'Thank you! Your message was sent and I will reply soon.' }
    else { window.location.href = 'mailto:' + EMAIL + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body); note.textContent = 'Could not send it here, so your email app is opening instead.' }
  } else if (via === 'zalo') note.textContent = 'Zalo opened. Your message is copied: paste it into the chat.'
  else if (via === 'gmail') note.textContent = 'Gmail opened in a new tab with your message ready. Press Send there.'
  else if (via === 'whatsapp') note.textContent = 'WhatsApp opened with your message ready.'
  else note.textContent = 'Your email app should open with the message ready.'
}

export function wire(form) {
  if (form.dataset.wired) return
  form.dataset.wired = '1'
  const note = form.querySelector('.note')
  form.addEventListener('submit', (e) => { e.preventDefault(); go(form, note, 'form') })
  form.querySelectorAll('[data-via]').forEach((b) => b.addEventListener('click', () => {
    if (!form.reportValidity()) return
    go(form, note, b.dataset.via)
  }))
}
