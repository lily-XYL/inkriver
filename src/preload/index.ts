import { contextBridge, ipcRenderer } from 'electron'
import type { AppInfo, Book, RecentItem, ShortcutId, Shortcuts } from '../shared/types'

const api = {
  info: (): Promise<AppInfo> => ipcRenderer.invoke('app:getInfo'),

  shortcuts: {
    get: (): Promise<Shortcuts> => ipcRenderer.invoke('shortcuts:get'),
    set: (patch: Partial<Record<ShortcutId, string>>): Promise<{ ok: boolean; error?: string; shortcuts: Shortcuts }> =>
      ipcRenderer.invoke('shortcuts:set', patch),
    reset: (): Promise<{ ok: boolean; shortcuts: Shortcuts }> => ipcRenderer.invoke('shortcuts:reset'),
    capture: (id: ShortcutId | null): Promise<{ ok: boolean }> => ipcRenderer.invoke('shortcuts:capture', id),
    onCaptured: (
      callback: (payload: {
        id: ShortcutId | null
        accel: string | null
        error: string | null
        shortcuts: Shortcuts
      }) => void
    ): (() => void) => {
      const handler = (
        _event: Electron.IpcRendererEvent,
        payload: { id: ShortcutId | null; accel: string | null; error: string | null; shortcuts: Shortcuts }
      ): void => callback(payload)
      ipcRenderer.on('shortcuts:captured', handler)
      return () => {
        ipcRenderer.removeListener('shortcuts:captured', handler)
      }
    }
  },

  win: {
    minimize: (): Promise<{ ok: boolean }> => ipcRenderer.invoke('window:minimize'),
    toggleMaximize: (): Promise<{ ok: boolean; maximized: boolean }> =>
      ipcRenderer.invoke('window:toggleMaximize'),
    close: (): Promise<{ ok: boolean }> => ipcRenderer.invoke('window:close'),
    isMaximized: (): Promise<{ maximized: boolean }> => ipcRenderer.invoke('window:isMaximized'),
    onMaximizedChange: (callback: (maximized: boolean) => void): (() => void) => {
      const handler = (_event: Electron.IpcRendererEvent, maximized: boolean): void => callback(maximized)
      ipcRenderer.on('window:maximized-change', handler)
      return () => {
        ipcRenderer.removeListener('window:maximized-change', handler)
      }
    }
  },

  pickProject: (): Promise<{
    canceled: boolean
    dir: string | null
    data: Book | null
    error: string | null
  }> => ipcRenderer.invoke('dialog:pickProject'),

  pickParent: (): Promise<{ canceled: boolean; dir: string | null }> => ipcRenderer.invoke('dialog:pickParent'),

  pickImage: (): Promise<{ canceled: boolean; dataUrl: string | null; error?: string }> =>
    ipcRenderer.invoke('dialog:pickImage'),

  newProject: (payload: { name: string; baseDir: string; data: Book }): Promise<{ ok: boolean; dir?: string; error?: string }> =>
    ipcRenderer.invoke('project:new', payload),

  openProject: (dir: string): Promise<{ ok: boolean; data: Book | null; error?: string }> =>
    ipcRenderer.invoke('project:open', dir),

  saveProject: (dir: string, data: Book): Promise<{ ok: boolean; backup?: string | null; error?: string }> =>
    ipcRenderer.invoke('project:save', { dir, data }),

  flushSync: (dir: string, data: Book): { ok: boolean; error?: string } =>
    ipcRenderer.sendSync('project:flushSync', { dir, data }) as { ok: boolean; error?: string },

  backups: {
    list: (dir: string): Promise<{ name: string; size: number; mtime: number }[]> => ipcRenderer.invoke('backup:list', dir),
    now: (dir: string): Promise<{ ok: boolean; list: { name: string; size: number; mtime: number }[]; error?: string }> =>
      ipcRenderer.invoke('backup:now', dir),
    restore: (dir: string, name: string): Promise<{ ok: boolean; data: Book | null; error?: string }> =>
      ipcRenderer.invoke('backup:restore', { dir, name }),
    openFolder: (dir: string): Promise<{ ok: boolean }> => ipcRenderer.invoke('backup:openFolder', dir)
  },

  recents: {
    list: (): Promise<RecentItem[]> => ipcRenderer.invoke('recent:list'),
    remove: (dir: string): Promise<{ ok: boolean }> => ipcRenderer.invoke('recent:remove', dir)
  },

  saveExport: (payload: {
    defaultName: string
    filters: { name: string; extensions: string[] }[]
    dataBase64: string
  }): Promise<{ canceled: boolean; path: string | null; error?: string }> => ipcRenderer.invoke('export:saveFile', payload),

  openPath: (p: string): Promise<{ ok: boolean }> => ipcRenderer.invoke('open:path', p),

  copyText: (text: string): Promise<{ ok: boolean }> => ipcRenderer.invoke('clipboard:writeText', text),

  onMenu: (callback: (action: string) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, action: string): void => callback(action)
    ipcRenderer.on('menu:action', handler)
    return () => {
      ipcRenderer.removeListener('menu:action', handler)
    }
  }
}

contextBridge.exposeInMainWorld('inkriver', api)

export type InkRiverApi = typeof api
