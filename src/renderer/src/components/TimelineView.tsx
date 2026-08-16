import { useEffect, useMemo, useState, type JSX } from 'react'
import { useApp } from '../lib/store'
import { useT, EmptyState } from './ui'
import { Icon } from './Icons'
import { RichEditor } from './RichEditor'

export function TimelineView(): JSX.Element {
  const t = useT()
  const book = useApp((s) => s.book)
  const timelineFocusId = useApp((s) => s.timelineFocusId)
  const addTimeline = useApp((s) => s.addTimeline)
  const updateTimeline = useApp((s) => s.updateTimeline)
  const deleteTimeline = useApp((s) => s.deleteTimeline)
  const updateBook = useApp((s) => s.updateBook)
  const openTimeline = useApp((s) => s.openTimeline)
  const openChar = useApp((s) => s.openChar)
  const openEditor = useApp((s) => s.openEditor)

  const events = useMemo(() => [...(book?.timeline ?? [])].sort((a, b) => a.order - b.order), [book?.timeline])
  const [selectedId, setSelectedId] = useState<string | null>(timelineFocusId ?? events[0]?.id ?? null)

  useEffect(() => {
    if (timelineFocusId) setSelectedId(timelineFocusId)
  }, [timelineFocusId])

  if (!book) return <div />
  const event = book.timeline.find((e) => e.id === selectedId) ?? events[0] ?? null

  const moveEvent = (id: string, dir: -1 | 1): void => {
    const idx = events.findIndex((e) => e.id === id)
    const to = idx + dir
    if (idx === -1 || to < 0 || to >= events.length) return
    updateBook((b) => {
      const list = [...b.timeline].sort((a, c) => a.order - c.order)
      const [item] = list.splice(idx, 1)
      list.splice(to, 0, item)
      list.forEach((e, i) => {
        e.order = i
      })
    })
  }

  const toggleChapter = (id: string): void => {
    if (!event) return
    const has = event.chapterIds.includes(id)
    updateTimeline(event.id, {
      chapterIds: has ? event.chapterIds.filter((x) => x !== id) : [...event.chapterIds, id]
    })
  }

  const toggleCharacter = (id: string): void => {
    if (!event) return
    const has = event.characterIds.includes(id)
    updateTimeline(event.id, {
      characterIds: has ? event.characterIds.filter((x) => x !== id) : [...event.characterIds, id]
    })
  }

  return (
    <div className="split">
      <div className="split-list">
        <button className="btn primary" style={{ width: '100%', marginBottom: 12 }} onClick={addTimeline}>
          <Icon name="plus" size={14} /> {t('addTimeline')}
        </button>
        {events.length === 0 ? (
          <EmptyState icon="clock" text="还没有时间线事件" />
        ) : (
          <div className="timeline">
            {events.map((e) => (
              <div
                key={e.id}
                className={`tl-item ${e.id === event?.id ? 'active' : ''}`}
                onClick={() => {
                  setSelectedId(e.id)
                  openTimeline(e.id)
                }}
              >
                <div className="tl-date">{e.date || '未标注时间'}</div>
                <div className="tl-title">{e.title}</div>
                <div className="tl-desc">
                  {e.description.replace(/<[^>]*>/g, '').slice(0, 60)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="split-detail">
        {!event ? (
          <EmptyState icon="clock" text="选择或新建一个事件" />
        ) : (
          <>
            <div className="detail-title">
              <input
                style={{ flex: 1, fontSize: 20, fontWeight: 700, border: 'none', background: 'transparent' }}
                value={event.title}
                placeholder="事件标题"
                onChange={(e) => updateTimeline(event.id, { title: e.target.value })}
              />
              <button className="icon-btn" title="上移" onClick={() => moveEvent(event.id, -1)}>
                <Icon name="arrowUp" size={15} />
              </button>
              <button className="icon-btn" title="下移" onClick={() => moveEvent(event.id, 1)}>
                <Icon name="arrowDown" size={15} />
              </button>
              <button className="icon-btn" title={t('delete')} onClick={() => deleteTimeline(event.id)}>
                <Icon name="trash" size={15} />
              </button>
            </div>

            <div className="detail-card">
              <div className="field-row">
                <div className="field">
                  <label>{t('timelineDate')}</label>
                  <input
                    value={event.date}
                    placeholder="如：第一纪元 315 年 · 春"
                    onChange={(e) => updateTimeline(event.id, { date: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="detail-card">
              <h3>{t('timelineDesc')}</h3>
              <RichEditor
                key={`tl-${event.id}`}
                value={event.description}
                placeholder="发生了什么？"
                minHeight={160}
                onChange={(html) => updateTimeline(event.id, { description: html })}
              />
            </div>

            <div className="detail-card">
              <h3>{t('relatedChapters')}</h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                {event.chapterIds.map((id) => {
                  const ch = book.chapters.find((c) => c.id === id)
                  if (!ch) return null
                  return (
                    <span className="tag" key={id}>
                      <span style={{ cursor: 'pointer' }} onClick={() => openEditor(id)}>
                        {ch.title}
                      </span>
                      <span className="tag-x" onClick={() => toggleChapter(id)}>
                        ×
                      </span>
                    </span>
                  )
                })}
              </div>
              <select value="" onChange={(e) => e.target.value && toggleChapter(e.target.value)}>
                <option value="">+ 添加关联章节…</option>
                {book.chapters
                  .filter((c) => !event.chapterIds.includes(c.id))
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
              </select>

              <h3 style={{ marginTop: 18 }}>{t('relatedCharacters')}</h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                {event.characterIds.map((id) => {
                  const c = book.characters.find((x) => x.id === id)
                  if (!c) return null
                  return (
                    <span className="tag" key={id}>
                      <span style={{ cursor: 'pointer' }} onClick={() => openChar(id)}>
                        {c.name}
                      </span>
                      <span className="tag-x" onClick={() => toggleCharacter(id)}>
                        ×
                      </span>
                    </span>
                  )
                })}
              </div>
              <select value="" onChange={(e) => e.target.value && toggleCharacter(e.target.value)}>
                <option value="">+ 添加关联人物…</option>
                {book.characters
                  .filter((c) => !event.characterIds.includes(c.id))
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
              </select>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
