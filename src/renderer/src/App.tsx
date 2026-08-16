import { useEffect, type JSX } from 'react'
import { useApp } from './lib/store'
import { Sidebar } from './components/Sidebar'
import { HomeView } from './components/HomeView'
import { EditorView } from './components/EditorView'
import { NotesView } from './components/NotesView'
import { CharactersView } from './components/CharactersView'
import { WorldView } from './components/WorldView'
import { TimelineView } from './components/TimelineView'
import { StatsView } from './components/StatsView'
import { SearchView } from './components/SearchView'
import { SettingsView } from './components/SettingsView'
import { ExportDialog, NewProjectModal, ConfirmModal, Toasts } from './components/Modals'
import { Logo } from './components/Icons'

export default function App(): JSX.Element {
  const ready = useApp((s) => s.ready)
  const view = useApp((s) => s.view)
  const focusMode = useApp((s) => s.focusMode)
  const theme = useApp((s) => s.book?.settings.theme ?? 'light')
  const accent = useApp((s) => s.book?.settings.accent ?? '#3b5b92')
  const init = useApp((s) => s.init)
  const onMenu = useApp((s) => s.onMenu)

  useEffect(() => {
    void init()
  }, [init])

  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  useEffect(() => {
    document.documentElement.style.setProperty('--accent', accent)
  }, [accent])

  useEffect(() => {
    return onMenu()
  }, [onMenu])

  if (!ready) {
    return (
      <div className="boot">
        <Logo size={64} />
        <div className="boot-title">墨河 InkRiver</div>
        <div className="boot-sub">正在载入…</div>
      </div>
    )
  }

  return (
    <div className={`app ${focusMode ? 'focus-mode' : ''}`}>
      <Sidebar />
      <main className="main">
        {view === 'home' && <HomeView />}
        {view === 'editor' && <EditorView />}
        {view === 'notes' && <NotesView />}
        {view === 'characters' && <CharactersView />}
        {view === 'world' && <WorldView />}
        {view === 'timeline' && <TimelineView />}
        {view === 'stats' && <StatsView />}
        {view === 'search' && <SearchView />}
        {view === 'settings' && <SettingsView />}
      </main>
      <ExportDialog />
      <NewProjectModal />
      <ConfirmModal />
      <Toasts />
    </div>
  )
}
