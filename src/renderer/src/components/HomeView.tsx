import type { JSX } from 'react'
import { useApp } from '../lib/store'
import { useT } from './ui'
import { Icon, Logo } from './Icons'
import { relativeTime } from '../lib/words'

export function HomeView(): JSX.Element {
  const t = useT()
  const recent = useApp((s) => s.recent)
  const toggleNew = useApp((s) => s.toggleNew)
  const openProjectFlow = useApp((s) => s.openProjectFlow)
  const openProject = useApp((s) => s.openProject)
  const removeRecent = useApp((s) => s.recentRemove)

  return (
    <div className="home">
      <div className="home-hero">
        <Logo size={76} />
        <h1>墨河 InkRiver</h1>
        <p>{t('welcome')}</p>
      </div>
      <div className="home-actions">
        <button className="btn primary" onClick={toggleNew}>
          <Icon name="plus" size={15} /> {t('newProject')}
        </button>
        <button className="btn" onClick={() => void openProjectFlow()}>
          <Icon name="folder" size={15} /> {t('openProject')}
        </button>
      </div>
      <div className="home-recent">
        <h2>{t('recentProjects')}</h2>
        {recent.length === 0 ? (
          <div className="card">
            <div className="card-body">
              <p className="card-text">{t('noRecent')}</p>
            </div>
          </div>
        ) : (
          <div className="card">
            {recent.map((item, i) => (
              <div
                key={item.dir}
                className="recent-row card-hover"
                style={{ borderBottom: i < recent.length - 1 ? '1px solid var(--border)' : 'none' }}
                onClick={() => void openProject(item.dir)}
              >
                <div className="char-avatar" style={{ background: 'var(--accent)' }}>
                  {(item.title || '书').slice(0, 1)}
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div className="recent-title">{item.title}</div>
                  <div className="recent-dir">{item.dir}</div>
                </div>
                <span className="recent-time">{relativeTime(item.updatedAt)}</span>
                <button
                  className="icon-btn"
                  title="从列表移除"
                  onClick={(e) => {
                    e.stopPropagation()
                    void removeRecent(item.dir)
                  }}
                >
                  <Icon name="x" size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
