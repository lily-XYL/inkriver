import JSZip from 'jszip'
import {
  AlignmentType,
  BorderStyle,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType
} from 'docx'
import type { Book, Chapter } from '../../../shared/types'
import { htmlToText } from './words'
import { htmlToMarkdown, parseHtml } from './html'

export interface ExportOptions {
  scope: 'chapter' | 'book'
  format: 'txt' | 'md' | 'docx' | 'epub'
  includeOutline: boolean
}

interface OrderedChapter {
  chapter: Chapter
  volumeTitle: string | null
}

export function orderedChapters(book: Book): OrderedChapter[] {
  const volumes = [...book.volumes].sort((a, b) => a.order - b.order)
  const byParent: Record<string, Chapter[]> = {}
  for (const c of book.chapters) {
    ;(byParent[c.parentId] ??= []).push(c)
  }
  for (const key of Object.keys(byParent)) byParent[key].sort((a, b) => a.order - b.order)
  const out: OrderedChapter[] = []
  for (const v of volumes) {
    for (const c of byParent[v.id] ?? []) out.push({ chapter: c, volumeTitle: v.title })
  }
  for (const c of byParent[''] ?? []) out.push({ chapter: c, volumeTitle: null })
  return out
}

function buildTxt(book: Book, items: OrderedChapter[], includeOutline: boolean): string {
  const lines: string[] = [book.meta.title || '未命名作品']
  if (book.meta.author) lines.push(`作者：${book.meta.author}`)
  if (book.meta.genre) lines.push(`类型：${book.meta.genre}`)
  lines.push('')
  let lastVol: string | null = null
  for (const { chapter, volumeTitle } of items) {
    if (volumeTitle && volumeTitle !== lastVol) {
      lines.push('')
      lines.push(`【${volumeTitle}】`)
      lines.push('')
      lastVol = volumeTitle
    }
    lines.push(chapter.title)
    lines.push('')
    if (includeOutline && chapter.outline.trim()) {
      lines.push(`【大纲】${htmlToText(chapter.outline)}`)
      lines.push('')
    }
    lines.push(htmlToText(chapter.content))
    lines.push('')
    lines.push('----------------')
    lines.push('')
  }
  return lines.join('\n')
}

function buildMd(book: Book, items: OrderedChapter[], includeOutline: boolean): string {
  const parts: string[] = [`# ${book.meta.title || '未命名作品'}`]
  if (book.meta.author) parts.push(`**作者：${book.meta.author}**`)
  if (book.meta.genre) parts.push(`**类型：${book.meta.genre}**`)
  parts.push('')
  let lastVol: string | null = null
  for (const { chapter, volumeTitle } of items) {
    if (volumeTitle && volumeTitle !== lastVol) {
      parts.push('')
      parts.push(`## ${volumeTitle}`)
      parts.push('')
      lastVol = volumeTitle
    }
    parts.push(`## ${chapter.title}`)
    parts.push('')
    if (includeOutline && chapter.outline.trim()) {
      parts.push(`> ${htmlToMarkdown(chapter.outline).replace(/\n/g, '\n> ')}`)
      parts.push('')
    }
    parts.push(htmlToMarkdown(chapter.content))
    parts.push('')
    parts.push('---')
    parts.push('')
  }
  return parts.join('\n')
}

// ---------- DOCX ----------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function inlineRuns(el: Element, inherited: Record<string, any> = {}): TextRun[] {
  const runs: TextRun[] = []
  for (const child of Array.from(el.childNodes)) {
    if (child.nodeType === Node.TEXT_NODE) {
      const text = (child.textContent ?? '').replace(/\n+/g, ' ')
      if (text) runs.push(new TextRun({ text, ...inherited }))
    } else if (child.nodeType === Node.ELEMENT_NODE) {
      const elem = child as Element
      const tag = elem.tagName.toLowerCase()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const s: Record<string, any> = { ...inherited }
      if (tag === 'strong' || tag === 'b') s.bold = true
      if (tag === 'em' || tag === 'i') s.italics = true
      if (tag === 'u') s.underline = {}
      if (tag === 's' || tag === 'del') s.strike = true
      if (tag === 'mark') s.highlight = '#ffe08a'
      if (tag === 'code') {
        s.font = 'Consolas'
        s.shading = { type: ShadingType.CLEAR, color: 'auto', fill: 'F2F2F2' }
      }
      if (tag === 'a') {
        s.color = '0563C1'
        s.underline = {}
      }
      if (['strong', 'b', 'em', 'i', 'u', 's', 'del', 'mark', 'code', 'a', 'span', 'font'].includes(tag)) {
        runs.push(...inlineRuns(elem, s))
      } else {
        const text = (elem.textContent ?? '').replace(/\n+/g, ' ')
        if (text) runs.push(new TextRun({ text, ...s }))
      }
    }
  }
  return runs
}

