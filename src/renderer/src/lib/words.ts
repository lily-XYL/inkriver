import type { Book } from '../../../shared/types'

const CJK_RE = /[\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF\u3040-\u30FF\uAC00-\uD7AF\uFF00-\uFFEF]/g

export function countWords(text: string): number {
  if (!text) return 0
  const cjk = (text.match(CJK_RE) || []).length
  const rest = text.replace(CJK_RE, ' ')
  const latin = (rest.match(/[A-Za-z0-9]+(?:[’'\-][A-Za-z0-9]+)*/g) || []).length
  return cjk + latin
}

export function htmlToText(html: string): string {
  const doc = new DOMParser().parseFromString(html || '', 'text/html')
  const BLOCKS = new Set(['P', 'DIV', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'LI', 'BLOCKQUOTE', 'PRE', 'TR', 'BR', 'UL', 'OL', 'TABLE'])
  const walk = (node: Node): string => {
    if (node.nodeType === Node.TEXT_NODE) return (node.textContent ?? '').replace(/\u00a0/g, ' ')
    if (node.nodeType !== Node.ELEMENT_NODE) return ''
    const el = node as Element
    let text = ''
    for (const child of Array.from(el.childNodes)) text += walk(child)
    if (BLOCKS.has(el.tagName)) text += '\n'
    return text
  }
  return walk(doc.body).replace(/\n{3,}/g, '\n\n').trim()
}

export function countHtml(html: string): number {
  return countWords(htmlToText(html))
}

export function totalWords(book: Book): number {
  return book.chapters.reduce((sum, c) => sum + (c.words || 0), 0)
}

export function todayKey(): string {
  const d = new Date()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

export function formatWords(n: number): string {
  return n.toLocaleString('zh-CN')
}

export function readingMinutes(words: number): number {
  return Math.max(1, Math.round(words / 300))
}

export function relativeTime(iso: string): string {
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return ''
  const diff = Date.now() - t
  const min = Math.floor(diff / 60000)
  if (min < 1) return '刚刚'
  if (min < 60) return `${min} 分钟前`
  const hour = Math.floor(min / 60)
  if (hour < 24) return `${hour} 小时前`
  const day = Math.floor(hour / 24)
  if (day < 30) return `${day} 天前`
  return new Date(t).toLocaleDateString()
}
