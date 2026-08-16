import { useEffect, useReducer, useState, type JSX } from 'react'
import { Extension } from '@tiptap/core'
import { EditorContent, useEditor, type Editor } from '@tiptap/react'
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

async function insertImage(editor: Editor): Promise<void> {
  const result = await window.inkriver.pickImage()
  if (result.canceled || !result.dataUrl) return
  editor.chain().focus().setImage({ src: result.dataUrl }).run()
}

export function RichEditor({
  value,
  onChange,
  placeholder,
  typewriter,
  onReady,
  minHeight
}: {
  value: string
  onChange: (html: string) => void
  placeholder?: string
  typewriter?: boolean
  onReady?: (editor: Editor) => void
  minHeight?: number
}): JSX.Element {
  const [, rerender] = useReducer((x: number) => x + 1, 0)
  const [linkOpen, setLinkOpen] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')

  const editor = useEditor({
    immediatelyRender: false,
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
      Image.configure({ allowBase64: true, inline: false }),
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
    onUpdate: ({ editor: ed }) => {
      onChange(ed.getHTML())
      if (typewriter) {
        requestAnimationFrame(() => {
          const dom = ed.view.domAtPos(ed.state.selection.from).node as HTMLElement | undefined
          dom?.scrollIntoView({ block: 'center', behavior: 'smooth' })
        })
      }
    },
    onSelectionUpdate: () => rerender()
  })

  useEffect(() => {
    if (editor) {
      editor.on('transaction', rerender)
      onReady?.(editor)
      return () => {
        editor.off('transaction', rerender)
      }
    }
  }, [editor, onReady])

  if (!editor) return <div style={{ minHeight: minHeight ?? 300 }} />

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
