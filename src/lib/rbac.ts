/**
 * RBAC Engine — Production Role-Based Access Control
 *
 * Defines a complete permission system with 6 roles and granular
 * resource:action permissions. Used by middleware and API routes
 * to enforce access control.
 */

// ─── Permission Definitions ─────────────────────────────────────────────────

export type Permission =
  | 'dashboard:read' | 'dashboard:write'
  | 'agents:read' | 'agents:write' | 'agents:execute'
  | 'graph:read' | 'graph:write'
  | 'search:read'
  | 'predictions:read' | 'predictions:write'
  | 'events:read' | 'events:write'
  | 'memory:read' | 'memory:write'
  | 'security:read' | 'security:write' | 'security:admin'
  | 'connectors:read' | 'connectors:write' | 'connectors:admin'
  | 'users:read' | 'users:write' | 'users:admin'
  | 'audit:read' | 'audit:admin'
  | 'tenants:read' | 'tenants:write' | 'tenants:admin'
  | 'chat:read' | 'chat:write'
  | 'boardroom:read' | 'boardroom:write'

// ─── Role Definitions ───────────────────────────────────────────────────────

export type Role = 'super_admin' | 'admin' | 'manager' | 'analyst' | 'viewer' | 'agent'

export const ROLES: Role[] = ['super_admin', 'admin', 'manager', 'analyst', 'viewer', 'agent']

/**
 * Complete permission mapping for each role.
 *
 * - super_admin: Every permission in the system
 * - admin:       All permissions except tenant admin
 * - manager:     Read on everything, write on operational resources, no admin
 * - analyst:     Read on everything, write on analytics-specific resources
 * - viewer:      Read-only across the board
 * - agent:       Permissions for autonomous agent operations
 */
export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  super_admin: [
    // Dashboard
    'dashboard:read', 'dashboard:write',
    // Agents
    'agents:read', 'agents:write', 'agents:execute',
    // Graph
    'graph:read', 'graph:write',
    // Search
    'search:read',
    // Predictions
    'predictions:read', 'predictions:write',
    // Events
    'events:read', 'events:write',
    // Memory
    'memory:read', 'memory:write',
    // Security
    'security:read', 'security:write', 'security:admin',
    // Connectors
    'connectors:read', 'connectors:write', 'connectors:admin',
    // Users
    'users:read', 'users:write', 'users:admin',
    // Audit
    'audit:read', 'audit:admin',
    // Tenants
    'tenants:read', 'tenants:write', 'tenants:admin',
    // Chat
    'chat:read', 'chat:write',
    // Boardroom
    'boardroom:read', 'boardroom:write',
  ],

  admin: [
    // Dashboard
    'dashboard:read', 'dashboard:write',
    // Agents
    'agents:read', 'agents:write', 'agents:execute',
    // Graph
    'graph:read', 'graph:write',
    // Search
    'search:read',
    // Predictions
    'predictions:read', 'predictions:write',
    // Events
    'events:read', 'events:write',
    // Memory
    'memory:read', 'memory:write',
    // Security
    'security:read', 'security:write', 'security:admin',
    // Connectors
    'connectors:read', 'connectors:write', 'connectors:admin',
    // Users
    'users:read', 'users:write', 'users:admin',
    // Audit
    'audit:read', 'audit:admin',
    // Tenants
    'tenants:read', 'tenants:write',
    // Chat
    'chat:read', 'chat:write',
    // Boardroom
    'boardroom:read', 'boardroom:write',
  ],

  manager: [
    // Dashboard
    'dashboard:read', 'dashboard:write',
    // Agents
    'agents:read', 'agents:execute',
    // Graph
    'graph:read',
    // Search
    'search:read',
    // Predictions
    'predictions:read',
    // Events
    'events:read', 'events:write',
    // Memory
    'memory:read', 'memory:write',
    // Security
    'security:read',
    // Connectors
    'connectors:read', 'connectors:write',
    // Users
    'users:read',
    // Audit
    'audit:read',
    // Tenants
    'tenants:read',
    // Chat
    'chat:read', 'chat:write',
    // Boardroom
    'boardroom:read', 'boardroom:write',
  ],

  analyst: [
    // Dashboard
    'dashboard:read',
    // Agents
    'agents:read',
    // Graph
    'graph:read',
    // Search
    'search:read',
    // Predictions
    'predictions:read', 'predictions:write',
    // Events
    'events:read',
    // Memory
    'memory:read',
    // Security
    'security:read',
    // Connectors
    'connectors:read',
    // Users
    'users:read',
    // Audit
    'audit:read',
    // Tenants
    'tenants:read',
    // Chat
    'chat:read', 'chat:write',
    // Boardroom
    'boardroom:read',
  ],

  viewer: [
    // Dashboard
    'dashboard:read',
    // Agents
    'agents:read',
    // Graph
    'graph:read',
    // Search
    'search:read',
    // Predictions
    'predictions:read',
    // Events
    'events:read',
    // Memory
    'memory:read',
    // Security
    'security:read',
    // Connectors
    'connectors:read',
    // Users
    'users:read',
    // Audit
    'audit:read',
    // Tenants
    'tenants:read',
    // Chat
    'chat:read',
    // Boardroom
    'boardroom:read',
  ],

  agent: [
    // Dashboard
    'dashboard:read',
    // Agents
    'agents:read', 'agents:execute',
    // Graph
    'graph:read',
    // Search
    'search:read',
    // Predictions
    'predictions:read', 'predictions:write',
    // Events
    'events:read', 'events:write',
    // Memory
    'memory:read', 'memory:write',
    // Security
    'security:read',
    // Connectors
    'connectors:read',
    // Chat
    'chat:read', 'chat:write',
    // Boardroom
    'boardroom:read', 'boardroom:write',
  ],
}

