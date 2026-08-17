import { app, BrowserWindow, Menu, clipboard, dialog, ipcMain, shell } from 'electron'
import * as fs from 'node:fs'
import * as path from 'node:path'
import type { Book, RecentItem, ShortcutId, Shortcuts } from '../shared/types'

let mainWindow: BrowserWindow | null = null

// 免安装目录版：用户数据直接写入 exe 所在文件夹（即 InkRiverData），
// 不再额外生成数据文件夹
if (app.isPackaged) {
  try {
    app.setPath('userData', path.dirname(process.execPath))
  } catch {
    // ignore
  }
}

const SHORTCUT_DEFAULTS: Shortcuts = {
  'new-project': 'CmdOrCtrl+N',
  'new-chapter': 'CmdOrCtrl+Shift+N',
  'open-project': 'CmdOrCtrl+O',
  save: 'CmdOrCtrl+S',
  export: 'CmdOrCtrl+E',
  find: 'CmdOrCtrl+F',
  'focus-mode': 'CmdOrCtrl+Shift+F',
  'toggle-theme': 'CmdOrCtrl+Shift+T'
}

function shortcutsFile(): string {
  return path.join(userDataPath(), 'shortcuts.json')
}

function loadShortcuts(): Shortcuts {
  const merged = { ...SHORTCUT_DEFAULTS }
  try {
    const raw = fs.readFileSync(shortcutsFile(), 'utf8')
    const data = JSON.parse(raw) as Partial<Shortcuts>
    for (const key of Object.keys(SHORTCUT_DEFAULTS) as ShortcutId[]) {
      const value = data[key]
      if (typeof value === 'string' && value.trim()) merged[key] = value.trim()
    }
  } catch {
    // no custom shortcuts yet
  }
  return merged
}

function saveShortcuts(shortcuts: Shortcuts): void {
  try {
    fs.mkdirSync(userDataPath(), { recursive: true })
    fs.writeFileSync(shortcutsFile(), JSON.stringify(shortcuts, null, 2), 'utf8')
  } catch {
    // ignore
  }
}

let shortcuts: Shortcuts = loadShortcuts()
let shortcutCaptureId: ShortcutId | null = null

function applyShortcut(id: ShortcutId, accel: string): { ok: boolean; error?: string; shortcuts: Shortcuts } {
  const value = accel.trim()
  if (!value) return { ok: false, error: '快捷键不能为空', shortcuts: { ...shortcuts } }
  for (const other of Object.keys(SHORTCUT_DEFAULTS) as ShortcutId[]) {
    if (other !== id && shortcuts[other] === value) {
      return { ok: false, error: `快捷键 ${value} 已被其他功能占用`, shortcuts: { ...shortcuts } }
    }
  }
  const next = { ...shortcuts, [id]: value }
  shortcuts = next
  saveShortcuts(next)
  buildMenu()
  return { ok: true, shortcuts: { ...next } }
}

function acceleratorFromInput(input: Electron.Input): string | null {
  const parts: string[] = []
  if (input.control || input.meta) parts.push('CmdOrCtrl')
  if (input.alt) parts.push('Alt')
  if (input.shift) parts.push('Shift')
  if (parts.length === 0) return null
  const keyMap: Record<string, string> = {
    ' ': 'Space',
    Enter: 'Return',
    Up: 'Up',
    Down: 'Down',
    Left: 'Left',
    Right: 'Right',
    Backspace: 'Backspace',
    Delete: 'Delete',
    Home: 'Home',
    End: 'End',
    PageUp: 'PageUp',
    PageDown: 'PageDown',
    Tab: 'Tab'
  }
  let key = input.key
  if (keyMap[key]) {
    key = keyMap[key]
  } else if (/^[a-zA-Z]$/.test(key)) {
    key = key.toUpperCase()
  } else if (!/^(F([1-9]|1[0-9]|2[0-4])|\d)$/.test(key)) {
    return null
  }
  return [...parts, key].join('+')
}

const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
}

