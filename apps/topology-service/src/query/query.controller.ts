import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { GraphService } from '@graph/graph.service';
import {
  QueryOptionsDto,
  BlastRadiusQueryDto,
  SubgraphQueryDto,
  ServiceNodeResponseDto,
  DependencyEdgeResponseDto,
  GraphStatisticsResponseDto,
  DependencyResponseDto,
  BlastRadiusResponseDto,
  PathResponseDto,
  SubgraphResponseDto,
  CycleDetectionResponseDto,
} from './dto';

@ApiTags('query')
@Controller('query')
export class QueryController {
  private readonly logger = new Logger(QueryController.name);

  constructor(private readonly graphService: GraphService) {}

  @Get('services')
  @ApiOperation({ summary: 'Get all services' })
  @ApiResponse({ status: 200, description: 'List of all services', type: [ServiceNodeResponseDto] })
  getAllServices() {
    const nodes = this.graphService.getAllNodes();
    return {
      success: true,
      count: nodes.length,
      data: nodes.map((n) => n.toJSON()),
    };
  }

  @Get('services/:id')
  @ApiOperation({ summary: 'Get a specific service by ID' })
  @ApiParam({ name: 'id', description: 'Service ID' })
  @ApiResponse({ status: 200, description: 'Service details', type: ServiceNodeResponseDto })
  @ApiResponse({ status: 404, description: 'Service not found' })
  getService(@Param('id') id: string) {
    const node = this.graphService.getNode(id);
    if (!node) {
      throw new NotFoundException(`Service ${id} not found`);
    }
    return {
      success: true,
      data: node.toJSON(),
    };
  }

  @Get('dependencies')
  @ApiOperation({ summary: 'Get all dependencies' })
  @ApiResponse({ status: 200, description: 'List of all dependencies', type: [DependencyEdgeResponseDto] })
  getAllDependencies() {
    const edges = this.graphService.getAllEdges();
    return {
      success: true,
      count: edges.length,
      data: edges.map((e) => e.toJSON()),
    };
  }

  @Get('dependencies/:serviceId/direct')
  @ApiOperation({ summary: 'Get direct dependencies of a service' })
  @ApiParam({ name: 'serviceId', description: 'Service ID' })
  @ApiQuery({ name: 'typeFilter', required: false, enum: ['http', 'grpc', 'event'] })
  @ApiResponse({ status: 200, description: 'List of direct dependencies' })
  @ApiResponse({ status: 404, description: 'Service not found' })
  getDirectDependencies(
    @Param('serviceId') serviceId: string,
    @Query() options: QueryOptionsDto,
  ) {
    const dependencies = this.graphService.getDirectDependencies(
      serviceId,
      options.typeFilter,
    );
    return {
      success: true,
      serviceId,
      count: dependencies.length,
      data: dependencies,
    };
  }

  @Get('dependencies/:serviceId/transitive')
  @ApiOperation({ summary: 'Get transitive dependencies of a service' })
  @ApiParam({ name: 'serviceId', description: 'Service ID' })
  @ApiQuery({ name: 'typeFilter', required: false, enum: ['http', 'grpc', 'event'] })
  @ApiQuery({ name: 'maxDepth', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'List of transitive dependencies with depth' })
  @ApiResponse({ status: 404, description: 'Service not found' })
  getTransitiveDependencies(
    @Param('serviceId') serviceId: string,
    @Query() options: QueryOptionsDto,
  ) {
    const maxDepth = options.maxDepth || 10;
    const dependencies = this.graphService.getTransitiveDependencies(
      serviceId,
      maxDepth,
      options.typeFilter,
    );

    const result: Record<string, number> = {};
    dependencies.forEach((depth, nodeId) => {
      result[nodeId] = depth;
    });

    return {
      success: true,
      serviceId,
      maxDepth,
      count: dependencies.size,
      data: result,
    };
  }

  @Get('dependencies/:serviceId/reverse')
  @ApiOperation({ summary: 'Get services that depend on this service (reverse dependencies)' })
  @ApiParam({ name: 'serviceId', description: 'Service ID' })
  @ApiQuery({ name: 'typeFilter', required: false, enum: ['http', 'grpc', 'event'] })
  @ApiResponse({ status: 200, description: 'List of reverse dependencies' })
  @ApiResponse({ status: 404, description: 'Service not found' })
  getReverseDependencies(
    @Param('serviceId') serviceId: string,
    @Query() options: QueryOptionsDto,
  ) {
    const dependencies = this.graphService.getReverseDependencies(
      serviceId,
      options.typeFilter,
    );
    return {
      success: true,
      serviceId,
      count: dependencies.length,
      data: dependencies,
    };
  }

