// Runs rcedit from the local winCodeSign vendor copy to embed the icon and
// version metadata into the packaged InkRiver.exe. electron-builder's built-in
// resource editing is disabled (signAndEditExecutable: false) to avoid its
// winCodeSign download, which fails to extract on non-elevated Windows.
const { execFileSync } = require('node:child_process')
const path = require('node:path')
const fs = require('node:fs')

exports.default = async function afterPack(context) {
  const { appOutDir, packager, electronPlatformName } = context
  if (electronPlatformName !== 'win32') return
  // rcedit is a Windows executable. Skip resource editing only when the
  // Windows package is cross-built from another host; native Windows builds
  // retain the icon and version-metadata update below.
  if (process.platform !== 'win32') {
    console.warn('[after-pack] skipped Windows resource editing on non-Windows build host')
    return
  }
  const exe = path.join(appOutDir, `${packager.appInfo.productFilename}.exe`)
  if (!fs.existsSync(exe)) return
  const vendor = path.join(__dirname, '..', '.vendor', 'winCodeSign')
  const arch = process.arch === 'ia32' ? 'ia32' : 'x64'
  const rcedit = path.join(vendor, arch === 'ia32' ? 'rcedit-ia32.exe' : 'rcedit-x64.exe')
  if (!fs.existsSync(rcedit)) return
  const icon = path.join(__dirname, '..', 'build', 'icon.ico')
  const version = packager.appInfo.version || '1.0.0'
  const args = [
    exe,
    '--set-icon', icon,
    '--set-version-string', 'ProductName', 'InkRiver',
    '--set-version-string', 'FileDescription', '墨河 InkRiver 长篇写作',
    '--set-version-string', 'CompanyName', 'InkRiver',
    '--set-version-string', 'LegalCopyright', 'Copyright © 2026 InkRiver',
    '--set-file-version', version,
    '--set-product-version', version
  ]
  execFileSync(rcedit, args, { stdio: 'inherit' })
  console.log('[after-pack] resources edited:', exe)
}
