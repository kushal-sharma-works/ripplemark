import { Test, TestingModule } from '@nestjs/testing';
import { GraphService } from './graph.service';
import { ServiceNode, DependencyEdge } from './entities';

describe('GraphService', () => {
  let service: GraphService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GraphService],
    }).compile();

    service = module.get<GraphService>(GraphService);
  });

  afterEach(() => {
    service.clear();
  });

  describe('Node Operations', () => {
    it('should add a node', () => {
      const node = new ServiceNode('svc1', 'Service 1', '1.0.0', 'sync');
      service.addNode(node);

      const retrieved = service.getNode('svc1');
      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe('Service 1');
    });

    it('should throw error when adding duplicate node', () => {
      const node = new ServiceNode('svc1', 'Service 1', '1.0.0', 'sync');
      service.addNode(node);

      expect(() => service.addNode(node)).toThrow();
    });

    it('should update a node', () => {
      const node = new ServiceNode('svc1', 'Service 1', '1.0.0', 'sync');
      service.addNode(node);

      service.updateNode('svc1', { version: '2.0.0' });
      const updated = service.getNode('svc1');
      expect(updated?.version).toBe('2.0.0');
    });

    it('should remove a node', () => {
      const node = new ServiceNode('svc1', 'Service 1', '1.0.0', 'sync');
      service.addNode(node);

      service.removeNode('svc1');
      const retrieved = service.getNode('svc1');
      expect(retrieved).toBeUndefined();
    });

    it('should get all nodes', () => {
      const node1 = new ServiceNode('svc1', 'Service 1', '1.0.0', 'sync');
      const node2 = new ServiceNode('svc2', 'Service 2', '1.0.0', 'async');
      service.addNode(node1);
      service.addNode(node2);

      const nodes = service.getAllNodes();
      expect(nodes).toHaveLength(2);
    });
  });

  describe('Edge Operations', () => {
    beforeEach(() => {
      const node1 = new ServiceNode('svc1', 'Service 1', '1.0.0', 'sync');
      const node2 = new ServiceNode('svc2', 'Service 2', '1.0.0', 'async');
      service.addNode(node1);
      service.addNode(node2);
    });

    it('should add an edge', () => {
      const edge = new DependencyEdge('svc1', 'svc2', 'http', 1, 100);
      service.addEdge(edge);

      const edges = service.getEdges('svc1');
      expect(edges).toHaveLength(1);
      expect(edges[0].target).toBe('svc2');
    });

    it('should throw error when adding duplicate edge', () => {
      const edge = new DependencyEdge('svc1', 'svc2', 'http', 1, 100);
      service.addEdge(edge);

      expect(() => service.addEdge(edge)).toThrow();
    });

    it('should update an edge', () => {
      const edge = new DependencyEdge('svc1', 'svc2', 'http', 1, 100);
      service.addEdge(edge);

      service.updateEdge('svc1', 'svc2', 'http', { latency: 200 });
      const edges = service.getEdges('svc1');
      expect(edges[0].latency).toBe(200);
    });

    it('should remove an edge', () => {
      const edge = new DependencyEdge('svc1', 'svc2', 'http', 1, 100);
      service.addEdge(edge);

      service.removeEdge('svc1', 'svc2', 'http');
      const edges = service.getEdges('svc1');
      expect(edges).toHaveLength(0);
    });
  });

  describe('Cycle Detection (Tarjan\'s Algorithm)', () => {
    it('should detect no cycles in acyclic graph', () => {
      const node1 = new ServiceNode('svc1', 'Service 1', '1.0.0', 'sync');
      const node2 = new ServiceNode('svc2', 'Service 2', '1.0.0', 'sync');
      const node3 = new ServiceNode('svc3', 'Service 3', '1.0.0', 'sync');

      service.addNode(node1);
      service.addNode(node2);
      service.addNode(node3);

      service.addEdge(new DependencyEdge('svc1', 'svc2', 'http'));
      service.addEdge(new DependencyEdge('svc2', 'svc3', 'http'));

      const cycles = service.detectCycles();
      expect(cycles).toHaveLength(0);
    });

    it('should detect simple cycle', () => {
      const node1 = new ServiceNode('svc1', 'Service 1', '1.0.0', 'sync');
      const node2 = new ServiceNode('svc2', 'Service 2', '1.0.0', 'sync');
      const node3 = new ServiceNode('svc3', 'Service 3', '1.0.0', 'sync');

      service.addNode(node1);
      service.addNode(node2);
      service.addNode(node3);

      service.addEdge(new DependencyEdge('svc1', 'svc2', 'http'));
      service.addEdge(new DependencyEdge('svc2', 'svc3', 'http'));
      service.addEdge(new DependencyEdge('svc3', 'svc1', 'http'));

      const cycles = service.detectCycles();
      expect(cycles.length).toBeGreaterThan(0);
      expect(cycles[0]).toContain('svc1');
      expect(cycles[0]).toContain('svc2');
      expect(cycles[0]).toContain('svc3');
    });

    it('should detect self-loop', () => {
      const node1 = new ServiceNode('svc1', 'Service 1', '1.0.0', 'sync');
      service.addNode(node1);

      service.addEdge(new DependencyEdge('svc1', 'svc1', 'http'));

      const cycles = service.detectCycles();
      expect(cycles.length).toBeGreaterThan(0);
    });
  });

  describe('Topological Sort', () => {
    it('should return topological sort for acyclic graph', () => {
      const node1 = new ServiceNode('svc1', 'Service 1', '1.0.0', 'sync');
      const node2 = new ServiceNode('svc2', 'Service 2', '1.0.0', 'sync');
      const node3 = new ServiceNode('svc3', 'Service 3', '1.0.0', 'sync');

      service.addNode(node1);
      service.addNode(node2);
      service.addNode(node3);

      service.addEdge(new DependencyEdge('svc1', 'svc2', 'http'));
      service.addEdge(new DependencyEdge('svc2', 'svc3', 'http'));

      const sorted = service.topologicalSort();
      expect(sorted).not.toBeNull();
      expect(sorted).toHaveLength(3);

      const idx1 = sorted!.indexOf('svc1');
      const idx2 = sorted!.indexOf('svc2');
      const idx3 = sorted!.indexOf('svc3');

      expect(idx1).toBeLessThan(idx2);
      expect(idx2).toBeLessThan(idx3);
    });

    it('should return null for cyclic graph', () => {
      const node1 = new ServiceNode('svc1', 'Service 1', '1.0.0', 'sync');
      const node2 = new ServiceNode('svc2', 'Service 2', '1.0.0', 'sync');

      service.addNode(node1);
      service.addNode(node2);

      service.addEdge(new DependencyEdge('svc1', 'svc2', 'http'));
      service.addEdge(new DependencyEdge('svc2', 'svc1', 'http'));

      const sorted = service.topologicalSort();
      expect(sorted).toBeNull();
    });
  });

  describe('Dependency Queries', () => {
    beforeEach(() => {
      // Create a graph: svc1 -> svc2 -> svc3 -> svc4
      for (let i = 1; i <= 4; i++) {
        service.addNode(
          new ServiceNode(`svc${i}`, `Service ${i}`, '1.0.0', 'sync'),
        );
      }

      service.addEdge(new DependencyEdge('svc1', 'svc2', 'http'));
      service.addEdge(new DependencyEdge('svc2', 'svc3', 'http'));
      service.addEdge(new DependencyEdge('svc3', 'svc4', 'http'));
    });

    it('should get direct dependencies', () => {
      const deps = service.getDirectDependencies('svc1');
      expect(deps).toHaveLength(1);
      expect(deps[0]).toBe('svc2');
    });

    it('should get transitive dependencies', () => {
      const deps = service.getTransitiveDependencies('svc1', 10);
      expect(deps.size).toBe(3);
      expect(deps.has('svc2')).toBe(true);
      expect(deps.has('svc3')).toBe(true);
      expect(deps.has('svc4')).toBe(true);
    });

    it('should respect depth limit in transitive dependencies', () => {
      const deps = service.getTransitiveDependencies('svc1', 1);
      expect(deps.size).toBe(1);
      expect(deps.has('svc2')).toBe(true);
      expect(deps.has('svc3')).toBe(false);
    });

    it('should get reverse dependencies', () => {
      const deps = service.getReverseDependencies('svc2');
      expect(deps).toHaveLength(1);
      expect(deps[0]).toBe('svc1');
    });

    it('should get transitive reverse dependencies', () => {
      const deps = service.getTransitiveReverseDependencies('svc4', 10);
      expect(deps.size).toBe(3);
      expect(deps.has('svc3')).toBe(true);
      expect(deps.has('svc2')).toBe(true);
      expect(deps.has('svc1')).toBe(true);
    });
  });

  describe('Blast Radius Calculation', () => {
    beforeEach(() => {
      // Create a star graph with svc1 at center
      service.addNode(new ServiceNode('svc1', 'Service 1', '1.0.0', 'sync'));
      for (let i = 2; i <= 5; i++) {
        service.addNode(
          new ServiceNode(`svc${i}`, `Service ${i}`, '1.0.0', 'sync'),
        );
      }

      // svc1 depends on svc2, svc3
      service.addEdge(new DependencyEdge('svc1', 'svc2', 'http'));
      service.addEdge(new DependencyEdge('svc1', 'svc3', 'http'));

      // svc4, svc5 depend on svc1
      service.addEdge(new DependencyEdge('svc4', 'svc1', 'http'));
      service.addEdge(new DependencyEdge('svc5', 'svc1', 'http'));
    });

    it('should calculate blast radius', () => {
      const radius = service.calculateBlastRadius('svc1', 3);

      expect(radius.affected.size).toBe(2); // svc2, svc3
      expect(radius.affectedBy.size).toBe(2); // svc4, svc5
      expect(radius.total).toBe(4);
    });
  });

  describe('Shortest Path', () => {
    beforeEach(() => {
      // Create a graph with multiple paths
      for (let i = 1; i <= 5; i++) {
        service.addNode(
          new ServiceNode(`svc${i}`, `Service ${i}`, '1.0.0', 'sync'),
        );
      }

      // Shorter path: svc1 -> svc2 -> svc5
      service.addEdge(new DependencyEdge('svc1', 'svc2', 'http'));
      service.addEdge(new DependencyEdge('svc2', 'svc5', 'http'));

      // Longer path: svc1 -> svc3 -> svc4 -> svc5
      service.addEdge(new DependencyEdge('svc1', 'svc3', 'http'));
      service.addEdge(new DependencyEdge('svc3', 'svc4', 'http'));
      service.addEdge(new DependencyEdge('svc4', 'svc5', 'http'));
    });

    it('should find shortest path', () => {
      const path = service.findShortestPath('svc1', 'svc5');
      expect(path).not.toBeNull();
      expect(path).toHaveLength(3); // svc1 -> svc2 -> svc5
      expect(path![0]).toBe('svc1');
      expect(path![1]).toBe('svc2');
      expect(path![2]).toBe('svc5');
    });

    it('should return null when no path exists', () => {
      service.addNode(new ServiceNode('isolated', 'Isolated', '1.0.0', 'sync'));
      const path = service.findShortestPath('svc1', 'isolated');
      expect(path).toBeNull();
    });
  });

  describe('Graph Statistics', () => {
    it('should return correct statistics', () => {
      const node1 = new ServiceNode('svc1', 'Service 1', '1.0.0', 'sync');
      const node2 = new ServiceNode('svc2', 'Service 2', '1.0.0', 'sync');
      service.addNode(node1);
      service.addNode(node2);

      service.addEdge(new DependencyEdge('svc1', 'svc2', 'http'));

      const stats = service.getStatistics();
      expect(stats.nodeCount).toBe(2);
      expect(stats.edgeCount).toBe(1);
      expect(stats.averageDegree).toBe(0.5);
    });
  });

  describe('Export and Import', () => {
    it('should export and import graph', () => {
      const node1 = new ServiceNode('svc1', 'Service 1', '1.0.0', 'sync');
      const node2 = new ServiceNode('svc2', 'Service 2', '1.0.0', 'sync');
      service.addNode(node1);
      service.addNode(node2);

      service.addEdge(new DependencyEdge('svc1', 'svc2', 'http'));

      const exported = service.exportGraph();
      expect(exported.nodes).toHaveLength(2);
      expect(exported.edges).toHaveLength(1);

      service.clear();
      expect(service.getAllNodes()).toHaveLength(0);

      service.importGraph(exported);
      expect(service.getAllNodes()).toHaveLength(2);
      expect(service.getAllEdges()).toHaveLength(1);
    });
  });
});
