import { useEffect, useReducer, useRef, useState, type JSX } from 'react'
import { Editor, Extension } from '@tiptap/core'
import { EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Underline from '@tiptap/extension-underline'
import Highlight from '@tiptap/extension-highlight'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import TextAlign from '@tiptap/extension-text-align'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import Table from '@tiptap/extension-table'
import TableRow from '@tiptap/extension-table-row'
import TableCell from '@tiptap/extension-table-cell'
import TableHeader from '@tiptap/extension-table-header'
import { createSearchPlugin } from '../lib/search'
import { Icon, type IconName } from './Icons'

interface ToolbarButton {
  icon?: IconName
  label?: string
  title: string
  active?: (editor: Editor) => boolean
  run: (editor: Editor) => void
}

const groups: ToolbarButton[][] = [
  [
    { icon: 'undo', title: '撤销', run: (e) => e.chain().focus().undo().run() },
    { icon: 'redo', title: '重做', run: (e) => e.chain().focus().redo().run() }
  ],
  [
    { icon: 'h1', title: '一级标题', active: (e) => e.isActive('heading', { level: 1 }), run: (e) => e.chain().focus().toggleHeading({ level: 1 }).run() },
    { icon: 'h2', title: '二级标题', active: (e) => e.isActive('heading', { level: 2 }), run: (e) => e.chain().focus().toggleHeading({ level: 2 }).run() },
    { icon: 'h3', title: '三级标题', active: (e) => e.isActive('heading', { level: 3 }), run: (e) => e.chain().focus().toggleHeading({ level: 3 }).run() },
    { label: '¶', title: '正文段落', active: (e) => e.isActive('paragraph'), run: (e) => e.chain().focus().setParagraph().run() },
    { icon: 'clear', title: '清除格式', run: (e) => e.chain().focus().clearNodes().unsetAllMarks().run() }
  ],
  [
    { label: 'B', title: '加粗 (Ctrl+B)', active: (e) => e.isActive('bold'), run: (e) => e.chain().focus().toggleBold().run() },
    { label: 'I', title: '斜体 (Ctrl+I)', active: (e) => e.isActive('italic'), run: (e) => e.chain().focus().toggleItalic().run() },
    { label: 'U', title: '下划线 (Ctrl+U)', active: (e) => e.isActive('underline'), run: (e) => e.chain().focus().toggleUnderline().run() },
    { label: 'S', title: '删除线', active: (e) => e.isActive('strike'), run: (e) => e.chain().focus().toggleStrike().run() },
    { icon: 'highlight', title: '高亮', active: (e) => e.isActive('highlight'), run: (e) => e.chain().focus().toggleHighlight().run() }
  ],
  [
    { icon: 'quote', title: '引用', active: (e) => e.isActive('blockquote'), run: (e) => e.chain().focus().toggleBlockquote().run() },
    { icon: 'code', title: '代码块', active: (e) => e.isActive('codeBlock'), run: (e) => e.chain().focus().toggleCodeBlock().run() },
    { label: '`', title: '行内代码', active: (e) => e.isActive('code'), run: (e) => e.chain().focus().toggleCode().run() },
    { icon: 'list', title: '无序列表', active: (e) => e.isActive('bulletList'), run: (e) => e.chain().focus().toggleBulletList().run() },
    { icon: 'listOrdered', title: '有序列表', active: (e) => e.isActive('orderedList'), run: (e) => e.chain().focus().toggleOrderedList().run() },
    { icon: 'task', title: '任务列表', active: (e) => e.isActive('taskList'), run: (e) => e.chain().focus().toggleTaskList().run() },
    { icon: 'hr', title: '分隔线', run: (e) => e.chain().focus().setHorizontalRule().run() }
  ],
  [
    { icon: 'alignLeft', title: '左对齐', active: (e) => e.isActive({ textAlign: 'left' }), run: (e) => e.chain().focus().setTextAlign('left').run() },
    { icon: 'alignCenter', title: '居中', active: (e) => e.isActive({ textAlign: 'center' }), run: (e) => e.chain().focus().setTextAlign('center').run() },
    { icon: 'alignRight', title: '右对齐', active: (e) => e.isActive({ textAlign: 'right' }), run: (e) => e.chain().focus().setTextAlign('right').run() }
  ],
  [
    { icon: 'image', title: '插入图片', run: (e) => void insertImage(e) },
    { icon: 'link', title: '插入链接', active: (e) => e.isActive('link'), run: (e) => void e.commands.setLink({ href: '' }) }
  ]
]

const SearchExtension = Extension.create({
  name: 'inkriverSearch',
  addProseMirrorPlugins() {
    return [createSearchPlugin()]
  }
})

const ResizableImage = Image.extend({
  addAttributes() {
    const parent = this.parent?.() ?? {}
    return {
      ...parent,
      width: {
        default: null,
        parseHTML: (element) => element.getAttribute('width'),
        renderHTML: (attributes) => (attributes.width ? { width: attributes.width } : {})
      }
    }
  }
})

const IMG_SIZES: (string | null)[] = [null, '100%', '75%', '50%', '25%']
const MAX_IMAGE_DIM = 1600

// 章节编辑器实例缓存：切换章节时保留撤销历史与光标位置
const editorCache = new Map<string, Editor>()
const EDITOR_CACHE_LIMIT = 20

function cachedEditor(key: string): Editor | undefined {
  const ed = editorCache.get(key)
  if (ed) {
    editorCache.delete(key)
    editorCache.set(key, ed)
  }
  return ed
}

function storeEditor(key: string, ed: Editor): void {
  editorCache.set(key, ed)
  while (editorCache.size > EDITOR_CACHE_LIMIT) {
    const oldestKey = editorCache.keys().next().value as string | undefined
    if (oldestKey === undefined) break
    const oldest = editorCache.get(oldestKey)
    editorCache.delete(oldestKey)
    try {
      oldest?.destroy()
    } catch {
      // ignore
    }
  }
}

function downscaleDataUrl(dataUrl: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new window.Image()
    img.onload = () => {
      const maxDim = Math.max(img.naturalWidth, img.naturalHeight)
      if (maxDim <= MAX_IMAGE_DIM) {
        resolve(dataUrl)
        return
      }
      const scale = MAX_IMAGE_DIM / maxDim
      const canvas = document.createElement('canvas')
      canvas.width = Math.max(1, Math.round(img.naturalWidth * scale))
      canvas.height = Math.max(1, Math.round(img.naturalHeight * scale))
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        resolve(dataUrl)
        return
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      const isPng = dataUrl.startsWith('data:image/png')
      resolve(canvas.toDataURL(isPng ? 'image/png' : 'image/jpeg', 0.85))
    }
    img.onerror = () => resolve(dataUrl)
    img.src = dataUrl
  })
}

