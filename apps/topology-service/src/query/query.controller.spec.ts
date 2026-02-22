import { NotFoundException } from '@nestjs/common';
import { QueryController } from './query.controller';

describe('QueryController', () => {
  const graphService = {
    getAllNodes: jest.fn(() => [{ toJSON: () => ({ id: 'svc-a' }) }]),
    getNode: jest.fn(),
    getAllEdges: jest.fn(() => [{ toJSON: () => ({ source: 'svc-a', target: 'svc-b' }) }]),
    getDirectDependencies: jest.fn(() => ['svc-b']),
    getTransitiveDependencies: jest.fn(() => new Map<string, number>([['svc-b', 1], ['svc-c', 2]])),
    getReverseDependencies: jest.fn(() => ['svc-z']),
    getTransitiveReverseDependencies: jest.fn(() => new Map<string, number>([['svc-z', 1]])),
    calculateBlastRadius: jest.fn(() => ({ affected: new Set(['svc-b']), affectedBy: new Set(['svc-z']), total: 2 })),
    findShortestPath: jest.fn(() => ['svc-a', 'svc-b']),
    extractSubgraph: jest.fn(() => ({
      nodes: [{ toJSON: () => ({ id: 'svc-a' }) }],
      edges: [{ toJSON: () => ({ source: 'svc-a', target: 'svc-b' }) }],
    })),
    getStatistics: jest.fn(() => ({ nodeCount: 2, edgeCount: 1 })),
    detectCycles: jest.fn(() => [['svc-a', 'svc-b', 'svc-a']]),
    topologicalSort: jest.fn(() => ['svc-a', 'svc-b']),
    exportGraph: jest.fn(() => ({ nodes: [{ id: 'svc-a' }], edges: [] })),
  };

  let controller: QueryController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new QueryController(graphService as any);
  });

  it('returns all services', () => {
    const result = controller.getAllServices();
    expect(result.success).toBe(true);
    expect(result.count).toBe(1);
  });

  it('throws when service does not exist', () => {
    graphService.getNode.mockReturnValueOnce(null);
    expect(() => controller.getService('missing')).toThrow(NotFoundException);
  });

  it('returns dependencies and transitive maps', () => {
    const direct = controller.getDirectDependencies('svc-a', { typeFilter: 'http' } as any);
    const transitive = controller.getTransitiveDependencies('svc-a', { maxDepth: 4 } as any);

    expect(direct.count).toBe(1);
    expect(transitive.data).toEqual({ 'svc-b': 1, 'svc-c': 2 });
  });

  it('returns reverse dependency views', () => {
    const reverse = controller.getReverseDependencies('svc-a', {} as any);
    const reverseTransitive = controller.getTransitiveReverseDependencies('svc-a', {} as any);

    expect(reverse.count).toBe(1);
    expect(reverseTransitive.data).toEqual({ 'svc-z': 1 });
  });

  it('calculates blast radius and shortest path', () => {
    const blast = controller.getBlastRadius('svc-a', { maxDepth: 2 } as any);
    const path = controller.getShortestPath('svc-a', 'svc-b');

    expect(blast.data.total).toBe(2);
    expect(path.data.found).toBe(true);
    expect(path.data.length).toBe(2);
  });

  it('returns subgraph, statistics, cycles and export', () => {
    const subgraph = controller.getSubgraph({ nodeIds: ['svc-a'] } as any);
    const stats = controller.getStatistics();
    const cycles = controller.detectCycles();
    const exported = controller.exportGraph();

    expect(subgraph.data.nodeCount).toBe(1);
    expect(stats.data.nodeCount).toBe(2);
    expect(cycles.data.hasCycles).toBe(true);
    expect(exported.success).toBe(true);
  });

  it('returns topological sort failure response for cyclic graphs', () => {
    graphService.topologicalSort.mockReturnValueOnce(null as any);
    const result = controller.getTopologicalSort();

    expect(result.success).toBe(false);
    expect(result.message).toContain('graph contains cycles');
  });

  it('returns topological sort result when acyclic', () => {
    const result = controller.getTopologicalSort();

    expect(result.success).toBe(true);
    expect(result.count).toBe(2);
  });
});
