export type ServiceType = 'api' | 'worker' | 'frontend' | 'database';
export type DependencyType = 'sync' | 'async';

export interface ServiceNode {
  id: string;
  name: string;
  type: ServiceType;
  teamId: string;
  status: 'healthy' | 'degraded' | 'down';
  version: string;
}

export interface DependencyEdge {
  source: string;
  target: string;
  type: DependencyType;
}

export interface GraphSnapshot {
  id: string;
  capturedAt: string;
  nodes: ServiceNode[];
  edges: DependencyEdge[];
}
