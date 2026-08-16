import { create } from 'zustand'
import type { StoreApi, UseBoundStore } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import type {
  AppInfo,
  AppSettings,
  Book,
  Chapter,
  Character,
  CharacterRelation,
  Note,
  RecentItem,
  TimelineEvent,
  Volume,
  WorldEntity,
  WorldType
} from '../../../shared/types'
import { createEmptyBook, newId, nowIso, sortBook } from '../../../shared/types'
import { countWords, htmlToText, totalWords, todayKey } from './words'
import { orderedChapters } from './export'

export type View = 'home' | 'editor' | 'notes' | 'characters' | 'world' | 'timeline' | 'stats' | 'search' | 'settings'

interface Toast {
  id: number
  text: string
  kind: 'info' | 'error' | 'success'
}

interface ConfirmState {
  title: string
  message: string
  danger?: boolean
  onYes: () => void
}

interface AppState {
  ready: boolean
  info: AppInfo | null
  projectDir: string | null
  book: Book | null
  recent: RecentItem[]
  view: View
  chapterId: string | null
  noteId: string | null
  charId: string | null
  worldId: string | null
  timelineFocusId: string | null
  query: string
  findOpen: boolean
  exportOpen: boolean
  newOpen: boolean
  focusMode: boolean
  preview: boolean
  dirty: boolean
  savedAt: number
  toasts: Toast[]
  toastSeq: number
  confirm: ConfirmState | null

  init: () => Promise<void>
  onMenu: () => () => void
  toast: (text: string, kind?: Toast['kind']) => void
  askConfirm: (title: string, message: string, onYes: () => void, danger?: boolean) => void
  setConfirm: (confirm: ConfirmState | null) => void
  setView: (view: View) => void
  openEditor: (chapterId: string) => void
  openNote: (noteId: string) => void
  openChar: (charId: string) => void
  openWorld: (worldId: string) => void
  openTimeline: (timelineId: string) => void
  setQuery: (q: string) => void
  toggleFind: () => void
  toggleExport: () => void
  toggleNew: () => void
  toggleFocus: () => void
  togglePreview: () => void

  createProject: (name: string, baseDir: string, meta?: Partial<Book['meta']>) => Promise<boolean>
  openProjectFlow: () => Promise<void>
  openProject: (dir: string) => Promise<boolean>
  closeProject: () => Promise<void>
  recentRemove: (dir: string) => Promise<void>
  saveNow: () => Promise<void>
  copyBookText: () => Promise<void>
  restoreBackup: (name: string) => Promise<void>

  updateBook: (fn: (draft: Book) => void) => void
  updateSettings: (patch: Partial<AppSettings>) => void

  addVolume: () => void
  renameVolume: (id: string, title: string) => void
  deleteVolume: (id: string) => void
  reorderVolume: (from: number, to: number) => void

  addChapter: (parentId: string) => void
  updateChapter: (id: string, patch: Partial<Chapter>) => void
  deleteChapter: (id: string) => void
  restoreChapter: (trashId: string) => void
  moveChapter: (id: string, parentId: string, index: number) => void
  duplicateChapter: (id: string) => void

  addNote: () => void
  updateNote: (id: string, patch: Partial<Note>) => void
  deleteNote: (id: string) => void
  restoreNote: (trashId: string) => void

  addCharacter: () => void
  updateCharacter: (id: string, patch: Partial<Character>) => void
  deleteCharacter: (id: string) => void
  addRelation: (charId: string, relation: CharacterRelation) => void
  removeRelation: (charId: string, index: number) => void

  addWorld: (type?: WorldType) => void
  updateWorld: (id: string, patch: Partial<WorldEntity>) => void
  deleteWorld: (id: string) => void

  addTimeline: () => void
  updateTimeline: (id: string, patch: Partial<TimelineEvent>) => void
  deleteTimeline: (id: string) => void

  emptyTrash: () => void
}

let saveTimer: ReturnType<typeof setTimeout> | null = null

