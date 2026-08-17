import { useMemo, useState, type JSX } from 'react'
import {
  closestCorners,
  DndContext,
  DragOverlay,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent
} from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Chapter, Volume } from '../../../shared/types'
import { useApp } from '../lib/store'
import { formatWords } from '../lib/words'
import { Icon } from './Icons'

interface DragItem {
  type: 'volume' | 'chapter'
  group: string
}

export function ChapterTree(): JSX.Element {
  const book = useApp((s) => s.book)
  const chapterId = useApp((s) => s.chapterId)
  const addChapter = useApp((s) => s.addChapter)
  const addVolume = useApp((s) => s.addVolume)
  const moveChapter = useApp((s) => s.moveChapter)
  const reorderVolume = useApp((s) => s.reorderVolume)
  const updateBook = useApp((s) => s.updateBook)

  const [active, setActive] = useState<{ id: string; type: 'volume' | 'chapter' } | null>(null)
  const [renameId, setRenameId] = useState<string | null>(null)
  const [renameText, setRenameText] = useState('')
  const [moveMenuFor, setMoveMenuFor] = useState<string | null>(null)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }))

  const volumes = useMemo(() => [...(book?.volumes ?? [])].sort((a, b) => a.order - b.order), [book?.volumes])

  const chaptersByParent = useMemo(() => {
    const map: Record<string, Chapter[]> = {}
    for (const c of book?.chapters ?? []) {
      ;(map[c.parentId] ??= []).push(c)
    }
    for (const key of Object.keys(map)) map[key].sort((a, b) => a.order - b.order)
    return map
  }, [book?.chapters])

  const itemMap = useMemo(() => {
    const map: Record<string, DragItem> = {}
    for (const v of volumes) map[v.id] = { type: 'volume', group: '' }
    for (const c of book?.chapters ?? []) map[c.id] = { type: 'chapter', group: c.parentId }
    return map
  }, [volumes, book?.chapters])

  if (!book) return <div className="tree-wrap" />

  const onDragStart = (e: DragStartEvent): void => {
    const id = String(e.active.id)
    const item = itemMap[id]
    if (item) setActive({ id, type: item.type })
  }

  const onDragEnd = (e: DragEndEvent): void => {
    setActive(null)
    const { active: a, over } = e
    if (!over) return
    const activeId = String(a.id)
    const overId = String(over.id)
    const st = useApp.getState()
    const b = st.book
    if (!b) return
    const activeItem = itemMap[activeId]
    if (!activeItem) return

    if (activeItem.type === 'volume') {
      const overItem = itemMap[overId]
      if (overItem?.type === 'volume') {
        const from = volumes.findIndex((v) => v.id === activeId)
        const to = volumes.findIndex((v) => v.id === overId)
        if (from !== -1 && to !== -1) reorderVolume(from, to)
      }
      return
    }

    // chapter
    const overItem = itemMap[overId]
    let targetGroup = activeItem.group
    let index = (chaptersByParent[targetGroup] ?? []).length

    if (overItem?.type === 'chapter') {
      targetGroup = overItem.group
      const list = chaptersByParent[targetGroup] ?? []
      const overIdx = list.findIndex((c) => c.id === overId)
      const activeIdx = list.findIndex((c) => c.id === activeId)
      index = activeIdx !== -1 && activeIdx < overIdx ? overIdx : overIdx + 1
    } else if (overItem?.type === 'volume') {
      targetGroup = overId
      index = (chaptersByParent[overId] ?? []).length
    } else if (overId === 'root') {
      targetGroup = ''
      index = (chaptersByParent[''] ?? []).length
    }
    moveChapter(activeId, targetGroup, Math.max(0, index))
  }

  const startRename = (id: string, current: string): void => {
    setRenameId(id)
    setRenameText(current)
  }

  const commitRename = (): void => {
    if (renameId) {
      const st = useApp.getState()
      const b = st.book
      const v = b?.volumes.find((x) => x.id === renameId)
      const c = b?.chapters.find((x) => x.id === renameId)
      const name = renameText.trim()
      if (v && name) st.renameVolume(renameId, name)
      if (c && name) st.updateChapter(renameId, { title: name })
    }
    setRenameId(null)
  }

  const rootChapters = chaptersByParent[''] ?? []

  return (
    <div className="tree-wrap">
      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={onDragStart} onDragEnd={onDragEnd}>
        <SortableContext items={volumes.map((v) => v.id)} strategy={verticalListSortingStrategy}>
          {volumes.map((v) => (
            <VolumeItem
              key={v.id}
              volume={v}
              chapters={chaptersByParent[v.id] ?? []}
              activeChapterId={chapterId}
              renameId={renameId}
              renameText={renameText}
              setRenameText={setRenameText}
              startRename={startRename}
              commitRename={commitRename}
              setRenameId={setRenameId}
              moveMenuFor={moveMenuFor}
              setMoveMenuFor={setMoveMenuFor}
            />
          ))}
        </SortableContext>

        {(rootChapters.length > 0 || moveMenuFor === '') && (
          <RootGroup
            chapters={rootChapters}
            activeChapterId={chapterId}
            renameId={renameId}
            renameText={renameText}
            setRenameText={setRenameText}
            startRename={startRename}
            commitRename={commitRename}
            setRenameId={setRenameId}
            moveMenuFor={moveMenuFor}
            setMoveMenuFor={setMoveMenuFor}
          />
        )}

        <DragOverlay>
          {active &&
            (active.type === 'volume' ? (
              <div className="tree-row volume-row" style={{ background: 'var(--panel)', boxShadow: 'var(--shadow-lg)' }}>
                <Icon name="chevronDown" size={14} />
                <span className="tree-label">{volumes.find((v) => v.id === active.id)?.title ?? ''}</span>
              </div>
            ) : (
              <div className="tree-row active" style={{ boxShadow: 'var(--shadow-lg)' }}>
                <span className="tree-label">
                  {book.chapters.find((c) => c.id === active.id)?.title ?? ''}
                </span>
              </div>
            ))}
        </DragOverlay>
      </DndContext>

      <div style={{ padding: '10px 8px 0', display: 'flex', gap: 6 }}>
        <button className="btn small" style={{ flex: 1 }} onClick={() => addChapter('')}>
          <Icon name="plus" size={13} /> 新建章节
        </button>
        <button className="btn small" style={{ flex: 1 }} onClick={addVolume}>
          <Icon name="folder" size={13} /> 新建卷
        </button>
      </div>
    </div>
  )
}

