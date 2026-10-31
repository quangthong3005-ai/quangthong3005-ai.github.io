import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth'
import { getFirestore, collection, query, where, orderBy, onSnapshot, doc, getDoc, getDocs, setDoc, addDoc, deleteDoc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { firebaseConfig, adminEmails } from './firebase-config.js'
import { TEXT_FIELDS, DEV_TEXTS, AUDIO_TEXTS } from './qt-texts.js'
import { DEV_PROJECTS, DEV_SKILLS, DEV_EXP, PLUGINS } from './qt-defaults.js'

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
  if (ok) { subSchedule(); subPhotos(); subVideos(); loadTexts('qt', TEXT_FIELDS, 'textList', 'textMsg'); loadTexts('dev', DEV_TEXTS, 'devtextList', 'devtextMsg'); loadTexts('audio', AUDIO_TEXTS, 'audtextList', 'audtextMsg'); MANAGERS.forEach(startManager); subData() } else drawCal()
})

/* tabs are built per site in showSite() below */

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
async function loadTexts(docId, fields, listId, msgId) {
  let saved = {}
  try { const s = await getDoc(doc(db, 'site', docId)); if (s.exists()) saved = s.data() } catch { /* defaults */ }
  const box = $(listId); box.innerHTML = ''
  fields.forEach((f) => {
    const wrap = el('div'); const lab = el('label', '', f.label)
    const inp = f.multi ? el('textarea') : el('input'); if (f.multi) inp.rows = 3; inp.maxLength = 600; inp.value = saved[f.key] || f.default
    lab.append(inp)
    const row = el('div', 'row'); row.style.marginTop = '8px'
    const save = el('button', 'btn sm', 'Save'); save.type = 'button'
    const reset = el('button', 'btn ghost sm', 'Reset'); reset.type = 'button'
    save.addEventListener('click', async () => { await setDoc(doc(db, 'site', docId), { [f.key]: inp.value.trim() }, { merge: true }); flash(msgId, 'Saved.') })
    reset.addEventListener('click', async () => { inp.value = f.default; await setDoc(doc(db, 'site', docId), { [f.key]: '' }, { merge: true }); flash(msgId, 'Reset to the original text.') })
    row.append(save, reset); wrap.append(lab, row); box.append(wrap)
  })
}

/* ---------------- list managers (projects, skills, experience, plugins) ---------------- */
const MANAGERS = [
  { id: 'devprojects', title: 'Projects', sub: 'Projects shown on the Developer page. Use the arrows to change the order.', defaults: DEV_PROJECTS,
    fields: [{ k: 'title', l: 'Title', max: 100, req: 1, full: 1 }, { k: 'desc', l: 'Description', ta: 1, max: 400, full: 1 }, { k: 'tech', l: 'Tech used', max: 120 }, { k: 'linkLabel', l: 'Link text', max: 40 }, { k: 'link', l: 'Link (https://...)', type: 'url', max: 300, full: 1 }, { k: 'image', l: 'Image (optional)', img: 1, full: 1 }],
    head: (d) => d.title, meta: (d) => d.tech || d.desc },
  { id: 'devskills', title: 'Skills', sub: 'Skills shown on the Developer page.', defaults: DEV_SKILLS, fields: [{ k: 'name', l: 'Skill', max: 40, req: 1, full: 1 }], head: (d) => d.name, meta: () => '' },
  { id: 'devexp', title: 'Experience & education', sub: 'Timeline entries on the Developer page.', defaults: DEV_EXP,
    fields: [{ k: 'period', l: 'Period (e.g. 2026 - Present)', max: 40 }, { k: 'title', l: 'Role or degree', max: 100, req: 1 }, { k: 'text', l: 'Description', ta: 1, max: 400, full: 1 }], head: (d) => d.title, meta: (d) => d.period },
  { id: 'plugins', title: 'Plugin products', sub: 'Add, edit and remove plugins. A picture is optional: without one the card shows a dial.', defaults: PLUGINS,
    fields: [{ k: 'name', l: 'Plugin name', max: 60, req: 1 }, { k: 'tag', l: 'Type (Dynamics, Filter...)', max: 30, list: ['Dynamics', 'Filter', 'Harmonic', 'Modulation', 'Reverb', 'Delay', 'Utility'] }, { k: 'desc', l: 'Description', ta: 1, max: 500, full: 1 }, { k: 'linkLabel', l: 'Link text', max: 40 }, { k: 'link', l: 'Link (demo, download, video...)', type: 'url', max: 300, full: 1 }, { k: 'image', l: 'Picture / screenshot', img: 1, full: 1 }],
    head: (d) => d.name, meta: (d) => d.tag || d.desc },
]