async function insertImage(editor: Editor): Promise<void> {
  const result = await window.inkriver.pickImage()
  if (result.canceled || !result.dataUrl) return
  const dataUrl = await downscaleDataUrl(result.dataUrl)
  editor.chain().focus().setImage({ src: dataUrl }).run()
}

export function RichEditor({
  value,
  onChange,
  placeholder,
  typewriter,
  onReady,
  minHeight,
  cacheKey
}: {
  value: string
  onChange: (html: string) => void
  placeholder?: string
  typewriter?: boolean
  onReady?: (editor: Editor) => void
  minHeight?: number
  cacheKey?: string
}): JSX.Element {
  const [, rerender] = useReducer((x: number) => x + 1, 0)
  const [linkOpen, setLinkOpen] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')
  const [editor, setEditor] = useState<Editor | null>(null)
  const onChangeRef = useRef(onChange)
  const typewriterRef = useRef(typewriter)
  onChangeRef.current = onChange
  typewriterRef.current = typewriter

  useEffect(() => {
    let ed: Editor | null | undefined = null
    if (cacheKey) ed = cachedEditor(cacheKey)
    if (!ed) {
      ed = new Editor({
        content: value,
        extensions: [
          StarterKit.configure({
            heading: { levels: [1, 2, 3, 4, 5, 6] }
          }),
          Underline,
          Highlight,
          Link.configure({
            openOnClick: false,
            autolink: true,
            HTMLAttributes: { rel: 'noopener' }
          }),
          ResizableImage.configure({ allowBase64: true, inline: false }),
          TextAlign.configure({ types: ['heading', 'paragraph'] }),
          TaskList,
          TaskItem.configure({ nested: true }),
          Table.configure({ resizable: true }),
          TableRow,
          TableHeader,
          TableCell,
          Placeholder.configure({ placeholder: placeholder ?? '从这里开始落笔…' }),
          SearchExtension
        ],
        editorProps: {
          attributes: {
            class: 'ProseMirror'
          }
        },
        onUpdate: ({ editor: e }) => {
          onChangeRef.current(e.getHTML())
          if (typewriterRef.current) {
            requestAnimationFrame(() => {
              const dom = e.view.domAtPos(e.state.selection.from).node as HTMLElement | undefined
              dom?.scrollIntoView({ block: 'center', behavior: 'smooth' })
            })
          }
        },
        onSelectionUpdate: () => rerender()
      })
      if (cacheKey) storeEditor(cacheKey, ed)
    } else if (ed.getHTML() !== value) {
      ed.commands.setContent(value, false)
    }
    const onTransaction = (): void => rerender()
    ed.on('transaction', onTransaction)
    setEditor(ed)
    onReady?.(ed)
    return () => {
      ed.off('transaction', onTransaction)
    }
    // 编辑器实例由 cacheKey 决定，value/onChange 通过 ref 保持最新
  }, [cacheKey]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!editor) return <div style={{ minHeight: minHeight ?? 300 }} />

  const imageSelected = editor.isActive('image')
  const imageWidth = imageSelected ? editor.getAttributes('image').width : null

  return (
    <div>
      <div className="toolbar">
        {groups.map((group, gi) => (
          <span key={gi} className="inline-flex">
            {group.map((btn) => {
              const active = btn.active?.(editor)
              return (
                <button
                  key={btn.title}
                  className={`tb-btn ${active ? 'active' : ''}`}
                  title={btn.title}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    if (btn.icon === 'link') {
                      if (editor.isActive('link')) {
                        editor.chain().focus().unsetLink().run()
                      } else {
                        setLinkUrl(editor.getAttributes('link').href ?? '')
                        setLinkOpen(true)
                      }
                      return
                    }
                    btn.run(editor)
                  }}
                >
                  {btn.icon ? <Icon name={btn.icon} size={15} /> : <b style={{ fontSize: 14 }}>{btn.label}</b>}
                </button>
              )
            })}
            {gi < groups.length - 1 && <span className="tb-sep" />}
          </span>
        ))}
        <span className="inline-flex">
          <span className="tb-sep" />
          <button
            className="tb-btn"
            title="插入表格"
            onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
          >
            <Icon name="table" size={15} />
          </button>
        </span>
        {imageSelected && (
          <span className="inline-flex img-size-controls">
            <span className="tb-sep" />
            {IMG_SIZES.map((w) => {
              const active = imageWidth === w
              return (
                <button
                  key={String(w)}
                  className={`tb-btn ${active ? 'active' : ''}`}
                  title={w === null ? '原始宽度' : `宽度 ${w}`}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    editor
                      .chain()
                      .focus()
                      .updateAttributes('image', w === null ? { width: null } : { width: w })
                      .run()
                  }}
                >
                  {w === null ? '原宽' : w}
                </button>
              )
            })}
          </span>
        )}
      </div>

      {linkOpen && (
        <div className="find-panel">
          <input
            autoFocus
            value={linkUrl}
            placeholder="https://…"
            onChange={(e) => setLinkUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                if (linkUrl.trim()) editor.chain().focus().extendMarkRange('link').setLink({ href: linkUrl.trim() }).run()
                setLinkOpen(false)
              }
            }}
          />
          <button
            className="btn small"
            onClick={() => {
              if (linkUrl.trim()) editor.chain().focus().extendMarkRange('link').setLink({ href: linkUrl.trim() }).run()
              setLinkOpen(false)
            }}
          >
            确定
          </button>
          <button className="btn small ghost" onClick={() => setLinkOpen(false)}>
            取消
          </button>
        </div>
      )}

      <EditorContent editor={editor} style={{ minHeight: minHeight ?? 300 }} />
    </div>
  )
}
