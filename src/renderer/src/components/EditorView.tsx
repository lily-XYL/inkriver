import { useEffect, useRef, useState, type CSSProperties, type JSX } from 'react'
import type { Editor } from '@tiptap/react'
import { useApp } from '../lib/store'
import { RichEditor } from './RichEditor'
import { EmptyState, useT } from './ui'
import { Icon } from './Icons'
import { countHtml, formatWords, readingMinutes, totalWords, todayKey } from '../lib/words'
import { getSearchCount, moveSearch, replaceAll, replaceCurrent, setSearchQuery } from '../lib/search'
import type { ChapterStatus } from '../../../shared/types'

const STATUS_ORDER: ChapterStatus[] = ['draft', 'writing', 'done']

export function EditorView(): JSX.Element {
  const t = useT()
  const book = useApp((s) => s.book)
  const chapterId = useApp((s) => s.chapterId)
  const preview = useApp((s) => s.preview)
  const focusMode = useApp((s) => s.focusMode)
  const dirty = useApp((s) => s.dirty)
  const updateChapter = useApp((s) => s.updateChapter)
  const deleteChapter = useApp((s) => s.deleteChapter)
  const togglePreview = useApp((s) => s.togglePreview)
  const toggleFocus = useApp((s) => s.toggleFocus)
  const toggleExport = useApp((s) => s.toggleExport)
  const copyBookText = useApp((s) => s.copyBookText)
  const copyChapterText = useApp((s) => s.copyChapterText)
  const findOpen = useApp((s) => s.findOpen)
  const toggleFind = useApp((s) => s.toggleFind)
  const locate = useApp((s) => s.locate)
  const clearLocate = useApp((s) => s.clearLocate)

  const [tab, setTab] = useState<'content' | 'outline'>('content')
  const [findText, setFindText] = useState('')
  const [replaceText, setReplaceText] = useState('')
  const [findCount, setFindCount] = useState({ total: 0, current: 0 })
  const editorRef = useRef<Editor | null>(null)

  const chapter = book?.chapters.find((c) => c.id === chapterId)

  useEffect(() => {
    if (!locate || !chapterId) return
    const editor = editorRef.current
    if (!editor) return
    setFindText(locate)
    setSearchQuery(editor, locate)
    setFindCount(getSearchCount(editor))
    clearLocate()
  }, [chapterId, locate, clearLocate])

  if (!book || !chapter) {
    return (
      <div className="main-scroll">
        <EmptyState icon="book" text="请从左侧选择一个章节，或新建一个章节开始写作" />
      </div>
    )
  }

  const settings = book.settings
  const words = chapter.words || countHtml(chapter.content)
  const total = totalWords(book)
  const today = book.stats.daily[todayKey()] ?? 0

  const cycleStatus = (): void => {
    const idx = STATUS_ORDER.indexOf(chapter.status)
    const next = STATUS_ORDER[(idx + 1) % STATUS_ORDER.length]
    updateChapter(chapter.id, { status: next })
  }

  const runFind = (forward: boolean): void => {
    const editor = editorRef.current
    if (!editor) return
    if (!findText.trim()) {
      setFindCount({ total: 0, current: 0 })
      return
    }
    setSearchQuery(editor, findText)
    if (!forward) {
      moveSearch(editor, -1)
    }
    setFindCount(getSearchCount(editor))
  }

  const paperStyle = {
    '--editor-font': settings.fontFamily,
    '--editor-font-size': `${settings.fontSize}px`,
    '--editor-line-height': settings.lineHeight,
    maxWidth: settings.editorWidth
  } as CSSProperties

  const statusLabel: Record<ChapterStatus, string> = {
    draft: '草稿',
    writing: '写作中',
    done: '已完成'
  }

  return (
    <div className="editor-area">
      <div className="editor-topbar">
        <input
          className="chapter-title-input"
          value={chapter.title}
          placeholder="章节标题"
          onChange={(e) => updateChapter(chapter.id, { title: e.target.value })}
        />
        <button className={`status-pill ${chapter.status}`} onClick={cycleStatus} title="点击切换章节状态">
          <span className="save-dot" />
          {statusLabel[chapter.status]}
        </button>
        <input
          type="number"
          style={{ width: 92 }}
          min={0}
          value={chapter.target || ''}
          placeholder="目标字数"
          title="本章目标字数"
          onChange={(e) => updateChapter(chapter.id, { target: Math.max(0, Number(e.target.value) || 0) })}
        />
        <button className="btn small" onClick={() => setTab(tab === 'content' ? 'outline' : 'content')}>
          {tab === 'content' ? '大纲' : '正文'}
        </button>
        <span style={{ flex: 1 }} />
        <button className="icon-btn" title="查找 / 替换 (Ctrl+F)" onClick={toggleFind}>
          <Icon name="search" />
        </button>
        <button className={`icon-btn ${preview ? 'accent' : ''}`} title="预览" onClick={togglePreview}>
          <Icon name="eye" />
        </button>
        <button className={`icon-btn ${focusMode ? 'accent' : ''}`} title="专注模式 (Ctrl+Shift+F)" onClick={toggleFocus}>
          <Icon name="expand" />
        </button>
        <button className="icon-btn" title="导出" onClick={toggleExport}>
          <Icon name="download" />
        </button>
        <button className="icon-btn" title="复制全书" onClick={() => void copyBookText()}>
          <Icon name="clipboard" />
        </button>
        <button className="icon-btn" title="复制本章文字" onClick={() => void copyChapterText(chapter.id)}>
          <Icon name="copy" />
        </button>
        <button className="icon-btn" title="删除章节" onClick={() => deleteChapter(chapter.id)}>
          <Icon name="trash" />
        </button>
      </div>

      {findOpen && tab === 'content' && (
        <div className="find-panel">
          <Icon name="search" size={14} />
          <input
            autoFocus
            value={findText}
            placeholder="查找"
            onChange={(e) => {
              setFindText(e.target.value)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                if (e.shiftKey) {
                  if (editorRef.current) moveSearch(editorRef.current, -1)
                  setFindCount(getSearchCount(editorRef.current!))
                } else {
                  runFind(true)
                }
              }
            }}
          />
          <span className="count">
            {findCount.total ? `${findCount.current}/${findCount.total}` : '无结果'}
          </span>
          <button className="btn small" onClick={() => runFind(true)}>
            下一个
          </button>
          <button
            className="btn small"
            onClick={() => {
              runFind(false)
            }}
          >
            上一个
          </button>
          <input
            value={replaceText}
            placeholder="替换为"
            style={{ width: 140 }}
            onChange={(e) => setReplaceText(e.target.value)}
          />
          <button
            className="btn small"
            onClick={() => {
              const editor = editorRef.current
              if (editor && findText) {
                replaceCurrent(editor, replaceText)
                moveSearch(editor, 1)
                setFindCount(getSearchCount(editor))
              }
            }}
          >
            替换
          </button>
          <button
            className="btn small"
            onClick={() => {
              const editor = editorRef.current
              if (editor && findText) {
                const n = replaceAll(editor, findText, replaceText)
                if (n > 0) useApp.getState().toast(`已替换 ${n} 处`, 'success')
                setFindCount(getSearchCount(editor))
              }
            }}
          >
            全部替换
          </button>
          <button className="btn small ghost" onClick={toggleFind}>
            关闭
          </button>
        </div>
      )}

      {preview ? (
        <div className="editor-paper-wrap">
          <div className="editor-paper" style={paperStyle}>
            <h1 style={{ textAlign: 'center', marginBottom: 8 }}>{chapter.title}</h1>
            <div
              className="ProseMirror"
              dangerouslySetInnerHTML={{ __html: tab === 'content' ? chapter.content : chapter.outline }}
            />
          </div>
        </div>
      ) : (
        <div className="editor-paper-wrap" style={{ paddingTop: tab === 'outline' ? 10 : 28 }}>
          <div className="editor-paper" style={paperStyle}>
            {tab === 'content' ? (
              <RichEditor
                cacheKey={`content:${chapter.id}`}
                value={chapter.content}
                typewriter={settings.typewriter}
                placeholder="从这里开始落笔…"
                onReady={(editor) => {
                  editorRef.current = editor
                }}
                onChange={(html) => {
                  updateChapter(chapter.id, { content: html, words: countHtml(html) })
                }}
              />
            ) : (
              <RichEditor
                cacheKey={`outline:${chapter.id}`}
                value={chapter.outline}
                placeholder="本章大纲：这一章要发生什么？"
                onChange={(html) => updateChapter(chapter.id, { outline: html })}
              />
            )}
          </div>
        </div>
      )}

      <div className="editor-stats">
        <span className="stat">
          {t('wordsOfChapter')}：<b>{formatWords(words)}</b>
        </span>
        {chapter.target > 0 && (
          <span className="stat">
            目标 <b>{formatWords(chapter.target)}</b>（{Math.min(100, Math.round((words / chapter.target) * 100))}%）
          </span>
        )}
        <span className="stat">
          {t('totalWords')}：<b>{formatWords(total)}</b>
        </span>
        <span className="stat">
          {t('todayWords')}：<b>{formatWords(today)}</b>
        </span>
        <span className="stat">
          {t('readingTime', { n: readingMinutes(words) })}
        </span>
        <span style={{ flex: 1 }} />
        <span className="stat">
          <span className={`save-dot ${dirty ? 'dirty' : ''}`} />
          {dirty ? t('saving') : t('saved')}
        </span>
      </div>
    </div>
  )
}