function startManager(m) {
  const root = $('tab-' + m.id); if (!root || root.dataset.built) return
  root.dataset.built = '1'
  root.innerHTML = ''
  const head = el('div', 'mgr-head'); head.append(el('h2', '', m.title))
  const addBtn = el('button', 'btn sm', '+ Add'); addBtn.type = 'button'; head.append(addBtn)
  const form = el('form', 'form'); form.hidden = true
  const grid = el('div', 'grid'); form.append(grid)
  const inputs = {}
  m.fields.forEach((f) => {
    const lab = el('label', f.full ? 'full' : '', f.l)
    const inp = f.ta ? el('textarea') : el('input')
    if (f.ta) inp.rows = 3
    if (f.img) { inp.type = 'file'; inp.accept = 'image/*' } else { if (f.type) inp.type = f.type; inp.maxLength = f.max; if (f.req) inp.required = true }
    if (f.list) { const dl = el('datalist'); dl.id = m.id + '_' + f.k; f.list.forEach((v) => { const o = el('option'); o.value = v; dl.append(o) }); inp.setAttribute('list', dl.id); lab.append(dl) }
    lab.append(inp); grid.append(lab); inputs[f.k] = inp
  })
  const imgKeep = el('label', 'full'); const rm = el('input'); rm.type = 'checkbox'; rm.style.width = 'auto'; imgKeep.append(rm, document.createTextNode(' Remove the current picture')); imgKeep.style.display = 'flex'; imgKeep.style.gap = '8px'; imgKeep.style.alignItems = 'center'; imgKeep.hidden = true
  if (m.fields.some((f) => f.img)) grid.append(imgKeep)
  const row = el('div', 'row'); row.style.marginTop = '14px'
  const save = el('button', 'btn', 'Save'); save.type = 'submit'
  const cancel = el('button', 'btn ghost', 'Cancel'); cancel.type = 'button'
  row.append(save, cancel); form.append(row)
  const msg = el('p', 'msg'); msg.setAttribute('aria-live', 'polite')
  const listBox = el('div', 'items')
  root.append(head, el('p', 'sub', m.sub), form, msg, listBox)

  let editing = null, rows = []
  const close = () => { form.hidden = true; editing = null }
  const open = (r) => {
    editing = r || null; form.reset(); imgKeep.hidden = !(r && r.image); rm.checked = false
    m.fields.forEach((f) => { if (!f.img) inputs[f.k].value = (r && r[f.k]) || '' })
    save.textContent = r ? 'Save changes' : 'Add'; form.hidden = false; (Object.values(inputs)[0]).focus()
  }
  addBtn.addEventListener('click', () => open(null)); cancel.addEventListener('click', close)
  form.addEventListener('submit', async (e) => {
    e.preventDefault(); save.disabled = true
    try {
      const data = {}
      for (const f of m.fields) {
        if (f.img) { const file = inputs[f.k].files[0]; if (file) data[f.k] = await resize(file); else if (editing && rm.checked) data[f.k] = ''; else if (!editing) data[f.k] = '' }
        else data[f.k] = inputs[f.k].value.trim()
      }
      if (editing) await setDoc(doc(db, m.id, editing.id), data, { merge: true })
      else await addDoc(collection(db, m.id), { ...data, order: Date.now(), createdAt: serverTimestamp() })
      close(); flash2(msg, 'Saved. The website is updated.')
    } catch { flash2(msg, 'Could not save. Check the picture size and that the Firestore rules are published.') }
    save.disabled = false
  })
  const swap = async (i, j) => { const a = rows[i], b = rows[j]; if (!a || !b) return; await Promise.all([updateDoc(doc(db, m.id, a.id), { order: b.order }), updateDoc(doc(db, m.id, b.id), { order: a.order })]) }
  stops.push(onSnapshot(query(collection(db, m.id), orderBy('order')), (snap) => {
    rows = snap.docs.map((d) => ({ id: d.id, ...d.data() })); listBox.innerHTML = ''
    if (!rows.length) {
      listBox.append(el('p', 'sub', 'Nothing added yet, so the website shows its built-in version.'))
      const load = el('button', 'btn ghost sm', 'Load the current items so I can edit them'); load.type = 'button'
      load.addEventListener('click', async () => { load.disabled = true; const t = Date.now(); for (const [i, d] of m.defaults.entries()) await addDoc(collection(db, m.id), { ...d, order: t + i, createdAt: serverTimestamp() }) })
      listBox.append(load)
    }
    rows.forEach((r, i) => {
      const it = el('div', 'it')
      if (r.image) { const im = document.createElement('img'); im.src = r.image; im.alt = ''; it.append(im) }
      const tx = el('div', 'tx'); tx.append(el('b', '', m.head(r)), el('small', '', m.meta(r) || '')); it.append(tx)
      const up = el('button', 'btn ghost sm', '\u2191'); up.type = 'button'; up.disabled = i === 0; up.addEventListener('click', () => swap(i, i - 1))
      const dn = el('button', 'btn ghost sm', '\u2193'); dn.type = 'button'; dn.disabled = i === rows.length - 1; dn.addEventListener('click', () => swap(i, i + 1))
      const ed = el('button', 'btn ghost sm', 'Edit'); ed.type = 'button'; ed.addEventListener('click', () => { open(r); form.scrollIntoView({ behavior: 'smooth', block: 'nearest' }) })
      const del = el('button', 'btn danger sm', 'Delete'); del.type = 'button'; del.addEventListener('click', () => { if (confirm('Delete "' + m.head(r) + '"?')) deleteDoc(doc(db, m.id, r.id)) })
      it.append(up, dn, ed, del); listBox.append(it)
    })
  }))
}
const flash2 = (node, m) => { node.textContent = m; setTimeout(() => { if (node.textContent === m) node.textContent = '' }, 4500) }

