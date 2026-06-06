'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { motion } from 'framer-motion'
import { ZoomIn, ZoomOut, Maximize, Filter, AlertTriangle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { GraphData, GraphNode, GraphEdge } from '@/lib/types'

const typeColors: Record<string, string> = {
  person: '#06b6d4',
  team: '#10b981',
  project: '#f59e0b',
  system: '#8b5cf6',
  customer: '#f43f5e',
  vendor: '#f97316',
  decision: '#6366f1',
  data_asset: '#14b8a6',
}

const typeLabels: Record<string, string> = {
  person: 'People',
  team: 'Teams',
  project: 'Projects',
  system: 'Systems',
  customer: 'Customers',
  vendor: 'Vendors',
  decision: 'Decisions',
  data_asset: 'Data Assets',
}

// Convert hex color + opacity to rgba string (universally supported in canvas)
function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

export function GraphView() {
  const [data, setData] = useState<GraphData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeFilter, setActiveFilter] = useState('all')
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null)
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null)
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 })
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const nodesRef = useRef<GraphNode[]>([])
  const edgesRef = useRef<GraphEdge[]>([])
  const transformRef = useRef({ x: 0, y: 0, scale: 1 })
  const dragRef = useRef<{ nodeId: string | null; startX: number; startY: number; nodeStartX: number; nodeStartY: number }>({
    nodeId: null, startX: 0, startY: 0, nodeStartX: 0, nodeStartY: 0,
  })
  const isPanningRef = useRef(false)
  const panStartRef = useRef({ x: 0, y: 0 })
  const animFrameRef = useRef<number>(0)
  const activeFilterRef = useRef('all')
  const hoveredNodeRef = useRef<GraphNode | null>(null)
  const selectedNodeRef = useRef<GraphNode | null>(null)

  const [fetchKey, setFetchKey] = useState(0)

  const handleRetry = () => {
    setLoading(true)
    setError(null)
    setFetchKey((k) => k + 1)
  }

  // Fetch graph data
  useEffect(() => {
    let cancelled = false
    fetch('/api/graph')
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then((d) => {
        if (cancelled) return
        setData(d)
        // Initialize node positions in a circle centered on canvas center
        nodesRef.current = d.nodes.map((n: { id: string; type: string; name: string; relationCount: number }, i: number) => {
          const angle = (i / d.nodes.length) * Math.PI * 2
          const radius = 200 + Math.random() * 150
          // Use a reasonable default center; simulation will adjust once canvas dimensions are known
          const cx = typeof window !== 'undefined' ? window.innerWidth / 2 : 520
          const cy = typeof window !== 'undefined' ? window.innerHeight / 2 : 260
          return {
            ...n,
            x: cx + Math.cos(angle) * radius,
            y: cy + Math.sin(angle) * radius,
            vx: 0,
            vy: 0,
          }
        })
        edgesRef.current = d.edges
      })
      .catch(() => { if (!cancelled) setError('Failed to load graph data. Please try again.') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [fetchKey])

  // Sync refs with state
  useEffect(() => { activeFilterRef.current = activeFilter }, [activeFilter])
  useEffect(() => { hoveredNodeRef.current = hoveredNode }, [hoveredNode])
  useEffect(() => { selectedNodeRef.current = selectedNode }, [selectedNode])

  // Main animation loop
  useEffect(() => {
    if (loading || !data) return

    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let running = true

    const resizeCanvas = () => {
      const parent = canvas.parentElement
      if (!parent) return
      const dpr = window.devicePixelRatio || 1
      const width = parent.clientWidth
      const height = parent.clientHeight
      if (width === 0 || height === 0) return
      canvas.width = width * dpr
      canvas.height = height * dpr
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      ctx.scale(dpr, dpr)
    }

    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)

    const simulate = () => {
      const nodes = nodesRef.current
      const edges = edgesRef.current
      const filter = activeFilterRef.current
      if (nodes.length === 0) return

      const alpha = 0.3
      const repulsion = 3000
      const attraction = 0.005
      const damping = 0.85
      const canvasW = canvas.clientWidth
      const canvasH = canvas.clientHeight
      const cx = canvasW / 2
      const cy = canvasH / 2

      // Fix any NaN positions first
      for (const node of nodes) {
        if (!Number.isFinite(node.x) || !Number.isFinite(node.y)) {
          node.x = cx + (Math.random() - 0.5) * 200
          node.y = cy + (Math.random() - 0.5) * 200
        }
        if (!Number.isFinite(node.vx)) node.vx = 0
        if (!Number.isFinite(node.vy)) node.vy = 0
      }

      // Node-to-node repulsion
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i]
        if (filter !== 'all' && a.type !== filter) continue

        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j]
          if (filter !== 'all' && b.type !== filter) continue

          const dx = a.x - b.x
          const dy = a.y - b.y
          const dist = Math.sqrt(dx * dx + dy * dy) || 1
          const force = repulsion / (dist * dist)
          const fx = (dx / dist) * force * alpha
          const fy = (dy / dist) * force * alpha

          a.vx += fx
          a.vy += fy
          b.vx -= fx
          b.vy -= fy
        }
      }

      // Edge attraction
      for (const edge of edges) {
        const source = nodes.find((n) => n.id === edge.source)
        const target = nodes.find((n) => n.id === edge.target)
        if (!source || !target) continue
        if (filter !== 'all' && (source.type !== filter || target.type !== filter)) continue

        const dx = target.x - source.x
        const dy = target.y - source.y
        const dist = Math.sqrt(dx * dx + dy * dy) || 1
        const idealDist = 180
        const force = (dist - idealDist) * attraction * alpha

        source.vx += dx * force
        source.vy += dy * force
        target.vx -= dx * force
        target.vy -= dy * force
      }

      // Center gravity + velocity damping
      for (const node of nodes) {
        if (filter !== 'all' && node.type !== filter) continue

        node.vx += (cx - node.x) * 0.001
        node.vy += (cy - node.y) * 0.001

        if (dragRef.current.nodeId !== node.id) {
          node.vx *= damping
          node.vy *= damping
          node.x += node.vx
          node.y += node.vy
        }
      }
    }

    const draw = () => {
      const dpr = window.devicePixelRatio || 1
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      const width = canvas.clientWidth
      const height = canvas.clientHeight
      ctx.clearRect(0, 0, width, height)

      const transform = transformRef.current
      const nodes = nodesRef.current
      const edges = edgesRef.current
      const filter = activeFilterRef.current
      const hov = hoveredNodeRef.current
      const sel = selectedNodeRef.current

      if (nodes.length === 0) return

      ctx.save()
      ctx.translate(transform.x, transform.y)
      ctx.scale(transform.scale, transform.scale)

      // Build a lookup map for faster edge drawing
      const nodeMap = new Map<string, GraphNode>()
      for (const n of nodes) nodeMap.set(n.id, n)

      // Draw edges
      for (const edge of edges) {
        const source = nodeMap.get(edge.source)
        const target = nodeMap.get(edge.target)
        if (!source || !target) continue
        if (!Number.isFinite(source.x) || !Number.isFinite(target.x)) continue
        if (filter !== 'all' && (source.type !== filter || target.type !== filter)) continue

        const isConnected = sel && (sel.id === source.id || sel.id === target.id)
        ctx.beginPath()
        ctx.moveTo(source.x, source.y)
        ctx.lineTo(target.x, target.y)
        ctx.strokeStyle = isConnected ? 'rgba(16, 185, 129, 0.5)' : 'rgba(42, 42, 62, 0.6)'
        ctx.lineWidth = isConnected ? 2 : 1
        ctx.stroke()

        // Arrow head
        const angle = Math.atan2(target.y - source.y, target.x - source.x)
        const targetRadius = Math.max(6, Math.min(20, (target.relationCount || 1) * 3))
        const arrowX = target.x - Math.cos(angle) * (targetRadius + 4)
        const arrowY = target.y - Math.sin(angle) * (targetRadius + 4)
        ctx.beginPath()
        ctx.moveTo(arrowX, arrowY)
        ctx.lineTo(arrowX - 6 * Math.cos(angle - 0.4), arrowY - 6 * Math.sin(angle - 0.4))
        ctx.lineTo(arrowX - 6 * Math.cos(angle + 0.4), arrowY - 6 * Math.sin(angle + 0.4))
        ctx.closePath()
        ctx.fillStyle = isConnected ? 'rgba(16, 185, 129, 0.5)' : 'rgba(42, 42, 62, 0.6)'
        ctx.fill()
      }

      // Draw nodes
      for (const node of nodes) {
        if (filter !== 'all' && node.type !== filter) continue
        if (!Number.isFinite(node.x) || !Number.isFinite(node.y)) continue

        const color = typeColors[node.type] || '#6b7280'
        const radius = Math.max(6, Math.min(20, (node.relationCount || 1) * 3))
        const isHovered = hov?.id === node.id
        const isSelected = sel?.id === node.id
        const isConnectedToSelected = sel && edges.some(
          (e) =>
            (e.source === sel.id && e.target === node.id) ||
            (e.target === sel.id && e.source === node.id)
        )

        // Hover/select glow
        if (isHovered || isSelected) {
          ctx.beginPath()
          ctx.arc(node.x, node.y, radius + 8, 0, Math.PI * 2)
          ctx.fillStyle = hexToRgba(color, 0.19)
          ctx.fill()
        }

        // Connected highlight
        if (isConnectedToSelected && !isSelected) {
          ctx.beginPath()
          ctx.arc(node.x, node.y, radius + 4, 0, Math.PI * 2)
          ctx.fillStyle = hexToRgba(color, 0.08)
          ctx.fill()
        }

        // Node circle
        ctx.beginPath()
        ctx.arc(node.x, node.y, radius, 0, Math.PI * 2)
        ctx.fillStyle = isSelected ? color : hexToRgba(color, 0.5)
        ctx.fill()
        ctx.strokeStyle = color
        ctx.lineWidth = isSelected ? 2.5 : 1
        ctx.stroke()

        // Label
        if (isHovered || isSelected || transform.scale > 1.2) {
          ctx.font = '11px sans-serif'
          ctx.fillStyle = '#e5e7eb'
          ctx.textAlign = 'center'
          ctx.fillText(node.name, node.x, node.y + radius + 14)
        }
      }

      ctx.restore()
    }

    const animate = () => {
      if (!running) return
      simulate()
      draw()
      animFrameRef.current = requestAnimationFrame(animate)
    }
    animFrameRef.current = requestAnimationFrame(animate)

    return () => {
      running = false
      window.removeEventListener('resize', resizeCanvas)
      cancelAnimationFrame(animFrameRef.current)
    }
  }, [loading, data])

  const getNodeAtPos = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current
    if (!canvas) return null
    const rect = canvas.getBoundingClientRect()
    const transform = transformRef.current
    const x = (clientX - rect.left - transform.x) / transform.scale
    const y = (clientY - rect.top - transform.y) / transform.scale
    const filter = activeFilterRef.current

    for (const node of nodesRef.current) {
      if (filter !== 'all' && node.type !== filter) continue
      if (!Number.isFinite(node.x) || !Number.isFinite(node.y)) continue
      const radius = Math.max(6, Math.min(20, (node.relationCount || 1) * 3))
      const dx = x - node.x
      const dy = y - node.y
      if (dx * dx + dy * dy < (radius + 5) * (radius + 5)) {
        return node
      }
    }
    return null
  }, [])

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const node = getNodeAtPos(e.clientX, e.clientY)
    if (node) {
      dragRef.current = {
        nodeId: node.id,
        startX: e.clientX,
        startY: e.clientY,
        nodeStartX: node.x,
        nodeStartY: node.y,
      }
    } else {
      isPanningRef.current = true
      panStartRef.current = { x: e.clientX - transformRef.current.x, y: e.clientY - transformRef.current.y }
    }
  }, [getNodeAtPos])

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (dragRef.current.nodeId) {
      const node = nodesRef.current.find((n) => n.id === dragRef.current.nodeId)
      if (node) {
        const transform = transformRef.current
        node.x = dragRef.current.nodeStartX + (e.clientX - dragRef.current.startX) / transform.scale
        node.y = dragRef.current.nodeStartY + (e.clientY - dragRef.current.startY) / transform.scale
      }
    } else if (isPanningRef.current) {
      transformRef.current.x = e.clientX - panStartRef.current.x
      transformRef.current.y = e.clientY - panStartRef.current.y
    } else {
      const node = getNodeAtPos(e.clientX, e.clientY)
      setHoveredNode(node)
      if (node) {
        setTooltipPos({ x: e.clientX, y: e.clientY })
      }
    }
  }, [getNodeAtPos])

  const handleMouseUp = useCallback(() => {
    if (dragRef.current.nodeId) {
      const node = nodesRef.current.find((n) => n.id === dragRef.current.nodeId)
      if (node) {
        setSelectedNode(node)
      }
      dragRef.current = { nodeId: null, startX: 0, startY: 0, nodeStartX: 0, nodeStartY: 0 }
    }
    isPanningRef.current = false
  }, [])

  // Use a non-passive wheel listener to allow preventDefault (avoids passive event listener warnings)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const handler = (e: WheelEvent) => {
      e.preventDefault()
      const delta = e.deltaY > 0 ? 0.9 : 1.1
      const newScale = Math.max(0.2, Math.min(5, transformRef.current.scale * delta))
      // Zoom centered on cursor position
      const rect = canvas.getBoundingClientRect()
      const mouseX = e.clientX - rect.left
      const mouseY = e.clientY - rect.top
      const oldScale = transformRef.current.scale
      transformRef.current.x = mouseX - (mouseX - transformRef.current.x) * (newScale / oldScale)
      transformRef.current.y = mouseY - (mouseY - transformRef.current.y) * (newScale / oldScale)
      transformRef.current.scale = newScale
    }
    canvas.addEventListener('wheel', handler, { passive: false })
    return () => canvas.removeEventListener('wheel', handler)
  }, [data, loading])

  if (error) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <AlertTriangle className="h-8 w-8 text-red-400" />
          <p className="text-sm text-gray-400">{error}</p>
          <Button variant="outline" size="sm" onClick={handleRetry}>
            Retry
          </Button>
        </div>
      </div>
    )
  }

  if (loading || !data) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
          <span className="text-sm text-gray-400">Loading knowledge graph...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      {/* Filter bar */}
      <div className="flex items-center gap-4 border-b border-[#1e1e2e] bg-[#0a0a0f] px-6 py-3">
        <Filter className="h-4 w-4 text-gray-500" />
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant={activeFilter === 'all' ? 'default' : 'ghost'}
            className={`h-7 text-xs ${activeFilter === 'all' ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30' : 'text-gray-400 hover:text-gray-200'}`}
            onClick={() => setActiveFilter('all')}
          >
            All
          </Button>
          {Object.entries(typeLabels).map(([key, label]) => (
            <Button
              key={key}
              size="sm"
              variant={activeFilter === key ? 'default' : 'ghost'}
              className={`h-7 text-xs ${activeFilter === key ? 'text-white' : 'text-gray-400 hover:text-gray-200'}`}
              style={activeFilter === key ? { backgroundColor: hexToRgba(typeColors[key], 0.19), color: typeColors[key] } : {}}
              onClick={() => setActiveFilter(key)}
            >
              {label}
            </Button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-gray-400" onClick={() => { transformRef.current.scale *= 1.2 }}>
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-gray-400" onClick={() => { transformRef.current.scale *= 0.8 }}>
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-gray-400" onClick={() => { transformRef.current = { x: 0, y: 0, scale: 1 } }}>
            <Maximize className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Stats bar */}
      <div className="flex items-center gap-6 border-b border-[#1e1e2e] bg-[#0d0d14] px-6 py-2">
        <span className="text-xs text-gray-500">
          <span className="font-mono text-gray-300">{data.totalEntities}</span> entities
        </span>
        <span className="text-xs text-gray-500">
          <span className="font-mono text-gray-300">{data.totalRelations}</span> relations
        </span>
        {Object.entries(data.typeCounts || {}).map(([type, count]) => (
          <span key={type} className="flex items-center gap-1.5 text-xs text-gray-500">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: typeColors[type] || '#6b7280' }} />
            <span className="font-mono text-gray-400">{count as number}</span> {typeLabels[type] || type}
          </span>
        ))}
      </div>

      {/* Canvas container */}
      <div className="relative flex-1 min-h-0">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          /* wheel handled via useEffect with non-passive listener */
          role="img"
          aria-label="Knowledge graph visualization showing entities and their relationships"
        />

        {/* Tooltip */}
        {hoveredNode && (
          <div
            className="pointer-events-none absolute z-10 rounded-lg border border-[#2a2a3e] bg-[#16161f] p-3 shadow-xl"
            style={{ left: tooltipPos.x + 12, top: tooltipPos.y + 12 }}
          >
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: typeColors[hoveredNode.type] || '#6b7280' }} />
              <span className="text-sm font-medium text-white">{hoveredNode.name}</span>
            </div>
            <p className="mt-1 text-xs text-gray-400">Type: {typeLabels[hoveredNode.type] || hoveredNode.type}</p>
            <p className="text-xs text-gray-400">Relations: {hoveredNode.relationCount}</p>
          </div>
        )}

        {/* Legend */}
        <div className="absolute bottom-4 left-4 rounded-lg border border-[#1e1e2e] bg-[#111118]/90 p-3 backdrop-blur">
          <p className="mb-2 text-xs font-medium text-gray-400">Node Types</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            {Object.entries(typeColors).map(([type, color]) => (
              <div key={type} className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
                <span className="text-[10px] text-gray-500">{typeLabels[type]}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Selected Node Details */}
      {selectedNode && (
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="border-t border-[#1e1e2e] bg-[#111118] p-4"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: typeColors[selectedNode.type] || '#6b7280' }} />
              <span className="text-sm font-medium text-white">{selectedNode.name}</span>
              <Badge variant="outline" className="border-[#2a2a3e] text-[10px] text-gray-400">
                {typeLabels[selectedNode.type] || selectedNode.type}
              </Badge>
            </div>
            <Button size="sm" variant="ghost" className="h-6 text-xs text-gray-400" onClick={() => setSelectedNode(null)}>
              Close
            </Button>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            <span className="text-xs text-gray-500">Connections:</span>
            {(data?.edges || [])
              .filter((e: GraphEdge) => e.source === selectedNode.id || e.target === selectedNode.id)
              .map((e: GraphEdge) => {
                const connectedName = e.source === selectedNode.id ? e.targetName : e.sourceName
                return (
                  <Badge key={e.id} variant="outline" className="border-[#2a2a3e] text-[10px] text-gray-400">
                    {connectedName} ({e.type})
                  </Badge>
                )
              })}
          </div>
        </motion.div>
      )}
    </div>
  )
}