app.whenReady().then(() => {
  registerIpc()
  buildMenu()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.focus()
  }
})

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1380,
    height: 880,
    minWidth: 1080,
    minHeight: 700,
    title: '墨河 InkRiver',
    backgroundColor: '#f6f4ee',
    show: false,
    autoHideMenuBar: false,
    frame: false,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  mainWindow = win

  const notifyMaximized = (): void => {
    mainWindow?.webContents.send('window:maximized-change', win.isMaximized())
  }
  win.on('maximize', notifyMaximized)
  win.on('unmaximize', notifyMaximized)

  win.webContents.on('before-input-event', (event, input) => {
    if (!shortcutCaptureId) return
    event.preventDefault()
    if (input.type !== 'keyDown') return
    if (input.key === 'Escape') {
      const id = shortcutCaptureId
      shortcutCaptureId = null
      win.webContents.send('shortcuts:captured', { id, accel: null, error: null })
      return
    }
    const accel = acceleratorFromInput(input)
    if (!accel) return
    const id = shortcutCaptureId
    shortcutCaptureId = null
    const result = applyShortcut(id, accel)
    win.webContents.send('shortcuts:captured', { id, accel: result.ok ? accel : null, error: result.error ?? null, shortcuts: result.shortcuts })
  })

  win.once('ready-to-show', () => win.show())
  win.on('closed', () => {
    mainWindow = null
  })

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      void shell.openExternal(url)
    }
    return { action: 'deny' }
  })

  win.webContents.on('will-navigate', (event, url) => {
    const devUrl = process.env.ELECTRON_RENDERER_URL
    const allowed = url.startsWith('file:') || (!!devUrl && url.startsWith(devUrl))
    if (!allowed) event.preventDefault()
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    void win.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    void win.loadFile(path.join(__dirname, '../renderer/index.html'))
  }

  if (process.argv.includes('--smoke-test')) {
    win.webContents.on('console-message', (_event, _level, message) => {
      console.log('[renderer]', message)
    })
    win.webContents.on('did-finish-load', () => {
      setTimeout(() => {
        console.log('SMOKE_OK')
        app.exit(0)
      }, 900)
    })
    win.webContents.on('render-process-gone', (_event, details) => {
      console.error('renderer gone', details.reason)
      app.exit(1)
    })
  }
}

function userDataPath(): string {
  return app.getPath('userData')
}

function recentFilePath(): string {
  return path.join(userDataPath(), 'recent.json')
}

function readRecents(): RecentItem[] {
  try {
    const raw = fs.readFileSync(recentFilePath(), 'utf8')
    const list = JSON.parse(raw)
    return Array.isArray(list) ? list : []
  } catch {
    return []
  }
}

function writeRecents(list: RecentItem[]): void {
  try {
    fs.mkdirSync(userDataPath(), { recursive: true })
    fs.writeFileSync(recentFilePath(), JSON.stringify(list, null, 2), 'utf8')
  } catch {
    // ignore
  }
}

function touchRecent(dir: string, book: Book): void {
  const list = readRecents().filter((item) => item.dir !== dir)
  list.unshift({
    dir,
    title: book.meta.title,
    author: book.meta.author,
    updatedAt: new Date().toISOString()
  })
  writeRecents(list.slice(0, 20))
}

function bookPath(dir: string): string {
  return path.join(dir, 'book.json')
}

function readBookFile(dir: string): Book | null {
  try {
    const raw = fs.readFileSync(bookPath(dir), 'utf8')
    const data = JSON.parse(raw) as Book
    if (!data || data.format !== 'inkriver' || !data.meta) return null
    return data
  } catch {
    return null
  }
}

function writeBookFile(dir: string, data: Book): void {
  fs.mkdirSync(dir, { recursive: true })
  const file = bookPath(dir)
  const tmp = file + '.tmp'
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8')
  if (fs.existsSync(file)) {
    fs.rmSync(file, { force: true })
  }
  fs.renameSync(tmp, file)
}

