import { useEffect, useState, type JSX } from 'react'

export function TitleBar(): JSX.Element {
  const [maximized, setMaximized] = useState(false)

  useEffect(() => {
    void window.inkriver.win.isMaximized().then(({ maximized }) => setMaximized(maximized))
    return window.inkriver.win.onMaximizedChange(setMaximized)
  }, [])

  return (
    <div className="titlebar">
      <div className="titlebar-title">
        <span className="titlebar-dot" />
        墨河 InkRiver
      </div>
      <div className="titlebar-controls">
        <button
          className="win-btn"
          title="最小化"
          aria-label="最小化"
          onClick={() => void window.inkriver.win.minimize()}
        >
          <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden>
            <path d="M0 5h10" stroke="currentColor" strokeWidth="1" />
          </svg>
        </button>
        <button
          className="win-btn"
          title={maximized ? '还原' : '最大化'}
          aria-label={maximized ? '还原' : '最大化'}
          onClick={() => void window.inkriver.win.toggleMaximize()}
        >
          {maximized ? (
            <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden>
              <path d="M2.5 2.5h6v6h-6z" fill="none" stroke="currentColor" strokeWidth="1" />
              <path d="M2.5 2.5h6v6h-6zM0.5 6.5v-6h6" fill="none" stroke="currentColor" strokeWidth="1" />
            </svg>
          ) : (
            <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden>
              <rect x="0.5" y="0.5" width="9" height="9" rx="0.5" fill="none" stroke="currentColor" strokeWidth="1" />
            </svg>
          )}
        </button>
        <button
          className="win-btn close"
          title="关闭"
          aria-label="关闭"
          onClick={() => void window.inkriver.win.close()}
        >
          <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden>
            <path d="M0.5 0.5l9 9M9.5 0.5l-9 9" stroke="currentColor" strokeWidth="1" />
          </svg>
        </button>
      </div>
    </div>
  )
}