export const useApp: UseBoundStore<StoreApi<AppState>> = create<AppState>()(
  immer((set, get) => {
    function scheduleSave(): void {
      if (saveTimer) clearTimeout(saveTimer)
      const ms = get().book?.settings.autosaveMs ?? 1500
      saveTimer = setTimeout(() => {
        void get().saveNow()
      }, ms)
    }

    function touch(): void {
      set((s) => {
        s.dirty = true
        if (s.book) s.book.meta.updatedAt = nowIso()
      })
      scheduleSave()
    }

    function applyBook(fn: (draft: Book) => void): void {
      set((s) => {
        if (s.book) {
          fn(s.book)
          sortBook(s.book)
        }
      })
      touch()
    }

    async function flushSave(): Promise<boolean> {
      const { book, projectDir } = get()
      if (!book || !projectDir) return true
      const data = JSON.parse(JSON.stringify(book)) as Book
      const today = todayKey()
      const total = totalWords(data)
      if (data.stats.dayDate !== today) {
        data.stats.dayDate = today
        data.stats.dayStartTotal = total
      }
      data.stats.daily[today] = Math.max(0, total - data.stats.dayStartTotal)
      data.meta.updatedAt = nowIso()
      const result = await window.inkriver.saveProject(projectDir, data)
      if (!result.ok) {
        get().toast(result.error || '保存失败', 'error')
        return false
      }
      set((s) => {
        s.book = data
        s.dirty = false
        s.savedAt = Date.now()
      })
      const recents = await window.inkriver.recents.list()
      set({ recent: recents })
      return true
    }

    return {
      ready: false,
      info: null,
      projectDir: null,
      book: null,
      recent: [],
      view: 'home',
      chapterId: null,
      noteId: null,
      charId: null,
      worldId: null,
      timelineFocusId: null,
      query: '',
      findOpen: false,
      exportOpen: false,
      newOpen: false,
      focusMode: false,
      preview: false,
      dirty: false,
      savedAt: 0,
      toasts: [],
      toastSeq: 0,
      confirm: null,

      async init() {
        const info = await window.inkriver.info()
        const recent = await window.inkriver.recents.list()
        set({ info, recent })
        const lastDir = localStorage.getItem('inkriver:lastDir')
        let opened = false
        if (lastDir) {
          opened = await get().openProject(lastDir)
        }
        set({ ready: true, view: opened ? 'editor' : 'home' })
      },

      onMenu() {
        const handler = (action: string): void => {
          const s = get()
          switch (action) {
            case 'new-project':
              s.setView('home')
              s.toggleNew()
              break
            case 'open-project':
              void s.openProjectFlow()
              break
            case 'save':
              void s.saveNow()
              break
            case 'export':
              if (s.book) s.toggleExport()
              else s.toast('请先新建或打开一个项目', 'info')
              break
            case 'find':
              if (s.view === 'editor') s.toggleFind()
              else if (s.book) {
                s.setView('editor')
                setTimeout(() => get().toggleFind(), 60)
              }
              break
            case 'focus-mode':
              if (s.view === 'editor') s.toggleFocus()
              break
            case 'toggle-theme':
              if (s.book) {
                const order = ['light', 'sepia', 'dark'] as const
                const next = order[(order.indexOf(s.book.settings.theme) + 1) % order.length]
                s.updateSettings({ theme: next })
              }
              break
          }
        }
        return window.inkriver.onMenu(handler)
      },

      toast(text, kind = 'info') {
        const id = get().toastSeq + 1
        set((s) => {
          s.toastSeq = id
          s.toasts.push({ id, text, kind })
        })
        setTimeout(() => {
          set((s) => {
            s.toasts = s.toasts.filter((t) => t.id !== id)
          })
        }, 3600)
      },

      askConfirm(title, message, onYes, danger = true) {
        set({ confirm: { title, message, onYes, danger } })
      },

      setConfirm(confirm) {
        set({ confirm })
      },

      setView(view) {
        set({ view })
      },

      openEditor(chapterId) {
        set({ view: 'editor', chapterId, findOpen: false })
      },

      openNote(noteId) {
        set({ view: 'notes', noteId })
      },

      openChar(charId) {
        set({ view: 'characters', charId })
      },

      openWorld(worldId) {
        set({ view: 'world', worldId })
      },

      openTimeline(timelineId) {
        set({ view: 'timeline', timelineFocusId: timelineId })
      },

      setQuery(q) {
        set({ query: q, view: 'search' })
      },

      toggleFind() {
        set((s) => {
          s.findOpen = !s.findOpen
        })
      },

      toggleExport() {
        set((s) => {
          s.exportOpen = !s.exportOpen
        })
      },

      toggleNew() {
        set((s) => {
          s.newOpen = !s.newOpen
        })
      },

      toggleFocus() {
        set((s) => {
          s.focusMode = !s.focusMode
        })
      },

      togglePreview() {
        set((s) => {
          s.preview = !s.preview
        })
      },

      async createProject(name, baseDir, meta) {
        const data = createEmptyBook({ ...meta, title: meta?.title ?? name })
        const result = await window.inkriver.newProject({ name, baseDir, data })
        if (!result.ok || !result.dir) {
          get().toast(result.error || '创建失败', 'error')
          return false
        }
        localStorage.setItem('inkriver:lastDir', result.dir)
        set((s) => {
          s.projectDir = result.dir!
          s.book = data
          s.view = 'editor'
          s.chapterId = null
          s.dirty = false
          s.newOpen = false
        })
        const chapterId = data.chapters[0]?.id
        if (chapterId) set({ chapterId })
        return true
      },

      async openProjectFlow() {
        const result = await window.inkriver.pickProject()
        if (result.canceled) return
        if (!result.data || !result.dir) {
          get().toast(result.error || '打开失败', 'error')
          return
        }
        localStorage.setItem('inkriver:lastDir', result.dir)
        set((s) => {
          s.projectDir = result.dir
          s.book = result.data
          s.view = 'editor'
          s.chapterId = result.data!.chapters[0]?.id ?? null
          s.dirty = false
        })
        const recents = await window.inkriver.recents.list()
        set({ recent: recents })
      },

      async openProject(dir) {
        const result = await window.inkriver.openProject(dir)
        if (!result.ok || !result.data) {
          localStorage.removeItem('inkriver:lastDir')
          return false
        }
        localStorage.setItem('inkriver:lastDir', dir)
        set((s) => {
          s.projectDir = dir
          s.book = result.data
          s.chapterId = result.data!.chapters[0]?.id ?? null
          s.dirty = false
          s.savedAt = Date.now()
          s.view = 'editor'
        })
        const recents = await window.inkriver.recents.list()
        set({ recent: recents })
        return true
      },

      async closeProject() {
        await get().saveNow()
        set((s) => {
          s.projectDir = null
          s.book = null
          s.chapterId = null
          s.view = 'home'
          s.dirty = false
        })
      },

      async recentRemove(dir) {
        await window.inkriver.recents.remove(dir)
        set((s) => {
          s.recent = s.recent.filter((r) => r.dir !== dir)
        })
        if (localStorage.getItem('inkriver:lastDir') === dir) localStorage.removeItem('inkriver:lastDir')
      },

      async saveNow() {
        if (saveTimer) {
          clearTimeout(saveTimer)
          saveTimer = null
        }
        await flushSave()
      },

      async copyBookText() {
        const book = get().book
        if (!book) return
        const parts: string[] = [book.meta.title || '未命名作品']
        if (book.meta.author) parts.push(`作者：${book.meta.author}`)
        parts.push('')
        let lastVol: string | null = null
        for (const { chapter, volumeTitle } of orderedChapters(book)) {
          if (volumeTitle && volumeTitle !== lastVol) {
            parts.push('', `【${volumeTitle}】`, '')
            lastVol = volumeTitle
          }
          parts.push(chapter.title, '', htmlToText(chapter.content), '', '----------------', '')
        }
        const text = parts.join('\n')
        try {
          await window.inkriver.copyText(text)
          get().toast(`已复制全文（${countWords(text).toLocaleString('zh-CN')} 字）`, 'success')
        } catch {
          get().toast('复制失败', 'error')
        }
      },

      async restoreBackup(name) {
        const dir = get().projectDir
        if (!dir) return
        const result = await window.inkriver.backups.restore(dir, name)
        if (!result.ok || !result.data) {
          get().toast(result.error || '恢复失败', 'error')
          return
        }
        set((s) => {
          s.book = result.data
          s.dirty = false
          s.savedAt = Date.now()
          s.chapterId = result.data!.chapters[0]?.id ?? null
        })
        get().toast('已恢复备份', 'success')
      },

      updateBook(fn) {
        applyBook(fn)
      },

      updateSettings(patch) {
        applyBook((book) => {
          book.settings = { ...book.settings, ...patch }
          if (patch.accent) document.documentElement.style.setProperty('--accent', patch.accent)
        })
      },

      addVolume() {
        const id = newId()
        applyBook((book) => {
          book.volumes.push({ id, title: '新卷', order: book.volumes.length })
        })
        get().toast('已新建卷，可点击右侧铅笔重命名', 'success')
      },

      renameVolume(id, title) {
        applyBook((book) => {
          const v = book.volumes.find((x) => x.id === id)
          if (v) v.title = title
        })
      },

      deleteVolume(id) {
        const book = get().book
        const volume = book?.volumes.find((v) => v.id === id)
        if (!book || !volume) return
        get().askConfirm('删除卷', '删除卷"' + volume.title + '"？其中的章节将移动到未分卷。', () => {
          applyBook((draft) => {
            draft.volumes = draft.volumes.filter((v) => v.id !== id)
            draft.chapters.forEach((c) => {
              if (c.parentId === id) c.parentId = ''
            })
          })
        })
      },

      reorderVolume(from, to) {
        applyBook((book) => {
          const vols = [...book.volumes].sort((a, b) => a.order - b.order)
          const [moved] = vols.splice(from, 1)
          vols.splice(to, 0, moved)
          vols.forEach((v, i) => {
            v.order = i
          })
        })
      },

      addChapter(parentId) {
        const id = newId()
        applyBook((book) => {
          const siblings = book.chapters.filter((c) => c.parentId === parentId)
          const order = siblings.length
          book.chapters.push({
            id,
            title: '新章节',
            content: '',
            outline: '',
            status: 'draft',
            parentId,
            order,
            target: 0,
            words: 0,
            createdAt: nowIso(),
            updatedAt: nowIso()
          })
        })
        get().openEditor(id)
      },

      updateChapter(id, patch) {
        applyBook((book) => {
          const ch = book.chapters.find((c) => c.id === id)
          if (ch) {
            Object.assign(ch, patch)
            ch.updatedAt = nowIso()
          }
        })
      },

      deleteChapter(id) {
        const book = get().book
        const chapter = book?.chapters.find((c) => c.id === id)
        if (!book || !chapter) return
        get().askConfirm('确认删除', '确定删除章节"' + chapter.title + '"吗？可稍后在回收站恢复。', () => {
          applyBook((draft) => {
            draft.chapters = draft.chapters.filter((c) => c.id !== id)
            draft.trash.chapters.push({ ...chapter, id: newId() })
          })
          set((s) => {
            if (s.chapterId === id) s.chapterId = null
          })
        })
      },

      restoreChapter(trashId) {
        const freshId = newId()
        applyBook((book) => {
          const idx = book.trash.chapters.findIndex((c) => c.id === trashId)
          if (idx === -1) return
          const [ch] = book.trash.chapters.splice(idx, 1)
          book.chapters.push({ ...ch, id: freshId, order: book.chapters.length })
        })
        set({ chapterId: freshId, view: 'editor' })
      },

      moveChapter(id, parentId, index) {
        applyBook((book) => {
          const ch = book.chapters.find((c) => c.id === id)
          if (!ch) return
          ch.parentId = parentId
          const siblings = book.chapters.filter((c) => c.parentId === parentId).sort((a, b) => a.order - b.order)
          const without = siblings.filter((c) => c.id !== id)
          without.splice(Math.max(0, Math.min(index, without.length)), 0, ch)
          without.forEach((c, i) => {
            c.order = i
          })
        })
      },

      duplicateChapter(id) {
        const book = get().book
        const src = book?.chapters.find((c) => c.id === id)
        if (!book || !src) return
        const copyId = newId()
        applyBook((draft) => {
          const siblings = draft.chapters.filter((c) => c.parentId === src.parentId)
          draft.chapters.push({
            ...src,
            id: copyId,
            title: src.title + '（副本）',
            order: siblings.length,
            createdAt: nowIso(),
            updatedAt: nowIso()
          })
        })
        get().openEditor(copyId)
      },

      addNote() {
        const id = newId()
        applyBook((book) => {
          book.notes.unshift({
            id,
            title: '新笔记',
            content: '',
            category: 'idea',
            tags: [],
            pinned: false,
            createdAt: nowIso(),
            updatedAt: nowIso()
          })
        })
        get().openNote(id)
      },

      updateNote(id, patch) {
        applyBook((book) => {
          const note = book.notes.find((n) => n.id === id)
          if (note) {
            Object.assign(note, patch)
            note.updatedAt = nowIso()
          }
        })
      },

      deleteNote(id) {
        const book = get().book
        const note = book?.notes.find((n) => n.id === id)
        if (!book || !note) return
        get().askConfirm('确认删除', '确定删除笔记"' + note.title + '"吗？可稍后在回收站恢复。', () => {
          applyBook((draft) => {
            draft.notes = draft.notes.filter((n) => n.id !== id)
            draft.trash.notes.push({ ...note, id: newId() })
          })
          set((s) => {
            if (s.noteId === id) s.noteId = null
          })
        })
      },

      restoreNote(trashId) {
        const freshId = newId()
        applyBook((book) => {
          const idx = book.trash.notes.findIndex((n) => n.id === trashId)
          if (idx === -1) return
          const [note] = book.trash.notes.splice(idx, 1)
          book.notes.unshift({ ...note, id: freshId })
        })
        set({ noteId: freshId, view: 'notes' })
      },

      addCharacter() {
        const id = newId()
        applyBook((book) => {
          book.characters.push({
            id,
            name: '新人物',
            aliases: '',
            age: '',
            gender: '',
            role: '角色',
            identity: '',
            appearance: '',
            personality: '',
            background: '',
            goal: '',
            conflict: '',
            tags: [],
            relations: [],
            firstChapterId: '',
            notes: '',
            color: '#3b5b92',
            createdAt: nowIso(),
            updatedAt: nowIso()
          })
        })
        get().openChar(id)
      },

      updateCharacter(id, patch) {
        applyBook((book) => {
          const c = book.characters.find((x) => x.id === id)
          if (c) {
            Object.assign(c, patch)
            c.updatedAt = nowIso()
          }
        })
      },

      deleteCharacter(id) {
        const book = get().book
        const character = book?.characters.find((c) => c.id === id)
        if (!book || !character) return
        get().askConfirm('确认删除', '确定删除人物"' + character.name + '"吗？此操作不可恢复。', () => {
          applyBook((draft) => {
            draft.characters = draft.characters.filter((c) => c.id !== id)
            draft.characters.forEach((c) => {
              c.relations = c.relations.filter((r) => r.charId !== id)
            })
            draft.world.forEach((w) => {
              w.relations = w.relations.filter((r) => r !== id)
            })
          })
          set((s) => {
            if (s.charId === id) s.charId = null
          })
        })
      },

      addRelation(charId, relation) {
        applyBook((book) => {
          const c = book.characters.find((x) => x.id === charId)
          if (c) c.relations.push(relation)
        })
      },

      removeRelation(charId, index) {
        applyBook((book) => {
          const c = book.characters.find((x) => x.id === charId)
          if (c) c.relations.splice(index, 1)
        })
      },

      addWorld(type = 'location') {
        const id = newId()
        applyBook((book) => {
          book.world.push({
            id,
            type,
            name: '新条目',
            summary: '',
            tags: [],
            relations: [],
            createdAt: nowIso(),
            updatedAt: nowIso()
          })
        })
        get().openWorld(id)
      },

      updateWorld(id, patch) {
        applyBook((book) => {
          const w = book.world.find((x) => x.id === id)
          if (w) {
            Object.assign(w, patch)
            w.updatedAt = nowIso()
          }
        })
      },

      deleteWorld(id) {
        const book = get().book
        const entity = book?.world.find((w) => w.id === id)
        if (!book || !entity) return
        get().askConfirm('确认删除', '确定删除条目"' + entity.name + '"吗？此操作不可恢复。', () => {
          applyBook((draft) => {
            draft.world = draft.world.filter((w) => w.id !== id)
            draft.world.forEach((w) => {
              w.relations = w.relations.filter((r) => r !== id)
            })
          })
          set((s) => {
            if (s.worldId === id) s.worldId = null
          })
        })
      },

      addTimeline() {
        const id = newId()
        applyBook((book) => {
          book.timeline.push({
            id,
            date: '',
            order: book.timeline.length,
            title: '新事件',
            description: '',
            chapterIds: [],
            characterIds: [],
            createdAt: nowIso(),
            updatedAt: nowIso()
          })
        })
        set((s) => {
          s.view = 'timeline'
          s.timelineFocusId = id
        })
      },

      updateTimeline(id, patch) {
        applyBook((book) => {
          const t = book.timeline.find((x) => x.id === id)
          if (t) {
            Object.assign(t, patch)
            t.updatedAt = nowIso()
          }
        })
      },

      deleteTimeline(id) {
        const book = get().book
        const ev = book?.timeline.find((t) => t.id === id)
        if (!book || !ev) return
        get().askConfirm('确认删除', '确定删除事件"' + ev.title + '"吗？此操作不可恢复。', () => {
          applyBook((draft) => {
            draft.timeline = draft.timeline.filter((t) => t.id !== id)
          })
        })
      },

      emptyTrash() {
        get().askConfirm('清空回收站', '确定清空回收站吗？回收站中的内容将被永久删除。', () => {
          applyBook((book) => {
            book.trash = { chapters: [], notes: [] }
          })
        })
      }
    }
  })
)

window.addEventListener('beforeunload', () => {
  const { book, projectDir, dirty } = useApp.getState()
  if (book && projectDir && dirty) {
    try {
      window.inkriver.flushSync(projectDir, book)
    } catch {
      // ignore
    }
  }
})

window.addEventListener('blur', () => {
  const { book, dirty, projectDir } = useApp.getState()
  if (book && dirty && projectDir) void useApp.getState().saveNow()
})