  @Get('dependencies/:serviceId/reverse-transitive')
  @ApiOperation({ summary: 'Get transitive reverse dependencies of a service' })
  @ApiParam({ name: 'serviceId', description: 'Service ID' })
  @ApiQuery({ name: 'typeFilter', required: false, enum: ['http', 'grpc', 'event'] })
  @ApiQuery({ name: 'maxDepth', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'List of transitive reverse dependencies with depth' })
  @ApiResponse({ status: 404, description: 'Service not found' })
  getTransitiveReverseDependencies(
    @Param('serviceId') serviceId: string,
    @Query() options: QueryOptionsDto,
  ) {
    const maxDepth = options.maxDepth || 10;
    const dependencies = this.graphService.getTransitiveReverseDependencies(
      serviceId,
      maxDepth,
      options.typeFilter,
    );

    const result: Record<string, number> = {};
    dependencies.forEach((depth, nodeId) => {
      result[nodeId] = depth;
    });

    return {
      success: true,
      serviceId,
      maxDepth,
      count: dependencies.size,
      data: result,
    };
  }

  @Get('blast-radius/:serviceId')
  @ApiOperation({ summary: 'Calculate blast radius for a service' })
  @ApiParam({ name: 'serviceId', description: 'Service ID' })
  @ApiQuery({ name: 'maxDepth', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Blast radius calculation', type: BlastRadiusResponseDto })
  @ApiResponse({ status: 404, description: 'Service not found' })
  getBlastRadius(
    @Param('serviceId') serviceId: string,
    @Query() query: BlastRadiusQueryDto,
  ) {
    const maxDepth = query.maxDepth || 3;
    const blastRadius = this.graphService.calculateBlastRadius(serviceId, maxDepth);

    return {
      success: true,
      serviceId,
      maxDepth,
      data: {
        affected: Array.from(blastRadius.affected),
        affectedBy: Array.from(blastRadius.affectedBy),
        total: blastRadius.total,
        details: {
          affectedCount: blastRadius.affected.size,
          affectedByCount: blastRadius.affectedBy.size,
        },
      },
    };
  }

  @Get('path/:sourceId/:targetId')
  @ApiOperation({ summary: 'Find shortest path between two services' })
  @ApiParam({ name: 'sourceId', description: 'Source service ID' })
  @ApiParam({ name: 'targetId', description: 'Target service ID' })
  @ApiResponse({ status: 200, description: 'Shortest path', type: PathResponseDto })
  @ApiResponse({ status: 404, description: 'Source or target service not found' })
  getShortestPath(
    @Param('sourceId') sourceId: string,
    @Param('targetId') targetId: string,
  ) {
    const path = this.graphService.findShortestPath(sourceId, targetId);

    return {
      success: true,
      sourceId,
      targetId,
      data: {
        found: path !== null,
        path,
        length: path ? path.length : 0,
      },
    };
  }

  @Post('subgraph')
  @ApiOperation({ summary: 'Extract a subgraph containing specific nodes' })
  @ApiResponse({ status: 200, description: 'Subgraph data', type: SubgraphResponseDto })
  getSubgraph(@Body() query: SubgraphQueryDto) {
    const subgraph = this.graphService.extractSubgraph(query.nodeIds);

    return {
      success: true,
      data: {
        nodes: subgraph.nodes.map((n) => n.toJSON()),
        edges: subgraph.edges.map((e) => e.toJSON()),
        nodeCount: subgraph.nodes.length,
        edgeCount: subgraph.edges.length,
      },
    };
  }

  @Get('statistics')
  @ApiOperation({ summary: 'Get graph statistics' })
  @ApiResponse({ status: 200, description: 'Graph statistics', type: GraphStatisticsResponseDto })
  getStatistics() {
    const stats = this.graphService.getStatistics();
    return {
      success: true,
      data: stats,
    };
  }

  @Get('cycles')
  @ApiOperation({ summary: 'Detect cycles in the dependency graph' })
  @ApiResponse({ status: 200, description: 'Cycle detection results', type: CycleDetectionResponseDto })
  detectCycles() {
    const cycles = this.graphService.detectCycles();

    return {
      success: true,
      data: {
        hasCycles: cycles.length > 0,
        cycleCount: cycles.length,
        cycles,
      },
    };
  }

  @Get('topological-sort')
  @ApiOperation({ summary: 'Get topological sort of the dependency graph' })
  @ApiResponse({ status: 200, description: 'Topologically sorted list of services' })
  @ApiResponse({ status: 400, description: 'Graph contains cycles, cannot sort' })
  getTopologicalSort() {
    const sorted = this.graphService.topologicalSort();

    if (sorted === null) {
      return {
        success: false,
        message: 'Cannot perform topological sort: graph contains cycles',
        data: null,
      };
    }

    return {
      success: true,
      count: sorted.length,
      data: sorted,
    };
  }

  @Get('export')
  @ApiOperation({ summary: 'Export the entire graph as JSON' })
  @ApiResponse({ status: 200, description: 'Exported graph data' })
  exportGraph() {
    const graph = this.graphService.exportGraph();
    return {
      success: true,
      data: graph,
    };
  }
}
