// Quang Thong portfolio: live weekly schedule. Loaded on idle; Firebase is imported only here.
import { firebaseConfig } from './firebase-config.js'

const weekEl = document.getElementById('qtWeek')
const rangeEl = document.getElementById('qtRange')
const liveEl = document.getElementById('qtLive')
const pill = document.getElementById('nextShow')
const comingBox = document.getElementById('qtComingBox')
const comingEl = document.getElementById('qtComing')
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const KINDS = { band: 'Band', collab: 'Collab', solo: 'Solo', session: 'Session' }
let shows = []
let unsub = null
let subFor = ''

const pad = (n) => String(n).padStart(2, '0')
const key = (d) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate())
const parse = (k) => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d) }
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x }
const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e }
const when = (s) => { const [h, m] = (s.start || '23:59').split(':').map(Number); const d = parse(s.date); d.setHours(h || 0, m || 0, 0, 0); return d }
const kindOf = (s) => (KINDS[s.kind] ? s.kind : 'band')
const withText = (s) => (s.with ? (kindOf(s) === 'collab' ? 'Collab with ' : 'With ') + s.with : '')
const safeLink = (u) => { try { const x = new URL(u); return /^https?:$/.test(x.protocol) ? x.href : '' } catch { return '' } }

function render() {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const week = [...Array(7)].map((_, i) => addDays(today, i))
  const weekEnd = key(week[6])
  rangeEl.textContent = week[0].getDate() + ' ' + MONTHS[week[0].getMonth()] + ' – ' + week[6].getDate() + ' ' + MONTHS[week[6].getMonth()]
  const frag = document.createDocumentFragment()
  week.forEach((d, i) => {
    const k = key(d)
    const day = el('article', 'day' + (i === 0 ? ' today' : ''))
    const head = el('header', 'dh')
    head.append(el('span', 'dow', i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : DAYS[d.getDay()]), el('span', 'dnum', d.getDate()), el('span', 'dmon', MONTHS[d.getMonth()]))
    day.append(head)
    const list = shows.filter((s) => s.date === k).sort((a, b) => (a.start || '').localeCompare(b.start || ''))
    if (!list.length) day.append(el('p', 'none', 'Free'))
    list.forEach((s) => {
      const href = safeLink(s.link)
      const e = el(href ? 'a' : 'div', 'show k-' + kindOf(s) + (i === 0 && s.start && when(s) < now ? ' past' : ''))
      if (href) { e.href = href; e.target = '_blank'; e.rel = 'noopener' }
      e.append(el('span', 'st', s.start ? s.start + (s.end ? '–' + s.end : '') : 'All day'))
      e.append(el('span', 'sn', s.with || s.title))
      if (s.with) e.append(el('span', 'sw', s.title))
      const where = [s.venue, s.city].filter(Boolean).join(', ')
      if (where) e.append(el('span', 'sx', where))
      if (s.note) e.append(el('span', 'sx', s.note))
      e.append(el('span', 'kind', KINDS[kindOf(s)]))
      day.append(e)
    })
    frag.append(day)
  })
  weekEl.replaceChildren(frag)

  const upcoming = shows.filter((s) => (s.start ? when(s) >= now : addDays(parse(s.date), 1) > now)).sort((a, b) => when(a) - when(b))
  const next = upcoming[0]
  if (next && pill) {
    const d = parse(next.date)
    const diff = Math.round((d - today) / 86400000)
    const label = diff === 0 ? 'Today' : diff === 1 ? 'Tomorrow' : DAYS[d.getDay()] + ' ' + d.getDate() + ' ' + MONTHS[d.getMonth()]
    pill.replaceChildren(el('i', 'live-dot'), el('span', '', 'Next · ' + label + (next.start ? ' · ' + next.start : '') + ' · ' + (next.with ? next.with + ' · ' : '') + next.title))
    pill.hidden = false
  } else if (pill) pill.hidden = true

  const later = upcoming.filter((s) => s.date > weekEnd).slice(0, 6)
  comingBox.hidden = !later.length
  comingEl.replaceChildren(...later.map((s) => {
    const li = el('li')
    const href = safeLink(s.link)
    const row = el(href ? 'a' : 'div', 'cm')
    if (href) { row.href = href; row.target = '_blank'; row.rel = 'noopener' }
    const d = parse(s.date)
    row.append(el('time', '', DAYS[d.getDay()] + ' ' + d.getDate() + ' ' + MONTHS[d.getMonth()]))
    const mid = el('div')
    mid.append(el('b', '', s.with || s.title))
    const sub = [s.with ? s.title : '', [s.venue, s.city].filter(Boolean).join(', '), s.start].filter(Boolean).join(' · ')
    if (sub) mid.append(el('small', '', sub))
    row.append(mid, el('span', 'kind', KINDS[kindOf(s)]))
    li.append(row)
    return li
  }))
}

async function subscribe() {
  const now = new Date()
  const from = key(now)
  if (from === subFor) return
  subFor = from
  if (unsub) { unsub(); unsub = null }
  if (!firebaseConfig.apiKey) return
  try {
    const [{ initializeApp, getApps }, f] = await Promise.all([import('firebase/app'), import('firebase/firestore')])
    const app = getApps()[0] || initializeApp(firebaseConfig)
    const db = f.getFirestore(app)
    const q = f.query(f.collection(db, 'shows'), f.where('date', '>=', from), f.where('date', '<=', key(addDays(now, 120))))
    unsub = f.onSnapshot(q, (snap) => {
      shows = snap.docs.map((d) => ({ id: d.id, ...d.data() })).filter((s) => s.scope === 'qt' || s.scope === 'both')
      liveEl.classList.add('on')
      render()
    }, () => liveEl.classList.remove('on'))
  } catch { liveEl.classList.remove('on') }
}

render()
subscribe()
setInterval(() => { if (!document.hidden) { subscribe(); render() } }, 30000)
