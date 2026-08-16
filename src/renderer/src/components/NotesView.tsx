import { useMemo, useState, type JSX } from 'react'
import type { NoteCategory } from '../../../shared/types'
import { NOTE_CATEGORIES } from '../../../shared/types'
import { useApp } from '../lib/store'
import { useT, EmptyState, Switch, TagInput } from './ui'
import { Icon } from './Icons'
import { RichEditor } from './RichEditor'

export function NotesView(): JSX.Element {
  const t = useT()
  const book = useApp((s) => s.book)
  const noteId = useApp((s) => s.noteId)
  const addNote = useApp((s) => s.addNote)
  const updateNote = useApp((s) => s.updateNote)
  const deleteNote = useApp((s) => s.deleteNote)
  const openNote = useApp((s) => s.openNote)
  const [filter, setFilter] = useState<NoteCategory | 'all'>('all')

  const notes = useMemo(() => {
    if (!book) return []
    const list = [...book.notes]
    if (filter !== 'all') {
      return list.filter((n) => n.category === filter)
    }
    return list.sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updatedAt.localeCompare(a.updatedAt))
  }, [book, filter])

  if (!book) return <div />
  const note = book.notes.find((n) => n.id === noteId) ?? notes[0] ?? null

  return (
    <div className="split">
      <div className="split-list">
        <div style={{ display: 'flex', gap: 4, marginBottom: 10, flexWrap: 'wrap' }}>
          {(['all', 'idea', 'outline', 'setting', 'misc'] as const).map((cat) => (
            <button
              key={cat}
              className={`btn small ${filter === cat ? 'primary' : ''}`}
              onClick={() => setFilter(cat)}
            >
              {cat === 'all' ? '全部' : NOTE_CATEGORIES.find((c) => c.id === cat)?.labelZh}
            </button>
          ))}
        </div>
        <button className="btn primary" style={{ width: '100%', marginBottom: 12 }} onClick={addNote}>
          <Icon name="plus" size={14} /> {t('addNote')}
        </button>
        {notes.length === 0 ? (
          <EmptyState icon="note" text="还没有笔记" />
        ) : (
          notes.map((n) => (
            <div
              key={n.id}
              className={`list-item ${n.id === note?.id ? 'active' : ''}`}
              onClick={() => openNote(n.id)}
            >
              <div className="li-title">
                {n.pinned && <Icon name="pin" size={12} />}
                {n.title || '（无标题）'}
              </div>
              <div className="li-sub">
                {NOTE_CATEGORIES.find((c) => c.id === n.category)?.labelZh}
                {n.tags.length > 0 && ` · ${n.tags.join('、')}`}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="split-detail">
        {!note ? (
          <EmptyState icon="note" text="选择或新建一条笔记" />
        ) : (
          <>
            <div className="detail-title">
              <input
                style={{ flex: 1, fontSize: 20, fontWeight: 700, border: 'none', background: 'transparent' }}
                value={note.title}
                placeholder="笔记标题"
                onChange={(e) => updateNote(note.id, { title: e.target.value })}
              />
              <button
                className={`icon-btn ${note.pinned ? 'accent' : ''}`}
                title={t('pinned')}
                onClick={() => updateNote(note.id, { pinned: !note.pinned })}
              >
                <Icon name="pin" size={15} />
              </button>
              <button className="icon-btn" title={t('delete')} onClick={() => deleteNote(note.id)}>
                <Icon name="trash" size={15} />
              </button>
            </div>
            <div className="detail-card" style={{ padding: '12px 16px' }}>
              <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                <div style={{ flex: '1 1 200px' }}>
                  <div className="field" style={{ marginBottom: 6 }}>
                    <label>{t('category')}</label>
                    <select
                      value={note.category}
                      onChange={(e) => updateNote(note.id, { category: e.target.value as NoteCategory })}
                    >
                      {NOTE_CATEGORIES.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.labelZh}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div style={{ flex: '1 1 300px' }}>
                  <div className="field" style={{ marginBottom: 6 }}>
                    <label>{t('tags')}</label>
                    <TagInput tags={note.tags} onChange={(tags) => updateNote(note.id, { tags })} />
                  </div>
                </div>
              </div>
            </div>
            <div className="detail-card">
              <RichEditor
                key={note.id}
                value={note.content}
                placeholder="记录灵感、大纲、设定…"
                minHeight={380}
                onChange={(html) => updateNote(note.id, { content: html })}
              />
            </div>
          </>
        )}
      </div>
    </div>
  )
}
