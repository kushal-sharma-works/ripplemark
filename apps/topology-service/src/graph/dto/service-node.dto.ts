import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsEnum, IsNotEmpty, IsOptional, IsObject } from 'class-validator';
import { ServiceType } from '../entities';

export class CreateServiceNodeDto {
  @ApiProperty({ description: 'Unique identifier for the service' })
  @IsString()
  @IsNotEmpty()
  id!: string;

  @ApiProperty({ description: 'Service name' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ description: 'Service version' })
  @IsString()
  @IsNotEmpty()
  version!: string;

  @ApiProperty({ enum: ['sync', 'async'], description: 'Service type' })
  @IsEnum(['sync', 'async'])
  type!: ServiceType;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class UpdateServiceNodeDto {
  @ApiPropertyOptional({ description: 'Service name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Service version' })
  @IsOptional()
  @IsString()
  version?: string;

  @ApiPropertyOptional({ enum: ['sync', 'async'], description: 'Service type' })
  @IsOptional()
  @IsEnum(['sync', 'async'])
  type?: ServiceType;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
