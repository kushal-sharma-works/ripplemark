import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsEnum, IsNumber, Min, Max, IsString, IsArray } from 'class-validator';
import { Type } from 'class-transformer';
import { DependencyType } from '@graph/entities';

export class QueryOptionsDto {
  @ApiPropertyOptional({ enum: ['http', 'grpc', 'event'], description: 'Filter by dependency type' })
  @IsOptional()
  @IsEnum(['http', 'grpc', 'event'])
  typeFilter?: DependencyType;

  @ApiPropertyOptional({ description: 'Maximum depth for transitive queries', default: 10, minimum: 1, maximum: 50 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(50)
  @Type(() => Number)
  maxDepth?: number;
}

export class BlastRadiusQueryDto {
  @ApiPropertyOptional({ description: 'Maximum depth for blast radius calculation', default: 3, minimum: 1, maximum: 20 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(20)
  @Type(() => Number)
  maxDepth?: number;
}

export class SubgraphQueryDto {
  @ApiPropertyOptional({ description: 'List of node IDs to include in subgraph' })
  @IsArray()
  @IsString({ each: true })
  nodeIds!: string[];
}

export class ServiceNodeResponseDto {
  id!: string;
  name!: string;
  version!: string;
  type!: string;
  metadata!: Record<string, any>;
  createdAt!: Date;
  updatedAt!: Date;
}

export class DependencyEdgeResponseDto {
  source!: string;
  target!: string;
  type!: string;
  latency?: number;
  weight!: number;
  metadata?: Record<string, any>;
  createdAt!: Date;
  updatedAt!: Date;
}

export class GraphStatisticsResponseDto {
  nodeCount!: number;
  edgeCount!: number;
  averageDegree!: number;
  density!: number;
}

export class DependencyResponseDto {
  dependencies!: string[];
  depth?: Map<string, number>;
}

export class BlastRadiusResponseDto {
  affected!: string[];
  affectedBy!: string[];
  total!: number;
  details!: {
    affectedCount: number;
    affectedByCount: number;
  };
}

export class PathResponseDto {
  path!: string[] | null;
  found!: boolean;
  length?: number;
}

export class SubgraphResponseDto {
  nodes!: ServiceNodeResponseDto[];
  edges!: DependencyEdgeResponseDto[];
  nodeCount!: number;
  edgeCount!: number;
}

export class CycleDetectionResponseDto {
  hasCycles!: boolean;
  cycleCount!: number;
  cycles!: string[][];
}
