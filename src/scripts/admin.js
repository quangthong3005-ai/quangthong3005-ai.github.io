import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth'
import { getFirestore, collection, query, where, orderBy, onSnapshot, doc, getDoc, getDocs, setDoc, addDoc, deleteDoc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { firebaseConfig, adminEmails } from './firebase-config.js'
import { TEXT_FIELDS } from './qt-texts.js'

const app = initializeApp(firebaseConfig)
const auth = getAuth(app)
const db = getFirestore(app)
const $ = (id) => document.getElementById(id)
const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e }
const pad = (n) => String(n).padStart(2, '0')
const key = (d) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate())
const parse = (k) => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d) }
const flash = (id, m) => { $(id).textContent = m; setTimeout(() => { if ($(id).textContent === m) $(id).textContent = '' }, 4000) }

let signedIn = false
const stops = []

$('signIn').addEventListener('click', () => signInWithPopup(auth, new GoogleAuthProvider()).catch(() => {}))
$('signOut').addEventListener('click', () => signOut(auth))
onAuthStateChanged(auth, (user) => {
  const ok = !!(user && !user.isAnonymous && user.email && adminEmails.includes(user.email))
  signedIn = ok
  $('loginBox').hidden = ok; $('app').hidden = !ok; $('signOut').hidden = !ok
  $('loginMsg').textContent = user && !user.isAnonymous && !ok ? user.email + ' is not allowed to use this page.' : ''
  stops.splice(0).forEach((s) => s())
  if (ok) { subSchedule(); subPhotos(); subVideos(); loadTexts(); subData() } else drawCal()
})

document.querySelectorAll('.tab').forEach((b) => b.addEventListener('click', () => {
  document.querySelectorAll('.tab').forEach((x) => { x.classList.toggle('active', x === b); $('tab-' + x.dataset.tab).hidden = x !== b })
}))

/* ---------------- schedule ---------------- */
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
let view = new Date(); view.setDate(1)
let shows = [], editingId = null, selected = '', unsubCal = null
const mine = (s) => s.scope === 'qt' || s.scope === 'both'

function gridStart() { const d = new Date(view.getFullYear(), view.getMonth(), 1); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d }

function subSchedule() {
  if (unsubCal) unsubCal()
  const start = gridStart(); const end = new Date(start); end.setDate(end.getDate() + 41)
  unsubCal = onSnapshot(query(collection(db, 'shows'), where('date', '>=', key(start)), where('date', '<=', key(end))),
    (snap) => { shows = snap.docs.map((d) => ({ id: d.id, ...d.data() })).filter(mine); $('calLive').classList.add('on'); drawCal() },
    () => $('calLive').classList.remove('on'))
  if (!stops.includes(stopCal)) stops.push(stopCal)
  if (!window.__upStop) {
    const t = new Date(), t2 = new Date(); t2.setDate(t2.getDate() + 60)
    window.__upStop = onSnapshot(query(collection(db, 'shows'), where('date', '>=', key(t)), where('date', '<=', key(t2))), (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() })).filter(mine).sort((a, b) => (a.date + (a.start || '')).localeCompare(b.date + (b.start || '')))
      const box = $('calUpcoming'); box.innerHTML = ''
      if (!list.length) box.append(el('p', 'sub', 'No shows in the next 60 days.'))
      list.forEach((s) => {
        const d = parse(s.date); const b = el('button', 'up'); b.type = 'button'
        b.append(el('b', '', DOW[(d.getDay() + 6) % 7] + ' ' + d.getDate() + ' ' + MONTHS[d.getMonth()].slice(0, 3) + (s.start ? ' · ' + s.start : '')), el('span', '', (s.with ? s.with + ' · ' : '') + s.title))
        b.addEventListener('click', () => { view = new Date(d.getFullYear(), d.getMonth(), 1); subSchedule(); openForm(s) })
        box.append(b)
      })
    })
    stops.push(() => { window.__upStop(); window.__upStop = null })
  }
}
function stopCal() { if (unsubCal) { unsubCal(); unsubCal = null } }