let lastBackupAt = 0

function createBackup(dir: string, data: Book, force = false): string | null {
  if (!data.settings.backupEnabled && !force) return null
  const now = Date.now()
  if (!force && now - lastBackupAt < data.settings.backupMinutes * 60 * 1000) return null
  lastBackupAt = now
  try {
    const backupDir = path.join(dir, 'backups')
    fs.mkdirSync(backupDir, { recursive: true })
    const stamp = new Date(now).toISOString().replace(/[:.]/g, '-').slice(0, 19)
    const file = path.join(backupDir, `backup-${stamp}.json`)
    fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8')
    const files = fs
      .readdirSync(backupDir)
      .filter((f) => f.endsWith('.json'))
      .sort()
    const keep = Math.max(1, data.settings.backupKeep || 30)
    for (const f of files.slice(0, Math.max(0, files.length - keep))) {
      try {
        fs.rmSync(path.join(backupDir, f), { force: true })
      } catch {
        // ignore
      }
    }
    return file
  } catch {
    return null
  }
}

function listBackups(dir: string): { name: string; size: number; mtime: number }[] {
  try {
    const backupDir = path.join(dir, 'backups')
    if (!fs.existsSync(backupDir)) return []
    return fs
      .readdirSync(backupDir)
      .filter((f) => f.endsWith('.json'))
      .map((f) => {
        const stat = fs.statSync(path.join(backupDir, f))
        return { name: f, size: stat.size, mtime: stat.mtimeMs }
      })
      .sort((a, b) => b.mtime - a.mtime)
  } catch {
    return []
  }
}

