'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Search, Users, FolderKanban, Gavel, Activity, Brain, CheckCircle, TrendingUp } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'

const filterTabs = [
  { id: 'all', label: 'All', icon: Search },
  { id: 'people', label: 'People', icon: Users },
  { id: 'projects', label: 'Projects', icon: FolderKanban },
  { id: 'decisions', label: 'Decisions', icon: Gavel },
  { id: 'events', label: 'Events', icon: Activity },
  { id: 'memories', label: 'Memories', icon: Brain },
  { id: 'tasks', label: 'Tasks', icon: CheckCircle },
  { id: 'predictions', label: 'Predictions', icon: TrendingUp },
]

const severityColors: Record<string, string> = {
  info: 'border-cyan-500/30 text-cyan-400',
  warning: 'border-amber-500/30 text-amber-400',
  error: 'border-red-500/30 text-red-400',
  critical: 'border-red-500/30 text-red-400',
}

const impactColors: Record<string, string> = {
  low: 'bg-gray-500/20 text-gray-400',
  medium: 'bg-cyan-500/20 text-cyan-400',
  high: 'bg-amber-500/20 text-amber-400',
  critical: 'bg-red-500/20 text-red-400',
}

const priorityColors: Record<string, string> = {
  low: 'bg-gray-500/20 text-gray-400',
  medium: 'bg-cyan-500/20 text-cyan-400',
  high: 'bg-amber-500/20 text-amber-400',
  critical: 'bg-red-500/20 text-red-400',
}

const taskStatusColors: Record<string, string> = {
  todo: 'bg-gray-500/20 text-gray-400',
  'in-progress': 'bg-cyan-500/20 text-cyan-400',
  review: 'bg-amber-500/20 text-amber-400',
  done: 'bg-emerald-500/20 text-emerald-400',
}

