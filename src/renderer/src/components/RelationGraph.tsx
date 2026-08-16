import { useEffect, useMemo, useRef, useState, type JSX } from 'react'
import type { Character } from '../../../shared/types'

interface GNode {
  id: string
  name: string
  color: string
  x: number
  y: number
  vx: number
  vy: number
}

interface GEdge {
  from: string
  to: string
  type: string
}

const W = 900
const H = 460

function simulate(characters: Character[], edges: GEdge[]): GNode[] {
  const nodes: GNode[] = characters.map((c, i) => ({
    id: c.id,
    name: c.name,
    color: c.color || '#3b5b92',
    x: 120 + ((i * 173) % (W - 240)),
    y: 90 + ((i * 97) % (H - 180)),
    vx: 0,
    vy: 0
  }))

  const nodeById = new Map(nodes.map((n) => [n.id, n]))
  const repulsion = 3200
  const spring = 0.018
  const center = 0.004
  const damping = 0.82

  for (let iter = 0; iter < 420; iter++) {
    // repulsion
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i]
        const b = nodes[j]
        let dx = a.x - b.x
        let dy = a.y - b.y
        let dist = Math.hypot(dx, dy) || 1
        const force = repulsion / (dist * dist)
        dx /= dist
        dy /= dist
        a.vx += dx * force
        a.vy += dy * force
        b.vx -= dx * force
        b.vy -= dy * force
      }
    }
    // springs
    for (const e of edges) {
      const a = nodeById.get(e.from)
      const b = nodeById.get(e.to)
      if (!a || !b) continue
      let dx = b.x - a.x
      let dy = b.y - a.y
      const dist = Math.hypot(dx, dy) || 1
      const force = (dist - 130) * spring
      dx /= dist
      dy /= dist
      a.vx += dx * force
      a.vy += dy * force
      b.vx -= dx * force
      b.vy -= dy * force
    }
    // center gravity + damping + bounds
    for (const n of nodes) {
      n.vx += (W / 2 - n.x) * center
      n.vy += (H / 2 - n.y) * center
      n.vx *= damping
      n.vy *= damping
      n.x += n.vx
      n.y += n.vy
      n.x = Math.max(48, Math.min(W - 48, n.x))
      n.y = Math.max(36, Math.min(H - 36, n.y))
    }
  }
  return nodes
}

export function RelationGraph({
  characters,
  activeId,
  onSelect
}: {
  characters: Character[]
  activeId: string | null
  onSelect: (id: string) => void
}): JSX.Element {
  const [hover, setHover] = useState<string | null>(null)
  const [drag, setDrag] = useState<string | null>(null)
  const svgRef = useRef<SVGSVGElement | null>(null)

  const edges = useMemo<GEdge[]>(() => {
    const out: GEdge[] = []
    const ids = new Set(characters.map((c) => c.id))
    for (const c of characters) {
      for (const r of c.relations) {
        if (ids.has(r.charId)) {
          const key = [c.id, r.charId].sort().join('|')
          if (!out.some((e) => [e.from, e.to].sort().join('|') === key)) {
            out.push({ from: c.id, to: r.charId, type: r.type })
          }
        }
      }
    }
    return out
  }, [characters])

  const key = characters.map((c) => c.id).join('|') + '#' + edges.length
  const initial = useMemo(() => simulate(characters, edges), [key]) // eslint-disable-line react-hooks/exhaustive-deps
  const [pos, setPos] = useState<GNode[]>(initial)

  useEffect(() => {
    setPos(initial)
  }, [initial])

  const move = (clientX: number, clientY: number): void => {
    if (!drag || !svgRef.current) return
    const ctm = svgRef.current.getScreenCTM()
    if (!ctm) return
    const pt = new DOMPoint(clientX, clientY).matrixTransform(ctm.inverse())
    setPos((prev) =>
      prev.map((n) =>
        n.id === drag
          ? { ...n, x: Math.max(36, Math.min(W - 36, pt.x)), y: Math.max(30, Math.min(H - 30, pt.y)) }
          : n
      )
    )
  }

  const nodeById = new Map(pos.map((n) => [n.id, n]))

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid meet"
      style={{ width: '100%', height: '100%', display: 'block' }}
      onPointerMove={(e) => move(e.clientX, e.clientY)}
      onPointerUp={() => setDrag(null)}
    >
      <defs>
        <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--border-strong)" />
        </marker>
      </defs>
      {edges.map((e, i) => {
        const a = nodeById.get(e.from)
        const b = nodeById.get(e.to)
        if (!a || !b) return null
        const active = hover === e.from || hover === e.to || drag === e.from || drag === e.to
        return (
          <g key={i}>
            <line
              className={`graph-edge ${active ? 'active' : ''}`}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              markerEnd="url(#arrow)"
            />
            <text x={(a.x + b.x) / 2} y={(a.y + b.y) / 2 - 4} fontSize={10} fill="var(--text-dim)" textAnchor="middle">
              {e.type}
            </text>
          </g>
        )
      })}
      {pos.map((n) => (
        <g
          key={n.id}
          className="graph-node"
          transform={`translate(${n.x},${n.y})`}
          onPointerDown={(e) => {
            e.stopPropagation()
            setDrag(n.id)
            svgRef.current?.setPointerCapture(e.pointerId)
          }}
          onPointerEnter={() => setHover(n.id)}
          onPointerLeave={() => setHover(null)}
          onDoubleClick={() => onSelect(n.id)}
        >
          <circle
            r={hover === n.id || drag === n.id ? 22 : 18}
            fill={n.color}
            opacity={drag && drag !== n.id ? 0.55 : 1}
            style={{ transition: 'r 0.12s ease', cursor: 'grab' }}
          />
          {activeId === n.id && <circle r={26} fill="none" stroke="var(--accent)" strokeWidth={2} strokeDasharray="4 3" />}
          <text y={34}>{n.name}</text>
        </g>
      ))}
    </svg>
  )
}
