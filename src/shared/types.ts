export interface BookMeta {
  id: string
  title: string
  author: string
  genre: string
  synopsis: string
  cover: string
  createdAt: string
  updatedAt: string
}

export type ThemeId = 'light' | 'dark' | 'sepia'

export interface AppSettings {
  theme: ThemeId
  accent: string
  fontFamily: string
  fontSize: number
  lineHeight: number
  editorWidth: number
  dailyGoal: number
  bookGoal: number
  autosaveMs: number
  backupEnabled: boolean
  backupKeep: number
  backupMinutes: number
  language: 'zh' | 'en'
  typewriter: boolean
  showWordCount: boolean
}

export interface Volume {
  id: string
  title: string
  order: number
  collapsed?: boolean
}

export type ChapterStatus = 'draft' | 'writing' | 'done'

export interface Chapter {
  id: string
  title: string
  content: string
  outline: string
  status: ChapterStatus
  parentId: string
  order: number
  target: number
  words: number
  createdAt: string
  updatedAt: string
}

export interface CharacterRelation {
  charId: string
  type: string
  note: string
}

export interface Character {
  id: string
  name: string
  aliases: string
  age: string
  gender: string
  role: string
  identity: string
  appearance: string
  personality: string
  background: string
  goal: string
  conflict: string
  tags: string[]
  relations: CharacterRelation[]
  firstChapterId: string
  notes: string
  color: string
  createdAt: string
  updatedAt: string
}

export type WorldType = 'location' | 'organization' | 'item' | 'concept' | 'species' | 'event' | 'other'

export interface WorldEntity {
  id: string
  type: WorldType
  name: string
  summary: string
  tags: string[]
  relations: string[]
  createdAt: string
  updatedAt: string
}

export interface TimelineEvent {
  id: string
  date: string
  order: number
  title: string
  description: string
  chapterIds: string[]
  characterIds: string[]
  createdAt: string
  updatedAt: string
}

export type NoteCategory = 'idea' | 'outline' | 'setting' | 'misc'

export interface Note {
  id: string
  title: string
  content: string
  category: NoteCategory
  tags: string[]
  pinned: boolean
  createdAt: string
  updatedAt: string
}

export interface Stats {
  daily: Record<string, number>
  dayDate: string
  dayStartTotal: number
}

export interface Trash {
  chapters: Chapter[]
  notes: Note[]
}

export interface Book {
  format: string
  version: number
  meta: BookMeta
  settings: AppSettings
  volumes: Volume[]
  chapters: Chapter[]
  notes: Note[]
  characters: Character[]
  world: WorldEntity[]
  timeline: TimelineEvent[]
  stats: Stats
  trash: Trash
}

export interface RecentItem {
  dir: string
  title: string
  author: string
  updatedAt: string
}

export interface AppInfo {
  version: string
  electron: string
  chrome: string
  node: string
  platform: string
  userData: string
  projectDir: string | null
}

export type ShortcutId =
  | 'new-project'
  | 'new-chapter'
  | 'open-project'
  | 'save'
  | 'export'
  | 'find'
  | 'focus-mode'
  | 'toggle-theme'

export type Shortcuts = Record<ShortcutId, string>

export const DEFAULT_ACCENT = '#3b5b92'

export const WORLD_TYPES: { id: WorldType; labelZh: string; labelEn: string }[] = [
  { id: 'location', labelZh: '地点', labelEn: 'Location' },
  { id: 'organization', labelZh: '组织', labelEn: 'Organization' },
  { id: 'item', labelZh: '物品', labelEn: 'Item' },
  { id: 'concept', labelZh: '概念', labelEn: 'Concept' },
  { id: 'species', labelZh: '种族', labelEn: 'Species' },
  { id: 'event', labelZh: '事件', labelEn: 'Event' },
  { id: 'other', labelZh: '其他', labelEn: 'Other' }
]

export const CHAPTER_STATUSES: { id: ChapterStatus; labelZh: string; labelEn: string }[] = [
  { id: 'draft', labelZh: '草稿', labelEn: 'Draft' },
  { id: 'writing', labelZh: '写作中', labelEn: 'Writing' },
  { id: 'done', labelZh: '已完成', labelEn: 'Done' }
]

export const NOTE_CATEGORIES: { id: NoteCategory; labelZh: string; labelEn: string }[] = [
  { id: 'idea', labelZh: '灵感', labelEn: 'Ideas' },
  { id: 'outline', labelZh: '大纲', labelEn: 'Outline' },
  { id: 'setting', labelZh: '设定', labelEn: 'Setting' },
  { id: 'misc', labelZh: '杂项', labelEn: 'Misc' }
]

export const CHARACTER_COLORS = [
  '#3b5b92',
  '#8a3b3b',
  '#3b7a57',
  '#7a5a3b',
  '#6b3b8a',
  '#3b7a8a',
  '#8a6b3b',
  '#b0455a',
  '#4b6f44',
  '#556b8a'
]

export function nowIso(): string {
  return new Date().toISOString()
}

export function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return 'id-' + Math.random().toString(36).slice(2) + Date.now().toString(36)
}

export function createDefaultSettings(): AppSettings {
  return {
    theme: 'light',
    accent: DEFAULT_ACCENT,
    fontFamily: '楷体, KaiTi, serif',
    fontSize: 17,
    lineHeight: 1.9,
    editorWidth: 760,
    dailyGoal: 2000,
    bookGoal: 200000,
    autosaveMs: 1500,
    backupEnabled: true,
    backupKeep: 30,
    backupMinutes: 10,
    language: 'zh',
    typewriter: false,
    showWordCount: true
  }
}

export function createEmptyBook(meta?: Partial<BookMeta>): Book {
  const now = nowIso()
  const id = newId()
  return {
    format: 'inkriver',
    version: 1,
    meta: {
      id,
      title: meta?.title || '未命名作品',
      author: meta?.author || '',
      genre: meta?.genre || '',
      synopsis: meta?.synopsis || '',
      cover: meta?.cover || '',
      createdAt: now,
      updatedAt: now
    },
    settings: createDefaultSettings(),
    volumes: [{ id: newId(), title: '第一卷', order: 0 }],
    chapters: [],
    notes: [],
    characters: [],
    world: [],
    timeline: [],
    stats: { daily: {}, dayDate: '', dayStartTotal: 0 },
    trash: { chapters: [], notes: [] }
  }
}

export function sortBook(book: Book): Book {
  book.volumes.sort((a, b) => a.order - b.order)
  book.chapters.sort((a, b) => {
    if (a.parentId !== b.parentId) return 0
    return a.order - b.order
  })
  book.timeline.sort((a, b) => a.order - b.order)
  return book
}
