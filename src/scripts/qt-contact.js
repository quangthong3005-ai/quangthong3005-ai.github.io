// Contact form: saves the message to Firestore (read it in the admin Data tab) and falls back to the email app.
import { firebaseConfig } from './firebase-config.js'
const EMAIL = 'quangthong3005@gmail.com'

export async function sendMessage(form, note) {
  const d = new FormData(form)
  const cut = (v, n) => String(v || '').trim().slice(0, n)
  const name = cut(d.get('name'), 80), contact = cut(d.get('contact'), 120), message = cut(d.get('message'), 2000)
  if (!name || !contact || !message) { note.textContent = 'Please fill in your name, how to reach you and a message.'; return }
  const btn = form.querySelector('button[type=submit]'); btn.disabled = true; note.textContent = 'Sending...'
  try {
    if (!firebaseConfig.apiKey) throw new Error('no firebase')
    const [{ initializeApp, getApps }, a, f] = await Promise.all([import('firebase/app'), import('firebase/auth'), import('firebase/firestore')])
    const app = getApps()[0] || initializeApp(firebaseConfig)
    const auth = a.getAuth(app)
    if (!auth.currentUser) await a.signInAnonymously(auth)
    await f.addDoc(f.collection(f.getFirestore(app), 'requests'), { name, contact, type: '', date: '', place: '', message, via: 'form', site: 'portfolio', createdAt: f.serverTimestamp() })
    form.reset(); note.textContent = 'Thank you! Your message was sent and I will reply soon.'
  } catch {
    window.location.href = 'mailto:' + EMAIL + '?subject=' + encodeURIComponent('Hi Quang Thong, message from ' + name) + '&body=' + encodeURIComponent(message + '\n\n' + name + ' · ' + contact)
    note.textContent = 'Could not send it here, so your email app is opening instead.'
  }
  btn.disabled = false
}
