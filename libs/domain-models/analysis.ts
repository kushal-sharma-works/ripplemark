export type ChangeType = 'api' | 'schema' | 'infra' | 'config';
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface ChangeProposal {
  serviceId: string;
  changeType: ChangeType;
  title: string;
  description: string;
}

export interface ImpactedService {
  service: string;
  reason: string;
  score: number;
}

export interface ImpactResult {
  riskScore: number;
  riskLevel: RiskLevel;
  affectedServices: ImpactedService[];
  recommendedActions: string[];
}