const HEADING_MAP: Record<string, (typeof HeadingLevel)[keyof typeof HeadingLevel]> = {
  h1: HeadingLevel.HEADING_1,
  h2: HeadingLevel.HEADING_2,
  h3: HeadingLevel.HEADING_3,
  h4: HeadingLevel.HEADING_4,
  h5: HeadingLevel.HEADING_5,
  h6: HeadingLevel.HEADING_6
}

function alignOf(el: HTMLElement): (typeof AlignmentType)[keyof typeof AlignmentType] | undefined {
  switch (el.style.textAlign) {
    case 'center':
      return AlignmentType.CENTER
    case 'right':
      return AlignmentType.RIGHT
    case 'justify':
      return AlignmentType.JUSTIFIED
    default:
      return undefined
  }
}

function tableToDocx(table: HTMLTableElement): Table {
  const rows: TableRow[] = []
  for (const tr of Array.from(table.rows)) {
    const cells: TableCell[] = []
    for (const td of Array.from(tr.cells)) {
      const paras = elementChildrenToDocx(td as HTMLElement)
      const isHeader = td.tagName.toLowerCase() === 'th'
      cells.push(
        new TableCell({
          children: paras.length ? paras : [new Paragraph({ text: '' })],
          shading: isHeader ? { type: ShadingType.CLEAR, color: 'auto', fill: 'EDEDED' } : undefined
        })
      )
    }
    rows.push(new TableRow({ children: cells }))
  }
  return new Table({
    rows,
    width: { size: 100, type: WidthType.PERCENTAGE }
  })
}

function elementChildrenToDocx(root: HTMLElement): (Paragraph | Table)[] {
  const out: (Paragraph | Table)[] = []
  for (const child of Array.from(root.childNodes)) {
    if (child.nodeType === Node.TEXT_NODE) {
      const text = (child.textContent ?? '').replace(/\s+/g, ' ').trim()
      if (text) out.push(new Paragraph({ children: [new TextRun({ text })] }))
      continue
    }
    if (child.nodeType !== Node.ELEMENT_NODE) continue
    const el = child as HTMLElement
    const tag = el.tagName.toLowerCase()
    if (tag === 'h1' || tag === 'h2' || tag === 'h3' || tag === 'h4' || tag === 'h5' || tag === 'h6') {
      out.push(new Paragraph({ children: inlineRuns(el), heading: HEADING_MAP[tag] }))
    } else if (tag === 'p') {
      out.push(new Paragraph({ children: inlineRuns(el), alignment: alignOf(el), spacing: { after: 120 } }))
    } else if (tag === 'blockquote') {
      out.push(
        new Paragraph({
          children: inlineRuns(el),
          indent: { left: 480 },
          spacing: { after: 120 },
          border: {
            left: { style: BorderStyle.SINGLE, size: 18, color: '8A6D3B', space: 8 }
          }
        })
      )
    } else if (tag === 'ul') {
      for (const li of Array.from(el.querySelectorAll(':scope > li'))) {
        out.push(new Paragraph({ children: inlineRuns(li as HTMLElement), bullet: { level: 0 } }))
      }
    } else if (tag === 'ol') {
      Array.from(el.querySelectorAll(':scope > li')).forEach((li, i) => {
        out.push(
          new Paragraph({
            children: [new TextRun({ text: `${i + 1}. ` }), ...inlineRuns(li as HTMLElement)],
            indent: { left: 480 }
          })
        )
      })
    } else if (tag === 'pre') {
      out.push(
        new Paragraph({
          children: [new TextRun({ text: el.textContent ?? '', font: 'Consolas', size: 20 })],
          shading: { type: ShadingType.CLEAR, color: 'auto', fill: 'F5F5F5' }
        })
      )
    } else if (tag === 'table') {
      out.push(tableToDocx(el as HTMLTableElement))
    } else if (tag === 'hr') {
      out.push(
        new Paragraph({
          border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: '999999', space: 6 } },
          spacing: { after: 200 }
        })
      )
    } else {
      out.push(...elementChildrenToDocx(el))
    }
  }
  return out
}