function drawCal() {
  $('calTitle').textContent = MONTHS[view.getMonth()] + ' ' + view.getFullYear()
  const g = $('calGrid'); g.innerHTML = ''
  DOW.forEach((d) => g.append(el('div', 'dow', d)))
  const start = gridStart(); const today = key(new Date())
  for (let i = 0; i < 42; i++) {
    const d = new Date(start); d.setDate(d.getDate() + i); const k = key(d)
    const cell = el('div', 'cell' + (d.getMonth() !== view.getMonth() ? ' out' : '') + (k === today ? ' today' : '') + (k === selected ? ' sel' : ''))
    cell.tabIndex = 0; cell.setAttribute('role', 'button'); cell.setAttribute('aria-label', 'Add show on ' + k)
    const num = el('div', 'num'); num.append(el('span', '', String(d.getDate())), el('span', '', '+')); cell.append(num)
    const list = shows.filter((s) => s.date === k).sort((a, b) => (a.start || '').localeCompare(b.start || ''))
    list.slice(0, 3).forEach((s) => {
      const c = el('button', 'chip ' + (s.kind || 'band') + (s.scope === 'both' ? ' both' : ''), (s.start ? s.start + ' ' : '') + (s.with ? s.with + ' · ' : '') + s.title); c.type = 'button'; c.title = s.title
      c.addEventListener('click', (ev) => { ev.stopPropagation(); openForm(s) }); cell.append(c)
    })
    if (list.length > 3) cell.append(el('span', 'more', '+' + (list.length - 3) + ' more'))
    const add = () => openForm({ date: k })
    cell.addEventListener('click', add)
    cell.addEventListener('keydown', (ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); add() } })
    g.append(cell)
  }
}

function openForm(s) {
  editingId = s.id || null; selected = s.date || ''
  $('shTitle').value = s.title || ''; $('shWith').value = s.with || ''; $('shKind').value = s.kind || 'band'
  $('shDate').value = s.date || ''; $('shCity').value = s.city || ''; $('shStart').value = s.start || ''; $('shEnd').value = s.end || ''
  $('shVenue').value = s.venue || ''; $('shNote').value = s.note || ''; $('shLink').value = s.link || ''; $('shScope').value = s.scope === 'both' ? 'both' : 'qt'
  $('shDelete').hidden = !editingId; $('shSave').textContent = editingId ? 'Save changes' : 'Add show'
  $('calForm').hidden = false; $('shMsg').textContent = ''; drawCal()
  $('calForm').scrollIntoView({ behavior: 'smooth', block: 'nearest' }); $('shTitle').focus()
}
function closeForm() { $('calForm').hidden = true; editingId = null; selected = ''; drawCal() }

$('calForm').addEventListener('submit', async (e) => {
  e.preventDefault()
  const data = { title: $('shTitle').value.trim(), with: $('shWith').value.trim(), kind: $('shKind').value, date: $('shDate').value, city: $('shCity').value.trim(),
    start: $('shStart').value, end: $('shEnd').value, venue: $('shVenue').value.trim(), note: $('shNote').value.trim(), link: $('shLink').value.trim(), scope: $('shScope').value }
  try {
    if (editingId) await setDoc(doc(db, 'shows', editingId), data, { merge: true })
    else await addDoc(collection(db, 'shows'), { ...data, createdAt: serverTimestamp() })
    const d = parse(data.date)
    if (d.getMonth() !== view.getMonth() || d.getFullYear() !== view.getFullYear()) { view = new Date(d.getFullYear(), d.getMonth(), 1); subSchedule() }
    $('shMsg').textContent = 'Saved. The portfolio is updated.'; editingId = null; $('calForm').hidden = true; selected = ''; drawCal()
  } catch { $('shMsg').textContent = 'Could not save. Check that the Firestore rules are published.' }
})
$('shDelete').addEventListener('click', async () => { if (editingId && confirm('Delete this show?')) { await deleteDoc(doc(db, 'shows', editingId)); closeForm() } })
$('shCancel').addEventListener('click', closeForm)
const move = (n) => { view = new Date(view.getFullYear(), view.getMonth() + n, 1); if (signedIn) subSchedule(); else drawCal() }
$('calPrev').addEventListener('click', () => move(-1)); $('calNext').addEventListener('click', () => move(1))
$('calToday').addEventListener('click', () => { view = new Date(); view.setDate(1); if (signedIn) subSchedule(); else drawCal() })
drawCal()

