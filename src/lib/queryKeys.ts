export const QUERY_KEYS = {
  tickets: ['tickets'] as const,
  ticketsByStatus: (status: string) => ['tickets', status] as const,
  tasks: ['tasks'] as const,
  tasksByStatus: (status: string) => ['tasks', status] as const,
  technicians: ['technicians'] as const,
  ticketsByQueue: (queue: string) => ['tickets', 'queue', queue] as const,
  analytics: ['analytics'] as const,
  inventory: ['inventory'] as const,
  callCenters: ['callCenters'] as const,
  auditLogs: ['auditLogs'] as const,
} as const;
