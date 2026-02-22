import { IngestionController } from './ingestion.controller';

describe('IngestionController', () => {
  const graphService = {
    addNode: jest.fn(),
    updateNode: jest.fn(),
    removeNode: jest.fn(),
    addEdge: jest.fn(),
    updateEdge: jest.fn(),
    removeEdge: jest.fn(),
    getStatistics: jest.fn(() => ({ nodeCount: 3, edgeCount: 2 })),
  };

  const graphGateway = {
    emitGraphUpdate: jest.fn(),
  };

  const metricsService = {
    setGraphCounts: jest.fn(),
    incrementChangeProposals: jest.fn(),
    observeAnalysisDuration: jest.fn(),
  };

  let controller: IngestionController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new IngestionController(graphService as any, graphGateway as any, metricsService as any);
  });

  it('registers service and emits node event', () => {
    const result = controller.registerService({
      id: 'svc-a',
      name: 'Service A',
      version: '1.0.0',
      type: 'sync',
      metadata: { team: 'platform' },
    } as any);

    expect(result.success).toBe(true);
    expect(graphService.addNode).toHaveBeenCalled();
    expect(graphGateway.emitGraphUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'node_added' }),
    );
    expect(metricsService.setGraphCounts).toHaveBeenCalledWith(3, 2);
  });

  it('bulk registers services and collects per-item failures', () => {
    graphService.addNode
      .mockImplementationOnce(() => undefined)
      .mockImplementationOnce(() => {
        throw new Error('duplicate');
      });

    const result = controller.registerServicesBulk({
      services: [
        { id: 'svc-a', name: 'A', version: '1.0.0', type: 'sync' },
        { id: 'svc-b', name: 'B', version: '1.0.0', type: 'async' },
      ],
    } as any);

    expect(result.success).toBe(false);
    expect(result.registered).toBe(1);
    expect(result.failed).toBe(1);
    expect(result.errors[0].serviceId).toBe('svc-b');
  });

  it('updates service and emits update event', () => {
    graphService.updateNode.mockReturnValue({ toJSON: () => ({ id: 'svc-a', name: 'A2' }) });

    const result = controller.updateService('svc-a', { name: 'A2' } as any);

    expect(result.success).toBe(true);
    expect(graphService.updateNode).toHaveBeenCalledWith('svc-a', { name: 'A2' });
    expect(graphGateway.emitGraphUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'node_updated' }),
    );
  });

  it('registers dependency and emits edge event', () => {
    const result = controller.registerDependency({
      source: 'svc-a',
      target: 'svc-b',
      type: 'http',
      weight: 2,
    } as any);

    expect(result.success).toBe(true);
    expect(graphService.addEdge).toHaveBeenCalled();
    expect(graphGateway.emitGraphUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'edge_added' }),
    );
  });

  it('removes dependency and emits edge removed event', () => {
    controller.removeDependency('svc-a', 'svc-b', 'http');

    expect(graphService.removeEdge).toHaveBeenCalledWith('svc-a', 'svc-b', 'http');
    expect(graphGateway.emitGraphUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'edge_removed' }),
    );
  });

  it('updates existing dependency when report finds duplicate edge', () => {
    graphService.addEdge.mockImplementationOnce(() => {
      throw new Error('already exists');
    });

    const result = controller.submitDependencyReport({
      serviceId: 'svc-a',
      dependencies: [{ target: 'svc-b', type: 'grpc', weight: 3 }],
    } as any);

    expect(result.success).toBe(true);
    expect(graphService.updateEdge).toHaveBeenCalledWith('svc-a', 'svc-b', 'grpc', {
      weight: 3,
      latency: undefined,
      metadata: undefined,
    });
    expect(metricsService.incrementChangeProposals).toHaveBeenCalled();
    expect(metricsService.observeAnalysisDuration).toHaveBeenCalled();
  });
});
