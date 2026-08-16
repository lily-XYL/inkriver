import { useMemo, useState, type JSX } from 'react'
import type { CharacterRelation } from '../../../shared/types'
import { CHARACTER_COLORS } from '../../../shared/types'
import { useApp } from '../lib/store'
import { useT, EmptyState, Field, TagInput } from './ui'
import { Icon } from './Icons'
import { RichEditor } from './RichEditor'
import { RelationGraph } from './RelationGraph'

export function CharactersView(): JSX.Element {
  const t = useT()
  const book = useApp((s) => s.book)
  const charId = useApp((s) => s.charId)
  const addCharacter = useApp((s) => s.addCharacter)
  const updateCharacter = useApp((s) => s.updateCharacter)
  const deleteCharacter = useApp((s) => s.deleteCharacter)
  const addRelation = useApp((s) => s.addRelation)
  const removeRelation = useApp((s) => s.removeRelation)
  const openChar = useApp((s) => s.openChar)
  const [showGraph, setShowGraph] = useState(true)

  const characters = useMemo(() => [...(book?.characters ?? [])].sort((a, b) => a.name.localeCompare(b.name, 'zh')), [book?.characters])

  if (!book) return <div />
  const character = book.characters.find((c) => c.id === charId) ?? characters[0] ?? null

  const addRel = (): void => {
    if (!character) return
    const target = characters.find((c) => c.id !== character.id && !character.relations.some((r) => r.charId === c.id))
    if (!target) return
    addRelation(character.id, { charId: target.id, type: '朋友', note: '' })
  }

  return (
    <div className="split">
      <div className="split-list">
        <button className="btn primary" style={{ width: '100%', marginBottom: 12 }} onClick={addCharacter}>
          <Icon name="plus" size={14} /> {t('addCharacter')}
        </button>
        {characters.length === 0 ? (
          <EmptyState icon="users" text="还没有人物" />
        ) : (
          characters.map((c) => (
            <div key={c.id} className={`list-item ${c.id === character?.id ? 'active' : ''}`} onClick={() => openChar(c.id)}>
              <div className="li-title">
                <span className="char-avatar" style={{ background: c.color || '#3b5b92' }}>
                  {c.name.slice(0, 1)}
                </span>
                <span style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 600 }}>{c.name}</div>
                  <div className="li-sub">{c.role || c.identity || '角色'}</div>
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="split-detail">
        {!character ? (
          <EmptyState icon="users" text="选择或新建一个人物" />
        ) : (
          <>
            <div className="detail-title">
              <span className="char-avatar" style={{ background: character.color || '#3b5b92' }}>
                {character.name.slice(0, 1)}
              </span>
              <input
                style={{ flex: 1, fontSize: 20, fontWeight: 700, border: 'none', background: 'transparent' }}
                value={character.name}
                placeholder="人物姓名"
                onChange={(e) => updateCharacter(character.id, { name: e.target.value })}
              />
              <button className="icon-btn" title={t('delete')} onClick={() => deleteCharacter(character.id)}>
                <Icon name="trash" size={15} />
              </button>
            </div>

            <div className="detail-card">
              <div className="field-row">
                <Field label={t('aliases')}>
                  <input
                    value={character.aliases}
                    onChange={(e) => updateCharacter(character.id, { aliases: e.target.value })}
                  />
                </Field>
                <Field label={t('age')}>
                  <input value={character.age} onChange={(e) => updateCharacter(character.id, { age: e.target.value })} />
                </Field>
                <Field label={t('gender')}>
                  <input
                    value={character.gender}
                    onChange={(e) => updateCharacter(character.id, { gender: e.target.value })}
                  />
                </Field>
                <Field label={t('role')}>
                  <input value={character.role} onChange={(e) => updateCharacter(character.id, { role: e.target.value })} />
                </Field>
                <Field label={t('identity')}>
                  <input
                    value={character.identity}
                    onChange={(e) => updateCharacter(character.id, { identity: e.target.value })}
                  />
                </Field>
                <Field label={t('firstChapter')}>
                  <select
                    value={character.firstChapterId}
                    onChange={(e) => updateCharacter(character.id, { firstChapterId: e.target.value })}
                  >
                    <option value="">—</option>
                    {book.chapters.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.title}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
              <div className="field">
                <label>{t('tags')}</label>
                <TagInput tags={character.tags} onChange={(tags) => updateCharacter(character.id, { tags })} />
              </div>
            </div>

            <div className="detail-card">
              <h3>{t('appearance')}</h3>
              <textarea
                rows={2}
                style={{ width: '100%' }}
                value={character.appearance}
                onChange={(e) => updateCharacter(character.id, { appearance: e.target.value })}
              />
              <h3>{t('personality')}</h3>
              <textarea
                rows={3}
                style={{ width: '100%' }}
                value={character.personality}
                onChange={(e) => updateCharacter(character.id, { personality: e.target.value })}
              />
              <h3>{t('background')}</h3>
              <textarea
                rows={4}
                style={{ width: '100%' }}
                value={character.background}
                onChange={(e) => updateCharacter(character.id, { background: e.target.value })}
              />
              <div className="field-row">
                <div className="field">
                  <label>{t('goal')}</label>
                  <textarea
                    rows={2}
                    value={character.goal}
                    onChange={(e) => updateCharacter(character.id, { goal: e.target.value })}
                  />
                </div>
                <div className="field">
                  <label>{t('conflict')}</label>
                  <textarea
                    rows={2}
                    value={character.conflict}
                    onChange={(e) => updateCharacter(character.id, { conflict: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="detail-card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h3 style={{ margin: 0 }}>{t('relations')}</h3>
                <button className="btn small" onClick={addRel}>
                  <Icon name="plus" size={12} /> {t('addRelation')}
                </button>
              </div>
              {character.relations.length === 0 ? (
                <p className="muted" style={{ fontSize: 12, margin: '10px 0 0' }}>
                  暂无关系，点击"添加关系"建立人物联系
                </p>
              ) : (
                character.relations.map((rel, i) => {
                  const target = characters.find((c) => c.id === rel.charId)
                  if (!target) return null
                  return (
                    <div className="rel-row" key={i}>
                      <span className="char-avatar" style={{ width: 26, height: 26, fontSize: 12, background: target.color }}>
                        {target.name.slice(0, 1)}
                      </span>
                      <span style={{ fontWeight: 600 }}>{target.name}</span>
                      <span className="rel-badge">{rel.type}</span>
                      <input
                        style={{ flex: 1, minWidth: 80 }}
                        placeholder="备注"
                        value={rel.note}
                        onChange={(e) => {
                          const next: CharacterRelation = { ...rel, note: e.target.value }
                          updateCharacter(character.id, {
                            relations: character.relations.map((r, j) => (j === i ? next : r))
                          })
                        }}
                      />
                      <button
                        className="icon-btn"
                        title="删除关系"
                        onClick={() => removeRelation(character.id, i)}
                      >
                        <Icon name="x" size={13} />
                      </button>
                    </div>
                  )
                })
              )}
            </div>

            <div className="detail-card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <h3 style={{ margin: 0 }}>关系图谱</h3>
                <button className="btn small" onClick={() => setShowGraph(!showGraph)}>
                  {showGraph ? '收起' : '展开'}
                </button>
              </div>
              {showGraph && (
                <div className="graph-box">
                  <RelationGraph
                    characters={characters}
                    activeId={character.id}
                    onSelect={(id) => openChar(id)}
                  />
                  <div className="graph-tip">拖拽调整位置 · 双击节点跳转到人物 · 点击人物卡颜色可更换</div>
                </div>
              )}
            </div>

            <div className="detail-card">
              <h3>{t('notesField')}</h3>
              <RichEditor
                key={`char-${character.id}`}
                value={character.notes}
                placeholder="关于这个人物，你还想记住什么？"
                minHeight={180}
                onChange={(html) => updateCharacter(character.id, { notes: html })}
              />
            </div>
          </>
        )}
      </div>
    </div>
  )
}
