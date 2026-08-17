import { useEffect, useState, type JSX } from 'react'
import { useApp } from '../lib/store'
import { Field, Switch, useT } from './ui'
import { Icon } from './Icons'
import type { ShortcutId, Shortcuts } from '../../../shared/types'

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

const SHORTCUT_ACTIONS: { id: ShortcutId; label: string }[] = [
  { id: 'new-project', label: '新建项目' },
  { id: 'new-chapter', label: '新建章节' },
  { id: 'open-project', label: '打开项目' },
  { id: 'save', label: '保存' },
  { id: 'export', label: '导出' },
  { id: 'find', label: '查找 / 替换' },
  { id: 'focus-mode', label: '专注模式' },
  { id: 'toggle-theme', label: '切换主题' }
]

function displayAccel(accel: string): string {
  return accel.replace('CmdOrCtrl', 'Ctrl')
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
  const [shortcuts, setShortcuts] = useState<Shortcuts | null>(null)
  const [capturing, setCapturing] = useState<ShortcutId | null>(null)

  const refresh = async (): Promise<void> => {
    if (!projectDir) return
    const list = await window.inkriver.backups.list(projectDir)
    setBackups(list)
  }

  useEffect(() => {
    void refresh()
  }, [projectDir]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    void window.inkriver.shortcuts.get().then(setShortcuts)
    return window.inkriver.shortcuts.onCaptured(({ id, accel, error, shortcuts: next }) => {
      setCapturing(null)
      setShortcuts(next)
      if (error) toast(error, 'error')
      else if (id && accel) toast(`快捷键 ${displayAccel(accel)} 已生效`, 'success')
    })
  }, [toast])

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
        <h2>快捷键</h2>
        <p className="muted" style={{ fontSize: 12, marginTop: -4, marginBottom: 10 }}>
          点击右侧按钮后按下新的组合键即可修改（需含 Ctrl / Alt / Shift，按 Esc 取消）
        </p>
        {SHORTCUT_ACTIONS.map(({ id, label }) => (
          <div className="setting-row" key={id}>
            <div>
              <div className="set-label">{label}</div>
            </div>
            <button
              className={`shortcut-key ${capturing === id ? 'recording' : ''}`}
              onClick={() => {
                const next = capturing === id ? null : id
                setCapturing(next)
                void window.inkriver.shortcuts.capture(next)
              }}
              onBlur={() => {
                if (capturing === id) {
                  setCapturing(null)
                  void window.inkriver.shortcuts.capture(null)
                }
              }}
            >
              {capturing === id
                ? '按下组合键…（Esc 取消）'
                : displayAccel(shortcuts?.[id] ?? '')}
            </button>
          </div>
        ))}
        <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
          <button
            className="btn small"
            onClick={() => {
              void window.inkriver.shortcuts.reset().then((res) => {
                setShortcuts(res.shortcuts)
                toast('已恢复默认快捷键', 'success')
              })
            }}
          >
            <Icon name="restore" size={13} /> 恢复默认
          </button>
        </div>
      </div>

      <div className="card settings-section">
        <h2>使用文档</h2>
        <div className="doc-block">
          <div className="doc-title">全局快捷键（可在上方自定义）</div>
          <div className="doc-grid">
            <span>Ctrl+N 新建项目</span>
            <span>Ctrl+Shift+N 新建章节</span>
            <span>Ctrl+O 打开项目</span>
            <span>Ctrl+S 保存</span>
            <span>Ctrl+E 导出</span>
            <span>Ctrl+F 查找 / 替换</span>
            <span>Ctrl+Shift+F 专注模式</span>
            <span>Ctrl+Shift+T 切换主题</span>
            <span>F11 全屏</span>
          </div>
        </div>
        <div className="doc-block">
          <div className="doc-title">编辑器快捷键</div>
          <div className="doc-grid">
            <span>Ctrl+B 加粗</span>
            <span>Ctrl+I 斜体</span>
            <span>Ctrl+U 下划线</span>
            <span>Ctrl+Shift+S 删除线</span>
            <span>Ctrl+Shift+H 高亮</span>
            <span>Ctrl+Z 撤销 / Ctrl+Y 重做</span>
            <span>Ctrl+Alt+1/2/3 标题</span>
            <span>Ctrl+Shift+8/7/9 列表</span>
            <span>Ctrl+E 行内代码</span>
          </div>
        </div>
        <div className="doc-block">
          <div className="doc-title">写作提示</div>
          <ul className="doc-list">
            <li>自动备份默认开启，可在“备份”中调整间隔；每次打开 / 关闭项目都会强制留一份快照。</li>
            <li>新建章节会自动编号为“第 N 章”，可直接修改标题。</li>
            <li>删除的章节、笔记可在“数据”的回收站中恢复。</li>
            <li>正文中插入的图片，导出 docx / epub 时会自动嵌入。</li>
            <li>全文搜索（左侧搜索页）点击章节结果后，会自动定位并高亮到第一个匹配处。</li>
          </ul>
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