/* ---------------- site switcher ---------------- */
const SITES = {
  musician: { tabs: [['schedule', 'Schedule'], ['photos', 'Photos'], ['videos', 'Videos'], ['texts', 'Texts'], ['data', 'Data']], data: 'portfolio', view: 'musician.html' },
  developer: { tabs: [['devprojects', 'Projects'], ['devskills', 'Skills'], ['devexp', 'Experience'], ['devtexts', 'Texts'], ['data', 'Data']], data: 'developer', view: 'developer.html' },
  audio: { tabs: [['plugins', 'Plugins'], ['audtexts', 'Texts'], ['data', 'Data']], data: 'audio', view: 'audio-plugin.html' },
}
const ALL_PANELS = ['schedule', 'photos', 'videos', 'texts', 'devprojects', 'devskills', 'devexp', 'devtexts', 'plugins', 'audtexts', 'data']
let curSite = 'musician'
function showTab(t) {
  ALL_PANELS.forEach((p) => { $('tab-' + p).hidden = p !== t })
  document.querySelectorAll('#tabs .tab').forEach((b) => b.classList.toggle('active', b.dataset.tab === t))
  if (t === 'data') { $('dSite').value = SITES[curSite].data; drawData(); markSeen() }
  try { history.replaceState(null, '', '#' + curSite + '/' + t) } catch { /* ignore */ }
}
function showSite(name, tab) {
  curSite = SITES[name] ? name : 'musician'
  document.querySelectorAll('.site').forEach((b) => b.classList.toggle('active', b.dataset.site === curSite))
  $('viewSite').href = SITES[curSite].view
  const box = $('tabs'); box.innerHTML = ''
  SITES[curSite].tabs.forEach(([id, label]) => {
    const b = el('button', 'tab', label); b.dataset.tab = id; b.addEventListener('click', () => showTab(id))
    if (id === 'data') { const n = el('span', 'dotn'); n.id = 'newBadge'; n.hidden = true; b.append(n) }
    box.append(b)
  })
  updateBadge()
  showTab(tab && SITES[curSite].tabs.some((t) => t[0] === tab) ? tab : SITES[curSite].tabs[0][0])
}
document.querySelectorAll('.site').forEach((b) => b.addEventListener('click', () => showSite(b.dataset.site)))

