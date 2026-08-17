import { useMemo, type JSX } from 'react'
import { useApp } from '../lib/store'
import { useT } from './ui'
import { Icon, type IconName } from './Icons'
import { htmlToText } from '../lib/words'

interface Result {
  kind: '章节' | '笔记' | '人物' | '世界观' | '时间线'
  icon: IconName
  title: string
  snippet: string
  action: () => void
}

function snippetAround(text: string, query: string, radius = 40): string {
  const idx = text.toLowerCase().indexOf(query.toLowerCase())
  if (idx === -1) return text.slice(0, 120)
  const start = Math.max(0, idx - radius)
  const end = Math.min(text.length, idx + query.length + radius)
  return (start > 0 ? '…' : '') + text.slice(start, end) + (end < text.length ? '…' : '')
}

export function SearchView(): JSX.Element {
  const t = useT()
  const book = useApp((s) => s.book)
  const query = useApp((s) => s.query)
  const setQuery = useApp((s) => s.setQuery)
  const openChapterLocated = useApp((s) => s.openChapterLocated)
  const openNote = useApp((s) => s.openNote)
  const openChar = useApp((s) => s.openChar)
  const openWorld = useApp((s) => s.openWorld)
  const openTimeline = useApp((s) => s.openTimeline)

  const results = useMemo<Result[]>(() => {
    if (!book || !query.trim()) return []
    const q = query.trim()
    const out: Result[] = []
    for (const c of book.chapters) {
      const text = htmlToText(c.content)
      const outline = htmlToText(c.outline)
      const hay = `${c.title}\n${outline}\n${text}`
      if (hay.toLowerCase().includes(q.toLowerCase())) {
        const snip = snippetAround(text, q) || snippetAround(outline, q) || c.title
        out.push({
          kind: '章节',
          icon: 'book',
          title: c.title,
          snippet: snip,
          action: () => openChapterLocated(c.id, q)
        })
      }
    }
    for (const n of book.notes) {
      const text = `${n.title}\n${htmlToText(n.content)}`
      if (text.toLowerCase().includes(q.toLowerCase())) {
        out.push({ kind: '笔记', icon: 'note', title: n.title, snippet: snippetAround(text, q), action: () => openNote(n.id) })
      }
    }
    for (const c of book.characters) {
      const text = `${c.name} ${c.aliases} ${c.identity} ${c.appearance} ${c.personality} ${c.background} ${c.goal} ${c.conflict}`
      if (text.toLowerCase().includes(q.toLowerCase())) {
        out.push({ kind: '人物', icon: 'users', title: c.name, snippet: snippetAround(text, q), action: () => openChar(c.id) })
      }
    }
    for (const w of book.world) {
      const text = `${w.name}\n${htmlToText(w.summary)}`
      if (text.toLowerCase().includes(q.toLowerCase())) {
        out.push({ kind: '世界观', icon: 'globe', title: w.name, snippet: snippetAround(text, q), action: () => openWorld(w.id) })
      }
    }
    for (const e of book.timeline) {
      const text = `${e.date} ${e.title} ${htmlToText(e.description)}`
      if (text.toLowerCase().includes(q.toLowerCase())) {
        out.push({ kind: '时间线', icon: 'clock', title: e.title, snippet: snippetAround(text, q), action: () => openTimeline(e.id) })
      }
    }
    return out
  }, [book, query, openChapterLocated, openNote, openChar, openWorld, openTimeline])

  return (
    <div className="main-scroll">
      <div className="page-head">
        <div>
          <h1 className="page-title">{t('search')}</h1>
          <p className="page-sub">搜索正文、笔记、人物、世界观与时间线</p>
        </div>
      </div>
      <input
        autoFocus
        className="search-input"
        placeholder={t('searchPlaceholder')}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {query.trim() && (
        <div className="search-results">
          <p className="muted">{t('searchResult', { n: results.length })}</p>
          {results.map((r, i) => (
            <div key={i} className="card card-hover search-result" onClick={r.action}>
              <div className="sr-title">
                <Icon name={r.icon} size={14} />
                {r.title}
                <span className="sr-type">{r.kind}</span>
              </div>
              <div className="sr-snippet">{r.snippet}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
