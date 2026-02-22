import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsArray,
  ValidateNested,
  IsOptional,
  IsEnum,
  IsNumber,
  Min,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';
import { DependencyType } from '@graph/entities';

export class DependencyReportItemDto {
  @ApiProperty({ description: 'Target service ID' })
  @IsString()
  @IsNotEmpty()
  target!: string;

  @ApiProperty({ enum: ['http', 'grpc', 'event'], description: 'Dependency type' })
  @IsEnum(['http', 'grpc', 'event'])
  type!: DependencyType;

  @ApiPropertyOptional({ description: 'Latency in milliseconds' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  latency?: number;

  @ApiPropertyOptional({ description: 'Weight/importance', default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  weight?: number;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class DependencyReportDto {
  @ApiProperty({ description: 'Source service ID' })
  @IsString()
  @IsNotEmpty()
  serviceId!: string;

  @ApiProperty({ description: 'List of dependencies', type: [DependencyReportItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DependencyReportItemDto)
  dependencies!: DependencyReportItemDto[];
}

export class BulkServiceRegistrationDto {
  @ApiProperty({ description: 'List of services to register' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => Object)
  services!: Array<{
    id: string;
    name: string;
    version: string;
    type: 'sync' | 'async';
    metadata?: Record<string, any>;
  }>;
}

export class GraphUpdateEventDto {
  @ApiProperty({ enum: ['node_added', 'node_updated', 'node_removed', 'edge_added', 'edge_updated', 'edge_removed'] })
  eventType!: string;

  @ApiProperty({ description: 'Timestamp of the event' })
  timestamp!: Date;

  @ApiProperty({ description: 'Event payload' })
  payload!: any;
}