async function buildDocxBlob(book: Book, items: OrderedChapter[], includeOutline: boolean): Promise<Blob> {
  const children: (Paragraph | Table)[] = []
  children.push(
    new Paragraph({ text: book.meta.title || '未命名作品', heading: HeadingLevel.TITLE, alignment: AlignmentType.CENTER })
  )
  const metaLine = [book.meta.author && `作者：${book.meta.author}`, book.meta.genre && `类型：${book.meta.genre}`]
    .filter(Boolean)
    .join('　')
  if (metaLine) children.push(new Paragraph({ text: metaLine, alignment: AlignmentType.CENTER, spacing: { after: 240 } }))

  let lastVol: string | null = null
  let pageBreak = false
  for (const { chapter, volumeTitle } of items) {
    if (volumeTitle && volumeTitle !== lastVol) {
      children.push(
        new Paragraph({ text: volumeTitle, heading: HeadingLevel.HEADING_1, pageBreakBefore: pageBreak })
      )
      lastVol = volumeTitle
      pageBreak = true
    }
    children.push(new Paragraph({ text: chapter.title, heading: HeadingLevel.HEADING_1, pageBreakBefore: pageBreak }))
    pageBreak = true
    if (includeOutline && chapter.outline.trim()) {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: `【大纲】${htmlToText(chapter.outline)}`, italics: true, color: '666666' })],
          spacing: { after: 120 }
        })
      )
    }
    const dom = parseHtml(chapter.content)
    children.push(...elementChildrenToDocx(dom.body))
  }

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { font: { name: '微软雅黑' }, size: 24 }
        }
      }
    },
    sections: [{ children }]
  })
  return Packer.toBlob(doc)
}

// ---------- EPUB ----------

const EPUB_CSS = `body { font-family: "Noto Serif SC","Songti SC",serif; line-height: 1.9; padding: 1em; }
h1 { font-size: 1.5em; text-align: center; margin-bottom: 1.2em; }
p { margin: 0 0 0.8em; text-indent: 2em; }
blockquote { border-left: 3px solid #999; padding-left: 1em; color: #555; margin: 1em 0; }
pre { background: #f5f5f5; padding: 0.8em; font-size: 0.9em; white-space: pre-wrap; }
table { border-collapse: collapse; width: 100%; margin: 1em 0; }
td, th { border: 1px solid #999; padding: 4px 8px; }
`

const XML_ESCAPE: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&apos;'
}