function RowActions({
  onRename,
  onDelete,
  onDuplicate,
  onMove,
  showMove
}: {
  onRename: () => void
  onDelete: () => void
  onDuplicate: () => void
  onMove?: () => void
  showMove: boolean
}): JSX.Element {
  return (
    <span className="row-actions">
      {showMove && onMove && (
        <span className="icon-btn" style={{ width: 22, height: 22 }} title="移动到卷" onClick={(e) => {
          e.stopPropagation()
          onMove()
        }}>
          <Icon name="folder" size={13} />
        </span>
      )}
      <span className="icon-btn" style={{ width: 22, height: 22 }} title="重命名" onClick={(e) => {
        e.stopPropagation()
        onRename()
      }}>
        <Icon name="pencil" size={12} />
      </span>
      <span className="icon-btn" style={{ width: 22, height: 22 }} title="复制" onClick={(e) => {
        e.stopPropagation()
        onDuplicate()
      }}>
        <Icon name="copy" size={12} />
      </span>
      <span className="icon-btn" style={{ width: 22, height: 22 }} title="删除" onClick={(e) => {
        e.stopPropagation()
        onDelete()
      }}>
        <Icon name="trash" size={12} />
      </span>
    </span>
  )
}

function MoveMenu({
  onPick
}: {
  onPick: (parentId: string) => void
}): JSX.Element {
  const book = useApp((s) => s.book)
  if (!book) return <></>
  return (
    <div style={{ padding: '2px 8px 6px 22px', display: 'flex', flexWrap: 'wrap', gap: 4 }}>
      {book.volumes.map((v) => (
        <button
          key={v.id}
          className="btn small"
          onClick={(e) => {
            e.stopPropagation()
            onPick(v.id)
          }}
        >
          {v.title}
        </button>
      ))}
      <button
        className="btn small"
        onClick={(e) => {
          e.stopPropagation()
          onPick('')
        }}
      >
        未分卷
      </button>
    </div>
  )
}