/* ---------------- photos ---------------- */
function resize(file, max = 1600, limit = 900000) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file); const img = new Image()
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height)); const c = document.createElement('canvas')
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k)
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url)
      let q = 0.84, out = c.toDataURL('image/jpeg', q)
      while (out.length > limit && q > 0.4) { q -= 0.08; out = c.toDataURL('image/jpeg', q) }
      out.length > limit ? reject(new Error('too big')) : resolve(out)
    }
    img.onerror = () => reject(new Error('not an image')); img.src = url
  })
}
$('photoForm').addEventListener('submit', async (e) => {
  e.preventDefault()
  const files = Array.from($('photoFile').files); if (!files.length) return
  $('photoBtn').disabled = true; let done = 0
  for (const f of files) {
    $('photoMsg').textContent = 'Uploading ' + (done + 1) + ' / ' + files.length + '...'
    try { await addDoc(collection(db, 'qtphotos'), { src: await resize(f), caption: $('photoCaption').value.trim(), createdAt: serverTimestamp() }); done++ }
    catch { $('photoMsg').textContent = 'Could not upload ' + f.name + '.'; $('photoBtn').disabled = false; return }
  }
  $('photoMsg').textContent = 'Done: ' + done + ' photo(s) added.'; $('photoForm').reset(); $('photoBtn').disabled = false
})
function subPhotos() {
  stops.push(onSnapshot(query(collection(db, 'qtphotos'), orderBy('createdAt', 'desc')), (snap) => {
    const box = $('photoList'); box.innerHTML = ''
    if (snap.empty) box.append(el('p', 'sub', 'No uploaded photos yet.'))
    snap.forEach((d) => {
      const p = d.data(); const t = el('div', 'tile'); const img = document.createElement('img'); img.src = p.src; img.alt = ''
      const cap = el('input'); cap.value = p.caption || ''; cap.maxLength = 80; cap.placeholder = 'Caption'
      cap.addEventListener('change', () => updateDoc(doc(db, 'qtphotos', d.id), { caption: cap.value.trim() }))
      const del = el('button', 'btn danger sm', 'Delete'); del.type = 'button'
      del.addEventListener('click', () => { if (confirm('Delete this photo?')) deleteDoc(doc(db, 'qtphotos', d.id)) })
      t.append(img, cap, del); box.append(t)
    })
  }))
}

/* ---------------- videos ---------------- */
const ytId = (v) => { const m = String(v || '').trim().match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([\w-]{11})|^([\w-]{11})$/); return m ? (m[1] || m[2]) : '' }
$('videoForm').addEventListener('submit', async (e) => {
  e.preventDefault()
  const id = ytId($('videoUrl').value)
  if (!id) { flash('videoMsg', 'That does not look like a YouTube link.'); return }
  try { await addDoc(collection(db, 'qtvideos'), { ytId: id, title: $('videoTitle').value.trim(), createdAt: serverTimestamp() }); $('videoForm').reset(); flash('videoMsg', 'Video added.') }
  catch { flash('videoMsg', 'Could not add it. Check the Firestore rules.') }
})
function subVideos() {
  stops.push(onSnapshot(query(collection(db, 'qtvideos'), orderBy('createdAt', 'desc')), (snap) => {
    const box = $('videoList'); box.innerHTML = ''
    if (snap.empty) box.append(el('p', 'sub', 'No extra videos yet.'))
    snap.forEach((d) => {
      const v = d.data(); const t = el('div', 'tile'); const img = document.createElement('img'); img.src = 'https://i.ytimg.com/vi/' + encodeURIComponent(v.ytId) + '/hqdefault.jpg'; img.alt = ''
      const title = el('input'); title.value = v.title || ''; title.maxLength = 100; title.placeholder = 'Title'
      title.addEventListener('change', () => updateDoc(doc(db, 'qtvideos', d.id), { title: title.value.trim() }))
      const del = el('button', 'btn danger sm', 'Delete'); del.type = 'button'
      del.addEventListener('click', () => { if (confirm('Delete this video?')) deleteDoc(doc(db, 'qtvideos', d.id)) })
      t.append(img, title, del); box.append(t)
    })
  }))
}

