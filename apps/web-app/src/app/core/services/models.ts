export type ServiceType = 'api' | 'worker' | 'frontend' | 'database';
export type DependencyType = 'sync' | 'async';

export interface ServiceNode {
  id: string;
  name: string;
  type: ServiceType;
  team: string;
  status: 'healthy' | 'degraded' | 'down';
  version: string;
}

export interface DependencyEdge {
  source: string;
  target: string;
  type: DependencyType;
}

export interface GraphSnapshot {
  nodes: ServiceNode[];
  edges: DependencyEdge[];
  capturedAt: string;
}

export interface DashboardOverview {
  totalServices: number;
  totalDependencies: number;
  recentChanges: number;
  systemHealth: 'healthy' | 'degraded' | 'down';
}

export interface ChangeProposal {
  serviceId: string;
  changeType: 'schema' | 'api' | 'infra' | 'config';
  title: string;
  description: string;
}

export interface ImpactResult {
  affectedServices: Array<{ service: string; score: number; reason: string }>;
  riskScore: number;
  recommendedActions: string[];
}

export interface TeamSummary {
  id: string;
  name: string;
  members: number;
  serviceCount: number;
}
