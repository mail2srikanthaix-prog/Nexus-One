import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Create Organization
  const org = await prisma.organization.create({
    data: {
      name: 'Nexus Corp',
      industry: 'Technology',
      size: 'Enterprise',
      revenue: 250000000,
    },
  })

  // Create Teams
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

  // Create People
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

  // Create Projects
  const projects = await Promise.all([
    prisma.project.create({ data: { name: 'Nexus One Platform', description: 'Enterprise AI Operating System', status: 'active', health: 92, progress: 67, riskScore: 18, budget: 5000000, budgetUsed: 3200000, startDate: new Date('2024-01-15'), endDate: new Date('2025-06-30'), orgId: org.id, teamId: teams[0].id } }),
    prisma.project.create({ data: { name: 'Quantum Security Shield', description: 'Zero-trust security implementation', status: 'active', health: 88, progress: 45, riskScore: 25, budget: 2000000, budgetUsed: 850000, startDate: new Date('2024-06-01'), endDate: new Date('2025-12-31'), orgId: org.id, teamId: teams[3].id } }),
    prisma.project.create({ data: { name: 'Revenue Intelligence Engine', description: 'AI-powered revenue optimization', status: 'active', health: 78, progress: 33, riskScore: 35, budget: 1500000, budgetUsed: 600000, startDate: new Date('2024-09-01'), endDate: new Date('2025-08-31'), orgId: org.id, teamId: teams[2].id } }),
    prisma.project.create({ data: { name: 'Knowledge Graph v2', description: 'Next-gen organizational knowledge graph', status: 'active', health: 95, progress: 52, riskScore: 12, budget: 1800000, budgetUsed: 900000, startDate: new Date('2024-04-01'), endDate: new Date('2025-04-30'), orgId: org.id, teamId: teams[4].id } }),
    prisma.project.create({ data: { name: 'Self-Healing Infrastructure', description: 'Autonomous system recovery and optimization', status: 'on-hold', health: 65, progress: 20, riskScore: 45, budget: 3000000, budgetUsed: 450000, startDate: new Date('2024-11-01'), endDate: new Date('2025-11-30'), orgId: org.id, teamId: teams[5].id } }),
    prisma.project.create({ data: { name: 'Customer 360', description: 'Unified customer intelligence platform', status: 'active', health: 82, progress: 58, riskScore: 22, budget: 1200000, budgetUsed: 680000, startDate: new Date('2024-03-15'), endDate: new Date('2025-03-15'), orgId: org.id, teamId: teams[1].id } }),
  ])

  // Create Tasks
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

  // Create Decisions
  const decisions = await Promise.all([
    prisma.decision.create({ data: { title: 'Adopt microservices architecture', description: 'Migrate from monolith to microservices', status: 'implemented', impact: 'high', confidence: 0.85, reasoning: 'Enables independent scaling and deployment', madeById: people[1].id, projectId: projects[0].id } }),
    prisma.decision.create({ data: { title: 'Implement zero-trust security model', description: 'Full zero-trust across all systems', status: 'approved', impact: 'critical', confidence: 0.92, reasoning: 'Required for SOC2 and FedRAMP compliance', madeById: people[6].id, projectId: projects[1].id } }),
    prisma.decision.create({ data: { title: 'Switch to graph database for knowledge', description: 'Move from relational to graph for entity relationships', status: 'implemented', impact: 'high', confidence: 0.78, reasoning: 'Better relationship queries and traversal', madeById: people[7].id, projectId: projects[3].id } }),
    prisma.decision.create({ data: { title: 'Launch AI boardroom feature', description: 'Virtual executive team simulation', status: 'proposed', impact: 'high', confidence: 0.65, reasoning: 'Competitive advantage and customer demand', madeById: people[0].id } }),
    prisma.decision.create({ data: { title: 'Freeze hiring in Q2', description: 'Temporary hiring freeze to manage budget', status: 'approved', impact: 'medium', confidence: 0.70, reasoning: 'Budget constraints from delayed revenue', madeById: people[2].id } }),
  ])

  // Create Events (recent)
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

  // Create Graph Entities
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

  // Create Graph Relations
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

  // Create Agents
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

  // Create Agent Actions
  const actionData = [
    { agentId: agents[0].id, type: 'reasoning', title: 'Q1 Strategic Assessment', description: 'Analyzing quarterly performance against OKRs', result: 'Q1 performance exceeds targets by 8%. Recommend increasing R&D investment.', status: 'completed', confidence: 0.89, evidence: JSON.stringify(['revenue_data', 'okr_tracking', 'market_benchmarks']) },
    { agentId: agents[1].id, type: 'execution', title: 'Architecture Review Sprint 24', description: 'Reviewing code changes for architectural compliance', result: '3 violations detected. Auto-created remediation tasks.', status: 'completed', confidence: 0.92, evidence: JSON.stringify(['code_review', 'dependency_analysis']) },
    { agentId: agents[5].id, type: 'alert', title: 'CVE-2024-1234 Detection', description: 'Critical vulnerability found in production dependencies', result: 'Patched 4/5 affected services. 1 requires manual intervention.', status: 'completed', confidence: 0.98, evidence: JSON.stringify(['snyk_scan', 'dependency_tree']) },
    { agentId: agents[8].id, type: 'recommendation', title: 'Attrition Risk Alert', description: '3 engineers showing high attrition signals', result: 'Recommended: retention packages for Alex P., Chris A., and Jordan L.', status: 'pending', confidence: 0.82, evidence: JSON.stringify(['engagement_scores', 'market_salary_data', 'tenure_analysis']) },
    { agentId: agents[9].id, type: 'observation', title: 'API Latency Anomaly', description: 'P95 latency spike detected in us-east-1', result: 'Root cause: connection pool exhaustion. Auto-remediation triggered.', status: 'completed', confidence: 0.95, evidence: JSON.stringify(['prometheus_metrics', 'trace_analysis']) },
    { agentId: agents[2].id, type: 'recommendation', title: 'Budget Reallocation Proposal', description: 'Self-Healing project over budget by 15%', result: 'Recommend reducing scope or increasing allocation by $200K', status: 'pending', confidence: 0.76, evidence: JSON.stringify(['budget_tracking', 'burn_rate_analysis']) },
  ]
  await Promise.all(actionData.map(a => prisma.agentAction.create({ data: a })))

  // Create Memories
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

  // Create Predictions
  const predictionData = [
    { type: 'delay', title: 'Self-Healing Infrastructure Delay', description: 'Project at risk of missing Q3 deadline due to team capacity constraints', probability: 0.72, impact: 'high', timeframe: '90 days', status: 'active', evidence: JSON.stringify(['sprint_velocity_decline', 'team_capacity_analysis', 'dependency_delays']) },
    { type: 'churn', title: 'Globex Inc Churn Risk', description: 'Key technical sponsor left. Engagement scores declining.', probability: 0.65, impact: 'high', timeframe: '60 days', status: 'active', evidence: JSON.stringify(['contact_departure', 'usage_decline', 'support_ticket_trend']) },
    { type: 'incident', title: 'Database Capacity Threshold', description: 'Neo4j projected to hit storage limit within 45 days', probability: 0.58, impact: 'critical', timeframe: '45 days', status: 'active', evidence: JSON.stringify(['growth_rate', 'current_utilization', 'capacity_forecast']) },
    { type: 'attrition', title: 'Engineering Attrition Spike', description: '3 senior engineers showing high departure signals', probability: 0.55, impact: 'high', timeframe: '120 days', status: 'active', evidence: JSON.stringify(['engagement_survey', 'market_salary_delta', 'tenure_analysis']) },
    { type: 'budget', title: 'Q3 Budget Overrun', description: 'Cloud infrastructure costs trending 20% above forecast', probability: 0.68, impact: 'medium', timeframe: '90 days', status: 'active', evidence: JSON.stringify(['spend_trend', 'usage_growth', 'reserved_instance_coverage']) },
    { type: 'risk', title: 'Compliance Gap: SOC2 Audit', description: 'Missing evidence for 3 control objectives', probability: 0.45, impact: 'critical', timeframe: '30 days', status: 'active', evidence: JSON.stringify(['audit_readiness_score', 'control_coverage', 'evidence_collection_status']) },
  ]
  await Promise.all(predictionData.map(p => prisma.prediction.create({ data: p })))

  // Create Connectors
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
  await Promise.all(connectorData.map(c => prisma.connector.create({ data: { ...c, orgId: org.id } })))

  // Create Audit Logs
  const auditData = [
    { action: 'user.login', actor: 'sarah.chen@nexuscorp.io', resource: 'dashboard', severity: 'info', ipAddress: '10.0.1.42' },
    { action: 'agent.execute', actor: 'system:security-agent', resource: 'vulnerability_scan', details: 'Automated vulnerability scan completed', severity: 'info' },
    { action: 'data.export', actor: 'marcus.r@nexuscorp.io', resource: 'engineering_metrics', details: 'Exported team velocity report', severity: 'warning', ipAddress: '10.0.2.18' },
    { action: 'config.change', actor: 'system:workflow-agent', resource: 'k8s_hpa_config', details: 'Auto-scaled cluster from 75 to 82 nodes', severity: 'info' },
    { action: 'access.denied', actor: 'unknown', resource: 'admin_panel', details: 'Failed login attempt from external IP', severity: 'critical', ipAddress: '185.234.72.x' },
    { action: 'decision.approve', actor: 'elena.v@nexuscorp.io', resource: 'budget_reallocation', details: 'Approved Q2 budget adjustments', severity: 'info', ipAddress: '10.0.3.5' },
  ]
  await Promise.all(auditData.map(a => prisma.auditLog.create({ data: a })))

  // Create Demo User
  const bcrypt = await import('bcryptjs')
  const passwordHash = await bcrypt.hash('nexus123', 12)
  await prisma.user.create({
    data: {
      name: 'Sarah Chen',
      email: 'admin@nexuscorp.io',
      passwordHash,
      role: 'admin',
      department: 'Executive',
    },
  })
  console.log('- 1 demo user (admin@nexuscorp.io / nexus123)')

  console.log('Seed data created successfully!')
  console.log(`- ${1} organization`)
  console.log(`- ${teams.length} teams`)
  console.log(`- ${people.length} people`)
  console.log(`- ${projects.length} projects`)
  console.log(`- ${taskData.length} tasks`)
  console.log(`- ${decisions.length} decisions`)
  console.log(`- ${events.length} events`)
  console.log(`- ${graphEntities.length} graph entities`)
  console.log(`- 15 graph relations`)
  console.log(`- ${agents.length} agents`)
  console.log(`- ${actionData.length} agent actions`)
  console.log(`- ${memoryData.length} memories`)
  console.log(`- ${predictionData.length} predictions`)
  console.log(`- ${connectorData.length} connectors`)
  console.log(`- ${auditData.length} audit logs`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