function registerIpc(): void {
  ipcMain.handle('app:getInfo', () => {
    return {
      version: app.getVersion(),
      electron: process.versions.electron,
      chrome: process.versions.chrome,
      node: process.versions.node,
      platform: process.platform,
      userData: userDataPath(),
      projectDir: process.env.INKRIVER_PROJECT_DIR ?? null
    }
  })

  ipcMain.handle('window:minimize', () => {
    mainWindow?.minimize()
    return { ok: true }
  })

  ipcMain.handle('window:toggleMaximize', () => {
    if (!mainWindow) return { ok: false }
    if (mainWindow.isMaximized()) mainWindow.unmaximize()
    else mainWindow.maximize()
    return { ok: true, maximized: mainWindow.isMaximized() }
  })

  ipcMain.handle('window:close', () => {
    mainWindow?.close()
    return { ok: true }
  })

  ipcMain.handle('window:isMaximized', () => ({
    maximized: mainWindow?.isMaximized() ?? false
  }))

  ipcMain.handle('shortcuts:get', () => ({ ...shortcuts }))

  ipcMain.handle('shortcuts:set', (_event, patch: Partial<Shortcuts>) => {
    let result: { ok: boolean; error?: string; shortcuts: Shortcuts } = { ok: true, shortcuts: { ...shortcuts } }
    for (const key of Object.keys(SHORTCUT_DEFAULTS) as ShortcutId[]) {
      const value = patch[key]
      if (typeof value !== 'string') continue
      result = applyShortcut(key, value)
      if (!result.ok) break
    }
    return result
  })

  ipcMain.handle('shortcuts:capture', (_event, id: ShortcutId | null) => {
    shortcutCaptureId = id
    return { ok: true }
  })

  ipcMain.handle('shortcuts:reset', () => {
    shortcuts = { ...SHORTCUT_DEFAULTS }
    saveShortcuts(shortcuts)
    buildMenu()
    return { ok: true, shortcuts: { ...shortcuts } }
  })

  ipcMain.handle('dialog:pickProject', async () => {
    const result = await dialog.showOpenDialog(mainWindow!, {
      title: '打开墨河项目',
      properties: ['openDirectory', 'createDirectory']
    })
    if (result.canceled || result.filePaths.length === 0) {
      return { canceled: true, dir: null, data: null, error: null }
    }
    const dir = result.filePaths[0]
    const data = readBookFile(dir)
    if (!data) {
      return { canceled: false, dir, data: null, error: '该文件夹不是有效的墨河项目（缺少 book.json）' }
    }
    touchRecent(dir, data)
    return { canceled: false, dir, data, error: null }
  })

  ipcMain.handle('dialog:pickParent', async () => {
    const result = await dialog.showOpenDialog(mainWindow!, {
      title: '选择项目保存位置',
      properties: ['openDirectory', 'createDirectory']
    })
    return result.canceled ? { canceled: true, dir: null } : { canceled: false, dir: result.filePaths[0] }
  })

  ipcMain.handle('dialog:pickImage', async () => {
    const result = await dialog.showOpenDialog(mainWindow!, {
      title: '插入图片',
      properties: ['openFile'],
      filters: [
        { name: '图片', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg'] },
        { name: '所有文件', extensions: ['*'] }
      ]
    })
    if (result.canceled || result.filePaths.length === 0) return { canceled: true, dataUrl: null }
    try {
      const file = result.filePaths[0]
      const buf = fs.readFileSync(file)
      const ext = path.extname(file).slice(1).toLowerCase() || 'png'
      const mime = ext === 'jpg' ? 'jpeg' : ext
      return { canceled: false, dataUrl: `data:image/${mime};base64,${buf.toString('base64')}` }
    } catch (error) {
      return { canceled: false, dataUrl: null, error: String(error) }
    }
  })

  ipcMain.handle('project:new', async (_event, payload: { name: string; baseDir: string; data: Book }) => {
    const safe = payload.name.trim().replace(/[\\/:*?"<>|]/g, '_')
    if (!safe) return { ok: false, error: '项目名称不能为空' }
    const dir = path.join(payload.baseDir, safe.endsWith('.inkriver') ? safe : `${safe}.inkriver`)
    if (fs.existsSync(dir)) return { ok: false, error: '同名项目文件夹已存在' }
    try {
      fs.mkdirSync(dir, { recursive: true })
      writeBookFile(dir, payload.data)
      touchRecent(dir, payload.data)
      return { ok: true, dir, error: null }
    } catch (error) {
      return { ok: false, error: String(error) }
    }
  })

  ipcMain.handle('project:open', async (_event, dir: string) => {
    const data = readBookFile(dir)
    if (!data) return { ok: false, data: null, error: '该文件夹不是有效的墨河项目（缺少 book.json）' }
    createBackup(dir, data, true)
    touchRecent(dir, data)
    return { ok: true, data, error: null }
  })

  ipcMain.handle('project:save', async (_event, payload: { dir: string; data: Book }) => {
    try {
      writeBookFile(payload.dir, payload.data)
      const backup = createBackup(payload.dir, payload.data)
      touchRecent(payload.dir, payload.data)
      return { ok: true, backup, error: null }
    } catch (error) {
      return { ok: false, backup: null, error: String(error) }
    }
  })

  ipcMain.on('project:flushSync', (event, payload: { dir: string; data: Book }) => {
    try {
      writeBookFile(payload.dir, payload.data)
      touchRecent(payload.dir, payload.data)
      event.returnValue = { ok: true, error: null }
    } catch (error) {
      event.returnValue = { ok: false, error: String(error) }
    }
  })

  ipcMain.handle('backup:list', async (_event, dir: string) => listBackups(dir))

  ipcMain.handle('backup:now', async (_event, dir: string) => {
    const data = readBookFile(dir)
    if (!data) return { ok: false, list: listBackups(dir), error: '项目读取失败' }
    createBackup(dir, data, true)
    return { ok: true, list: listBackups(dir), error: null }
  })

  ipcMain.handle('backup:restore', async (_event, payload: { dir: string; name: string }) => {
    const file = path.join(payload.dir, 'backups', payload.name)
    if (!file.startsWith(path.join(payload.dir, 'backups')) || !fs.existsSync(file)) {
      return { ok: false, data: null, error: '备份文件不存在' }
    }
    try {
      const raw = fs.readFileSync(file, 'utf8')
      const data = JSON.parse(raw) as Book
      writeBookFile(payload.dir, data)
      touchRecent(payload.dir, data)
      return { ok: true, data, error: null }
    } catch (error) {
      return { ok: false, data: null, error: String(error) }
    }
  })

  ipcMain.handle('backup:openFolder', async (_event, dir: string) => {
    const backupDir = path.join(dir, 'backups')
    fs.mkdirSync(backupDir, { recursive: true })
    void shell.openPath(backupDir)
    return { ok: true }
  })

  ipcMain.handle('recent:list', async () => readRecents())

  ipcMain.handle('recent:remove', async (_event, dir: string) => {
    writeRecents(readRecents().filter((item) => item.dir !== dir))
    return { ok: true }
  })

  ipcMain.handle(
    'export:saveFile',
    async (_event, payload: { defaultName: string; filters: { name: string; extensions: string[] }[]; dataBase64: string }) => {
      const result = await dialog.showSaveDialog(mainWindow!, {
        title: '导出文件',
        defaultPath: payload.defaultName,
        filters: payload.filters
      })
      if (result.canceled || !result.filePath) return { canceled: true, path: null }
      try {
        fs.writeFileSync(result.filePath, Buffer.from(payload.dataBase64, 'base64'))
        return { canceled: false, path: result.filePath }
      } catch (error) {
        return { canceled: false, path: null, error: String(error) }
      }
    }
  )

  ipcMain.handle('open:path', async (_event, p: string) => {
    void shell.openPath(p)
    return { ok: true }
  })

  ipcMain.handle('clipboard:writeText', async (_event, text: string) => {
    clipboard.writeText(String(text ?? ''))
    return { ok: true }
  })

}

function send(action: string): void {
  mainWindow?.webContents.send('menu:action', action)
}

function buildMenu(): void {
  const isMac = process.platform === 'darwin'
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: '文件',
      submenu: [
        { label: '新建项目', accelerator: shortcuts['new-project'], click: () => send('new-project') },
        { label: '新建章节', accelerator: shortcuts['new-chapter'], click: () => send('new-chapter') },
        { label: '打开项目', accelerator: shortcuts['open-project'], click: () => send('open-project') },
        { type: 'separator' },
        { label: '保存', accelerator: shortcuts.save, click: () => send('save') },
        { label: '导出…', accelerator: shortcuts.export, click: () => send('export') },
        { type: 'separator' },
        isMac ? { role: 'close' } : { role: 'quit', label: '退出' }
      ]
    },
    {
      label: '编辑',
      submenu: [
        { role: 'undo', label: '撤销' },
        { role: 'redo', label: '重做' },
        { type: 'separator' },
        { role: 'cut', label: '剪切' },
        { role: 'copy', label: '复制' },
        { role: 'paste', label: '粘贴' },
        { role: 'selectAll', label: '全选' },
        { type: 'separator' },
        { label: '查找 / 替换', accelerator: shortcuts.find, click: () => send('find') }
      ]
    },
    {
      label: '视图',
      submenu: [
        { label: '专注模式', accelerator: shortcuts['focus-mode'], click: () => send('focus-mode') },
        { label: '切换主题', accelerator: shortcuts['toggle-theme'], click: () => send('toggle-theme') },
        { type: 'separator' },
        { role: 'reload', label: '重新加载' },
        { role: 'togglefullscreen', label: '全屏' }
      ]
    },
    {
      label: '帮助',
      submenu: [
        {
          label: '关于 墨河 InkRiver',
          click: () => {
            void dialog.showMessageBox(mainWindow!, {
              type: 'info',
              title: '关于 墨河 InkRiver',
              message: '墨河 InkRiver',
              detail: `版本 ${app.getVersion()}\nElectron ${process.versions.electron} / Chromium ${process.versions.chrome}\n\n面向长篇小说的 Windows 写作应用。`
            })
          }
        }
      ]
    }
  ]
  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}
