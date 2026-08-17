import type { JSX } from 'react'
import { useApp, type View } from '../lib/store'
import { useT } from './ui'
import { Icon, Logo, type IconName } from './Icons'
import { ChapterTree } from './ChapterTree'
import { formatWords, totalWords, todayKey } from '../lib/words'

const NAV: { view: View; icon: IconName; key: string }[] = [
  { view: 'editor', icon: 'book', key: 'editor' },
  { view: 'notes', icon: 'note', key: 'notes' },
  { view: 'characters', icon: 'users', key: 'characters' },
  { view: 'world', icon: 'globe', key: 'world' },
  { view: 'timeline', icon: 'clock', key: 'timeline' },
  { view: 'stats', icon: 'chart', key: 'stats' },
  { view: 'search', icon: 'search', key: 'search' }
]

export function Sidebar(): JSX.Element {
  const t = useT()
  const book = useApp((s) => s.book)
  const view = useApp((s) => s.view)
  const setView = useApp((s) => s.setView)
  const dirty = useApp((s) => s.dirty)
  const savedAt = useApp((s) => s.savedAt)
  const projectDir = useApp((s) => s.projectDir)
  const openHome = useApp((s) => s.setView)

  const total = book ? totalWords(book) : 0
  const today = book ? (book.stats.daily[todayKey()] ?? 0) : 0

  const openEditorView = (): void => {
    if (book) {
      if (!book.chapters.length) {
        setView('editor')
      } else {
        setView('editor')
      }
    } else {
      setView('home')
    }
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-brand" onClick={() => openHome('home')}>
        <Logo size={34} />
        <div>
          <div className="brand-name">墨河</div>
          <div className="brand-sub">InkRiver · 长篇写作</div>
        </div>
      </div>

      <div className="nav">
        {NAV.map((item) => (
          <button
            key={item.view}
            className={`nav-item ${view === item.view ? 'active' : ''}`}
            onClick={() => {
              if (item.view === 'editor') openEditorView()
              else setView(item.view)
            }}
          >
            <Icon name={item.icon} size={14} />
          </button>
        ))}
        <button className={`nav-item ${view === 'settings' ? 'active' : ''}`} onClick={() => setView('settings')}>
          <Icon name="gear" size={14} />
        </button>
      </div>

      {book ? (
        <>
          <div className="project-head">
            <div className="project-title-row">
              <span className="project-title">{book.meta.title || '未命名作品'}</span>
              <button className="icon-btn" title="项目设置" onClick={() => setView('settings')}>
                <Icon name="gear" size={14} />
              </button>
            </div>
            <div className="project-meta">
              {[book.meta.author, book.meta.genre].filter(Boolean).join(' · ') || '点击设置填写作品信息'}
            </div>
          </div>
          <ChapterTree />
        </>
      ) : (
        <div className="tree-wrap">
          <div className="empty">
            <Icon name="book" size={36} />
            <p>还没有打开项目</p>
            <button className="btn small" onClick={() => setView('home')}>
              去首页新建 / 打开
            </button>
          </div>
        </div>
      )}

      <div className="sidebar-footer">
        <span className="inline-flex">
          <span className={`save-dot ${dirty ? 'dirty' : ''}`} />
          {dirty ? t('unsaved') : t('saved')}
        </span>
        {book && (
          <span>
            {formatWords(total)} 字 · 今日 {formatWords(today)}
          </span>
        )}
      </div>
    </aside>
  )
}
