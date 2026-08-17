// 把 electron-builder 的 win-unpacked 输出整理为免安装目录版：
// 应用文件夹命名为 InkRiverData（exe 就在其中，用户数据也写进该文件夹，
// 不再单独生成数据文件夹），并清理旧的单文件便携版。
const fs = require('node:fs')
const path = require('node:path')

const out = path.join(__dirname, '..', 'release')
const src = path.join(out, 'win-unpacked')
const dst = path.join(out, 'InkRiverData')

if (!fs.existsSync(src)) {
  console.error('[finalize] win-unpacked not found, run electron-builder --win dir first')
  process.exit(1)
}

if (fs.existsSync(dst)) {
  fs.rmSync(dst, { recursive: true, force: true })
}
fs.renameSync(src, dst)

for (const f of fs.readdirSync(out)) {
  if (/^InkRiver-[\d.]+-portable\.exe$/.test(f)) {
    fs.rmSync(path.join(out, f), { force: true })
  }
}

console.log('[finalize] 免安装目录版: release/InkRiverData/InkRiver.exe')