/* ---------------- data ---------------- */
const STATUS = { new: 'New', contacted: 'Contacted', quoted: 'Quoted', booked: 'Booked', done: 'Done', lost: 'Not going ahead' }
let requests = [], notes = {}, allShows = [], firstSnap = true
const SITE_LABEL = { portfolio: 'Musician', developer: 'Developer', audio: 'Audio', band: 'Band' }
const siteOf = (r) => r.site || 'band'
const SEEN_KEY = 'adminSeenAt'
const seenAt = () => { try { return Number(localStorage.getItem(SEEN_KEY)) || 0 } catch { return 0 } }
function markSeen() { try { localStorage.setItem(SEEN_KEY, String(Date.now())) } catch { /* ignore */ } updateBadge() }
function updateBadge() {
  const b = $('newBadge'); if (!b) return
  const n = requests.filter((r) => ms(r.createdAt) > seenAt()).length
  b.textContent = String(n); b.hidden = !n || !$('tab-data').hidden
}
const ago = (t) => { const s = Math.max(0, (Date.now() - ms(t)) / 1000); if (!ms(t) || s < 45) return 'just now'; if (s < 3600) return Math.round(s / 60) + ' min ago'; if (s < 86400) return Math.round(s / 3600) + ' h ago'; return Math.round(s / 86400) + ' d ago' }
const norm = (s) => String(s || '').trim().toLowerCase()
const ms = (t) => (t && t.toMillis ? t.toMillis() : 0)
const fmt = (t) => { const d = t && t.toDate ? t.toDate() : null; return d ? d.toLocaleDateString('vi-VN') + ' ' + d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : 'just now' }
const contactKey = (c) => { const v = norm(c); if (v.includes('@')) return v; const dg = v.replace(/\D/g, ''); return dg.length >= 8 ? dg.replace(/^84/, '0') : v }
const idOf = (k) => 'c_' + k.replace(/[^a-z0-9@._+-]/g, '_').slice(0, 120)
const download = (name, text, type) => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name; a.click(); URL.revokeObjectURL(a.href) }

Object.entries(STATUS).forEach(([k, v]) => { const o = el('option', '', v); o.value = k; $('dStatus').append(o) })

function subData() {
  stops.push(onSnapshot(query(collection(db, 'requests'), orderBy('createdAt', 'desc')), (s) => {
    requests = s.docs.map((d) => ({ id: d.id, ...d.data() }))
    const fresh = new Set(firstSnap ? [] : s.docChanges().filter((c) => c.type === 'added').map((c) => c.doc.id))
    firstSnap = false
    drawData(); drawFeed(fresh); updateBadge()
  }))
  stops.push(() => { firstSnap = true })
  const tickId = setInterval(() => drawFeed(), 30000); stops.push(() => clearInterval(tickId))
  stops.push(onSnapshot(collection(db, 'customers'), (s) => { notes = {}; s.forEach((d) => { notes[d.id] = d.data() }); drawData() }))
  stops.push(onSnapshot(collection(db, 'shows'), (s) => { allShows = s.docs.map((d) => ({ id: d.id, ...d.data() })); drawData() }))
}

