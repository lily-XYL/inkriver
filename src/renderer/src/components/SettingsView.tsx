import { useEffect, useState, type JSX } from 'react'
import { useApp } from '../lib/store'
import { Field, Switch, useT } from './ui'
import { Icon } from './Icons'

const FONTS = [
  { value: '楷体, KaiTi, serif', label: '楷体' },
  { value: '"Microsoft YaHei", "微软雅黑", sans-serif', label: '微软雅黑' },
  { value: '宋体, SimSun, serif', label: '宋体' },
  { value: '"Source Han Serif SC", "Noto Serif SC", serif', label: '思源宋体' },
  { value: 'Georgia, "Times New Roman", serif', label: 'Georgia' },
  { value: 'Consolas, "Courier New", monospace', label: '等宽字体' }
]

interface BackupItem {
  name: string
  size: number
  mtime: number
}

export function SettingsView(): JSX.Element {
  const t = useT()
  const book = useApp((s) => s.book)
  const info = useApp((s) => s.info)
  const projectDir = useApp((s) => s.projectDir)
  const updateSettings = useApp((s) => s.updateSettings)
  const updateBook = useApp((s) => s.updateBook)
  const askConfirm = useApp((s) => s.askConfirm)
  const toast = useApp((s) => s.toast)
  const emptyTrash = useApp((s) => s.emptyTrash)
  const restoreBackup = useApp((s) => s.restoreBackup)
  const [backups, setBackups] = useState<BackupItem[]>([])

  const refresh = async (): Promise<void> => {
    if (!projectDir) return
    const list = await window.inkriver.backups.list(projectDir)
    setBackups(list)
  }

  useEffect(() => {
    void refresh()
  }, [projectDir]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!book) {
    return (
      <div className="main-scroll">
        <p className="muted">请先打开项目再调整设置</p>
      </div>
    )
  }

  const s = book.settings
  const setMeta = (patch: Partial<typeof book.meta>): void => {
    updateBook((b) => {
      Object.assign(b.meta, patch)
    })
  }

  const backupNow = async (): Promise<void> => {
    if (!projectDir) return
    await window.inkriver.backups.now(projectDir)
    await refresh()
    toast(t('backupCreated'), 'success')
  }

  return (
    <div className="main-scroll">
      <div className="page-head">
        <div>
          <h1 className="page-title">{t('settings')}</h1>
          <p className="page-sub">{book.meta.title}</p>
        </div>
      </div>

      <div className="card settings-section">
        <h2>作品信息</h2>
        <div className="field-row">
          <Field label={t('projectName')}>
            <input value={book.meta.title} onChange={(e) => setMeta({ title: e.target.value })} />
          </Field>
          <Field label={t('projectAuthor')}>
            <input value={book.meta.author} onChange={(e) => setMeta({ author: e.target.value })} />
          </Field>
        </div>
        <Field label={t('projectGenre')}>
          <input value={book.meta.genre} onChange={(e) => setMeta({ genre: e.target.value })} />
        </Field>
        <Field label={t('synopsis')}>
          <textarea rows={4} value={book.meta.synopsis} onChange={(e) => setMeta({ synopsis: e.target.value })} />
        </Field>
      </div>

      <div className="card settings-section">
        <h2>{t('appearanceSection')}</h2>
        <div className="setting-row">
          <div>
            <div className="set-label">{t('theme')}</div>
          </div>
          <select
            value={s.theme}
            onChange={(e) => updateSettings({ theme: e.target.value as typeof s.theme })}
          >
            <option value="light">{t('light')}</option>
            <option value="sepia">{t('sepia')}</option>
            <option value="dark">{t('dark')}</option>
          </select>
        </div>
        <div className="setting-row">
          <div>
            <div className="set-label">{t('language')}</div>
          </div>
          <select value={s.language} onChange={(e) => updateSettings({ language: e.target.value as 'zh' | 'en' })}>
            <option value="zh">中文</option>
            <option value="en">English</option>
          </select>
        </div>
        <div className="setting-row">
          <div>
            <div className="set-label">{t('accentColor')}</div>
          </div>
          <input
            type="color"
            value={s.accent}
            style={{ width: 60, height: 30, padding: 2 }}
            onChange={(e) => updateSettings({ accent: e.target.value })}
          />
        </div>
        <div className="setting-row">
          <div>
            <div className="set-label">{t('editorFont')}</div>
          </div>
          <select
            value={s.fontFamily}
            onChange={(e) => updateSettings({ fontFamily: e.target.value })}
          >
            {FONTS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
        </div>
        <div className="setting-row">
          <div>
            <div className="set-label">{t('editorFontSize')}</div>
          </div>
          <input
            type="number"
            min={12}
            max={32}
            value={s.fontSize}
            onChange={(e) => updateSettings({ fontSize: Math.max(12, Math.min(32, Number(e.target.value) || 17)) })}
          />
        </div>
        <div className="setting-row">
          <div>
            <div className="set-label">{t('lineHeight')}</div>
          </div>
          <input
            type="number"
            min={1}
            max={3}
            step={0.1}
            value={s.lineHeight}
            onChange={(e) => updateSettings({ lineHeight: Math.max(1, Math.min(3, Number(e.target.value) || 1.9)) })}
          />
        </div>
        <div className="setting-row">
          <div>
            <div className="set-label">{t('editorWidth')}</div>
          </div>
          <input
            type="number"
            min={480}
            max={1200}
            step={20}
            value={s.editorWidth}
            onChange={(e) => updateSettings({ editorWidth: Math.max(480, Math.min(1200, Number(e.target.value) || 760)) })}
          />
        </div>
      </div>

      <div className="card settings-section">
        <h2>{t('writing')}</h2>
        <div className="setting-row">
          <div>
            <div className="set-label">{t('dailyGoal')}</div>
          </div>
          <input
            type="number"
            min={0}
            step={100}
            value={s.dailyGoal}
            onChange={(e) => updateSettings({ dailyGoal: Math.max(0, Number(e.target.value) || 0) })}
          />
        </div>
        <div className="setting-row">
          <div>
            <div className="set-label">{t('bookGoal')}</div>
          </div>
          <input
            type="number"
            min={0}
            step={10000}
            value={s.bookGoal}
            onChange={(e) => updateSettings({ bookGoal: Math.max(0, Number(e.target.value) || 0) })}
          />
        </div>
        <div className="setting-row">
          <div>
            <div className="set-label">{t('autosave')}</div>
          </div>
          <input
            type="number"
            min={0.5}
            max={60}
            step={0.5}
            value={s.autosaveMs / 1000}
            onChange={(e) => updateSettings({ autosaveMs: Math.max(500, Math.min(60000, Number(e.target.value) * 1000 || 1500)) })}
          />
        </div>
        <div className="setting-row">
          <div>
            <div className="set-label">{t('typewriterMode')}</div>
          </div>
          <Switch checked={s.typewriter} onChange={(v) => updateSettings({ typewriter: v })} />
        </div>
        <div className="setting-row">
          <div>
            <div className="set-label">{t('showWordCount')}</div>
          </div>
          <Switch checked={s.showWordCount} onChange={(v) => updateSettings({ showWordCount: v })} />
        </div>
      </div>

      <div className="card settings-section">
        <h2>{t('backup')}</h2>
        <div className="setting-row">
          <div>
            <div className="set-label">{t('backupEnabled')}</div>
          </div>
          <Switch checked={s.backupEnabled} onChange={(v) => updateSettings({ backupEnabled: v })} />
        </div>
        <div className="setting-row">
          <div>
            <div className="set-label">{t('backupInterval')}</div>
          </div>
          <input
            type="number"
            min={1}
            value={s.backupMinutes}
            onChange={(e) => updateSettings({ backupMinutes: Math.max(1, Number(e.target.value) || 10) })}
          />
        </div>
        <div className="setting-row">
          <div>
            <div className="set-label">{t('backupKeep')}</div>
          </div>
          <input
            type="number"
            min={1}
            max={200}
            value={s.backupKeep}
            onChange={(e) => updateSettings({ backupKeep: Math.max(1, Math.min(200, Number(e.target.value) || 30)) })}
          />
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
          <button className="btn" onClick={() => void backupNow()}>
            <Icon name="save" size={14} /> {t('backupNow')}
          </button>
          <button
            className="btn"
            onClick={() => {
              if (projectDir) void window.inkriver.backups.openFolder(projectDir)
            }}
          >
            <Icon name="folder" size={14} /> {t('openBackupFolder')}
          </button>
        </div>
        <div style={{ marginTop: 14 }}>
          <div className="set-label" style={{ marginBottom: 6 }}>
            {t('backups')}（{backups.length}）
          </div>
          {backups.length === 0 ? (
            <p className="muted" style={{ fontSize: 12 }}>
              暂无备份
            </p>
          ) : (
            backups.slice(0, 12).map((b) => (
              <div className="backup-row" key={b.name}>
                <span>{b.name.replace('backup-', '').replace('.json', '').replace(/T/g, ' ')}</span>
                <span className="mini">{(b.size / 1024).toFixed(1)} KB</span>
                <button
                  className="btn small"
                  onClick={() =>
                    askConfirm(t('restoreBackup'), t('restoreConfirm'), () => {
                      void restoreBackup(b.name)
                    })
                  }
                >
                  {t('restoreBackup')}
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="card settings-section">
        <h2>{t('data')}</h2>
        <div className="setting-row">
          <div>
            <div className="set-label">{t('trash')}</div>
            <div className="set-hint">
              章节 {book.trash.chapters.length} · 笔记 {book.trash.notes.length}
            </div>
          </div>
          <button className="btn danger small" onClick={emptyTrash}>
            {t('emptyTrash')}
          </button>
        </div>
      </div>

      <div className="card settings-section">
        <h2>{t('about')}</h2>
        <div className="setting-row">
          <div className="set-label">墨河 InkRiver</div>
          <span className="mini">
            {t('version')} {info?.version ?? '1.0.0'}
          </span>
        </div>
        <div className="setting-row">
          <div className="set-label">Electron</div>
          <span className="mini">{info?.electron ?? ''} / Chromium {info?.chrome ?? ''}</span>
        </div>
        {projectDir && (
          <div className="setting-row">
            <div className="set-label">项目位置</div>
            <span className="mini" style={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {projectDir}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
