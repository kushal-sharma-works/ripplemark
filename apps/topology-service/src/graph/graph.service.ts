import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { ServiceNode, DependencyEdge, DependencyType } from './entities';

export interface GraphStatistics {
  nodeCount: number;
  edgeCount: number;
  averageDegree: number;
  density: number;
}

export interface PathResult {
  path: string[];
  totalWeight: number;
  totalLatency: number;
}

@Injectable()
export class GraphService {
  private readonly logger = new Logger(GraphService.name);
  private nodes: Map<string, ServiceNode> = new Map();
  private adjacencyList: Map<string, DependencyEdge[]> = new Map();
  private reverseAdjacencyList: Map<string, DependencyEdge[]> = new Map();

  // Node operations
  addNode(node: ServiceNode): void {
    if (this.nodes.has(node.id)) {
      throw new BadRequestException(`Service node with ID ${node.id} already exists`);
    }
    this.nodes.set(node.id, node);
    this.adjacencyList.set(node.id, []);
    this.reverseAdjacencyList.set(node.id, []);
    this.logger.log(`Added node: ${node.id} (${node.name})`);
  }

  updateNode(id: string, data: Partial<ServiceNode>): ServiceNode {
    const node = this.nodes.get(id);
    if (!node) {
      throw new NotFoundException(`Service node ${id} not found`);
    }
    node.update(data);
    this.nodes.set(id, node);
    this.logger.log(`Updated node: ${id}`);
    return node;
  }

  removeNode(id: string): void {
    if (!this.nodes.has(id)) {
      throw new NotFoundException(`Service node ${id} not found`);
    }

    // Remove all edges connected to this node
    const outgoingEdges = this.adjacencyList.get(id) || [];
    for (const edge of outgoingEdges) {
      this.removeEdgeFromReverse(edge);
    }

    const incomingEdges = this.reverseAdjacencyList.get(id) || [];
    for (const edge of incomingEdges) {
      this.removeEdgeFromForward(edge);
    }

    this.nodes.delete(id);
    this.adjacencyList.delete(id);
    this.reverseAdjacencyList.delete(id);
    this.logger.log(`Removed node: ${id}`);
  }

  getNode(id: string): ServiceNode | undefined {
    return this.nodes.get(id);
  }

  getAllNodes(): ServiceNode[] {
    return Array.from(this.nodes.values());
  }

  // Edge operations
  addEdge(edge: DependencyEdge): void {
    if (!this.nodes.has(edge.source)) {
      throw new NotFoundException(`Source node ${edge.source} not found`);
    }
    if (!this.nodes.has(edge.target)) {
      throw new NotFoundException(`Target node ${edge.target} not found`);
    }

    // Check if edge already exists
    const existingEdges = this.adjacencyList.get(edge.source) || [];
    const exists = existingEdges.some((e) => e.target === edge.target && e.type === edge.type);
    if (exists) {
      throw new BadRequestException(
        `Edge from ${edge.source} to ${edge.target} of type ${edge.type} already exists`,
      );
    }

    this.adjacencyList.get(edge.source)!.push(edge);
    this.reverseAdjacencyList.get(edge.target)!.push(edge);
    this.logger.log(`Added edge: ${edge.source} -> ${edge.target} (${edge.type})`);
  }

  updateEdge(source: string, target: string, type: DependencyType, data: Partial<DependencyEdge>): DependencyEdge {
    const edges = this.adjacencyList.get(source);
    if (!edges) {
      throw new NotFoundException(`Source node ${source} not found`);
    }

    const edge = edges.find((e) => e.target === target && e.type === type);
    if (!edge) {
      throw new NotFoundException(`Edge from ${source} to ${target} of type ${type} not found`);
    }

    edge.update(data);
    this.logger.log(`Updated edge: ${source} -> ${target}`);
    return edge;
  }

