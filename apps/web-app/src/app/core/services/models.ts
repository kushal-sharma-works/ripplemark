export type ServiceType = 'sync' | 'async';
export type DependencyType = 'http' | 'grpc' | 'event';

export interface ServiceNode {
  id: string;
  name: string;
  type: ServiceType;
  version: string;
  metadata?: Record<string, unknown>;
  team?: string;
  status?: 'healthy' | 'degraded' | 'down';
}

export interface DependencyEdge {
  source: string;
  target: string;
  type: DependencyType;
}

export interface GraphSnapshot {
  nodes: ServiceNode[];
  edges: DependencyEdge[];
}

export interface DashboardOverview {
  totalServices: number;
  totalDependencies: number;
  recentChanges: number;
  systemHealth: 'healthy' | 'degraded' | 'down';
}

export interface ChangeProposal {
  serviceName: string;
  changeType: 'schema_change' | 'timeout_change' | 'retry_change' | 'deprecation' | 'version_bump';
  title?: string;
  description: string;
  maxDepth: number;
}

export interface ImpactResult {
  affectedServices: Array<{ service: string; score: number; reason: string }>;
  riskScore: number;
  backwardCompatibility: string;
}

export interface TeamSummary {
  id: string;
  name: string;
  members: number;
  serviceCount: number;
}