function VolumeItem({
  volume,
  chapters,
  activeChapterId,
  renameId,
  renameText,
  setRenameText,
  startRename,
  commitRename,
  setRenameId,
  moveMenuFor,
  setMoveMenuFor
}: {
  volume: Volume
  chapters: Chapter[]
  activeChapterId: string | null
  renameId: string | null
  renameText: string
  setRenameText: (v: string) => void
  startRename: (id: string, current: string) => void
  commitRename: () => void
  setRenameId: (id: string | null) => void
  moveMenuFor: string | null
  setMoveMenuFor: (id: string | null) => void
}): JSX.Element {
  const updateBook = useApp((s) => s.updateBook)
  const deleteVolume = useApp((s) => s.deleteVolume)
  const addChapter = useApp((s) => s.addChapter)
  const moveChapter = useApp((s) => s.moveChapter)
  const duplicateChapter = useApp((s) => s.duplicateChapter)
  const deleteChapter = useApp((s) => s.deleteChapter)
  const openEditor = useApp((s) => s.openEditor)

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: volume.id,
    data: { type: 'volume' }
  })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1
  }
  const collapsed = volume.collapsed ?? false

  const toggle = (): void => {
    updateBook((b) => {
      const v = b.volumes.find((x) => x.id === volume.id)
      if (v) v.collapsed = !(v.collapsed ?? false)
    })
  }

  return (
    <div ref={setNodeRef} style={style}>
      <div className="tree-row volume-row" {...attributes} {...listeners}>
        <span onClick={(e) => {
          e.stopPropagation()
          toggle()
        }}>
          <Icon name={collapsed ? 'chevronRight' : 'chevronDown'} size={14} />
        </span>
        {renameId === volume.id ? (
          <input
            style={{ flex: 1, minWidth: 0 }}
            autoFocus
            value={renameText}
            onChange={(e) => setRenameText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitRename()
              if (e.key === 'Escape') setRenameId(null)
            }}
            onBlur={commitRename}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span className="tree-label" onDoubleClick={() => startRename(volume.id, volume.title)}>
            {volume.title}
          </span>
        )}
        <span className="tree-words">
          {chapters.reduce((s, c) => s + (c.words || 0), 0).toLocaleString()}
        </span>
        <RowActions
          showMove={false}
          onRename={() => startRename(volume.id, volume.title)}
          onDuplicate={() => {}}
          onDelete={() => deleteVolume(volume.id)}
        />
      </div>
      {!collapsed && (
        <>
          <SortableContext items={chapters.map((c) => c.id)} strategy={verticalListSortingStrategy}>
            <div className="tree-children">
              {chapters.map((c) => (
                <ChapterRow
                  key={c.id}
                  chapter={c}
                  active={c.id === activeChapterId}
                  renameId={renameId}
                  renameText={renameText}
                  setRenameText={setRenameText}
                  startRename={startRename}
                  commitRename={commitRename}
                  setRenameId={setRenameId}
                  moveMenuFor={moveMenuFor}
                  setMoveMenuFor={setMoveMenuFor}
                  onOpen={() => openEditor(c.id)}
                  onDuplicate={() => duplicateChapter(c.id)}
                  onDelete={() => deleteChapter(c.id)}
                  onMove={(parentId) => moveChapter(c.id, parentId, 999)}
                />
              ))}
            </div>
          </SortableContext>
          <div style={{ paddingLeft: 24 }}>
            <button
              className="btn small ghost"
              onClick={(e) => {
                e.stopPropagation()
                addChapter(volume.id)
              }}
            >
              <Icon name="plus" size={12} /> 章节
            </button>
          </div>
        </>
      )}
    </div>
  )
}