function xmlEscape(text: string): string {
  return text.replace(/[&<>"']/g, (c) => XML_ESCAPE[c] ?? c)
}

function sanitizeXhtml(content: string): string {
  const doc = parseHtml(content)
  doc.body.querySelectorAll('img, script, style, iframe, input, button, svg, video, audio, object').forEach((n) => n.remove())
  const serializer = new XMLSerializer()
  const parts: string[] = []
  for (const child of Array.from(doc.body.childNodes)) {
    parts.push(serializer.serializeToString(child))
  }
  return parts.join('\n')
}

interface EpubChapter extends OrderedChapter {
  file: string
}

function buildOpf(book: Book, chapters: EpubChapter[]): string {
  const manifest =
    chapters
      .map((c, i) => `<item id="ch${i}" href="${c.file}" media-type="application/xhtml+xml"/>`)
      .join('') + `<item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>`
  const spine = chapters.map((_c, i) => `<itemref idref="ch${i}"/>`).join('')
  return `<?xml version="1.0" encoding="utf-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="2.0" unique-identifier="bookid">
<metadata xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:opf="http://www.idpf.org/2007/opf">
<dc:identifier id="bookid">urn:uuid:${book.meta.id}</dc:identifier>
<dc:title>${xmlEscape(book.meta.title || '未命名作品')}</dc:title>
<dc:language>zh-CN</dc:language>
${book.meta.author ? `<dc:creator>${xmlEscape(book.meta.author)}</dc:creator>` : ''}
</metadata>
<manifest>${manifest}</manifest>
<spine toc="ncx">${spine}</spine>
</package>`
}

function buildNcx(book: Book, chapters: EpubChapter[]): string {
  const navPoints = chapters
    .map(
      (c, i) =>
        `<navPoint id="np${i}" playOrder="${i + 1}"><navLabel><text>${xmlEscape(c.chapter.title)}</text></navLabel><content src="${c.file}"/></navPoint>`
    )
    .join('')
  return `<?xml version="1.0" encoding="utf-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
<head><meta name="dtb:uid" content="urn:uuid:${book.meta.id}"/><meta name="dtb:depth" content="1"/><meta name="dtb:totalPageCount" content="0"/><meta name="dtb:maxPageNumber" content="0"/></head>
<docTitle><text>${xmlEscape(book.meta.title || '未命名作品')}</text></docTitle>
<navMap>${navPoints}</navMap>
</ncx>`
}

async function buildEpubBlob(book: Book, items: OrderedChapter[]): Promise<Blob> {
  const zip = new JSZip()
  zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' })
  const metaInf = zip.folder('META-INF')
  if (!metaInf) throw new Error('zip error')
  metaInf.file(
    'container.xml',
    `<?xml version="1.0"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>`
  )
  const oebps = zip.folder('OEBPS')
  if (!oebps) throw new Error('zip error')
  const chapters: EpubChapter[] = items.map((x, i) => ({
    ...x,
    file: `chapter-${String(i + 1).padStart(3, '0')}.xhtml`
  }))
  oebps.file('style.css', EPUB_CSS)
  oebps.file('content.opf', buildOpf(book, chapters))
  oebps.file('toc.ncx', buildNcx(book, chapters))
  for (const c of chapters) {
    const body = `<h1>${xmlEscape(c.chapter.title)}</h1>\n${sanitizeXhtml(c.chapter.content)}`
    const xhtml = `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head><title>${xmlEscape(c.chapter.title)}</title><link rel="stylesheet" type="text/css" href="style.css"/></head>
<body>${body}</body>
</html>`
    oebps.file(c.file, xhtml)
  }
  return zip.generateAsync({ type: 'blob', mimeType: 'application/epub+zip', compression: 'DEFLATE' })
}

// ---------- Entry ----------

function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let bin = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(bin)
}

export async function exportBook(
  book: Book,
  chapterId: string | null,
  options: ExportOptions
): Promise<{ ok: boolean; canceled?: boolean; path?: string; error?: string }> {
  const all = orderedChapters(book)
  const items = options.scope === 'chapter' ? all.filter((x) => x.chapter.id === chapterId) : all
  if (!items.length) return { ok: false, error: '没有可导出的章节' }

  const baseName = `${book.meta.title || '未命名作品'}-${options.scope === 'chapter' ? items[0].chapter.title : '全本'}`
    .replace(/[\\/:*?"<>|]/g, '_')
  let blob: Blob
  let ext = 'txt'

  if (options.format === 'txt') {
    blob = new Blob(['\ufeff' + buildTxt(book, items, options.includeOutline)], {
      type: 'text/plain;charset=utf-8'
    })
    ext = 'txt'
  } else if (options.format === 'md') {
    blob = new Blob([buildMd(book, items, options.includeOutline)], { type: 'text/markdown;charset=utf-8' })
    ext = 'md'
  } else if (options.format === 'docx') {
    blob = await buildDocxBlob(book, items, options.includeOutline)
    ext = 'docx'
  } else {
    blob = await buildEpubBlob(book, items)
    ext = 'epub'
  }

  const buffer = await blob.arrayBuffer()
  const result = await window.inkriver.saveExport({
    defaultName: `${baseName}.${ext}`,
    filters: [{ name: ext.toUpperCase(), extensions: [ext] }],
    dataBase64: bufferToBase64(buffer)
  })
  if (result.canceled) return { ok: false, canceled: true }
  if (!result.path) return { ok: false, error: result.error || '导出失败' }
  return { ok: true, path: result.path }
}