// ─── Permission Check Functions ──────────────────────────────────────────────

/**
 * Check if a role has a specific permission.
 * Returns true if the role exists and includes the permission.
 */
export function hasPermission(role: string, permission: Permission): boolean {
  const roleKey = normalizeRole(role)
  if (!roleKey) return false
  return ROLE_PERMISSIONS[roleKey].includes(permission)
}

/**
 * Check if a role has any of the specified permissions.
 */
export function hasAnyPermission(role: string, permissions: Permission[]): boolean {
  return permissions.some((p) => hasPermission(role, p))
}

/**
 * Check if a role has all of the specified permissions.
 */
export function hasAllPermissions(role: string, permissions: Permission[]): boolean {
  return permissions.every((p) => hasPermission(role, p))
}

/**
 * Resource-level permission check.
 * Maps a resource + action to the corresponding Permission string.
 */
export function hasResourcePermission(
  role: string,
  resource: string,
  action: 'read' | 'write' | 'admin' | 'execute'
): boolean {
  const permission = `${resource}:${action}` as Permission
  return hasPermission(role, permission)
}

/**
 * Get all permissions for a given role.
 * Returns an empty array for unknown roles.
 */
export function getPermissions(role: string): Permission[] {
  const roleKey = normalizeRole(role)
  if (!roleKey) return []
  return [...ROLE_PERMISSIONS[roleKey]]
}

// ─── API Route → Permission Mapping ─────────────────────────────────────────

interface RoutePermissionRule {
  pattern: RegExp
  methods: Record<string, Permission>
}

/**
 * Rules for mapping API routes to required permissions.
 * Evaluated in order — first match wins.
 */