  removeEdge(source: string, target: string, type: DependencyType): void {
    const edges = this.adjacencyList.get(source);
    if (!edges) {
      throw new NotFoundException(`Source node ${source} not found`);
    }

    const edgeIndex = edges.findIndex((e) => e.target === target && e.type === type);
    if (edgeIndex === -1) {
      throw new NotFoundException(`Edge from ${source} to ${target} of type ${type} not found`);
    }

    const edge = edges[edgeIndex];
    edges.splice(edgeIndex, 1);
    this.removeEdgeFromReverse(edge);
    this.logger.log(`Removed edge: ${source} -> ${target}`);
  }

  private removeEdgeFromForward(edge: DependencyEdge): void {
    const edges = this.adjacencyList.get(edge.source);
    if (edges) {
      const index = edges.findIndex((e) => e.target === edge.target && e.type === edge.type);
      if (index !== -1) {
        edges.splice(index, 1);
      }
    }
  }

  private removeEdgeFromReverse(edge: DependencyEdge): void {
    const edges = this.reverseAdjacencyList.get(edge.target);
    if (edges) {
      const index = edges.findIndex((e) => e.source === edge.source && e.type === edge.type);
      if (index !== -1) {
        edges.splice(index, 1);
      }
    }
  }

  getEdges(source: string): DependencyEdge[] {
    return this.adjacencyList.get(source) || [];
  }

  getAllEdges(): DependencyEdge[] {
    const edges: DependencyEdge[] = [];
    for (const edgeList of this.adjacencyList.values()) {
      edges.push(...edgeList);
    }
    return edges;
  }

  // Cycle detection using Tarjan's algorithm
  detectCycles(): string[][] {
    const index = new Map<string, number>();
    const lowLink = new Map<string, number>();
    const onStack = new Set<string>();
    const stack: string[] = [];
    const cycles: string[][] = [];
    let currentIndex = 0;

    const strongConnect = (nodeId: string) => {
      index.set(nodeId, currentIndex);
      lowLink.set(nodeId, currentIndex);
      currentIndex++;
      stack.push(nodeId);
      onStack.add(nodeId);

      const edges = this.adjacencyList.get(nodeId) || [];
      for (const edge of edges) {
        const targetId = edge.target;
        if (!index.has(targetId)) {
          strongConnect(targetId);
          lowLink.set(nodeId, Math.min(lowLink.get(nodeId)!, lowLink.get(targetId)!));
        } else if (onStack.has(targetId)) {
          lowLink.set(nodeId, Math.min(lowLink.get(nodeId)!, index.get(targetId)!));
        }
      }

      if (lowLink.get(nodeId) === index.get(nodeId)) {
        const component: string[] = [];
        let w: string;
        do {
          w = stack.pop()!;
          onStack.delete(w);
          component.push(w);
        } while (w !== nodeId);

        // Only add if it's a real cycle (more than one node or self-loop)
        if (component.length > 1 || this.hasSelfLoop(nodeId)) {
          cycles.push(component);
        }
      }
    };

    for (const nodeId of this.nodes.keys()) {
      if (!index.has(nodeId)) {
        strongConnect(nodeId);
      }
    }

    this.logger.log(`Detected ${cycles.length} cycle(s)`);
    return cycles;
  }

  private hasSelfLoop(nodeId: string): boolean {
    const edges = this.adjacencyList.get(nodeId) || [];
    return edges.some((e) => e.target === nodeId);
  }

  // Topological sort (returns null if cycle exists)
  topologicalSort(): string[] | null {
    const cycles = this.detectCycles();
    if (cycles.length > 0) {
      this.logger.warn('Cannot perform topological sort: graph contains cycles');
      return null;
    }

    const inDegree = new Map<string, number>();
    for (const nodeId of this.nodes.keys()) {
      inDegree.set(nodeId, 0);
    }

    for (const edges of this.adjacencyList.values()) {
      for (const edge of edges) {
        inDegree.set(edge.target, inDegree.get(edge.target)! + 1);
      }
    }

    const queue: string[] = [];
    for (const [nodeId, degree] of inDegree.entries()) {
      if (degree === 0) {
        queue.push(nodeId);
      }
    }

    const result: string[] = [];
    while (queue.length > 0) {
      const nodeId = queue.shift()!;
      result.push(nodeId);

      const edges = this.adjacencyList.get(nodeId) || [];
      for (const edge of edges) {
        const newDegree = inDegree.get(edge.target)! - 1;
        inDegree.set(edge.target, newDegree);
        if (newDegree === 0) {
          queue.push(edge.target);
        }
      }
    }

    return result.length === this.nodes.size ? result : null;
  }

