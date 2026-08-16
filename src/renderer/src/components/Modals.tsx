import { useState, type JSX } from 'react'
import { useApp } from '../lib/store'
import { exportBook, type ExportOptions } from '../lib/export'
import { Field, Modal, useT } from './ui'
import { Icon } from './Icons'

// ---------- Export ----------

const FORMATS: { id: ExportOptions['format']; title: string; desc: string }[] = [
  { id: 'txt', title: 'TXT', desc: '纯文本，兼容性最好' },
  { id: 'md', title: 'Markdown', desc: '带格式标记，适合写作软件' },
  { id: 'docx', title: 'DOCX', desc: 'Word 文档，可直接编辑' },
  { id: 'epub', title: 'EPUB', desc: '电子书格式，适合阅读器' }
]

export function ExportDialog(): JSX.Element {
  const t = useT()
  const open = useApp((s) => s.exportOpen)
  const toggleExport = useApp((s) => s.toggleExport)
  const book = useApp((s) => s.book)
  const chapterId = useApp((s) => s.chapterId)
  const toast = useApp((s) => s.toast)
  const [scope, setScope] = useState<ExportOptions['scope']>('book')
  const [format, setFormat] = useState<ExportOptions['format']>('txt')
  const [includeOutline, setIncludeOutline] = useState(false)
  const [busy, setBusy] = useState(false)

  if (!open || !book) return <></>

  const run = async (): Promise<void> => {
    setBusy(true)
    try {
      const result = await exportBook(book, chapterId, { scope, format, includeOutline })
      if (result.canceled) return
      if (!result.ok || !result.path) {
        toast(result.error || '导出失败', 'error')
        return
      }
      toast(t('exportDone', { path: result.path }), 'success')
      toggleExport()
    } catch (error) {
      toast(String(error), 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal title={t('exportTitle')} onClose={toggleExport} wide
      footer={
        <>
          <button className="btn" onClick={toggleExport}>
            {t('cancel')}
          </button>
          <button className="btn primary" disabled={busy} onClick={() => void run()}>
            <Icon name="download" size={14} /> {busy ? '导出中…' : t('startExport')}
          </button>
        </>
      }
    >
      <div className="export-opts">
        <div
          className={`opt-card ${scope === 'book' ? 'selected' : ''}`}
          onClick={() => setScope('book')}
        >
          <div className="opt-title">{t('wholeBook')}</div>
          <div className="opt-desc">导出全部 {book.chapters.length} 个章节</div>
        </div>
        <div
          className={`opt-card ${scope === 'chapter' ? 'selected' : ''}`}
          onClick={() => setScope('chapter')}
        >
          <div className="opt-title">{t('currentChapter')}</div>
          <div className="opt-desc">
            {book.chapters.find((c) => c.id === chapterId)?.title ?? '未选择章节'}
          </div>
        </div>
      </div>
      <div className="export-opts">
        {FORMATS.map((f) => (
          <div
            key={f.id}
            className={`opt-card ${format === f.id ? 'selected' : ''}`}
            onClick={() => setFormat(f.id)}
          >
            <div className="opt-title">{f.title}</div>
            <div className="opt-desc">{f.desc}</div>
          </div>
        ))}
      </div>
      <label className="inline-flex" style={{ cursor: 'pointer' }}>
        <input
          type="checkbox"
          checked={includeOutline}
          onChange={(e) => setIncludeOutline(e.target.checked)}
        />
        {t('includeOutline')}
      </label>
      <p className="mini" style={{ marginTop: 10 }}>
        {t('exportHint')}。EPUB 与 DOCX 会自动跳过文档中的图片。
      </p>
    </Modal>
  )
}

// ---------- New project ----------

export function NewProjectModal(): JSX.Element {
  const t = useT()
  const open = useApp((s) => s.newOpen)
  const toggleNew = useApp((s) => s.toggleNew)
  const createProject = useApp((s) => s.createProject)
  const [name, setName] = useState('')
  const [author, setAuthor] = useState('')
  const [genre, setGenre] = useState('')
  const [baseDir, setBaseDir] = useState('')
  const [busy, setBusy] = useState(false)

  if (!open) return <></>

  const pick = async (): Promise<void> => {
    const result = await window.inkriver.pickParent()
    if (!result.canceled && result.dir) setBaseDir(result.dir)
  }

  const create = async (): Promise<void> => {
    if (!name.trim()) return
    let dir = baseDir
    if (!dir) {
      const result = await window.inkriver.pickParent()
      if (result.canceled || !result.dir) return
      dir = result.dir
      setBaseDir(dir)
    }
    setBusy(true)
    try {
      const ok = await createProject(name.trim(), dir, { author, genre })
      if (ok) {
        setName('')
        setAuthor('')
        setGenre('')
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      title={t('newProject')}
      onClose={toggleNew}
      footer={
        <>
          <button className="btn" onClick={toggleNew}>
            {t('cancel')}
          </button>
          <button className="btn primary" disabled={busy || !name.trim()} onClick={() => void create()}>
            <Icon name="plus" size={14} /> {t('create')}
          </button>
        </>
      }
    >
      <Field label={t('projectName')}>
        <input
          autoFocus
          value={name}
          placeholder="《长夜灯火》"
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void create()
          }}
        />
      </Field>
      <div className="field-row">
        <Field label={t('projectAuthor')}>
          <input value={author} onChange={(e) => setAuthor(e.target.value)} />
        </Field>
        <Field label={t('projectGenre')}>
          <input value={genre} placeholder="玄幻 / 科幻 / 言情…" onChange={(e) => setGenre(e.target.value)} />
        </Field>
      </div>
      <Field label={t('projectLocation')}>
        <div className="inline-flex" style={{ width: '100%', gap: 8 }}>
          <input
            style={{ flex: 1 }}
            value={baseDir}
            placeholder="点击右侧选择文件夹"
            onChange={(e) => setBaseDir(e.target.value)}
          />
          <button className="btn" onClick={() => void pick()}>
            <Icon name="folder" size={14} /> {t('chooseFolder')}
          </button>
        </div>
      </Field>
      <p className="mini">项目将保存为「{name.trim() || '书名'}.inkriver」文件夹，其中包含 book.json 与 backups/ 备份目录。</p>
    </Modal>
  )
}

// ---------- Confirm ----------

export function ConfirmModal(): JSX.Element {
  const confirm = useApp((s) => s.confirm)
  const setConfirm = useApp((s) => s.setConfirm)
  const t = useT()
  if (!confirm) return <></>
  return (
    <Modal
      title={confirm.title || t('deleteConfirmTitle')}
      onClose={() => setConfirm(null)}
      footer={
        <>
          <button className="btn" onClick={() => setConfirm(null)}>
            {t('cancel')}
          </button>
          <button
            className={`btn ${confirm.danger === false ? 'primary' : 'danger'}`}
            onClick={() => {
              const fn = confirm.onYes
              setConfirm(null)
              fn()
            }}
          >
            {t('confirm')}
          </button>
        </>
      }
    >
      <p style={{ lineHeight: 1.7, margin: 0 }}>{confirm.message}</p>
    </Modal>
  )
}

// ---------- Toasts ----------

export function Toasts(): JSX.Element {
  const toasts = useApp((s) => s.toasts)
  return (
    <div className="toasts">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast ${toast.kind}`}>
          {toast.text}
        </div>
      ))}
    </div>
  )
}