function ChapterRow({
  chapter,
  active,
  renameId,
  renameText,
  setRenameText,
  startRename,
  commitRename,
  setRenameId,
  moveMenuFor,
  setMoveMenuFor,
  onOpen,
  onDuplicate,
  onDelete,
  onMove
}: {
  chapter: Chapter
  active: boolean
  renameId: string | null
  renameText: string
  setRenameText: (v: string) => void
  startRename: (id: string, current: string) => void
  commitRename: () => void
  setRenameId: (id: string | null) => void
  moveMenuFor: string | null
  setMoveMenuFor: (id: string | null) => void
  onOpen: () => void
  onDuplicate: () => void
  onDelete: () => void
  onMove: (parentId: string) => void
}): JSX.Element {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: chapter.id,
    data: { type: 'chapter', group: chapter.parentId }
  })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <div className={`tree-row ${active ? 'active' : ''}`} onClick={onOpen}>
        {renameId === chapter.id ? (
          <input
            style={{ flex: 1, minWidth: 0 }}
            autoFocus
            value={renameText}
            onChange={(e) => setRenameText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitRename()
              if (e.key === 'Escape') setRenameId(null)
            }}
            onBlur={commitRename}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span className="tree-label" onDoubleClick={() => startRename(chapter.id, chapter.title)}>
            {chapter.title}
          </span>
        )}
        <span className="tree-words">{formatWords(chapter.words || 0)}</span>
        <RowActions
          showMove
          onRename={() => startRename(chapter.id, chapter.title)}
          onDuplicate={onDuplicate}
          onDelete={onDelete}
          onMove={() => setMoveMenuFor(moveMenuFor === chapter.id ? null : chapter.id)}
        />
      </div>
      {moveMenuFor === chapter.id && (
        <MoveMenu
          onPick={(parentId) => {
            onMove(parentId)
            setMoveMenuFor(null)
          }}
        />
      )}
    </div>
  )
}

function RootGroup({
  chapters,
  activeChapterId,
  renameId,
  renameText,
  setRenameText,
  startRename,
  commitRename,
  setRenameId,
  moveMenuFor,
  setMoveMenuFor
}: {
  chapters: Chapter[]
  activeChapterId: string | null
  renameId: string | null
  renameText: string
  setRenameText: (v: string) => void
  startRename: (id: string, current: string) => void
  commitRename: () => void
  setRenameId: (id: string | null) => void
  moveMenuFor: string | null
  setMoveMenuFor: (id: string | null) => void
}): JSX.Element {
  const { setNodeRef } = useDroppable({ id: 'root' })
  const openEditor = useApp((s) => s.openEditor)
  const duplicateChapter = useApp((s) => s.duplicateChapter)
  const deleteChapter = useApp((s) => s.deleteChapter)
  const moveChapter = useApp((s) => s.moveChapter)

  return (
    <div ref={setNodeRef}>
      <div className="tree-row volume-row" style={{ cursor: 'default' }}>
        <Icon name="chevronDown" size={14} style={{ opacity: 0.5 }} />
        <span className="tree-label muted">未分卷</span>
        <span className="tree-words">
          {chapters.reduce((s, c) => s + (c.words || 0), 0).toLocaleString()}
        </span>
      </div>
      <SortableContext items={chapters.map((c) => c.id)} strategy={verticalListSortingStrategy}>
        <div className="tree-children">
          {chapters.map((c) => (
            <ChapterRow
              key={c.id}
              chapter={c}
              active={c.id === activeChapterId}
              renameId={renameId}
              renameText={renameText}
              setRenameText={setRenameText}
              startRename={startRename}
              commitRename={commitRename}
              setRenameId={setRenameId}
              moveMenuFor={moveMenuFor}
              setMoveMenuFor={setMoveMenuFor}
              onOpen={() => openEditor(c.id)}
              onDuplicate={() => duplicateChapter(c.id)}
              onDelete={() => deleteChapter(c.id)}
              onMove={(parentId) => moveChapter(c.id, parentId, 999)}
            />
          ))}
        </div>
      </SortableContext>
    </div>
  )
}