  // Get direct dependencies
  getDirectDependencies(nodeId: string, typeFilter?: DependencyType): string[] {
    if (!this.nodes.has(nodeId)) {
      throw new NotFoundException(`Node ${nodeId} not found`);
    }

    const edges = this.adjacencyList.get(nodeId) || [];
    const filtered = typeFilter ? edges.filter((e) => e.type === typeFilter) : edges;
    return filtered.map((e) => e.target);
  }

  // Get transitive dependencies (BFS with depth limit)
  getTransitiveDependencies(
    nodeId: string,
    maxDepth: number = 10,
    typeFilter?: DependencyType,
  ): Map<string, number> {
    if (!this.nodes.has(nodeId)) {
      throw new NotFoundException(`Node ${nodeId} not found`);
    }

    const visited = new Map<string, number>(); // nodeId -> depth
    const queue: Array<{ id: string; depth: number }> = [{ id: nodeId, depth: 0 }];

    while (queue.length > 0) {
      const { id, depth } = queue.shift()!;

      if (depth > maxDepth) continue;
      if (visited.has(id)) continue;

      if (id !== nodeId) {
        visited.set(id, depth);
      }

      const edges = this.adjacencyList.get(id) || [];
      const filtered = typeFilter ? edges.filter((e) => e.type === typeFilter) : edges;

      for (const edge of filtered) {
        if (!visited.has(edge.target)) {
          queue.push({ id: edge.target, depth: depth + 1 });
        }
      }
    }

    return visited;
  }

  // Get reverse dependencies (what depends on this node)
  getReverseDependencies(nodeId: string, typeFilter?: DependencyType): string[] {
    if (!this.nodes.has(nodeId)) {
      throw new NotFoundException(`Node ${nodeId} not found`);
    }

    const edges = this.reverseAdjacencyList.get(nodeId) || [];
    const filtered = typeFilter ? edges.filter((e) => e.type === typeFilter) : edges;
    return filtered.map((e) => e.source);
  }

  // Get transitive reverse dependencies
  getTransitiveReverseDependencies(
    nodeId: string,
    maxDepth: number = 10,
    typeFilter?: DependencyType,
  ): Map<string, number> {
    if (!this.nodes.has(nodeId)) {
      throw new NotFoundException(`Node ${nodeId} not found`);
    }

    const visited = new Map<string, number>();
    const queue: Array<{ id: string; depth: number }> = [{ id: nodeId, depth: 0 }];

    while (queue.length > 0) {
      const { id, depth } = queue.shift()!;

      if (depth > maxDepth) continue;
      if (visited.has(id)) continue;

      if (id !== nodeId) {
        visited.set(id, depth);
      }

      const edges = this.reverseAdjacencyList.get(id) || [];
      const filtered = typeFilter ? edges.filter((e) => e.type === typeFilter) : edges;

      for (const edge of filtered) {
        if (!visited.has(edge.source)) {
          queue.push({ id: edge.source, depth: depth + 1 });
        }
      }
    }

    return visited;
  }

  // Calculate blast radius (both direct and reverse dependencies up to depth)
  calculateBlastRadius(nodeId: string, maxDepth: number = 3): {
    affected: Set<string>;
    affectedBy: Set<string>;
    total: number;
  } {
    if (!this.nodes.has(nodeId)) {
      throw new NotFoundException(`Node ${nodeId} not found`);
    }

    const affected = new Set<string>([
      ...this.getTransitiveDependencies(nodeId, maxDepth).keys(),
    ]);
    const affectedBy = new Set<string>([
      ...this.getTransitiveReverseDependencies(nodeId, maxDepth).keys(),
    ]);

    return {
      affected,
      affectedBy,
      total: affected.size + affectedBy.size,
    };
  }

