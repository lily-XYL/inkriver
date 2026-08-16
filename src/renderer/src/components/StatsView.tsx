import { useMemo, type JSX } from 'react'
import { useApp } from '../lib/store'
import { EmptyState, useT } from './ui'
import { formatWords, todayKey, totalWords } from '../lib/words'
import { Icon } from './Icons'

export function StatsView(): JSX.Element {
  const t = useT()
  const book = useApp((s) => s.book)

  const stats = useMemo(() => {
    if (!book) return null
    const total = totalWords(book)
    const daily = book.stats.daily
    const days = Object.keys(daily)
      .map((d) => ({ date: d, words: daily[d] }))
      .sort((a, b) => a.date.localeCompare(b.date))
    const last30 = days.slice(-30)
    const last30Sum = last30.reduce((s, d) => s + d.words, 0)
    const avg = last30.length ? Math.round(last30Sum / last30.length) : 0

    let streak = 0
    const d = new Date()
    for (let i = 0; i < 400; i++) {
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      if ((daily[key] ?? 0) > 0) streak++
      else if (i > 0) break
      d.setDate(d.getDate() - 1)
    }

    const chapters = book.chapters
    const chapterStats = chapters
      .map((c) => ({ title: c.title, words: c.words || 0 }))
      .sort((a, b) => b.words - a.words)
      .slice(0, 30)
    const maxChapter = Math.max(1, ...chapterStats.map((c) => c.words))

    // heatmap: last 90 days
    const heat: { date: string; words: number }[] = []
    const hd = new Date()
    hd.setDate(hd.getDate() - 89)
    for (let i = 0; i < 90; i++) {
      const key = `${hd.getFullYear()}-${String(hd.getMonth() + 1).padStart(2, '0')}-${String(hd.getDate()).padStart(2, '0')}`
      heat.push({ date: key, words: daily[key] ?? 0 })
      hd.setDate(hd.getDate() + 1)
    }
    const maxHeat = Math.max(1, ...heat.map((h) => h.words))

    return { total, daily, avg, streak, chapterStats, maxChapter, heat, maxHeat, goal: book.settings.bookGoal }
  }, [book])

  if (!book || !stats) return <div className="main-scroll"><EmptyState icon="chart" text="打开项目后查看写作统计" /></div>

  const goalPct = stats.goal > 0 ? Math.min(100, Math.round((stats.total / stats.goal) * 100)) : 0

  return (
    <div className="main-scroll">
      <div className="page-head">
        <div>
          <h1 className="page-title">{t('stats')}</h1>
          <p className="page-sub">{t('wordCountNote')}</p>
        </div>
      </div>

      <div className="stat-cards">
        <div className="card stat-card">
          <div className="num">{formatWords(stats.total)}</div>
          <div className="lbl">{t('totalWords')}</div>
          {stats.goal > 0 && (
            <>
              <div className="progress">
                <div style={{ width: `${goalPct}%` }} />
              </div>
              <div className="lbl">
                {t('goalProgress')} {goalPct}% / {formatWords(stats.goal)}
              </div>
            </>
          )}
        </div>
        <div className="card stat-card">
          <div className="num">{formatWords(stats.daily[todayKey()] ?? 0)}</div>
          <div className="lbl">{t('todayWords')}</div>
        </div>
        <div className="card stat-card">
          <div className="num">{formatWords(stats.avg)}</div>
          <div className="lbl">{t('perDay')}（近 30 天）</div>
        </div>
        <div className="card stat-card">
          <div className="num">{stats.streak}</div>
          <div className="lbl">{t('streak')}</div>
        </div>
        <div className="card stat-card">
          <div className="num">{book.chapters.length}</div>
          <div className="lbl">{t('chapters')}</div>
        </div>
      </div>

      <div className="card" style={{ padding: '16px 18px', marginBottom: 18 }}>
        <h3 style={{ margin: '0 0 12px', fontSize: 14 }}>{t('last30')} 写作热力图</h3>
        <div className="heatmap" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(12px, 1fr))' }}>
          {stats.heat.map((h) => (
            <div
              key={h.date}
              className="heat-cell"
              title={`${h.date}：${h.words} 字`}
              style={{
                background:
                  h.words === 0
                    ? 'var(--panel-3)'
                    : `color-mix(in srgb, var(--accent) ${Math.max(15, Math.round((h.words / stats.maxHeat) * 100))}%, var(--panel-2))`
              }}
            />
          ))}
        </div>
      </div>

      <div className="card" style={{ padding: '16px 18px', marginBottom: 18 }}>
        <h3 style={{ margin: '0 0 12px', fontSize: 14 }}>近 30 天每日字数</h3>
        {stats.daily
          ? Object.entries(stats.daily)
              .sort((a, b) => b[0].localeCompare(a[0]))
              .slice(0, 30)
              .map(([date, words]) => (
                <div className="bar-row" key={date}>
                  <span className="bar-name">{date}</span>
                  <div className="bar-track">
                    <div
                      className="bar-fill"
                      style={{
                        width: `${Math.max(2, Math.min(100, (words / Math.max(1, stats.maxHeat)) * 100))}%`
                      }}
                    />
                  </div>
                  <span className="bar-val">{formatWords(words)}</span>
                </div>
              ))
          : null}
      </div>

      <div className="card" style={{ padding: '16px 18px' }}>
        <h3 style={{ margin: '0 0 12px', fontSize: 14 }}>章节字数排行</h3>
        {stats.chapterStats.length === 0 ? (
          <p className="muted">还没有章节</p>
        ) : (
          stats.chapterStats.map((c) => (
            <div className="bar-row" key={c.title}>
              <span className="bar-name">{c.title}</span>
              <div className="bar-track">
                <div className="bar-fill" style={{ width: `${(c.words / stats.maxChapter) * 100}%` }} />
              </div>
              <span className="bar-val">{formatWords(c.words)}</span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
