export type DependencyType = 'http' | 'grpc' | 'event';

export class DependencyEdge {
  source: string; // service node ID
  target: string; // service node ID
  type: DependencyType;
  latency?: number; // in milliseconds
  weight: number; // importance/priority weight
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;

  constructor(
    source: string,
    target: string,
    type: DependencyType,
    weight: number = 1,
    latency?: number,
    metadata?: Record<string, any>,
  ) {
    this.source = source;
    this.target = target;
    this.type = type;
    this.weight = weight;
    this.latency = latency;
    this.metadata = metadata || {};
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }

  update(data: Partial<Omit<DependencyEdge, 'source' | 'target' | 'createdAt'>>): void {
    Object.assign(this, data);
    this.updatedAt = new Date();
  }

  toJSON() {
    return {
      source: this.source,
      target: this.target,
      type: this.type,
      latency: this.latency,
      weight: this.weight,
      metadata: this.metadata,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
