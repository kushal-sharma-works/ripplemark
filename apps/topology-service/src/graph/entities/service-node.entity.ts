export type ServiceType = 'sync' | 'async';

export interface ServiceNodeMetadata {
  [key: string]: any;
}

export class ServiceNode {
  id: string;
  name: string;
  version: string;
  type: ServiceType;
  metadata: ServiceNodeMetadata;
  createdAt: Date;
  updatedAt: Date;

  constructor(
    id: string,
    name: string,
    version: string,
    type: ServiceType,
    metadata: ServiceNodeMetadata = {},
  ) {
    this.id = id;
    this.name = name;
    this.version = version;
    this.type = type;
    this.metadata = metadata;
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }

  update(data: Partial<Omit<ServiceNode, 'id' | 'createdAt'>>): void {
    Object.assign(this, data);
    this.updatedAt = new Date();
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      version: this.version,
      type: this.type,
      metadata: this.metadata,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
