'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { motion } from 'framer-motion'
import { ZoomIn, ZoomOut, Maximize, Filter } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

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

interface GraphNode {
  id: string
  type: string
  name: string
  x: number
  y: number
  vx: number
  vy: number
  relationCount: number
}

interface GraphEdge {
  id: string
  source: string
  target: string
  type: string
  weight: number
  sourceName: string
  targetName: string
}

type ApiData = Record<string, unknown>

export function GraphView() {
  const [data, setData] = useState<ApiData>(null)
  const [loading, setLoading] = useState(true)
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

  useEffect(() => {
    activeFilterRef.current = activeFilter
  }, [activeFilter])

  useEffect(() => {
    hoveredNodeRef.current = hoveredNode
  }, [hoveredNode])

  useEffect(() => {
    selectedNodeRef.current = selectedNode
  }, [selectedNode])

  useEffect(() => {
    fetch('/api/graph')
      .then((r) => r.json())
      .then((d) => {
        setData(d)
        const cx = 600
        const cy = 400
        nodesRef.current = d.nodes.map((n: { id: string; type: string; name: string; relationCount: number }, i: number) => {
          const angle = (i / d.nodes.length) * Math.PI * 2
          const radius = 200 + Math.random() * 150
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
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  // Main animation loop - all simulation and drawing inlined
  useEffect(() => {
    if (loading || !data) return

    const canvas = canvasRef.current
    if (!canvas) return

    const resizeCanvas = () => {
      const parent = canvas.parentElement
      if (parent) {
        canvas.width = parent.clientWidth
        canvas.height = parent.clientHeight
      }
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

      const cx = 600
      const cy = 400
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
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      const { width, height } = canvas
      const transform = transformRef.current
      const nodes = nodesRef.current
      const edges = edgesRef.current
      const filter = activeFilterRef.current
      const hov = hoveredNodeRef.current
      const sel = selectedNodeRef.current

      ctx.clearRect(0, 0, width, height)
      ctx.save()
      ctx.translate(transform.x, transform.y)
      ctx.scale(transform.scale, transform.scale)

      // Draw edges
      for (const edge of edges) {
        const source = nodes.find((n) => n.id === edge.source)
        const target = nodes.find((n) => n.id === edge.target)
        if (!source || !target) continue
        if (filter !== 'all' && (source.type !== filter || target.type !== filter)) continue

        const isConnected = sel && (sel.id === source.id || sel.id === target.id)
        ctx.beginPath()
        ctx.moveTo(source.x, source.y)
        ctx.lineTo(target.x, target.y)
        ctx.strokeStyle = isConnected ? 'rgba(16, 185, 129, 0.5)' : 'rgba(42, 42, 62, 0.6)'
        ctx.lineWidth = isConnected ? 2 : 1
        ctx.stroke()

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

        const color = typeColors[node.type] || '#6b7280'
        const radius = Math.max(6, Math.min(20, (node.relationCount || 1) * 3))
        const isHovered = hov?.id === node.id
        const isSelected = sel?.id === node.id
        const isConnectedToSelected = sel && edges.some(
          (e) =>
            (e.source === sel.id && e.target === node.id) ||
            (e.target === sel.id && e.source === node.id)
        )

        if (isHovered || isSelected) {
          ctx.beginPath()
          ctx.arc(node.x, node.y, radius + 8, 0, Math.PI * 2)
          ctx.fillStyle = color + '30'
          ctx.fill()
        }

        if (isConnectedToSelected && !isSelected) {
          ctx.beginPath()
          ctx.arc(node.x, node.y, radius + 4, 0, Math.PI * 2)
          ctx.fillStyle = color + '15'
          ctx.fill()
        }

        ctx.beginPath()
        ctx.arc(node.x, node.y, radius, 0, Math.PI * 2)
        ctx.fillStyle = isSelected ? color : color + '80'
        ctx.fill()
        ctx.strokeStyle = color
        ctx.lineWidth = isSelected ? 2.5 : 1
        ctx.stroke()

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
      simulate()
      draw()
      animFrameRef.current = requestAnimationFrame(animate)
    }
    animFrameRef.current = requestAnimationFrame(animate)

    return () => {
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

  const handleWheel = useCallback((e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? 0.9 : 1.1
    const newScale = Math.max(0.2, Math.min(5, transformRef.current.scale * delta))
    transformRef.current.scale = newScale
  }, [])

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
              style={activeFilter === key ? { backgroundColor: typeColors[key] + '30', color: typeColors[key] } : {}}
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

      {/* Canvas */}
      <div className="relative flex-1">
        <canvas
          ref={canvasRef}
          className="h-full w-full cursor-grab active:cursor-grabbing"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
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
