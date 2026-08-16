import { useMemo, useState, type JSX } from 'react'
import type { WorldType } from '../../../shared/types'
import { WORLD_TYPES } from '../../../shared/types'
import { useApp } from '../lib/store'
import { useT, EmptyState, Field, TagInput } from './ui'
import { Icon } from './Icons'
import { RichEditor } from './RichEditor'

export function WorldView(): JSX.Element {
  const t = useT()
  const book = useApp((s) => s.book)
  const worldId = useApp((s) => s.worldId)
  const addWorld = useApp((s) => s.addWorld)
  const updateWorld = useApp((s) => s.updateWorld)
  const deleteWorld = useApp((s) => s.deleteWorld)
  const openWorld = useApp((s) => s.openWorld)
  const [filter, setFilter] = useState<WorldType | 'all'>('all')

  const entities = useMemo(() => {
    const list = [...(book?.world ?? [])].sort((a, b) => a.name.localeCompare(b.name, 'zh'))
    return filter === 'all' ? list : list.filter((w) => w.type === filter)
  }, [book?.world, filter])

  if (!book) return <div />
  const entity = book.world.find((w) => w.id === worldId) ?? entities[0] ?? null
  const characters = book.characters

  const typeLabel = (id: WorldType): string => WORLD_TYPES.find((x) => x.id === id)?.labelZh ?? id

  const toggleRelation = (id: string): void => {
    if (!entity) return
    const has = entity.relations.includes(id)
    updateWorld(entity.id, {
      relations: has ? entity.relations.filter((r) => r !== id) : [...entity.relations, id]
    })
  }

  return (
    <div className="split">
      <div className="split-list">
        <div style={{ display: 'flex', gap: 4, marginBottom: 10, flexWrap: 'wrap' }}>
          <button className={`btn small ${filter === 'all' ? 'primary' : ''}`} onClick={() => setFilter('all')}>
            全部
          </button>
          {WORLD_TYPES.map((wt) => (
            <button
              key={wt.id}
              className={`btn small ${filter === wt.id ? 'primary' : ''}`}
              onClick={() => setFilter(wt.id)}
            >
              {wt.labelZh}
            </button>
          ))}
        </div>
        <button className="btn primary" style={{ width: '100%', marginBottom: 12 }} onClick={() => addWorld(filter === 'all' ? 'location' : filter)}>
          <Icon name="plus" size={14} /> {t('addWorld')}
        </button>
        {entities.length === 0 ? (
          <EmptyState icon="globe" text="还没有设定条目" />
        ) : (
          entities.map((w) => (
            <div key={w.id} className={`list-item ${w.id === entity?.id ? 'active' : ''}`} onClick={() => openWorld(w.id)}>
              <div className="li-title">
                <span className="rel-badge">{typeLabel(w.type)}</span>
                {w.name}
              </div>
              <div className="li-sub">
                {w.tags.length > 0 ? w.tags.join('、') : (w.summary ? '有描述' : '无描述')}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="split-detail">
        {!entity ? (
          <EmptyState icon="globe" text="选择或新建一个设定条目" />
        ) : (
          <>
            <div className="detail-title">
              <input
                style={{ flex: 1, fontSize: 20, fontWeight: 700, border: 'none', background: 'transparent' }}
                value={entity.name}
                placeholder="条目名称"
                onChange={(e) => updateWorld(entity.id, { name: e.target.value })}
              />
              <button className="icon-btn" title={t('delete')} onClick={() => deleteWorld(entity.id)}>
                <Icon name="trash" size={15} />
              </button>
            </div>

            <div className="detail-card">
              <div className="field-row">
                <Field label={t('worldType')}>
                  <select value={entity.type} onChange={(e) => updateWorld(entity.id, { type: e.target.value as WorldType })}>
                    {WORLD_TYPES.map((wt) => (
                      <option key={wt.id} value={wt.id}>
                        {wt.labelZh}
                      </option>
                    ))}
                  </select>
                </Field>
                <div className="field">
                  <label>{t('tags')}</label>
                  <TagInput tags={entity.tags} onChange={(tags) => updateWorld(entity.id, { tags })} />
                </div>
              </div>
            </div>

            <div className="detail-card">
              <h3>{t('summary')}</h3>
              <RichEditor
                key={`world-${entity.id}`}
                value={entity.summary}
                placeholder="描述这个地点、组织、物品或概念…"
                minHeight={220}
                onChange={(html) => updateWorld(entity.id, { summary: html })}
              />
            </div>

            <div className="detail-card">
              <h3>{t('relatedChars')}</h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                {characters.filter((c) => entity.relations.includes(c.id)).map((c) => (
                  <span className="tag" key={c.id}>
                    {c.name}
                    <span className="tag-x" onClick={() => toggleRelation(c.id)}>
                      ×
                    </span>
                  </span>
                ))}
              </div>
              <select
                value=""
                onChange={(e) => {
                  if (e.target.value) toggleRelation(e.target.value)
                }}
              >
                <option value="">+ 添加关联人物…</option>
                {characters
                  .filter((c) => !entity.relations.includes(c.id))
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
              </select>

              <h3 style={{ marginTop: 18 }}>{t('relatedWorld')}</h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                {book.world.filter((w) => w.id !== entity.id && entity.relations.includes(w.id)).map((w) => (
                  <span className="tag" key={w.id}>
                    {w.name}
                    <span className="tag-x" onClick={() => toggleRelation(w.id)}>
                      ×
                    </span>
                  </span>
                ))}
              </div>
              <select
                value=""
                onChange={(e) => {
                  if (e.target.value) toggleRelation(e.target.value)
                }}
              >
                <option value="">+ 添加关联条目…</option>
                {book.world
                  .filter((w) => w.id !== entity.id && !entity.relations.includes(w.id))
                  .map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
              </select>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
