import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'
import type { Editor } from '@tiptap/react'
import type { Node as ProseNode } from '@tiptap/pm/model'

export const searchKey = new PluginKey<SearchPluginState>('inkriver-search')

export interface SearchRange {
  from: number
  to: number
}

interface SearchPluginState {
  query: string
  ranges: SearchRange[]
  current: number
}

function findRanges(doc: ProseNode, query: string): SearchRange[] {
  const ranges: SearchRange[] = []
  const q = query.toLowerCase()
  if (!q) return ranges
  doc.descendants((node, pos) => {
    if (node.isText && node.text) {
      const text = node.text.toLowerCase()
      let idx = text.indexOf(q)
      while (idx !== -1) {
        ranges.push({ from: pos + idx, to: pos + idx + q.length })
        idx = text.indexOf(q, idx + 1)
      }
    }
    return true
  })
  return ranges
}

export function createSearchPlugin(): Plugin {
  return new Plugin({
    key: searchKey,
    state: {
      init: (): SearchPluginState => ({ query: '', ranges: [], current: -1 }),
      apply(tr, value, _oldState, newState): SearchPluginState {
        const queryMeta = tr.getMeta('searchQuery') as string | undefined
        if (queryMeta !== undefined) {
          const ranges = findRanges(newState.doc, queryMeta)
          return { query: queryMeta, ranges, current: ranges.length ? 0 : -1 }
        }
        const moveMeta = tr.getMeta('searchMove') as number | undefined
        if (moveMeta !== undefined) {
          const query = value?.query ?? ''
          const ranges = value?.ranges ?? findRanges(newState.doc, query)
          const total = ranges.length
          if (!total) return { query, ranges: [], current: -1 }
          const cur = (value?.current ?? 0) + moveMeta
          const next = ((cur % total) + total) % total
          return { query, ranges, current: next }
        }
        if (tr.docChanged) {
          const query = value?.query ?? ''
          return { query, ranges: findRanges(newState.doc, query), current: -1 }
        }
        return value ?? { query: '', ranges: [], current: -1 }
      }
    },
    props: {
      decorations(state): DecorationSet | null {
        const value = searchKey.getState(state)
        if (!value || !value.ranges.length) return null
        const decos = value.ranges.map((r, i) =>
          Decoration.inline(r.from, r.to, {
            class: i === value.current ? 'search-hit search-hit-current' : 'search-hit'
          })
        )
        return DecorationSet.create(state.doc, decos)
      }
    }
  })
}

function scrollToCurrent(editor: Editor): void {
  const state = searchKey.getState(editor.state)
  if (!state || state.current < 0 || !state.ranges.length) return
  const range = state.ranges[state.current]
  editor.commands.setTextSelection({ from: range.from, to: range.to })
  const dom = editor.view.domAtPos(range.from).node as HTMLElement | undefined
  dom?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  editor.view.focus()
}

export function setSearchQuery(editor: Editor, query: string): void {
  editor.view.dispatch(editor.state.tr.setMeta('searchQuery', query))
  scrollToCurrent(editor)
}

export function moveSearch(editor: Editor, dir: number): void {
  editor.view.dispatch(editor.state.tr.setMeta('searchMove', dir))
  scrollToCurrent(editor)
}

export function getSearchCount(editor: Editor): { total: number; current: number } {
  const state = searchKey.getState(editor.state)
  return { total: state?.ranges.length ?? 0, current: (state?.current ?? -1) + 1 }
}

export function replaceCurrent(editor: Editor, replacement: string): boolean {
  const state = searchKey.getState(editor.state)
  if (!state || state.current < 0 || !state.ranges.length) return false
  const { from, to } = state.ranges[state.current]
  const query = state.query
  editor.view.dispatch(editor.state.tr.insertText(replacement, from, to))
  setSearchQuery(editor, query)
  return true
}

export function replaceAll(editor: Editor, query: string, replacement: string): number {
  const ranges = findRanges(editor.state.doc, query).slice().reverse()
  if (!ranges.length) return 0
  let tr = editor.state.tr
  for (const r of ranges) {
    tr = tr.insertText(replacement, r.from, r.to)
  }
  editor.view.dispatch(tr)
  setSearchQuery(editor, query)
  return ranges.length
}
