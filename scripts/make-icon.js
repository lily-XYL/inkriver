// Renders build/icon.svg to a 1024px PNG and a multi-size PNG-in-ICO icon set
// (256/128/64/48/32) via Electron's offscreen capture. PNG-in-ICO is the
// modern, lossless format supported by Windows Vista+ and rcedit.
const { app, BrowserWindow } = require('electron')
const fs = require('fs')
const path = require('path')

app.disableHardwareAcceleration()

const buildDir = path.join(__dirname, '..', 'build')
const svgPath = path.join(buildDir, 'icon.svg')
const pngPath = path.join(buildDir, 'icon.png')
const icoPath = path.join(buildDir, 'icon.ico')

function buildIco(pngs) {
  const count = pngs.length
  const header = Buffer.alloc(6)
  header.writeUInt16LE(1, 2) // type: icon
  header.writeUInt16LE(count, 4)
  const entries = []
  let offset = 6 + count * 16
  for (const png of pngs) {
    const size = png.readUInt32BE(16) // IHDR width
    const entry = Buffer.alloc(16)
    entry.writeUInt8(size >= 256 ? 0 : size, 0)
    entry.writeUInt8(size >= 256 ? 0 : size, 1)
    entry.writeUInt16LE(1, 4) // planes
    entry.writeUInt16LE(32, 6) // bit count
    entry.writeUInt32LE(png.length, 8)
    entry.writeUInt32LE(offset, 12)
    entries.push(entry)
    offset += png.length
  }
  return Buffer.concat([header, ...entries, ...pngs])
}

app.whenReady().then(async () => {
  try {
    const svg = fs.readFileSync(svgPath, 'utf8')
    const html = `<!doctype html><html><head><meta charset="utf-8">
<style>html,body{margin:0;padding:0;background:transparent;overflow:hidden}svg{width:100%;height:100%;display:block}</style>
</head><body>${svg}</body></html>`
    // NOTE: on this machine creating a second BrowserWindow after destroying
    // the first fails to load (GPU state issue), so one window is reused and
    // resized between captures.
    const win = new BrowserWindow({
      width: 1024,
      height: 1024,
      show: false,
      frame: false,
      transparent: true,
      webPreferences: { backgroundThrottling: false }
    })
    await win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html))
    const sizes = [1024, 256, 128, 64, 48, 32]
    const pngs = []
    for (const size of sizes) {
      win.setContentSize(size, size)
      await new Promise((r) => setTimeout(r, 250))
      const image = await win.webContents.capturePage({ x: 0, y: 0, width: size, height: size })
      pngs.push(image.toPNG())
    }
    win.destroy()
    fs.writeFileSync(pngPath, pngs[0])
    fs.writeFileSync(icoPath, buildIco(pngs.slice(1)))
    console.log('ICON_OK ' + pngPath + ' ' + icoPath)
    app.exit(0)
  } catch (err) {
    console.error('ICON_FAIL', err)
    app.exit(1)
  }
})