/* ---------------- texts ---------------- */
async function loadTexts() {
  let saved = {}
  try { const s = await getDoc(doc(db, 'site', 'qt')); if (s.exists()) saved = s.data() } catch { /* defaults */ }
  const box = $('textList'); box.innerHTML = ''
  TEXT_FIELDS.forEach((f) => {
    const wrap = el('div'); const lab = el('label', '', f.label)
    const inp = f.multi ? el('textarea') : el('input'); if (f.multi) inp.rows = 3; inp.maxLength = 600; inp.value = saved[f.key] ?? f.default
    lab.append(inp)
    const row = el('div', 'row'); row.style.marginTop = '8px'
    const save = el('button', 'btn sm', 'Save'); save.type = 'button'
    const reset = el('button', 'btn ghost sm', 'Reset'); reset.type = 'button'
    save.addEventListener('click', async () => { await setDoc(doc(db, 'site', 'qt'), { [f.key]: inp.value.trim() }, { merge: true }); flash('textMsg', 'Saved.') })
    reset.addEventListener('click', async () => { inp.value = f.default; await setDoc(doc(db, 'site', 'qt'), { [f.key]: '' }, { merge: true }); flash('textMsg', 'Reset to the original text.') })
    row.append(save, reset); wrap.append(lab, row); box.append(wrap)
  })
}

/* ---------------- data ---------------- */
const STATUS = { new: 'New', contacted: 'Contacted', quoted: 'Quoted', booked: 'Booked', done: 'Done', lost: 'Not going ahead' }
let requests = [], notes = {}, allShows = []
const norm = (s) => String(s || '').trim().toLowerCase()
const ms = (t) => (t && t.toMillis ? t.toMillis() : 0)
const fmt = (t) => { const d = t && t.toDate ? t.toDate() : null; return d ? d.toLocaleDateString('vi-VN') + ' ' + d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : 'just now' }
const contactKey = (c) => { const v = norm(c); if (v.includes('@')) return v; const dg = v.replace(/\D/g, ''); return dg.length >= 8 ? dg.replace(/^84/, '0') : v }
const idOf = (k) => 'c_' + k.replace(/[^a-z0-9@._+-]/g, '_').slice(0, 120)
const download = (name, text, type) => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name; a.click(); URL.revokeObjectURL(a.href) }

Object.entries(STATUS).forEach(([k, v]) => { const o = el('option', '', v); o.value = k; $('dStatus').append(o) })

function subData() {
  stops.push(onSnapshot(query(collection(db, 'requests'), orderBy('createdAt', 'desc')), (s) => { requests = s.docs.map((d) => ({ id: d.id, ...d.data() })); drawData() }))
  stops.push(onSnapshot(collection(db, 'customers'), (s) => { notes = {}; s.forEach((d) => { notes[d.id] = d.data() }); drawData() }))
  stops.push(onSnapshot(collection(db, 'shows'), (s) => { allShows = s.docs.map((d) => ({ id: d.id, ...d.data() })); drawData() }))
}

function groups() {
  const map = new Map()
  for (const r of requests) {
    const k = contactKey(r.contact) || 'name:' + norm(r.name)
    if (!map.has(k)) map.set(k, { key: k, name: r.name, contacts: new Set(), items: [] })
    const g = map.get(k); g.items.push(r); g.contacts.add(r.contact)
  }
  const list = [...map.values()]
  list.forEach((g) => { g.last = Math.max(...g.items.map((r) => ms(r.createdAt))); g.meta = notes[idOf(g.key)] || {}; g.sites = new Set(g.items.map((r) => r.site || 'band')) })
  return list.sort((a, b) => b.last - a.last)
}
function visible() {
  const q = norm($('dSearch').value), site = $('dSite').value, st = $('dStatus').value
  return groups().filter((g) => {
    if (site && !g.sites.has(site)) return false
    if (st && (g.meta.status || 'new') !== st) return false
    return !q || [g.name, ...g.contacts, g.meta.note, ...g.items.map((r) => r.message)].map(norm).join(' ').includes(q)
  })
}

