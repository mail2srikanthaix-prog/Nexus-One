import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🧹 Cleaning existing data...')

  // Disable FK checks temporarily so we can delete in any order
  await prisma.$executeRawUnsafe(`PRAGMA foreign_keys = OFF`)

  // Use raw SQL to wipe all tables and reset auto-increment
  const tableNames = [
    'QualityScore', 'Feedback', 'ConnectorWebhook', 'ConnectorSync',
    'DomainEvent', 'AgentMemory', 'AgentWorkflow',
    'ApiKey', 'TenantMember', 'Tenant',
    'AuditLog', 'ChatMessage', 'AgentAction', 'Event', 'Task',
    'Decision', 'GraphRelation', 'GraphEntity', 'Prediction',
    'Memory', 'Connector', 'Agent', 'Document', 'Person',
    'Project', 'Team', 'User', 'Organization',
  ]
  for (const table of tableNames) {
    await prisma.$executeRawUnsafe(`DELETE FROM "${table}"`)
  }
  // Reset SQLite auto-increment counters (sqlite_sequence may not exist with cuid IDs)
  try {
    for (const table of tableNames) {
      await prisma.$executeRawUnsafe(`DELETE FROM sqlite_sequence WHERE name = '${table}'`)
    }
  } catch {
    // sqlite_sequence table may not exist when using cuid() for IDs - safe to ignore
  }

  // Re-enable FK checks
  await prisma.$executeRawUnsafe(`PRAGMA foreign_keys = ON`)

  console.log('✅ Database cleaned. Seeding fresh data...\n')

  // ═══════════════════════════════════════════════════════════════════
  // Organization
  // ═══════════════════════════════════════════════════════════════════
  const org = await prisma.organization.create({
    data: {
      name: 'Nexus Corp',
      industry: 'Technology',
      size: 'Enterprise',
      revenue: 250000000,
    },
  })
  console.log(`✓ Organization: ${org.name}`)

  // ═══════════════════════════════════════════════════════════════════
  // Teams
  // ═══════════════════════════════════════════════════════════════════
  const teams = await Promise.all([
    prisma.team.create({ data: { name: 'Engineering', description: 'Core platform engineering', color: '#10b981', orgId: org.id } }),
    prisma.team.create({ data: { name: 'Product', description: 'Product strategy and management', color: '#8b5cf6', orgId: org.id } }),
    prisma.team.create({ data: { name: 'Sales', description: 'Revenue and client acquisition', color: '#f59e0b', orgId: org.id } }),
    prisma.team.create({ data: { name: 'Security', description: 'Cybersecurity and compliance', color: '#ef4444', orgId: org.id } }),
    prisma.team.create({ data: { name: 'Data Science', description: 'ML and analytics', color: '#06b6d4', orgId: org.id } }),
    prisma.team.create({ data: { name: 'Operations', description: 'Infrastructure and DevOps', color: '#f97316', orgId: org.id } }),
    prisma.team.create({ data: { name: 'Finance', description: 'Financial planning and analysis', color: '#84cc16', orgId: org.id } }),
    prisma.team.create({ data: { name: 'People', description: 'HR and talent', color: '#ec4899', orgId: org.id } }),
  ])
  console.log(`✓ Teams: ${teams.length}`)

  // ═══════════════════════════════════════════════════════════════════
  // People
  // ═══════════════════════════════════════════════════════════════════
  const people = await Promise.all([
    prisma.person.create({ data: { name: 'Sarah Chen', email: 'sarah.chen@nexuscorp.io', role: 'CEO', department: 'Executive', status: 'active', riskScore: 5, influenceScore: 98, orgId: org.id, teamId: teams[0].id } }),
    prisma.person.create({ data: { name: 'Marcus Rivera', email: 'marcus.r@nexuscorp.io', role: 'CTO', department: 'Engineering', status: 'active', riskScore: 8, influenceScore: 95, orgId: org.id, teamId: teams[0].id } }),
    prisma.person.create({ data: { name: 'Elena Volkov', email: 'elena.v@nexuscorp.io', role: 'CFO', department: 'Finance', status: 'active', riskScore: 3, influenceScore: 90, orgId: org.id, teamId: teams[6].id } }),
    prisma.person.create({ data: { name: 'James Okafor', email: 'james.o@nexuscorp.io', role: 'COO', department: 'Operations', status: 'active', riskScore: 6, influenceScore: 88, orgId: org.id, teamId: teams[5].id } }),
    prisma.person.create({ data: { name: 'Aisha Patel', email: 'aisha.p@nexuscorp.io', role: 'CRO', department: 'Sales', status: 'active', riskScore: 12, influenceScore: 85, orgId: org.id, teamId: teams[2].id } }),
    prisma.person.create({ data: { name: 'David Kim', email: 'david.k@nexuscorp.io', role: 'VP Engineering', department: 'Engineering', status: 'active', riskScore: 15, influenceScore: 82, orgId: org.id, teamId: teams[0].id } }),
    prisma.person.create({ data: { name: 'Lisa Zhang', email: 'lisa.z@nexuscorp.io', role: 'Head of Security', department: 'Security', status: 'active', riskScore: 4, influenceScore: 78, orgId: org.id, teamId: teams[3].id } }),
    prisma.person.create({ data: { name: 'Raj Mehta', email: 'raj.m@nexuscorp.io', role: 'Head of Data Science', department: 'Data Science', status: 'active', riskScore: 10, influenceScore: 80, orgId: org.id, teamId: teams[4].id } }),
    prisma.person.create({ data: { name: 'Nina Torres', email: 'nina.t@nexuscorp.io', role: 'VP Product', department: 'Product', status: 'active', riskScore: 7, influenceScore: 84, orgId: org.id, teamId: teams[1].id } }),
    prisma.person.create({ data: { name: 'Alex Petrov', email: 'alex.p@nexuscorp.io', role: 'Principal Engineer', department: 'Engineering', status: 'active', riskScore: 20, influenceScore: 75, orgId: org.id, teamId: teams[0].id } }),
    prisma.person.create({ data: { name: 'Maya Johnson', email: 'maya.j@nexuscorp.io', role: 'HR Director', department: 'People', status: 'active', riskScore: 2, influenceScore: 72, orgId: org.id, teamId: teams[7].id } }),
    prisma.person.create({ data: { name: 'Chris Anderson', email: 'chris.a@nexuscorp.io', role: 'Senior Developer', department: 'Engineering', status: 'away', riskScore: 25, influenceScore: 65, orgId: org.id, teamId: teams[0].id } }),
    prisma.person.create({ data: { name: 'Sophie Williams', email: 'sophie.w@nexuscorp.io', role: 'Sales Lead', department: 'Sales', status: 'active', riskScore: 18, influenceScore: 70, orgId: org.id, teamId: teams[2].id } }),
    prisma.person.create({ data: { name: 'Tom Bradley', email: 'tom.b@nexuscorp.io', role: 'DevOps Lead', department: 'Operations', status: 'active', riskScore: 14, influenceScore: 68, orgId: org.id, teamId: teams[5].id } }),
    prisma.person.create({ data: { name: 'Yuki Tanaka', email: 'yuki.t@nexuscorp.io', role: 'ML Engineer', department: 'Data Science', status: 'active', riskScore: 8, influenceScore: 66, orgId: org.id, teamId: teams[4].id } }),
  ])
  console.log(`✓ People: ${people.length}`)

  // ═══════════════════════════════════════════════════════════════════
  // Projects
  // ═══════════════════════════════════════════════════════════════════
  const projects = await Promise.all([
    prisma.project.create({ data: { name: 'Nexus One Platform', description: 'Enterprise AI Operating System', status: 'active', health: 92, progress: 67, riskScore: 18, budget: 5000000, budgetUsed: 3200000, startDate: new Date('2024-01-15'), endDate: new Date('2025-06-30'), orgId: org.id, teamId: teams[0].id } }),
    prisma.project.create({ data: { name: 'Quantum Security Shield', description: 'Zero-trust security implementation', status: 'active', health: 88, progress: 45, riskScore: 25, budget: 2000000, budgetUsed: 850000, startDate: new Date('2024-06-01'), endDate: new Date('2025-12-31'), orgId: org.id, teamId: teams[3].id } }),
    prisma.project.create({ data: { name: 'Revenue Intelligence Engine', description: 'AI-powered revenue optimization', status: 'active', health: 78, progress: 33, riskScore: 35, budget: 1500000, budgetUsed: 600000, startDate: new Date('2024-09-01'), endDate: new Date('2025-08-31'), orgId: org.id, teamId: teams[2].id } }),
    prisma.project.create({ data: { name: 'Knowledge Graph v2', description: 'Next-gen organizational knowledge graph', status: 'active', health: 95, progress: 52, riskScore: 12, budget: 1800000, budgetUsed: 900000, startDate: new Date('2024-04-01'), endDate: new Date('2025-04-30'), orgId: org.id, teamId: teams[4].id } }),
    prisma.project.create({ data: { name: 'Self-Healing Infrastructure', description: 'Autonomous system recovery and optimization', status: 'on-hold', health: 65, progress: 20, riskScore: 45, budget: 3000000, budgetUsed: 450000, startDate: new Date('2024-11-01'), endDate: new Date('2025-11-30'), orgId: org.id, teamId: teams[5].id } }),
    prisma.project.create({ data: { name: 'Customer 360', description: 'Unified customer intelligence platform', status: 'active', health: 82, progress: 58, riskScore: 22, budget: 1200000, budgetUsed: 680000, startDate: new Date('2024-03-15'), endDate: new Date('2025-03-15'), orgId: org.id, teamId: teams[1].id } }),
  ])
  console.log(`✓ Projects: ${projects.length}`)

  // ═══════════════════════════════════════════════════════════════════
  // Tasks
  // ═══════════════════════════════════════════════════════════════════
  const taskData = [
    { title: 'Implement graph query engine', status: 'in-progress', priority: 'high', assigneeId: people[9].id, projectId: projects[0].id },
    { title: 'Deploy mTLS across all services', status: 'in-progress', priority: 'critical', assigneeId: people[6].id, projectId: projects[1].id },
    { title: 'Build churn prediction model', status: 'todo', priority: 'high', assigneeId: people[14].id, projectId: projects[2].id },
    { title: 'Migrate graph to Neo4j 5.x', status: 'in-progress', priority: 'medium', assigneeId: people[7].id, projectId: projects[3].id },
    { title: 'Configure auto-remediation rules', status: 'blocked', priority: 'high', assigneeId: people[13].id, projectId: projects[4].id },
    { title: 'Design customer intent classifier', status: 'review', priority: 'medium', assigneeId: people[8].id, projectId: projects[5].id },
    { title: 'Set up ABAC policy engine', status: 'todo', priority: 'critical', assigneeId: people[6].id, projectId: projects[1].id },
    { title: 'Implement vector search pipeline', status: 'in-progress', priority: 'high', assigneeId: people[14].id, projectId: projects[3].id },
    { title: 'Revenue forecast Q2 model training', status: 'todo', priority: 'high', assigneeId: people[4].id, projectId: projects[2].id },
    { title: 'API gateway rate limiting', status: 'done', priority: 'medium', assigneeId: people[13].id, projectId: projects[0].id },
    { title: 'Real-time event streaming setup', status: 'in-progress', priority: 'high', assigneeId: people[5].id, projectId: projects[0].id },
    { title: 'Security audit compliance report', status: 'todo', priority: 'critical', assigneeId: people[6].id, projectId: projects[1].id },
    { title: 'Customer sentiment analysis pipeline', status: 'in-progress', priority: 'medium', assigneeId: people[14].id, projectId: projects[5].id },
    { title: 'Budget allocation optimization', status: 'review', priority: 'medium', assigneeId: people[2].id, projectId: projects[2].id },
    { title: 'Employee engagement survey analysis', status: 'todo', priority: 'low', assigneeId: people[10].id, projectId: projects[0].id },
  ]
  await Promise.all(taskData.map(t => prisma.task.create({ data: t })))
  console.log(`✓ Tasks: ${taskData.length}`)

  // ═══════════════════════════════════════════════════════════════════
  // Decisions
  // ═══════════════════════════════════════════════════════════════════
  const decisions = await Promise.all([
    prisma.decision.create({ data: { title: 'Adopt microservices architecture', description: 'Migrate from monolith to microservices', status: 'implemented', impact: 'high', confidence: 0.85, reasoning: 'Enables independent scaling and deployment', madeById: people[1].id, projectId: projects[0].id } }),
    prisma.decision.create({ data: { title: 'Implement zero-trust security model', description: 'Full zero-trust across all systems', status: 'approved', impact: 'critical', confidence: 0.92, reasoning: 'Required for SOC2 and FedRAMP compliance', madeById: people[6].id, projectId: projects[1].id } }),
    prisma.decision.create({ data: { title: 'Switch to graph database for knowledge', description: 'Move from relational to graph for entity relationships', status: 'implemented', impact: 'high', confidence: 0.78, reasoning: 'Better relationship queries and traversal', madeById: people[7].id, projectId: projects[3].id } }),
    prisma.decision.create({ data: { title: 'Launch AI boardroom feature', description: 'Virtual executive team simulation', status: 'proposed', impact: 'high', confidence: 0.65, reasoning: 'Competitive advantage and customer demand', madeById: people[0].id } }),
    prisma.decision.create({ data: { title: 'Freeze hiring in Q2', description: 'Temporary hiring freeze to manage budget', status: 'approved', impact: 'medium', confidence: 0.70, reasoning: 'Budget constraints from delayed revenue', madeById: people[2].id } }),
  ])
  console.log(`✓ Decisions: ${decisions.length}`)

  // ═══════════════════════════════════════════════════════════════════
  // Events
  // ═══════════════════════════════════════════════════════════════════
  const now = new Date()
  const eventData = [
    { type: 'deployment', title: 'Platform v3.2.1 deployed', description: 'Minor bug fixes and performance improvements', severity: 'info', source: 'kubernetes', personId: people[5].id, projectId: projects[0].id },
    { type: 'incident', title: 'API latency spike detected', description: 'P95 latency exceeded 500ms threshold', severity: 'warning', source: 'prometheus', personId: people[13].id, projectId: projects[0].id },
    { type: 'decision', title: 'Zero-trust model approved by board', description: 'Security initiative greenlit', severity: 'info', source: 'confluence', personId: people[6].id, decisionId: decisions[1].id },
    { type: 'commit', title: '47 commits merged to main', description: 'Sprint 24 completion', severity: 'info', source: 'github', personId: people[9].id, projectId: projects[0].id },
    { type: 'alert', title: 'Unusual login pattern detected', description: 'Multiple failed attempts from Eastern Europe', severity: 'critical', source: 'crowdstrike', personId: people[6].id },
    { type: 'meeting', title: 'Q1 Revenue Review', description: 'Revenue exceeded targets by 12%', severity: 'info', source: 'zoom', personId: people[4].id },
    { type: 'customer', title: 'Acme Corp renewed contract', description: '3-year renewal valued at $2.4M', severity: 'info', source: 'salesforce', personId: people[12].id },
    { type: 'alert', title: 'Budget overrun warning', description: 'Self-Healing project at 15% over budget', severity: 'warning', source: 'sap', personId: people[2].id, projectId: projects[4].id },
    { type: 'deployment', title: 'Security Shield v1.8 deployed', description: 'New threat detection rules', severity: 'info', source: 'kubernetes', personId: people[6].id, projectId: projects[1].id },
    { type: 'incident', title: 'Data pipeline failure', description: 'ETL job for customer analytics failed', severity: 'error', source: 'airflow', personId: people[7].id, projectId: projects[5].id },
    { type: 'commit', title: 'Knowledge Graph v2 beta released', description: 'Internal beta for graph engine', severity: 'info', source: 'github', personId: people[14].id, projectId: projects[3].id },
    { type: 'alert', title: 'Employee attrition risk: 3 engineers', description: 'Predictive model flagged 3 engineers at high attrition risk', severity: 'warning', source: 'workday', personId: people[10].id },
    { type: 'meeting', title: 'Architecture Review Board', description: 'Approved microservices decomposition plan', severity: 'info', source: 'teams', personId: people[1].id, decisionId: decisions[0].id },
    { type: 'customer', title: 'Customer complaint: API reliability', description: 'Beta client reported intermittent 503 errors', severity: 'warning', source: 'zendesk', projectId: projects[0].id },
    { type: 'security', title: 'CVE-2024-1234 patch applied', description: 'Critical vulnerability patched across all services', severity: 'info', source: 'snyk', personId: people[6].id },
  ]
  const events = await Promise.all(eventData.map((e, i) =>
    prisma.event.create({ data: { ...e, createdAt: new Date(now.getTime() - i * 3600000) } })
  ))
  console.log(`✓ Events: ${events.length}`)

  // ═══════════════════════════════════════════════════════════════════
  // Knowledge Graph
  // ═══════════════════════════════════════════════════════════════════
  const graphEntities = await Promise.all([
    prisma.graphEntity.create({ data: { type: 'person', name: 'Sarah Chen', properties: JSON.stringify({ role: 'CEO', department: 'Executive' }) } }),
    prisma.graphEntity.create({ data: { type: 'person', name: 'Marcus Rivera', properties: JSON.stringify({ role: 'CTO', department: 'Engineering' }) } }),
    prisma.graphEntity.create({ data: { type: 'person', name: 'Elena Volkov', properties: JSON.stringify({ role: 'CFO', department: 'Finance' }) } }),
    prisma.graphEntity.create({ data: { type: 'team', name: 'Engineering', properties: JSON.stringify({ size: 45, velocity: 'high' }) } }),
    prisma.graphEntity.create({ data: { type: 'team', name: 'Security', properties: JSON.stringify({ size: 12, velocity: 'medium' }) } }),
    prisma.graphEntity.create({ data: { type: 'project', name: 'Nexus One Platform', properties: JSON.stringify({ status: 'active', health: 92 }) } }),
    prisma.graphEntity.create({ data: { type: 'project', name: 'Quantum Security Shield', properties: JSON.stringify({ status: 'active', health: 88 }) } }),
    prisma.graphEntity.create({ data: { type: 'system', name: 'Kubernetes Cluster', properties: JSON.stringify({ provider: 'AWS', region: 'us-east-1' }) } }),
    prisma.graphEntity.create({ data: { type: 'system', name: 'Neo4j Graph DB', properties: JSON.stringify({ version: '5.x', size: '2TB' }) } }),
    prisma.graphEntity.create({ data: { type: 'customer', name: 'Acme Corp', properties: JSON.stringify({ tier: 'enterprise', arr: 2400000 }) } }),
    prisma.graphEntity.create({ data: { type: 'customer', name: 'Globex Inc', properties: JSON.stringify({ tier: 'enterprise', arr: 1800000 }) } }),
    prisma.graphEntity.create({ data: { type: 'vendor', name: 'AWS', properties: JSON.stringify({ category: 'cloud', spend: 45000 }) } }),
    prisma.graphEntity.create({ data: { type: 'decision', name: 'Adopt Microservices', properties: JSON.stringify({ impact: 'high', confidence: 0.85 }) } }),
    prisma.graphEntity.create({ data: { type: 'data_asset', name: 'Customer 360 Dataset', properties: JSON.stringify({ records: 2500000, sensitivity: 'confidential' }) } }),
  ])
  await Promise.all([
    prisma.graphRelation.create({ data: { type: 'reports_to', sourceId: graphEntities[1].id, targetId: graphEntities[0].id, weight: 0.9 } }),
    prisma.graphRelation.create({ data: { type: 'reports_to', sourceId: graphEntities[2].id, targetId: graphEntities[0].id, weight: 0.9 } }),
    prisma.graphRelation.create({ data: { type: 'leads', sourceId: graphEntities[1].id, targetId: graphEntities[3].id, weight: 0.8 } }),
    prisma.graphRelation.create({ data: { type: 'leads', sourceId: graphEntities[0].id, targetId: graphEntities[4].id, weight: 0.7 } }),
    prisma.graphRelation.create({ data: { type: 'owns', sourceId: graphEntities[3].id, targetId: graphEntities[5].id, weight: 0.9 } }),
    prisma.graphRelation.create({ data: { type: 'owns', sourceId: graphEntities[4].id, targetId: graphEntities[6].id, weight: 0.9 } }),
    prisma.graphRelation.create({ data: { type: 'depends_on', sourceId: graphEntities[5].id, targetId: graphEntities[7].id, weight: 1.0 } }),
    prisma.graphRelation.create({ data: { type: 'depends_on', sourceId: graphEntities[5].id, targetId: graphEntities[8].id, weight: 0.8 } }),
    prisma.graphRelation.create({ data: { type: 'serves', sourceId: graphEntities[5].id, targetId: graphEntities[9].id, weight: 0.7 } }),
    prisma.graphRelation.create({ data: { type: 'serves', sourceId: graphEntities[5].id, targetId: graphEntities[10].id, weight: 0.6 } }),
    prisma.graphRelation.create({ data: { type: 'supplies', sourceId: graphEntities[11].id, targetId: graphEntities[7].id, weight: 0.9 } }),
    prisma.graphRelation.create({ data: { type: 'influenced', sourceId: graphEntities[12].id, targetId: graphEntities[5].id, weight: 0.7 } }),
    prisma.graphRelation.create({ data: { type: 'contains', sourceId: graphEntities[5].id, targetId: graphEntities[13].id, weight: 0.6 } }),
    prisma.graphRelation.create({ data: { type: 'authored', sourceId: graphEntities[1].id, targetId: graphEntities[12].id, weight: 0.8 } }),
    prisma.graphRelation.create({ data: { type: 'accesses', sourceId: graphEntities[3].id, targetId: graphEntities[13].id, weight: 0.5 } }),
  ])
  console.log(`✓ Graph: ${graphEntities.length} entities, 15 relations`)

  // ═══════════════════════════════════════════════════════════════════
  // AI Agents
  // ═══════════════════════════════════════════════════════════════════
  const agents = await Promise.all([
    prisma.agent.create({ data: { name: 'CEO Agent', type: 'ceo', description: 'Strategic planning and executive decision support', status: 'thinking', capabilities: JSON.stringify(['strategic_planning', 'market_analysis', 'executive_briefing']), lastAction: 'Analyzing Q1 performance metrics' } }),
    prisma.agent.create({ data: { name: 'CTO Agent', type: 'cto', description: 'Technology strategy and architecture decisions', status: 'executing', capabilities: JSON.stringify(['architecture_review', 'tech_debt_analysis', 'innovation_scouting']), lastAction: 'Reviewing microservices migration progress' } }),
    prisma.agent.create({ data: { name: 'CFO Agent', type: 'cfo', description: 'Financial planning and risk management', status: 'reporting', capabilities: JSON.stringify(['budget_optimization', 'revenue_forecasting', 'cost_analysis']), lastAction: 'Generating Q2 budget forecast' } }),
    prisma.agent.create({ data: { name: 'COO Agent', type: 'coo', description: 'Operations optimization and efficiency', status: 'idle', capabilities: JSON.stringify(['process_optimization', 'resource_allocation', 'incident_management']), lastAction: 'Completed operations review' } }),
    prisma.agent.create({ data: { name: 'CRO Agent', type: 'cro', description: 'Revenue optimization and customer intelligence', status: 'thinking', capabilities: JSON.stringify(['churn_prediction', 'upsell_detection', 'pipeline_analysis']), lastAction: 'Analyzing customer health scores' } }),
    prisma.agent.create({ data: { name: 'Security Agent', type: 'security', description: 'Cybersecurity monitoring and threat detection', status: 'executing', capabilities: JSON.stringify(['threat_detection', 'vulnerability_scanning', 'compliance_monitoring']), lastAction: 'Scanning for CVE-2024-1234 exposure' } }),
    prisma.agent.create({ data: { name: 'Knowledge Agent', type: 'knowledge', description: 'Enterprise search and knowledge management', status: 'idle', capabilities: JSON.stringify(['semantic_search', 'graph_traversal', 'context_retrieval']), lastAction: 'Indexed 1,247 new documents' } }),
    prisma.agent.create({ data: { name: 'Workflow Agent', type: 'workflow', description: 'Process automation and orchestration', status: 'executing', capabilities: JSON.stringify(['task_automation', 'approval_routing', 'escalation_management']), lastAction: 'Auto-assigned 12 incident tickets' } }),
    prisma.agent.create({ data: { name: 'HR Agent', type: 'hr', description: 'People operations and talent intelligence', status: 'thinking', capabilities: JSON.stringify(['attrition_prediction', 'engagement_analysis', 'talent_matching']), lastAction: 'Flagged 3 attrition risks' } }),
    prisma.agent.create({ data: { name: 'Monitoring Agent', type: 'monitoring', description: 'System observability and anomaly detection', status: 'executing', capabilities: JSON.stringify(['anomaly_detection', 'performance_monitoring', 'alert_management']), lastAction: 'Detected API latency anomaly' } }),
  ])
  console.log(`✓ Agents: ${agents.length}`)

  // ═══════════════════════════════════════════════════════════════════
  // Agent Actions
  // ═══════════════════════════════════════════════════════════════════
  const actionData = [
    { agentId: agents[0].id, type: 'reasoning', title: 'Q1 Strategic Assessment', description: 'Analyzing quarterly performance against OKRs', result: 'Q1 performance exceeds targets by 8%. Recommend increasing R&D investment.', status: 'completed', confidence: 0.89, evidence: JSON.stringify(['revenue_data', 'okr_tracking', 'market_benchmarks']) },
    { agentId: agents[1].id, type: 'execution', title: 'Architecture Review Sprint 24', description: 'Reviewing code changes for architectural compliance', result: '3 violations detected. Auto-created remediation tasks.', status: 'completed', confidence: 0.92, evidence: JSON.stringify(['code_review', 'dependency_analysis']) },
    { agentId: agents[5].id, type: 'alert', title: 'CVE-2024-1234 Detection', description: 'Critical vulnerability found in production dependencies', result: 'Patched 4/5 affected services. 1 requires manual intervention.', status: 'completed', confidence: 0.98, evidence: JSON.stringify(['snyk_scan', 'dependency_tree']) },
    { agentId: agents[8].id, type: 'recommendation', title: 'Attrition Risk Alert', description: '3 engineers showing high attrition signals', result: 'Recommended: retention packages for Alex P., Chris A., and Jordan L.', status: 'pending', confidence: 0.82, evidence: JSON.stringify(['engagement_scores', 'market_salary_data', 'tenure_analysis']) },
    { agentId: agents[9].id, type: 'observation', title: 'API Latency Anomaly', description: 'P95 latency spike detected in us-east-1', result: 'Root cause: connection pool exhaustion. Auto-remediation triggered.', status: 'completed', confidence: 0.95, evidence: JSON.stringify(['prometheus_metrics', 'trace_analysis']) },
    { agentId: agents[2].id, type: 'recommendation', title: 'Budget Reallocation Proposal', description: 'Self-Healing project over budget by 15%', result: 'Recommend reducing scope or increasing allocation by $200K', status: 'pending', confidence: 0.76, evidence: JSON.stringify(['budget_tracking', 'burn_rate_analysis']) },
  ]
  await Promise.all(actionData.map(a => prisma.agentAction.create({ data: a })))
  console.log(`✓ Agent Actions: ${actionData.length}`)

  // ═══════════════════════════════════════════════════════════════════
  // Memories
  // ═══════════════════════════════════════════════════════════════════
  const memoryData = [
    { type: 'strategic', title: '2024 Strategic Pivot: AI-First', content: 'Board decided to pivot company strategy to AI-first approach. All product lines to integrate AI capabilities by Q3 2025. Key driver: competitive pressure from Palantir and Databricks.', source: 'board_meeting', importance: 0.95, tags: 'strategy,ai,board,2024' },
    { type: 'episodic', title: 'Q4 2023 Security Incident', content: 'Unauthorized access detected via compromised service account. Contained within 2 hours. Root cause: leaked API key in public repo. Led to implementation of secret scanning in CI/CD.', source: 'incident_report', importance: 0.9, tags: 'security,incident,postmortem' },
    { type: 'procedural', title: 'Incident Response Protocol v3', content: '1) Detect via monitoring agent 2) Auto-triage and severity assignment 3) Page on-call engineer for P1/P2 4) Auto-remediation for known patterns 5) Human approval for critical changes 6) Post-incident review within 24h', source: 'runbook', importance: 0.85, tags: 'process,incident,response,protocol' },
    { type: 'operational', title: 'Kubernetes Cluster Scaling Policy', content: 'Auto-scale between 50-200 nodes based on CPU/memory thresholds. Scale-up trigger: 70% utilization for 5 min. Scale-down trigger: 30% utilization for 15 min. Cost optimization: use spot instances for batch jobs.', source: 'configuration', importance: 0.7, tags: 'infrastructure,k8s,scaling,cost' },
    { type: 'semantic', title: 'Customer Churn Indicators', content: 'Primary indicators: 1) Decreased API usage >30% over 30 days 2) Support ticket escalation frequency 3) Key contact departure 4) Contract renewal >90 days without engagement 5) Competitor evaluation detected via intent signals.', source: 'data_analysis', importance: 0.88, tags: 'customers,churn,prediction,signals' },
    { type: 'strategic', title: 'Acme Corp Relationship Context', content: 'Largest enterprise customer ($2.4M ARR). Key sponsor: VP Engineering Jamie Foster. Recent concerns about API reliability. Renewal due Q3 2025. Critical to address latency issues before renewal conversation.', source: 'salesforce', importance: 0.92, tags: 'customer,acme,revenue,renewal' },
    { type: 'episodic', title: 'Microservices Migration Decision', content: 'CTO Marcus Rivera proposed microservices architecture in March 2024. Board approved in April. Key reasoning: independent scaling, faster deployments, technology flexibility. Expected completion: Q2 2025. Currently 45% migrated.', source: 'decision_record', importance: 0.85, tags: 'architecture,microservices,decision,migration' },
    { type: 'operational', title: 'Deployment Window Policy', content: 'Production deployments: Tuesday-Thursday 10am-4pm EST. No Friday deployments. Emergency hotfixes require CTO approval. Blue-green deployment for zero-downtime. Canary releases for high-risk changes.', source: 'policy', importance: 0.75, tags: 'deployment,policy,production,release' },
  ]
  await Promise.all(memoryData.map(m => prisma.memory.create({ data: m })))
  console.log(`✓ Memories: ${memoryData.length}`)

  // ═══════════════════════════════════════════════════════════════════
  // Predictions
  // ═══════════════════════════════════════════════════════════════════
  const predictionData = [
    { type: 'delay', title: 'Self-Healing Infrastructure Delay', description: 'Project at risk of missing Q3 deadline due to team capacity constraints', probability: 0.72, impact: 'high', timeframe: '90 days', status: 'active', evidence: JSON.stringify(['sprint_velocity_decline', 'team_capacity_analysis', 'dependency_delays']) },
    { type: 'churn', title: 'Globex Inc Churn Risk', description: 'Key technical sponsor left. Engagement scores declining.', probability: 0.65, impact: 'high', timeframe: '60 days', status: 'active', evidence: JSON.stringify(['contact_departure', 'usage_decline', 'support_ticket_trend']) },
    { type: 'incident', title: 'Database Capacity Threshold', description: 'Neo4j projected to hit storage limit within 45 days', probability: 0.58, impact: 'critical', timeframe: '45 days', status: 'active', evidence: JSON.stringify(['growth_rate', 'current_utilization', 'capacity_forecast']) },
    { type: 'attrition', title: 'Engineering Attrition Spike', description: '3 senior engineers showing high departure signals', probability: 0.55, impact: 'high', timeframe: '120 days', status: 'active', evidence: JSON.stringify(['engagement_survey', 'market_salary_delta', 'tenure_analysis']) },
    { type: 'budget', title: 'Q3 Budget Overrun', description: 'Cloud infrastructure costs trending 20% above forecast', probability: 0.68, impact: 'medium', timeframe: '90 days', status: 'active', evidence: JSON.stringify(['spend_trend', 'usage_growth', 'reserved_instance_coverage']) },
    { type: 'risk', title: 'Compliance Gap: SOC2 Audit', description: 'Missing evidence for 3 control objectives', probability: 0.45, impact: 'critical', timeframe: '30 days', status: 'active', evidence: JSON.stringify(['audit_readiness_score', 'control_coverage', 'evidence_collection_status']) },
  ]
  await Promise.all(predictionData.map(p => prisma.prediction.create({ data: p })))
  console.log(`✓ Predictions: ${predictionData.length}`)

  // ═══════════════════════════════════════════════════════════════════
  // Connectors
  // ═══════════════════════════════════════════════════════════════════
  const connectorData = [
    { name: 'GitHub', type: 'github', category: 'development', status: 'connected', lastSync: new Date(now.getTime() - 300000), recordCount: 15847 },
    { name: 'Slack', type: 'slack', category: 'communication', status: 'connected', lastSync: new Date(now.getTime() - 60000), recordCount: 234567 },
    { name: 'Jira', type: 'jira', category: 'project', status: 'connected', lastSync: new Date(now.getTime() - 180000), recordCount: 4521 },
    { name: 'Salesforce', type: 'salesforce', category: 'crm', status: 'syncing', lastSync: new Date(now.getTime() - 120000), recordCount: 8934 },
    { name: 'AWS CloudWatch', type: 'aws', category: 'cloud', status: 'connected', lastSync: new Date(now.getTime() - 30000), recordCount: 1245678 },
    { name: 'Zoom', type: 'zoom', category: 'communication', status: 'connected', lastSync: new Date(now.getTime() - 600000), recordCount: 3456 },
    { name: 'Confluence', type: 'confluence', category: 'knowledge', status: 'connected', lastSync: new Date(now.getTime() - 900000), recordCount: 7823 },
    { name: 'Snowflake', type: 'snowflake', category: 'data', status: 'connected', lastSync: new Date(now.getTime() - 240000), recordCount: 567890 },
    { name: 'Workday', type: 'workday', category: 'hr', status: 'connected', lastSync: new Date(now.getTime() - 3600000), recordCount: 1234 },
    { name: 'Snyk', type: 'snyk', category: 'security', status: 'connected', lastSync: new Date(now.getTime() - 150000), recordCount: 3456 },
    { name: 'PagerDuty', type: 'pagerduty', category: 'operations', status: 'error', lastSync: new Date(now.getTime() - 7200000), recordCount: 890 },
    { name: 'Google Workspace', type: 'google', category: 'communication', status: 'connected', lastSync: new Date(now.getTime() - 420000), recordCount: 45678 },
  ]
  const connectors = await Promise.all(connectorData.map(c => prisma.connector.create({ data: { ...c, orgId: org.id } })))
  console.log(`✓ Connectors: ${connectorData.length}`)

  // ═══════════════════════════════════════════════════════════════════
  // Audit Logs
  // ═══════════════════════════════════════════════════════════════════
  const auditData = [
    { action: 'user.login', actor: 'sarah.chen@nexuscorp.io', resource: 'dashboard', severity: 'info', ipAddress: '10.0.1.42' },
    { action: 'agent.execute', actor: 'system:security-agent', resource: 'vulnerability_scan', details: 'Automated vulnerability scan completed', severity: 'info' },
    { action: 'data.export', actor: 'marcus.r@nexuscorp.io', resource: 'engineering_metrics', details: 'Exported team velocity report', severity: 'warning', ipAddress: '10.0.2.18' },
    { action: 'config.change', actor: 'system:workflow-agent', resource: 'k8s_hpa_config', details: 'Auto-scaled cluster from 75 to 82 nodes', severity: 'info' },
    { action: 'access.denied', actor: 'unknown', resource: 'admin_panel', details: 'Failed login attempt from external IP', severity: 'critical', ipAddress: '185.234.72.x' },
    { action: 'decision.approve', actor: 'elena.v@nexuscorp.io', resource: 'budget_reallocation', details: 'Approved Q2 budget adjustments', severity: 'info', ipAddress: '10.0.3.5' },
  ]
  await Promise.all(auditData.map(a => prisma.auditLog.create({ data: a })))
  console.log(`✓ Audit Logs: ${auditData.length}`)

  // ═══════════════════════════════════════════════════════════════════
  // Demo User (upsert for idempotency)
  // ═══════════════════════════════════════════════════════════════════
  const bcrypt = await import('bcryptjs')
  const passwordHash = await bcrypt.hash('nexus123', 12)
  const demoUser = await prisma.user.upsert({
    where: { email: 'admin@nexuscorp.io' },
    update: { name: 'Sarah Chen', passwordHash, role: 'admin', department: 'Executive' },
    create: { name: 'Sarah Chen', email: 'admin@nexuscorp.io', passwordHash, role: 'admin', department: 'Executive' },
  })
  console.log(`✓ Demo User: ${demoUser.email}`)

  // ═══════════════════════════════════════════════════════════════════
  // Tenant (Multi-Tenancy)
  // ═══════════════════════════════════════════════════════════════════
  const tenant = await prisma.tenant.create({
    data: {
      name: 'Nexus Corp',
      slug: 'nexus-corp',
      domain: 'nexuscorp.io',
      plan: 'enterprise',
      status: 'active',
      maxUsers: 500,
      maxAgents: 50,
      maxStorage: BigInt(107374182400), // 100GB
      settings: JSON.stringify({
        features: ['boardroom', 'predictions', 'knowledge_graph', 'security'],
        ssoEnabled: true,
        auditRetentionDays: 365,
      }),
    },
  })
  console.log(`✓ Tenant: ${tenant.name} (${tenant.slug})`)

  // ═══════════════════════════════════════════════════════════════════
  // Tenant Member
  // ═══════════════════════════════════════════════════════════════════
  await prisma.tenantMember.create({
    data: {
      tenantId: tenant.id,
      userId: demoUser.id,
      role: 'super_admin',
      status: 'active',
    },
  })
  console.log(`✓ Tenant Member: ${demoUser.email} → super_admin`)

  // ═══════════════════════════════════════════════════════════════════
  // API Keys
  // ═══════════════════════════════════════════════════════════════════
  const apiKeyHash = await bcrypt.hash('nx_live_demo_key_sk_12345678', 12)
  const apiKeyData = [
    {
      name: 'Production API Key',
      keyHash: apiKeyHash,
      keyPrefix: 'nx_live_',
      tenantId: tenant.id,
      userId: demoUser.id,
      permissions: JSON.stringify(['read:all', 'write:all', 'admin:tenant']),
      expiresAt: new Date(now.getTime() + 365 * 24 * 3600000), // 1 year
      status: 'active',
    },
    {
      name: 'Webhook Integration Key',
      keyHash: await bcrypt.hash('nx_live_wh_sk_87654321', 12),
      keyPrefix: 'nx_live_',
      tenantId: tenant.id,
      permissions: JSON.stringify(['read:events', 'write:webhooks']),
      expiresAt: new Date(now.getTime() + 180 * 24 * 3600000), // 6 months
      status: 'active',
    },
    {
      name: 'Read-Only Analytics Key',
      keyHash: await bcrypt.hash('nx_test_ro_sk_11223344', 12),
      keyPrefix: 'nx_test_',
      tenantId: tenant.id,
      permissions: JSON.stringify(['read:dashboard', 'read:agents', 'read:predictions']),
      status: 'active',
    },
  ]
  await Promise.all(apiKeyData.map(k => prisma.apiKey.create({ data: k })))
  console.log(`✓ API Keys: ${apiKeyData.length}`)

  // ═══════════════════════════════════════════════════════════════════
  // Domain Events
  // ═══════════════════════════════════════════════════════════════════
  const domainEventData = [
    { eventType: 'project.created', aggregateId: projects[0].id, aggregateType: 'Project', version: 1, payload: JSON.stringify({ name: 'Nexus One Platform', teamId: teams[0].id }), metadata: JSON.stringify({ correlationId: 'seed-001' }), actorId: demoUser.id, actorType: 'user', tenantId: tenant.id },
    { eventType: 'project.created', aggregateId: projects[1].id, aggregateType: 'Project', version: 1, payload: JSON.stringify({ name: 'Quantum Security Shield', teamId: teams[3].id }), metadata: JSON.stringify({ correlationId: 'seed-002' }), actorId: demoUser.id, actorType: 'user', tenantId: tenant.id },
    { eventType: 'agent.action', aggregateId: agents[5].id, aggregateType: 'Agent', version: 1, payload: JSON.stringify({ action: 'vulnerability_scan', result: 'CVE-2024-1234 detected' }), actorId: agents[5].id, actorType: 'agent', tenantId: tenant.id },
    { eventType: 'task.completed', aggregateId: actionData[4] ? 'task-api-gateway' : 'task-1', aggregateType: 'Task', version: 1, payload: JSON.stringify({ title: 'API gateway rate limiting', completedBy: people[13].id }), actorId: people[13].id, actorType: 'user', tenantId: tenant.id },
    { eventType: 'decision.approved', aggregateId: decisions[1].id, aggregateType: 'Decision', version: 1, payload: JSON.stringify({ title: 'Implement zero-trust security model', approvedBy: people[6].id }), metadata: JSON.stringify({ correlationId: 'decision-002' }), actorId: people[6].id, actorType: 'user', tenantId: tenant.id },
    { eventType: 'connector.sync_completed', aggregateId: connectors[0].id, aggregateType: 'Connector', version: 1, payload: JSON.stringify({ name: 'GitHub', recordsSynced: 15847 }), actorType: 'system', tenantId: tenant.id },
    { eventType: 'agent.workflow_started', aggregateId: agents[7].id, aggregateType: 'Agent', version: 1, payload: JSON.stringify({ type: 'sequential', steps: 3 }), actorId: agents[7].id, actorType: 'agent', tenantId: tenant.id },
    { eventType: 'prediction.created', aggregateId: 'pred-delay-001', aggregateType: 'Prediction', version: 1, payload: JSON.stringify({ type: 'delay', title: 'Self-Healing Infrastructure Delay', probability: 0.72 }), actorType: 'system', tenantId: tenant.id },
  ]
  await Promise.all(domainEventData.map((e, i) =>
    prisma.domainEvent.create({ data: { ...e, createdAt: new Date(now.getTime() - i * 1800000) } })
  ))
  console.log(`✓ Domain Events: ${domainEventData.length}`)

  // ═══════════════════════════════════════════════════════════════════
  // Feedback
  // ═══════════════════════════════════════════════════════════════════
  const feedbackData = [
    { targetType: 'agent_response', targetId: agents[0].id, userId: demoUser.id, rating: 5, comment: 'CEO Agent provided excellent strategic insights for Q1 review', tags: JSON.stringify(['strategy', 'insightful']) },
    { targetType: 'agent_response', targetId: agents[5].id, userId: demoUser.id, rating: 4, comment: 'Security Agent detected vulnerability quickly but remediation was partial', tags: JSON.stringify(['security', 'fast-response']) },
    { targetType: 'prediction', targetId: 'pred-delay-001', userId: demoUser.id, rating: 3, comment: 'Delay prediction was somewhat accurate but timeframe was off', tags: JSON.stringify(['prediction', 'delay']) },
    { targetType: 'recommendation', targetId: agents[2].id, rating: 4, comment: 'Budget reallocation proposal was well-reasoned and data-backed', tags: JSON.stringify(['finance', 'budget']) },
    { targetType: 'agent_response', targetId: agents[8].id, rating: 5, comment: 'HR Agent accurately identified attrition risks with actionable recommendations', tags: JSON.stringify(['hr', 'attrition', 'actionable']) },
    { targetType: 'prediction', targetId: 'pred-churn-001', rating: 2, comment: 'Churn prediction had false positives, needs refinement', tags: JSON.stringify(['prediction', 'churn', 'false-positive']) },
  ]
  await Promise.all(feedbackData.map(f => prisma.feedback.create({ data: f })))
  console.log(`✓ Feedback: ${feedbackData.length}`)

  // ═══════════════════════════════════════════════════════════════════
  // Agent Workflows
  // ═══════════════════════════════════════════════════════════════════
  const workflowData = [
    {
      agentId: agents[7].id, type: 'sequential', status: 'completed',
      definition: JSON.stringify({ steps: ['detect_incident', 'classify_severity', 'route_to_team'] }),
      context: JSON.stringify({ incidentId: 'INC-2024-089', severity: 'P2' }),
      result: JSON.stringify({ classified: true, routed: true, team: 'platform-engineering' }),
      startedAt: new Date(now.getTime() - 3600000),
      completedAt: new Date(now.getTime() - 3500000),
    },
    {
      agentId: agents[5].id, type: 'parallel', status: 'running',
      definition: JSON.stringify({ steps: ['scan_dependencies', 'check_compliance', 'verify_patches'] }),
      context: JSON.stringify({ cveId: 'CVE-2024-1234', affectedServices: 5 }),
    },
    {
      agentId: agents[0].id, type: 'approval', status: 'pending',
      definition: JSON.stringify({ steps: ['generate_proposal', 'require_approval', 'execute_plan'] }),
      context: JSON.stringify({ proposalType: 'budget_reallocation', amount: 200000 }),
    },
  ]
  await Promise.all(workflowData.map(w => prisma.agentWorkflow.create({ data: w })))
  console.log(`✓ Agent Workflows: ${workflowData.length}`)

  // ═══════════════════════════════════════════════════════════════════
  // Agent Memories
  // ═══════════════════════════════════════════════════════════════════
  const agentMemoryData = [
    { agentId: agents[0].id, type: 'long_term', category: 'strategy', content: 'Company pivoted to AI-first strategy in 2024. All product lines must integrate AI by Q3 2025.', importance: 0.95, accessCount: 24 },
    { agentId: agents[5].id, type: 'episodic', category: 'security', content: 'CVE-2024-1234 was a critical log4j-style vulnerability. Patched 4/5 services within SLA.', importance: 0.9, accessCount: 12 },
    { agentId: agents[7].id, type: 'procedural', category: 'workflow', content: 'Incident routing procedure: P1→CTO+oncall, P2→team-lead, P3→auto-assign. Auto-remediation for known patterns.', importance: 0.85, accessCount: 45 },
    { agentId: agents[9].id, type: 'short_term', category: 'monitoring', content: 'Current API latency baseline: P50=120ms, P95=340ms, P99=890ms. Anomaly threshold: P95>500ms.', importance: 0.7, accessCount: 156 },
    { agentId: agents[2].id, type: 'long_term', category: 'finance', content: 'Q2 budget constraints require 15% reduction in discretionary spending. R&D budget protected.', importance: 0.88, accessCount: 8 },
  ]
  await Promise.all(agentMemoryData.map(m => prisma.agentMemory.create({ data: m })))
  console.log(`✓ Agent Memories: ${agentMemoryData.length}`)

  // ═══════════════════════════════════════════════════════════════════
  // Connector Syncs
  // ═══════════════════════════════════════════════════════════════════
  const syncData = [
    { connectorId: connectors[0].id, status: 'completed', recordsSynced: 1247, recordsFailed: 3, startedAt: new Date(now.getTime() - 300000), completedAt: new Date(now.getTime() - 280000) },
    { connectorId: connectors[3].id, status: 'running', recordsSynced: 5421, recordsFailed: 12, startedAt: new Date(now.getTime() - 120000) },
    { connectorId: connectors[10].id, status: 'failed', recordsSynced: 0, recordsFailed: 0, error: 'Connection timeout after 30s. PagerDuty API unreachable.', startedAt: new Date(now.getTime() - 7200000) },
  ]
  await Promise.all(syncData.map(s => prisma.connectorSync.create({ data: s })))
  console.log(`✓ Connector Syncs: ${syncData.length}`)

  // ═══════════════════════════════════════════════════════════════════
  // Connector Webhooks
  // ═══════════════════════════════════════════════════════════════════
  const webhookData = [
    { connectorId: connectors[0].id, eventType: 'push', payload: JSON.stringify({ ref: 'refs/heads/main', commits: 3, repository: 'nexus-platform' }), signature: 'sha256=abc123def456', status: 'processed', attempts: 1, lastAttemptAt: new Date(now.getTime() - 300000) },
    { connectorId: connectors[1].id, eventType: 'message', payload: JSON.stringify({ channel: '#incidents', user: 'monitoring-bot', text: 'P2: API latency spike detected' }), status: 'processed', attempts: 1, lastAttemptAt: new Date(now.getTime() - 60000) },
    { connectorId: connectors[10].id, eventType: 'incident.trigger', payload: JSON.stringify({ incidentId: 'PD-2024-456', severity: 'high', service: 'api-gateway' }), status: 'pending', attempts: 2, lastAttemptAt: new Date(now.getTime() - 300000) },
  ]
  await Promise.all(webhookData.map(w => prisma.connectorWebhook.create({ data: w })))
  console.log(`✓ Connector Webhooks: ${webhookData.length}`)

  console.log('\n═══════════════════════════════════════')
  console.log('  🎉 Seed completed successfully!')
  console.log('═══════════════════════════════════════')
  console.log(`  1 organization`)
  console.log(`  ${teams.length} teams`)
  console.log(`  ${people.length} people`)
  console.log(`  ${projects.length} projects`)
  console.log(`  ${taskData.length} tasks`)
  console.log(`  ${decisions.length} decisions`)
  console.log(`  ${events.length} events`)
  console.log(`  ${graphEntities.length} graph entities + 15 relations`)
  console.log(`  ${agents.length} AI agents`)
  console.log(`  ${actionData.length} agent actions`)
  console.log(`  ${memoryData.length} memories`)
  console.log(`  ${predictionData.length} predictions`)
  console.log(`  ${connectorData.length} connectors`)
  console.log(`  ${auditData.length} audit logs`)
  console.log(`  1 demo user`)
  console.log(`  1 tenant`)
  console.log(`  ${apiKeyData.length} API keys`)
  console.log(`  ${domainEventData.length} domain events`)
  console.log(`  ${feedbackData.length} feedback entries`)
  console.log(`  ${workflowData.length} agent workflows`)
  console.log(`  ${agentMemoryData.length} agent memories`)
  console.log(`  ${syncData.length} connector syncs`)
  console.log(`  ${webhookData.length} connector webhooks`)
  console.log('───────────────────────────────────────')
  console.log('  Login: admin@nexuscorp.io / nexus123')
  console.log('  Tenant: nexus-corp (enterprise)')
  console.log('═══════════════════════════════════════')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