function drawFeed(fresh = new Set()) {
  const box = $('feedList'); if (!box) return
  box.replaceChildren(...requests.slice(0, 8).map((r) => {
    const row = el('div', 'fi' + (fresh.has(r.id) ? ' fresh' : ''))
    row.append(el('span', 'badge s-' + siteOf(r), SITE_LABEL[siteOf(r)] || siteOf(r)), el('b', '', r.name || 'Guest'), el('span', 'm', r.message || ''), el('time', '', ago(r.createdAt)))
    return row
  }))
  if (!requests.length) box.append(el('p', 'sub', 'Nothing yet. New messages will pop up here instantly.'))
}

function groups() {
  const map = new Map()
  for (const r of requests) {
    const k = contactKey(r.contact) || 'name:' + norm(r.name)
    if (!map.has(k)) map.set(k, { key: k, name: r.name, contacts: new Set(), items: [] })
    const g = map.get(k); g.items.push(r); g.contacts.add(r.contact)
  }
  const list = [...map.values()]
  list.forEach((g) => { g.last = Math.max(...g.items.map((r) => ms(r.createdAt))); g.meta = notes[idOf(g.key)] || {}; g.sites = new Set(g.items.map(siteOf)) })
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
  $('stats').replaceChildren(...[[all.length, 'Customers'], [requests.length, 'Messages'], [all.filter((g) => (g.meta.status || 'new') === 'new').length, 'New'], [requests.filter((r) => siteOf(r) === 'portfolio').length, 'Musician msgs'], [requests.filter((r) => siteOf(r) === 'developer').length, 'Developer msgs'], [requests.filter((r) => siteOf(r) === 'audio').length, 'Audio msgs']].map(([n, l]) => { const s = el('div', 'stat'); s.append(el('b', '', String(n)), el('span', '', l)); return s }))
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
      const it = el('div', 'item'); const t = el('time'); t.append(document.createTextNode(fmt(r.createdAt) + ' · ')); t.append(el('span', 'badge s-' + siteOf(r), SITE_LABEL[siteOf(r)] || siteOf(r)), document.createTextNode(' · ' + ago(r.createdAt)))
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
  for (const g of groups()) g.items.slice().sort((a, b) => ms(a.createdAt) - ms(b.createdAt)).forEach((r) => rows.push([g.name, r.contact, STATUS[g.meta.status || 'new'], g.meta.note || '', fmt(r.createdAt), SITE_LABEL[siteOf(r)] || siteOf(r), r.type, r.date, r.place, r.message]))
  download('customers.csv', '﻿' + rows.map((r) => r.map((c) => '"' + String(c ?? '').replace(/"/g, '""') + '"').join(',')).join('\r\n'), 'text/csv;charset=utf-8')
})
$('dJson').addEventListener('click', async () => {
  $('dMsg').textContent = 'Collecting...'
  const read = async (c) => (await getDocs(collection(db, c))).docs.map((d) => ({ id: d.id, ...d.data() }))
  const strip = (l) => l.map(({ src, image, photo, ...r }) => ({ ...r, hasImage: !!(src || image || photo) }))
  const names = ['requests', 'customers', 'shows', 'qtvideos', 'qtphotos', 'site', 'devprojects', 'devskills', 'devexp', 'plugins']
  const res = await Promise.all(names.map((n) => read(n).catch(() => [])))
  const data = { exportedAt: new Date().toISOString() }
  names.forEach((n, i) => { data[n] = strip(res[i]) })
  download('portfolio-data-' + key(new Date()) + '.json', JSON.stringify(data, null, 2), 'application/json')
  flash('dMsg', 'Downloaded. Pictures are listed without the image data to keep the file small.')
})

{ const [s, t] = location.hash.slice(1).split('/'); showSite(s, t) }