function drawData() {
  const all = groups()
  const upcoming = allShows.filter((s) => s.date >= key(new Date()) && mine(s)).length
  $('stats').replaceChildren(...[[all.length, 'Customers'], [requests.length, 'Messages'], [all.filter((g) => (g.meta.status || 'new') === 'new').length, 'New'], [upcoming, 'Upcoming shows']].map(([n, l]) => { const s = el('div', 'stat'); s.append(el('b', '', String(n)), el('span', '', l)); return s }))
  const box = $('dList'); const open = new Set([...box.querySelectorAll('details[open]')].map((d) => d.dataset.key)); box.innerHTML = ''
  const list = visible()
  if (!list.length) { box.append(el('p', 'sub', 'No messages yet. Messages from the Contact form will appear here.')); return }
  for (const g of list) {
    const status = g.meta.status || 'new'
    const det = el('details', 'cust'); det.dataset.key = g.key; if (open.has(g.key)) det.open = true
    const sum = el('summary'); const left = el('div'); left.append(el('span', 'name', g.name || 'Guest'), el('small', '', [...g.contacts].join(' · ')))
    const right = el('div'); right.style.textAlign = 'right'
    right.append(el('span', 'badge', STATUS[status]), el('small', '', g.items.length + ' message' + (g.items.length === 1 ? '' : 's') + ' · ' + fmt({ toDate: () => new Date(g.last) })))
    sum.append(left, right); det.append(sum)
    const body = el('div', 'cbody')
    g.items.slice().sort((a, b) => ms(a.createdAt) - ms(b.createdAt)).forEach((r) => {
      const it = el('div', 'item'); const t = el('time'); t.append(document.createTextNode(fmt(r.createdAt) + ' · ')); t.append(el('span', 'badge' + (r.site === 'portfolio' ? '' : ' band'), r.site === 'portfolio' ? 'Portfolio' : 'Band'))
      it.append(t, document.createTextNode([r.type && 'Event: ' + r.type, r.date && 'Date: ' + r.date, r.place && 'Place: ' + r.place, r.message].filter(Boolean).join('\n')))
      body.append(it)
    })
    const sel = el('select'); for (const [k, v] of Object.entries(STATUS)) { const o = el('option', '', v); o.value = k; if (k === status) o.selected = true; sel.append(o) }
    const note = el('textarea'); note.rows = 3; note.maxLength = 2000; note.placeholder = 'Private note (what they asked, next step...)'; note.value = g.meta.note || ''
    const save = el('button', 'btn sm', 'Save note'); save.type = 'button'
    save.addEventListener('click', async () => { await setDoc(doc(db, 'customers', idOf(g.key)), { name: g.name || '', status: sel.value, note: note.value.trim(), updatedAt: new Date() }, { merge: true }); flash('dMsg', 'Saved note for ' + (g.name || 'customer') + '.') })
    body.append(sel, note, save); det.append(body); box.append(det)
  }
}
;['dSearch', 'dSite', 'dStatus'].forEach((id) => $(id).addEventListener('input', drawData))

$('dCsv').addEventListener('click', () => {
  const rows = [['Customer', 'Contact', 'Status', 'Note', 'Sent at', 'Site', 'Event', 'Date', 'Place', 'Message']]
  for (const g of groups()) g.items.slice().sort((a, b) => ms(a.createdAt) - ms(b.createdAt)).forEach((r) => rows.push([g.name, r.contact, STATUS[g.meta.status || 'new'], g.meta.note || '', fmt(r.createdAt), r.site || 'band', r.type, r.date, r.place, r.message]))
  download('customers.csv', '﻿' + rows.map((r) => r.map((c) => '"' + String(c ?? '').replace(/"/g, '""') + '"').join(',')).join('\r\n'), 'text/csv;charset=utf-8')
})
$('dJson').addEventListener('click', async () => {
  $('dMsg').textContent = 'Collecting...'
  const read = async (c) => (await getDocs(collection(db, c))).docs.map((d) => ({ id: d.id, ...d.data() }))
  const strip = (l) => l.map(({ src, ...r }) => ({ ...r, hasImage: !!src }))
  const [req, cus, sh, vid, ph, txt, qt] = await Promise.all([read('requests'), read('customers'), read('shows'), read('qtvideos'), read('qtphotos'), read('site'), read('members').catch(() => [])])
  const data = { exportedAt: new Date().toISOString(), requests: req, customers: cus, shows: sh, videos: vid, photos: strip(ph), texts: txt, members: qt.map(({ photo, ...m }) => m) }
  download('portfolio-data-' + key(new Date()) + '.json', JSON.stringify(data, null, 2), 'application/json')
  flash('dMsg', 'Downloaded. Photos are listed without the image data to keep the file small.')
})
