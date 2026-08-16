// Workaround for electron-builder on Windows without admin/Developer Mode:
// the winCodeSign-2.6.0 archive contains macOS symlinks that 7-Zip cannot
// extract without SeCreateSymbolicLinkPrivilege. This script extracts the
// archive locally (skipping the darwin/ folder) and patches app-builder-lib
// so getBin("winCodeSign") resolves to the local copy.
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const vendorDir = path.join(root, '.vendor', 'winCodeSign')
const marker = 'inkriver-wincodesign'

function findSevenZip() {
  const pnpmDir = path.join(root, 'node_modules', '.pnpm')
  if (!fs.existsSync(pnpmDir)) return null
  for (const entry of fs.readdirSync(pnpmDir)) {
    if (!entry.startsWith('7zip-bin@')) continue
    const exe = path.join(pnpmDir, entry, 'node_modules', '7zip-bin', 'win', 'x64', '7za.exe')
    if (fs.existsSync(exe)) return exe
  }
  return null
}

function findCachedArchive() {
  const candidates = [
    path.join(process.env.LOCALAPPDATA || '', 'electron-builder', 'Cache', 'winCodeSign'),
    path.join(process.env.ELECTRON_BUILDER_CACHE || '', 'winCodeSign'),
    path.join(root, '.vendor')
  ]
  for (const dir of candidates) {
    if (!dir || !fs.existsSync(dir)) continue
    for (const file of fs.readdirSync(dir)) {
      if (file.endsWith('.7z') && file.includes('winCodeSign')) {
        return path.join(dir, file)
      }
    }
    // cache dir contains numeric-named archives too
    for (const file of fs.readdirSync(dir)) {
      if (/^\d+\.7z$/.test(file)) return path.join(dir, file)
    }
  }
  return null
}

async function downloadArchive(target) {
  const url =
    'https://npmmirror.com/mirrors/electron-builder-binaries/winCodeSign-2.6.0/winCodeSign-2.6.0.7z'
  const res = await fetch(url)
  if (!res.ok) throw new Error(`download failed: ${res.status} ${url}`)
  const buf = Buffer.from(await res.arrayBuffer())
  fs.writeFileSync(target, buf)
}

async function ensureVendor() {
  if (fs.existsSync(path.join(vendorDir, 'win'))) return
  fs.mkdirSync(path.join(root, '.vendor'), { recursive: true })
  const sevenZip = findSevenZip()
  if (!sevenZip) throw new Error('7zip-bin not found; run pnpm install first')
  let archive = findCachedArchive()
  if (!archive) {
    archive = path.join(root, '.vendor', 'winCodeSign.7z')
    await downloadArchive(archive)
  }
  fs.mkdirSync(vendorDir, { recursive: true })
  // Extract everything except darwin/ (macOS-only symlinks we do not need).
  execFileSync(sevenZip, ['x', '-y', `-x!darwin`, archive, `-o${vendorDir}`], { stdio: 'inherit' })
  fs.rmSync(archive, { force: true })
  console.log('[setup-wincodesign] local winCodeSign ready at', vendorDir)
}

function patchBinDownload() {
  const pnpmDir = path.join(root, 'node_modules', '.pnpm')
  if (!fs.existsSync(pnpmDir)) return
  for (const entry of fs.readdirSync(pnpmDir)) {
    if (!entry.startsWith('app-builder-lib@')) continue
    const file = path.join(pnpmDir, entry, 'node_modules', 'app-builder-lib', 'out', 'binDownload.js')
    if (!fs.existsSync(file)) continue
    const source = fs.readFileSync(file, 'utf8')
    if (source.includes(marker)) continue
    const requires = 'const path = require("path");\nconst fs = require("fs");\n'
    const hook = `
function getBin(name, url, checksum) {
    // ${marker}: use local winCodeSign copy on Windows (avoids macOS symlink extraction issue)
    if (name === "winCodeSign") {
        const local = path.join(__dirname, "../../../../../.vendor/winCodeSign");
        if (fs.existsSync(path.join(local, "win"))) {
            return Promise.resolve(local);
        }
    }
`
    const patched = source
      .replace('Object.defineProperty(exports, "__esModule", { value: true });', '$&' + requires)
      .replace('function getBin(name, url, checksum) {\n', hook)
    if (patched === source) {
      throw new Error(`unexpected binDownload.js layout in ${file}`)
    }
    fs.writeFileSync(file, patched, 'utf8')
    console.log('[setup-wincodesign] patched', file)
  }
}

await ensureVendor()
patchBinDownload()
