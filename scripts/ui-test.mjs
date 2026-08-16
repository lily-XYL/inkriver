// UI 冒烟测试：通过 CDP 驱动打包好的应用，验证专注模式、字体、工具栏与复制功能。
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const PORT = 9333
const EXE = path.resolve('release/win-unpacked/InkRiver.exe')
const projectDir = path.resolve('.ui-test/测试.inkriver')

const now = new Date().toISOString()
const longContent =
  '<h1>第一章 启程</h1>' +
  Array.from({ length: 120 }, (_, i) => `<p>这是第 ${i + 1} 段测试内容，用于验证工具栏在长文中固定不动，写作区可以正常滚动。</p>`).join('')
const book = {
  format: 'inkriver',
  version: 1,
  meta: {
    id: 'ui-test-book',
    title: '界面测试小说',
    author: '测试作者',
    genre: '测试',
    synopsis: '',
    cover: '',
    createdAt: now,
    updatedAt: now
  },
  settings: {
    theme: 'light',
    accent: '#3b5b92',
    fontFamily: 'Georgia, serif',
    fontSize: 18,
    lineHeight: 2,
    editorWidth: 760,
    dailyGoal: 2000,
    bookGoal: 200000,
    autosaveMs: 1500,
    backupEnabled: false,
    backupKeep: 30,
    backupMinutes: 10,
    language: 'zh',
    typewriter: false,
    showWordCount: true
  },
  volumes: [],
  chapters: [
    {
      id: 'ch-1',
      title: '第一章 启程',
      content: longContent,
      outline: '<p>本章大纲：主角出发。</p>',
      status: 'draft',
      parentId: '',
      order: 0,
      target: 0,
      words: 0,
      createdAt: now,
      updatedAt: now
    }
  ],
  notes: [],
  characters: [],
  world: [],
  timeline: [],
  stats: { daily: {}, dayDate: '', dayStartTotal: 0 },
  trash: { chapters: [], notes: [] }
}

fs.mkdirSync(projectDir, { recursive: true })
fs.writeFileSync(path.join(projectDir, 'book.json'), JSON.stringify(book, null, 2))

const proc = spawn(EXE, [`--remote-debugging-port=${PORT}`], { stdio: 'ignore' })

async function getTarget() {
  for (let i = 0; i < 60; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json`)
      const list = await res.json()
      const page = list.find((t) => t.type === 'page')
      if (page) return page
    } catch {
      // retry
    }
    await new Promise((r) => setTimeout(r, 500))
  }
  throw new Error('CDP target not found')
}

let seq = 0
function connect(url) {
  const ws = new WebSocket(url)
  const pending = new Map()
  ws.onmessage = (ev) => {
    const msg = JSON.parse(ev.data)
    if (msg.id && pending.has(msg.id)) {
      pending.get(msg.id)(msg)
      pending.delete(msg.id)
    }
  }
  return {
    ready: new Promise((res, rej) => {
      ws.onopen = res
      ws.onerror = rej
    }),
    send(method, params = {}) {
      const mid = ++seq
      ws.send(JSON.stringify({ id: mid, method, params }))
      return new Promise((res) => pending.set(mid, res))
    },
    close: () => ws.close()
  }
}

async function evalJs(cdp, expression) {
  const r = await cdp.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
  return r.result?.result?.value
}

try {
  const page = await getTarget()
  const cdp = connect(page.webSocketDebuggerUrl)
  await cdp.ready

  const originalDir = await evalJs(cdp, `localStorage.getItem('inkriver:lastDir')`)
  await evalJs(
    cdp,
    `localStorage.setItem('inkriver:lastDir', ${JSON.stringify(projectDir)}); location.reload(); 'ok'`
  )
  await new Promise((r) => setTimeout(r, 5000))

  const state = await evalJs(
    cdp,
    `JSON.stringify({
      ls: localStorage.getItem('inkriver:lastDir'),
      body: (document.body.innerText || '').slice(0, 160),
      hasEditor: !!document.querySelector('.editor-area'),
      hasHome: !!document.querySelector('.home')
    })`
  )
  console.log('STATE', state)

  const before = await evalJs(
    cdp,
    `JSON.stringify({
      title: document.querySelector('.chapter-title-input')?.value ?? null,
      text: document.querySelector('.ProseMirror')?.innerText ?? null,
      font: getComputedStyle(document.querySelector('.ProseMirror')).fontFamily,
      fontSize: getComputedStyle(document.querySelector('.ProseMirror')).fontSize,
      lineHeight: getComputedStyle(document.querySelector('.ProseMirror')).lineHeight
    })`
  )
  console.log('BEFORE', before)

  await evalJs(cdp, `document.querySelector('[title*="专注模式"]')?.click(); 'ok'`)
  await new Promise((r) => setTimeout(r, 700))
  const after = await evalJs(
    cdp,
    `JSON.stringify({
      title: document.querySelector('.chapter-title-input')?.value ?? null,
      text: document.querySelector('.ProseMirror')?.innerText ?? null,
      proseH: document.querySelector('.ProseMirror')?.getBoundingClientRect().height,
      topbarH: document.querySelector('.editor-topbar')?.getBoundingClientRect().height,
      appClass: document.querySelector('.app')?.className,
      sidebarVisible: getComputedStyle(document.querySelector('.sidebar')).display
    })`
  )
  console.log('AFTER_FOCUS', after)

  await evalJs(cdp, `document.querySelector('[title*="专注模式"]')?.click(); 'ok'`)
  await new Promise((r) => setTimeout(r, 500))
  const back = await evalJs(cdp, `document.querySelector('.ProseMirror')?.innerText ?? null`)
  console.log('AFTER_BACK', back)

  // 工具栏固定测试：滚动到底部后看工具栏位置
  await evalJs(
    cdp,
    `(() => { const w = document.querySelector('.editor-paper-wrap'); w.scrollTop = w.scrollHeight; return w.scrollTop; })()`
  )
  await new Promise((r) => setTimeout(r, 400))
  const sticky = await evalJs(
    cdp,
    `JSON.stringify({
      toolbarTop: document.querySelector('.toolbar')?.getBoundingClientRect().top,
      wrapTop: document.querySelector('.editor-paper-wrap')?.getBoundingClientRect().top,
      scrollTop: document.querySelector('.editor-paper-wrap')?.scrollTop
    })`
  )
  console.log('STICKY', sticky)

  // 复制全文
  await evalJs(cdp, `document.querySelector('[title="复制全文"]')?.click(); 'ok'`)
  await new Promise((r) => setTimeout(r, 600))
  const copyToast = await evalJs(
    cdp,
    `Array.from(document.querySelectorAll('.toast')).map(t => t.textContent).join(' | ')`
  )
  console.log('COPY_TOAST', copyToast)

  // 还原用户数据：恢复原 lastDir、从最近列表移除测试项目
  await evalJs(
    cdp,
    `localStorage.setItem('inkriver:lastDir', ${JSON.stringify(originalDir ?? '')}); 'ok'`
  )
  await evalJs(cdp, `window.inkriver.recents.remove(${JSON.stringify(projectDir)}); 'ok'`)
  cdp.close()
  proc.kill()
  fs.rmSync(projectDir, { recursive: true, force: true })
  console.log('DONE')
} catch (err) {
  console.error('UI_TEST_FAIL', err)
  proc.kill()
  process.exit(1)
}
