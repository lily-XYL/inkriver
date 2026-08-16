import { useMemo, useState, type JSX, type ReactNode } from 'react'
import { translate, type Lang, type TKey } from '../i18n'
import { useApp } from '../lib/store'
import { Icon } from './Icons'

export function useT(): (key: TKey, vars?: Record<string, string | number>) => string {
  const lang = useApp((s) => s.book?.settings.language ?? 'zh')
  return useMemo(() => (key: TKey, vars?: Record<string, string | number>) => translate(lang, key, vars), [lang])
}

export function Modal({
  title,
  children,
  footer,
  onClose,
  wide
}: {
  title: ReactNode
  children: ReactNode
  footer?: ReactNode
  onClose: () => void
  wide?: boolean
}): JSX.Element {
  return (
    <div
      className="modal-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className={`modal ${wide ? 'wide' : ''}`}>
        <div className="modal-head">
          <h3 className="modal-title">{title}</h3>
          <button className="icon-btn" onClick={onClose} title="关闭">
            <Icon name="x" />
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  )
}

export function Field({
  label,
  children
}: {
  label: ReactNode
  children: ReactNode
}): JSX.Element {
  return (
    <div className="field">
      <label>{label}</label>
      {children}
    </div>
  )
}

export function TagInput({
  tags,
  onChange,
  placeholder
}: {
  tags: string[]
  onChange: (tags: string[]) => void
  placeholder?: string
}): JSX.Element {
  const [text, setText] = useState('')

  const add = (): void => {
    const value = text.trim().replace(/^#/, '')
    if (value && !tags.includes(value)) onChange([...tags, value])
    setText('')
  }

  return (
    <div
      className="tag-input"
      onClick={(e) => {
        const input = e.currentTarget.querySelector('input')
        input?.focus()
      }}
    >
      {tags.map((tag) => (
        <span className="tag" key={tag}>
          {tag}
          <span
            className="tag-x"
            onClick={(e) => {
              e.stopPropagation()
              onChange(tags.filter((t) => t !== tag))
            }}
          >
            ×
          </span>
        </span>
      ))}
      <input
        value={text}
        placeholder={placeholder ?? '输入标签后回车'}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault()
            add()
          } else if (e.key === 'Backspace' && !text && tags.length) {
            onChange(tags.slice(0, -1))
          }
        }}
        onBlur={add}
      />
    </div>
  )
}

export function EmptyState({
  icon,
  text,
  action
}: {
  icon: Parameters<typeof Icon>[0]['name']
  text: string
  action?: ReactNode
}): JSX.Element {
  return (
    <div className="empty">
      <Icon name={icon} size={40} />
      <p>{text}</p>
      {action}
    </div>
  )
}

export function Switch({
  checked,
  onChange
}: {
  checked: boolean
  onChange: (v: boolean) => void
}): JSX.Element {
  return (
    <label className="switch">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="track" />
    </label>
  )
}