const ROUTE_PERMISSION_RULES: RoutePermissionRule[] = [
  // Auth routes — handled separately, no permission needed
  { pattern: /^\/api\/auth\//, methods: {} },

  // Health check — public, no permission needed
  { pattern: /^\/api\/health$/, methods: {} },

  // Dashboard
  { pattern: /^\/api\/dashboard$/, methods: { GET: 'dashboard:read', POST: 'dashboard:write', PUT: 'dashboard:write', PATCH: 'dashboard:write' } },

  // Agents
  { pattern: /^\/api\/agents$/, methods: { GET: 'agents:read', POST: 'agents:write' } },
  { pattern: /^\/api\/agents\/[^/]+\/execute$/, methods: { POST: 'agents:execute' } },
  { pattern: /^\/api\/agents\//, methods: { GET: 'agents:read', PUT: 'agents:write', PATCH: 'agents:write', DELETE: 'agents:write' } },

  // Graph
  { pattern: /^\/api\/graph$/, methods: { GET: 'graph:read', POST: 'graph:write', PUT: 'graph:write' } },
  { pattern: /^\/api\/graph\//, methods: { GET: 'graph:read', PUT: 'graph:write', PATCH: 'graph:write', DELETE: 'graph:write' } },

  // Search
  { pattern: /^\/api\/search$/, methods: { GET: 'search:read', POST: 'search:read' } },

  // Predictions
  { pattern: /^\/api\/predictions$/, methods: { GET: 'predictions:read', POST: 'predictions:write' } },
  { pattern: /^\/api\/predictions\//, methods: { GET: 'predictions:read', PUT: 'predictions:write', PATCH: 'predictions:write', DELETE: 'predictions:write' } },

  // Events
  { pattern: /^\/api\/events$/, methods: { GET: 'events:read', POST: 'events:write' } },
  { pattern: /^\/api\/events\//, methods: { GET: 'events:read', PUT: 'events:write', PATCH: 'events:write', DELETE: 'events:write' } },

  // Memory
  { pattern: /^\/api\/memory$/, methods: { GET: 'memory:read', POST: 'memory:write' } },
  { pattern: /^\/api\/memory\//, methods: { GET: 'memory:read', PUT: 'memory:write', PATCH: 'memory:write', DELETE: 'memory:write' } },

  // Security
  { pattern: /^\/api\/security$/, methods: { GET: 'security:read', POST: 'security:write' } },
  { pattern: /^\/api\/security\/admin/, methods: { GET: 'security:admin', POST: 'security:admin', PUT: 'security:admin' } },
  { pattern: /^\/api\/security\//, methods: { GET: 'security:read', PUT: 'security:write', PATCH: 'security:write', DELETE: 'security:write' } },

  // Connectors
  { pattern: /^\/api\/connectors$/, methods: { GET: 'connectors:read', POST: 'connectors:write' } },
  { pattern: /^\/api\/connectors\/admin/, methods: { GET: 'connectors:admin', POST: 'connectors:admin', PUT: 'connectors:admin' } },
  { pattern: /^\/api\/connectors\//, methods: { GET: 'connectors:read', PUT: 'connectors:write', PATCH: 'connectors:write', DELETE: 'connectors:write' } },

  // Users
  { pattern: /^\/api\/users$/, methods: { GET: 'users:read', POST: 'users:write' } },
  { pattern: /^\/api\/users\/admin/, methods: { GET: 'users:admin', POST: 'users:admin', PUT: 'users:admin' } },
  { pattern: /^\/api\/users\//, methods: { GET: 'users:read', PUT: 'users:write', PATCH: 'users:write', DELETE: 'users:write' } },

  // Audit
  { pattern: /^\/api\/audit$/, methods: { GET: 'audit:read' } },
  { pattern: /^\/api\/audit\//, methods: { GET: 'audit:read', DELETE: 'audit:admin' } },

  // Tenants
  { pattern: /^\/api\/tenants$/, methods: { GET: 'tenants:read', POST: 'tenants:write' } },
  { pattern: /^\/api\/tenants\/admin/, methods: { GET: 'tenants:admin', POST: 'tenants:admin', PUT: 'tenants:admin' } },
  { pattern: /^\/api\/tenants\//, methods: { GET: 'tenants:read', PUT: 'tenants:write', PATCH: 'tenants:write', DELETE: 'tenants:write' } },

  // Chat
  { pattern: /^\/api\/chat$/, methods: { GET: 'chat:read', POST: 'chat:write' } },
  { pattern: /^\/api\/chat\//, methods: { GET: 'chat:read', POST: 'chat:write' } },

  // Boardroom
  { pattern: /^\/api\/boardroom$/, methods: { GET: 'boardroom:read', POST: 'boardroom:write' } },
  { pattern: /^\/api\/boardroom\//, methods: { GET: 'boardroom:read', POST: 'boardroom:write' } },
]

/**
 * Determine the required permission for an API route.
 * Returns null for public routes (auth, health) or unmatched routes.
 */
export function getRequiredPermission(pathname: string, method: string): Permission | null {
  for (const rule of ROUTE_PERMISSION_RULES) {
    if (rule.pattern.test(pathname)) {
      const perm = rule.methods[method.toUpperCase()]
      return perm ?? null
    }
  }
  // Unmatched API routes default to requiring 'security:read' for safety
  if (pathname.startsWith('/api/')) {
    return 'security:read'
  }
  return null
}

// ─── Helper Functions ────────────────────────────────────────────────────────

/**
 * Normalize a role string to a valid Role type.
 * Maps common variations to canonical role names.
 */
function normalizeRole(role: string): Role | null {
  const lower = role.toLowerCase().trim()

  // Direct match
  if (ROLES.includes(lower as Role)) {
    return lower as Role
  }

  // Common mappings
  const roleMappings: Record<string, Role> = {
    'superadmin': 'super_admin',
    'super-admin': 'super_admin',
    'administrator': 'admin',
    'mgr': 'manager',
    'management': 'manager',
    'view': 'viewer',
    'read': 'viewer',
    'readonly': 'viewer',
    'read-only': 'viewer',
    'bot': 'agent',
    'system': 'agent',
    'ai': 'agent',
    'user': 'viewer',  // Default 'user' role maps to viewer permissions
  }

  return roleMappings[lower] ?? null
}

/**
 * Check if a role is a valid system role.
 */
export function isValidRole(role: string): boolean {
  return normalizeRole(role) !== null
}

/**
 * Get the effective role for a user, with fallback.
 * Returns the normalized role or 'viewer' as the safest default.
 */
export function getEffectiveRole(role: string | undefined | null): Role {
  if (!role) return 'viewer'
  return normalizeRole(role) ?? 'viewer'
}