export function SearchView() {
  const [query, setQuery] = useState('')
  const [activeType, setActiveType] = useState('all')
  const [results, setResults] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [searchTime, setSearchTime] = useState(0)

  const handleSearch = async () => {
    if (!query.trim() && activeType === 'all') return
    setLoading(true)
    const start = Date.now()
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}&type=${activeType}`)
      const data = await res.json()
      setResults(data)
      setSearchTime(Date.now() - start)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Load initial results
    handleSearch()
    // re-run when activeType changes
  }, [activeType])

  const totalResults = results?.totalResults || 0
  const categoryCount = Object.keys(results?.results || {}).length

  return (
    <div className="flex h-full flex-col">
      {/* Search Header */}
      <div className="border-b border-[#1e1e2e] bg-[#0d0d14] p-6">
        <div className="mx-auto max-w-3xl">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Search across all company knowledge... (e.g., 'What customer complaints from the last 90 days are related to code changes?')"
                className="border-[#2a2a3e] bg-[#111118] py-3 pl-10 pr-4 text-gray-200 placeholder:text-gray-600"
              />
            </div>
            <Button
              onClick={handleSearch}
              disabled={loading}
              className="bg-emerald-500/20 px-6 text-emerald-400 hover:bg-emerald-500/30"
            >
              {loading ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent" />
              ) : (
                'Search'
              )}
            </Button>
          </div>

          {/* Filter Tabs */}
          <div className="mt-4 flex flex-wrap gap-2">
            {filterTabs.map((tab) => {
              const Icon = tab.icon
              return (
                <Button
                  key={tab.id}
                  size="sm"
                  variant={activeType === tab.id ? 'default' : 'ghost'}
                  className={`h-7 text-xs ${activeType === tab.id ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30' : 'text-gray-400 hover:text-gray-200'}`}
                  onClick={() => setActiveType(tab.id)}
                >
                  <Icon className="mr-1.5 h-3.5 w-3.5" />
                  {tab.label}
                </Button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-3xl">
          {/* Stats */}
          {results && (
            <p className="mb-4 text-xs text-gray-500">
              Found <span className="font-mono text-gray-300">{totalResults}</span> results across{' '}
              <span className="font-mono text-gray-300">{categoryCount}</span> categories in{' '}
              <span className="font-mono text-gray-300">{searchTime}ms</span>
            </p>
          )}

          {/* People Results */}
          {results?.results?.people?.length > 0 && (
            <div className="mb-6">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-gray-300">
                <Users className="h-4 w-4 text-cyan-400" />
                People
              </h3>
              <div className="space-y-2">
                {results.results.people.map((person: any) => (
                  <Card key={person.id} className="border-[#1e1e2e] bg-[#111118]">
                    <CardContent className="flex items-center gap-4 p-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-cyan-500/20">
                        <Users className="h-5 w-5 text-cyan-400" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-200">{person.name}</span>
                          <span className={`h-2 w-2 rounded-full ${person.status === 'active' ? 'bg-emerald-500' : 'bg-gray-500'}`} />
                        </div>
                        <p className="text-xs text-gray-500">{person.role} • {person.department}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-[10px] text-gray-500">Influence</p>
                        <div className="mt-1 flex items-center gap-2">
                          <Progress value={person.influenceScore} className="h-1.5 w-16 bg-[#1e1e2e]" />
                          <span className="text-xs font-mono text-gray-400">{person.influenceScore}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Projects Results */}
          {results?.results?.projects?.length > 0 && (
            <div className="mb-6">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-gray-300">
                <FolderKanban className="h-4 w-4 text-amber-400" />
                Projects
              </h3>
              <div className="space-y-2">
                {results.results.projects.map((project: any) => (
                  <Card key={project.id} className="border-[#1e1e2e] bg-[#111118]">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-200">{project.name}</span>
                        <Badge variant="outline" className={`border-[#2a2a3e] text-[10px] ${project.status === 'active' ? 'text-emerald-400' : 'text-gray-400'}`}>
                          {project.status}
                        </Badge>
                      </div>
                      {project.description && (
                        <p className="mt-1 line-clamp-1 text-xs text-gray-500">{project.description}</p>
                      )}
                      <div className="mt-2 flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-gray-500">Health</span>
                          <Progress value={project.health} className="h-1.5 w-20 bg-[#1e1e2e]" />
                          <span className="text-xs font-mono text-gray-400">{project.health}%</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-gray-500">Progress</span>
                          <Progress value={project.progress} className="h-1.5 w-20 bg-[#1e1e2e]" />
                          <span className="text-xs font-mono text-gray-400">{project.progress}%</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Decisions Results */}
          {results?.results?.decisions?.length > 0 && (
            <div className="mb-6">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-gray-300">
                <Gavel className="h-4 w-4 text-purple-400" />
                Decisions
              </h3>
              <div className="space-y-2">
                {results.results.decisions.map((decision: any) => (
                  <Card key={decision.id} className="border-[#1e1e2e] bg-[#111118]">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-200">{decision.title}</span>
                        <div className="flex gap-2">
                          <Badge variant="outline" className="border-[#2a2a3e] text-[10px] text-gray-400">
                            {decision.status}
                          </Badge>
                          <Badge className={impactColors[decision.impact] || 'bg-gray-500/20 text-gray-400'}>
                            {decision.impact}
                          </Badge>
                        </div>
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-[10px] text-gray-500">Confidence</span>
                        <Progress value={decision.confidence * 100} className="h-1.5 w-24 bg-[#1e1e2e]" />
                        <span className="text-xs font-mono text-gray-400">{Math.round(decision.confidence * 100)}%</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Events Results */}
          {results?.results?.events?.length > 0 && (
            <div className="mb-6">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-gray-300">
                <Activity className="h-4 w-4 text-emerald-400" />
                Events
              </h3>
              <div className="space-y-2">
                {results.results.events.map((event: any) => (
                  <Card key={event.id} className="border-[#1e1e2e] bg-[#111118]">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={severityColors[event.severity] || 'border-[#2a2a3e] text-gray-400'}>
                            {event.severity}
                          </Badge>
                          <span className="text-sm font-medium text-gray-200">{event.title}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {event.source && (
                            <Badge variant="outline" className="border-[#2a2a3e] text-[10px] text-gray-500">
                              {event.source}
                            </Badge>
                          )}
                          <span className="text-[10px] text-gray-500">
                            {new Date(event.createdAt).toLocaleTimeString()}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Memories Results */}
          {results?.results?.memories?.length > 0 && (
            <div className="mb-6">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-gray-300">
                <Brain className="h-4 w-4 text-rose-400" />
                Memories
              </h3>
              <div className="space-y-2">
                {results.results.memories.map((memory: any) => (
                  <Card key={memory.id} className="border-[#1e1e2e] bg-[#111118]">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-200">{memory.title}</span>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="border-[#2a2a3e] text-[10px] text-gray-400">
                            {memory.type}
                          </Badge>
                        </div>
                      </div>
                      <p className="mt-1 line-clamp-2 text-xs text-gray-500">{memory.content}</p>
                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-[10px] text-gray-500">Importance</span>
                        <Progress value={memory.importance * 100} className="h-1.5 w-20 bg-[#1e1e2e]" />
                        <span className="text-xs font-mono text-gray-400">{Math.round(memory.importance * 100)}%</span>
                      </div>
                      {memory.tags && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {memory.tags.split(',').map((tag: string) => (
                            <Badge key={tag} variant="outline" className="border-[#2a2a3e] text-[9px] text-gray-500">
                              {tag.trim()}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Tasks Results */}
          {results?.results?.tasks?.length > 0 && (
            <div className="mb-6">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-gray-300">
                <CheckCircle className="h-4 w-4 text-emerald-400" />
                Tasks
              </h3>
              <div className="space-y-2">
                {results.results.tasks.map((task: any) => (
                  <Card key={task.id} className="border-[#1e1e2e] bg-[#111118]">
                    <CardContent className="flex items-center justify-between p-4">
                      <span className="text-sm font-medium text-gray-200">{task.title}</span>
                      <div className="flex items-center gap-2">
                        <Badge className={priorityColors[task.priority] || 'bg-gray-500/20 text-gray-400'}>
                          {task.priority}
                        </Badge>
                        <Badge className={taskStatusColors[task.status] || 'bg-gray-500/20 text-gray-400'}>
                          {task.status}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Predictions Results */}
          {results?.results?.predictions?.length > 0 && (
            <div className="mb-6">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-gray-300">
                <TrendingUp className="h-4 w-4 text-amber-400" />
                Predictions
              </h3>
              <div className="space-y-2">
                {results.results.predictions.map((pred: any) => (
                  <Card key={pred.id} className="border-[#1e1e2e] bg-[#111118]">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-200">{pred.title}</span>
                        <Badge className={impactColors[pred.impact] || 'bg-gray-500/20 text-gray-400'}>
                          {pred.impact}
                        </Badge>
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-[10px] text-gray-500">Probability</span>
                        <Progress value={pred.probability * 100} className="h-1.5 w-24 bg-[#1e1e2e]" />
                        <span className="text-xs font-mono text-gray-400">{Math.round(pred.probability * 100)}%</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {!results && !loading && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Search className="mb-4 h-12 w-12 text-gray-600" />
              <p className="text-lg font-medium text-gray-400">Enterprise Search</p>
              <p className="mt-1 text-sm text-gray-600">Search across all company knowledge, people, projects, and decisions.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