  // Find shortest path using BFS
  findShortestPath(sourceId: string, targetId: string): string[] | null {
    if (!this.nodes.has(sourceId)) {
      throw new NotFoundException(`Source node ${sourceId} not found`);
    }
    if (!this.nodes.has(targetId)) {
      throw new NotFoundException(`Target node ${targetId} not found`);
    }

    if (sourceId === targetId) {
      return [sourceId];
    }

    const queue: string[] = [sourceId];
    const visited = new Set<string>([sourceId]);
    const parent = new Map<string, string>();

    while (queue.length > 0) {
      const current = queue.shift()!;

      if (current === targetId) {
        // Reconstruct path
        const path: string[] = [];
        let node = targetId;
        while (node !== sourceId) {
          path.unshift(node);
          node = parent.get(node)!;
        }
        path.unshift(sourceId);
        return path;
      }

      const edges = this.adjacencyList.get(current) || [];
      for (const edge of edges) {
        if (!visited.has(edge.target)) {
          visited.add(edge.target);
          parent.set(edge.target, current);
          queue.push(edge.target);
        }
      }
    }

    return null; // No path found
  }

  // Extract subgraph
  extractSubgraph(nodeIds: string[]): {
    nodes: ServiceNode[];
    edges: DependencyEdge[];
  } {
    const nodeSet = new Set(nodeIds);
    const nodes: ServiceNode[] = [];
    const edges: DependencyEdge[] = [];

    for (const nodeId of nodeIds) {
      const node = this.nodes.get(nodeId);
      if (node) {
        nodes.push(node);
        const nodeEdges = this.adjacencyList.get(nodeId) || [];
        for (const edge of nodeEdges) {
          if (nodeSet.has(edge.target)) {
            edges.push(edge);
          }
        }
      }
    }

    return { nodes, edges };
  }

  // Get graph statistics
  getStatistics(): GraphStatistics {
    const nodeCount = this.nodes.size;
    const edgeCount = this.getAllEdges().length;

    let totalDegree = 0;
    for (const edges of this.adjacencyList.values()) {
      totalDegree += edges.length;
    }

    const averageDegree = nodeCount > 0 ? totalDegree / nodeCount : 0;
    const maxEdges = nodeCount * (nodeCount - 1);
    const density = maxEdges > 0 ? edgeCount / maxEdges : 0;

    return {
      nodeCount,
      edgeCount,
      averageDegree,
      density,
    };
  }

  // Clear the entire graph
  clear(): void {
    this.nodes.clear();
    this.adjacencyList.clear();
    this.reverseAdjacencyList.clear();
    this.logger.log('Graph cleared');
  }

  // Export graph to JSON
  exportGraph(): {
    nodes: any[];
    edges: any[];
  } {
    return {
      nodes: Array.from(this.nodes.values()).map((n) => n.toJSON()),
      edges: this.getAllEdges().map((e) => e.toJSON()),
    };
  }

  // Import graph from JSON
  importGraph(data: { nodes: any[]; edges: any[] }): void {
    this.clear();

    for (const nodeData of data.nodes) {
      const node = new ServiceNode(
        nodeData.id,
        nodeData.name,
        nodeData.version,
        nodeData.type,
        nodeData.metadata,
      );
      this.addNode(node);
    }

    for (const edgeData of data.edges) {
      const edge = new DependencyEdge(
        edgeData.source,
        edgeData.target,
        edgeData.type,
        edgeData.weight,
        edgeData.latency,
        edgeData.metadata,
      );
      this.addEdge(edge);
    }

    this.logger.log(
      `Imported graph with ${data.nodes.length} nodes and ${data.edges.length} edges`,
    );
  }
}
