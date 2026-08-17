# 墨河 InkRiver

面向长篇小说的 Windows 桌面写作应用。长卷如河，落笔生墨。

[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Electron](https://img.shields.io/badge/Electron-37-blue.svg)](https://www.electronjs.org/)
[![React](https://img.shields.io/badge/React-19-61dafb.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178c6.svg)](https://www.typescriptlang.org/)

## 项目结构

```text
src/
  main/        Electron 主进程（窗口、项目文件、备份、导出、系统对话框）
  preload/     安全的 IPC 桥接层
  renderer/    React 界面（编辑器、章节树、人物、世界观、时间线、统计、设置）
  shared/      主进程与渲染层共享的数据模型
scripts/
  make-icon.js         图标渲染（SVG → PNG / 多尺寸 ICO）
  setup-wincodesign.mjs  Windows 打包修复（winCodeSign 本地化）
  after-pack.cjs        打包后写入图标与版本信息
  ui-test.mjs           CDP 驱动的界面自动化冒烟测试
build/           图标源文件与产物
.github/workflows/   CI 构建工作流
```

## 功能

- **项目库**：新建 / 打开 / 最近项目，项目以 `.inkriver` 文件夹保存，含 `book.json` 与 `backups/` 自动备份目录
- **分卷与章节树**：卷、章节两级结构，拖拽排序、移动到卷、复制、重命名、回收站恢复
- **富文本编辑器**：标题、加粗、斜体、下划线、高亮、引用、代码块、列表、任务清单、表格、图片（自动转内嵌）、链接、对齐；工具栏固定不随正文滚动
- **复制**：一键“复制全书”（书名、作者、卷、章节与正文）或“复制本章文字”（当前章节正文）到剪贴板
- **章节大纲**：每章正文与大纲双编辑区，正文 / 大纲一键切换
- **笔记**：灵感 / 大纲 / 设定 / 杂项四类，标签、置顶
- **人物卡**：外貌、性格、背景、目标、冲突、标签、首次出场章节、关系编辑器
- **关系图谱**：人物关系的力导向图，可拖拽、双击跳转
- **世界观**：地点 / 组织 / 物品 / 概念 / 种族 / 事件等条目，可与人物和条目互相关联
- **时间线**：纪年事件流，关联章节与人物，可排序
- **统计**：总字数、今日字数、日均、连续写作天数、近 90 天热力图、章节字数排行、目标进度
- **全局搜索**：跨正文、笔记、人物、世界观、时间线检索，点击结果自动定位并高亮到第一个匹配处
- **导出**：TXT / Markdown / DOCX / EPUB，支持单章或全本、附带大纲；DOCX / EPUB 自动嵌入正文图片
- **自动保存与备份**：防抖自动保存、退出前同步落盘、定时备份（默认开启）、打开 / 关闭项目强制快照、一键恢复
- **外观与写作设置**：浅色 / 深色 / 护眼主题、强调色、编辑器字体 / 字号 / 行距 / 宽度、每日与全书目标、打字机模式、专注模式、中英文界面
- **快捷键**：全部全局快捷键可在设置中自定义，内置“使用文档 / 快捷键速查”
- **分卷自动编号**：新书默认第一卷，新建卷 / 新建章节自动编号（第一卷、第二卷… / 第N章）

## 技术栈

- Electron 37 + electron-vite + React 19 + TypeScript
- TipTap（ProseMirror）富文本编辑
- Zustand + Immer 状态管理，dnd-kit 拖拽
- docx / jszip / turndown 导出
- electron-builder 打包免安装目录版（exe 与数据同在一个 `InkRiverData` 文件夹）

## 开发

环境要求：Node.js ≥ 20（本仓库开发时使用 Codex 捆绑 Node 24）。

```bash
pnpm install
pnpm dev        # 开发模式（热更新）
pnpm typecheck  # 类型检查
pnpm build      # 构建产物到 out/
pnpm smoke      # 冒烟测试（构建后启动自动退出）
```

国内网络已通过 `.npmrc` 配置镜像：

```ini
registry=https://registry.npmmirror.com/
electron_mirror=https://npmmirror.com/mirrors/electron/
electron_builder_binaries_mirror=https://npmmirror.com/mirrors/electron-builder-binaries/
```

## 打包免安装目录版

```bash
pnpm dist
```

产物位于 `release/InkRiverData/InkRiver.exe`（版本 1.1.0），整个 `InkRiverData` 文件夹即完整应用：

- 双击 `InkRiver.exe` 即可运行，无需安装；
- 最近打开、快捷键设置等用户数据直接写入该文件夹，不额外生成数据目录，整体拷贝 / 备份即迁移；
- 小说正文保存在你选择的 `.inkriver` 项目文件夹中（含 `backups/` 自动备份）。

图标为艺术性毛笔造型（宣纸底、竹笔杆、墨迹与朱红印章），源文件在 `build/icon.svg`。`scripts/make-icon.js` 用 Electron 离屏渲染出 `build/icon.png`（1024×1024）与多尺寸 `build/icon.ico`（256/128/64/48/32，PNG-in-ICO 无损格式），打包时嵌入应用。

## Windows 打包的两处已知问题（本项目已内置规避方案）

1. **winCodeSign 解压符号链接失败**：electron-builder 的 winCodeSign 压缩包内含 macOS 符号链接，在无管理员权限的 Windows 上 7-Zip 无法解压。
   - 方案：`pnpm install` 的 `postinstall` 会自动运行 `scripts/setup-wincodesign.mjs`，把 winCodeSign 解压到 `.vendor/winCodeSign`（跳过 `darwin/`），并让 electron-builder 直接使用本地副本。

另外 `signAndEditExecutable: false` + `scripts/after-pack.cjs` 钩子用本地 rcedit 写入应用图标与版本信息，避免打包阶段下载 winCodeSign。

## 数据与备份

- 项目目录：`<书名>.inkriver/`，全部数据在 `book.json`（UTF-8 JSON）
- 自动备份：`backups/backup-<时间戳>.json`，默认每 10 分钟一次、保留 30 份，可在设置中调整或恢复
- 图片以 base64 内嵌在正文中，项目可整体复制、移动

## 快捷键

| 快捷键 | 功能 |
| --- | --- |
| Ctrl+S | 保存 |
| Ctrl+N / Ctrl+O | 新建 / 打开项目 |
| Ctrl+Shift+N | 新建章节 |
| Ctrl+F | 查找 / 替换 |
| Ctrl+E | 导出 |
| Ctrl+Shift+F | 专注模式 |
| Ctrl+Shift+T | 循环切换主题 |
| F11 | 全屏 |

所有全局快捷键均可在“设置 → 快捷键”中自定义；编辑器内还有加粗（Ctrl+B）、斜体（Ctrl+I）、下划线（Ctrl+U）等格式快捷键，详见设置中的“使用文档”。

## 贡献

- 提交 Issue 报告 Bug 或建议新功能
- Fork 后提交 Pull Request，通过 `pnpm typecheck` 与 `pnpm build` 校验
- 涉及打包改动时，请保留 Windows 打包问题的两个内置规避方案（见上文说明）

本项目以 MIT 协议开源。
