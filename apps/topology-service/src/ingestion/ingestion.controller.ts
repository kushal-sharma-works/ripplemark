import {
  Controller,
  Post,
  Delete,
  Put,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { GraphService } from '@graph/graph.service';
import {
  CreateServiceNodeDto,
  UpdateServiceNodeDto,
  CreateDependencyEdgeDto,
  UpdateDependencyEdgeDto,
} from '@graph/dto';
import { ServiceNode, DependencyEdge } from '@graph/entities';
import { DependencyReportDto, BulkServiceRegistrationDto } from './dto';
import { GraphGateway } from './graph.gateway';
import { TopologyMetricsService } from '@app/observability/metrics.service';
import { trace } from '@opentelemetry/api';

@ApiTags('ingestion')
@Controller('ingestion')
export class IngestionController {
  private readonly logger = new Logger(IngestionController.name);
  private readonly tracer = trace.getTracer('topology-ingestion');

  constructor(
    private readonly graphService: GraphService,
    private readonly graphGateway: GraphGateway,
    private readonly metricsService: TopologyMetricsService,
  ) {}

  @Post('services')
  @ApiOperation({ summary: 'Register a new service' })
  @ApiResponse({ status: 201, description: 'Service registered successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input or service already exists' })
  registerService(@Body() dto: CreateServiceNodeDto) {
    const node = this.tracer.startActiveSpan('graph.register_service', (span) => {
      span.setAttribute('service.id', dto.id);
      const created = new ServiceNode(dto.id, dto.name, dto.version, dto.type, dto.metadata);
      this.graphService.addNode(created);
      span.end();
      return created;
    });

    // Emit WebSocket event
    this.graphGateway.emitGraphUpdate({
      eventType: 'node_added',
      timestamp: new Date(),
      payload: node.toJSON(),
    });

    const stats = this.graphService.getStatistics();
    this.metricsService.setGraphCounts(stats.nodeCount, stats.edgeCount);

    return {
      success: true,
      data: node.toJSON(),
    };
  }

  @Post('services/bulk')
  @ApiOperation({ summary: 'Register multiple services at once' })
  @ApiResponse({ status: 201, description: 'Services registered successfully' })
  registerServicesBulk(@Body() dto: BulkServiceRegistrationDto) {
    const results = [];
    const errors = [];

    for (const service of dto.services) {
      try {
        const node = this.tracer.startActiveSpan('graph.register_service.bulk_item', (span) => {
          span.setAttribute('service.id', service.id);
          const created = new ServiceNode(
            service.id,
            service.name,
            service.version,
            service.type,
            service.metadata,
          );
          this.graphService.addNode(created);
          span.end();
          return created;
        });
        results.push(node.toJSON());

        this.graphGateway.emitGraphUpdate({
          eventType: 'node_added',
          timestamp: new Date(),
          payload: node.toJSON(),
        });
      } catch (error) {
        errors.push({
          serviceId: service.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    const stats = this.graphService.getStatistics();
    this.metricsService.setGraphCounts(stats.nodeCount, stats.edgeCount);

    return {
      success: errors.length === 0,
      registered: results.length,
      failed: errors.length,
      data: results,
      errors,
    };
  }

  @Put('services/:id')
  @ApiOperation({ summary: 'Update an existing service' })
  @ApiParam({ name: 'id', description: 'Service ID' })
  @ApiResponse({ status: 200, description: 'Service updated successfully' })
  @ApiResponse({ status: 404, description: 'Service not found' })
  updateService(@Param('id') id: string, @Body() dto: UpdateServiceNodeDto) {
    const node = this.tracer.startActiveSpan('graph.update_service', (span) => {
      span.setAttribute('service.id', id);
      const updated = this.graphService.updateNode(id, dto);
      span.end();
      return updated;
    });

    this.graphGateway.emitGraphUpdate({
      eventType: 'node_updated',
      timestamp: new Date(),
      payload: { id, updates: dto },
    });

    const stats = this.graphService.getStatistics();
    this.metricsService.setGraphCounts(stats.nodeCount, stats.edgeCount);

    return {
      success: true,
      data: node.toJSON(),
    };
  }

  @Delete('services/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Deregister a service' })
  @ApiParam({ name: 'id', description: 'Service ID' })
  @ApiResponse({ status: 204, description: 'Service deregistered successfully' })
  @ApiResponse({ status: 404, description: 'Service not found' })
  deregisterService(@Param('id') id: string) {
    this.tracer.startActiveSpan('graph.remove_service', (span) => {
      span.setAttribute('service.id', id);
      this.graphService.removeNode(id);
      span.end();
    });

    this.graphGateway.emitGraphUpdate({
      eventType: 'node_removed',
      timestamp: new Date(),
      payload: { id },
    });

    const stats = this.graphService.getStatistics();
    this.metricsService.setGraphCounts(stats.nodeCount, stats.edgeCount);
  }

  @Post('dependencies')
  @ApiOperation({ summary: 'Register a dependency between services' })
  @ApiResponse({ status: 201, description: 'Dependency registered successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 404, description: 'Source or target service not found' })
  registerDependency(@Body() dto: CreateDependencyEdgeDto) {
    const edge = this.tracer.startActiveSpan('graph.register_dependency', (span) => {
      span.setAttribute('dependency.source', dto.source);
      span.setAttribute('dependency.target', dto.target);
      const created = new DependencyEdge(
        dto.source,
        dto.target,
        dto.type,
        dto.weight || 1,
        dto.latency,
        dto.metadata,
      );
      this.graphService.addEdge(created);
      span.end();
      return created;
    });

    this.graphGateway.emitGraphUpdate({
      eventType: 'edge_added',
      timestamp: new Date(),
      payload: edge.toJSON(),
    });

    const stats = this.graphService.getStatistics();
    this.metricsService.setGraphCounts(stats.nodeCount, stats.edgeCount);

    return {
      success: true,
      data: edge.toJSON(),
    };
  }

  @Put('dependencies/:source/:target/:type')
  @ApiOperation({ summary: 'Update a dependency' })
  @ApiParam({ name: 'source', description: 'Source service ID' })
  @ApiParam({ name: 'target', description: 'Target service ID' })
  @ApiParam({ name: 'type', description: 'Dependency type' })
  @ApiResponse({ status: 200, description: 'Dependency updated successfully' })
  @ApiResponse({ status: 404, description: 'Dependency not found' })
  updateDependency(
    @Param('source') source: string,
    @Param('target') target: string,
    @Param('type') type: 'http' | 'grpc' | 'event',
    @Body() dto: UpdateDependencyEdgeDto,
  ) {
    const edge = this.tracer.startActiveSpan('graph.update_dependency', (span) => {
      span.setAttribute('dependency.source', source);
      span.setAttribute('dependency.target', target);
      const updated = this.graphService.updateEdge(source, target, type, dto);
      span.end();
      return updated;
    });

    this.graphGateway.emitGraphUpdate({
      eventType: 'edge_updated',
      timestamp: new Date(),
      payload: { source, target, type, updates: dto },
    });

    const stats = this.graphService.getStatistics();
    this.metricsService.setGraphCounts(stats.nodeCount, stats.edgeCount);

    return {
      success: true,
      data: edge.toJSON(),
    };
  }

  @Delete('dependencies/:source/:target/:type')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a dependency' })
  @ApiParam({ name: 'source', description: 'Source service ID' })
  @ApiParam({ name: 'target', description: 'Target service ID' })
  @ApiParam({ name: 'type', description: 'Dependency type' })
  @ApiResponse({ status: 204, description: 'Dependency removed successfully' })
  @ApiResponse({ status: 404, description: 'Dependency not found' })
  removeDependency(
    @Param('source') source: string,
    @Param('target') target: string,
    @Param('type') type: 'http' | 'grpc' | 'event',
  ) {
    this.tracer.startActiveSpan('graph.remove_dependency', (span) => {
      span.setAttribute('dependency.source', source);
      span.setAttribute('dependency.target', target);
      this.graphService.removeEdge(source, target, type);
      span.end();
    });

    this.graphGateway.emitGraphUpdate({
      eventType: 'edge_removed',
      timestamp: new Date(),
      payload: { source, target, type },
    });

    const stats = this.graphService.getStatistics();
    this.metricsService.setGraphCounts(stats.nodeCount, stats.edgeCount);
  }

  @Post('reports')
  @ApiOperation({ summary: 'Submit a dependency report from a service' })
  @ApiResponse({ status: 201, description: 'Dependency report processed successfully' })
  submitDependencyReport(@Body() dto: DependencyReportDto) {
    const startedAt = process.hrtime.bigint();
    this.metricsService.incrementChangeProposals();
    const results = {
      serviceId: dto.serviceId,
      processed: 0,
      errors: [] as any[],
    };

    for (const dep of dto.dependencies) {
      try {
        const edge = new DependencyEdge(
          dto.serviceId,
          dep.target,
          dep.type,
          dep.weight || 1,
          dep.latency,
          dep.metadata,
        );

        // Try to add edge, skip if already exists
        try {
          this.graphService.addEdge(edge);
          results.processed++;

          this.graphGateway.emitGraphUpdate({
            eventType: 'edge_added',
            timestamp: new Date(),
            payload: edge.toJSON(),
          });
        } catch (error) {
          // If edge already exists, update it instead
          if (error instanceof Error && error.message.includes('already exists')) {
            this.graphService.updateEdge(dto.serviceId, dep.target, dep.type, {
              weight: dep.weight,
              latency: dep.latency,
              metadata: dep.metadata,
            });
            results.processed++;

            this.graphGateway.emitGraphUpdate({
              eventType: 'edge_updated',
              timestamp: new Date(),
              payload: { source: dto.serviceId, target: dep.target, type: dep.type },
            });
          } else {
            throw error;
          }
        }
      } catch (error) {
        results.errors.push({
          target: dep.target,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    const stats = this.graphService.getStatistics();
    this.metricsService.setGraphCounts(stats.nodeCount, stats.edgeCount);
    const durationSeconds = Number(process.hrtime.bigint() - startedAt) / 1_000_000_000;
    this.metricsService.observeAnalysisDuration(durationSeconds);

    return {
      success: results.errors.length === 0,
      data: results,
    };
  }
}
