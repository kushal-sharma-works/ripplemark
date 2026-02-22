import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsEnum, IsNotEmpty, IsOptional, IsNumber, IsObject, Min } from 'class-validator';
import { DependencyType } from '../entities';

export class CreateDependencyEdgeDto {
  @ApiProperty({ description: 'Source service ID' })
  @IsString()
  @IsNotEmpty()
  source!: string;

  @ApiProperty({ description: 'Target service ID' })
  @IsString()
  @IsNotEmpty()
  target!: string;

  @ApiProperty({ enum: ['http', 'grpc', 'event'], description: 'Dependency type' })
  @IsEnum(['http', 'grpc', 'event'])
  type!: DependencyType;

  @ApiPropertyOptional({ description: 'Edge weight (importance)', default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  weight?: number;

  @ApiPropertyOptional({ description: 'Latency in milliseconds' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  latency?: number;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class UpdateDependencyEdgeDto {
  @ApiPropertyOptional({ enum: ['http', 'grpc', 'event'], description: 'Dependency type' })
  @IsOptional()
  @IsEnum(['http', 'grpc', 'event'])
  type?: DependencyType;

  @ApiPropertyOptional({ description: 'Edge weight' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  weight?: number;

  @ApiPropertyOptional({ description: 'Latency in milliseconds' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  latency?: number;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
