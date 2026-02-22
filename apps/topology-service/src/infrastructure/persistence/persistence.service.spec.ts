import { PersistenceService } from './persistence.service';

describe('PersistenceService', () => {
  const graphService = {
    exportGraph: jest.fn(() => ({ nodes: [{ id: 'a' }], edges: [{ source: 'a', target: 'b' }] })),
    getStatistics: jest.fn(() => ({ nodeCount: 1, edgeCount: 1 })),
    importGraph: jest.fn(),
  };

  let currentFindOneResult: any = null;
  let currentFindResults: any[] = [];

  const model = jest.fn().mockImplementation(function (this: any, data: any) {
    this.data = data;
    this.save = jest.fn().mockResolvedValue(undefined);
  }) as any;

  model.findOne = jest.fn(() => ({
    sort: jest.fn(() => ({
      exec: jest.fn(async () => currentFindOneResult),
    })),
    exec: jest.fn(async () => currentFindOneResult),
  }));

  model.find = jest.fn(() => ({
    sort: jest.fn(() => ({
      skip: jest.fn(() => ({ exec: jest.fn(async () => currentFindResults) })),
      exec: jest.fn(async () => currentFindResults),
    })),
  }));

  model.deleteMany = jest.fn(async () => ({ deletedCount: 2 }));

  let service: PersistenceService;

  beforeEach(() => {
    jest.clearAllMocks();
    currentFindOneResult = null;
    currentFindResults = [];
    service = new PersistenceService(model, graphService as any);
  });

  it('loads latest snapshot when present', async () => {
    currentFindOneResult = {
      version: 'v1',
      graphData: { nodes: [{ id: 'n1' }], edges: [{ source: 'n1', target: 'n2' }] },
    };

    const loaded = await service.loadLatestSnapshot();

    expect(loaded).toBe(true);
    expect(graphService.importGraph).toHaveBeenCalledWith(currentFindOneResult.graphData);
  });

  it('returns false when no snapshot exists', async () => {
    const loaded = await service.loadLatestSnapshot();
    expect(loaded).toBe(false);
  });

  it('saves snapshot with graph metadata', async () => {
    await service.saveSnapshot('manual-v1');

    expect(model).toHaveBeenCalledWith(
      expect.objectContaining({ version: 'manual-v1', graphData: expect.any(Object) }),
    );
  });

  it('returns snapshots and specific snapshot by version', async () => {
    currentFindResults = [{ version: 'v2' }];
    currentFindOneResult = { version: 'v2' };

    const all = await service.getAllSnapshots();
    const one = await service.getSnapshot('v2');

    expect(all).toEqual([{ version: 'v2' }]);
    expect(one).toEqual({ version: 'v2' });
  });

  it('restores snapshot and handles missing snapshot', async () => {
    currentFindOneResult = { version: 'v3', graphData: { nodes: [], edges: [] } };
    await expect(service.restoreSnapshot('v3')).resolves.toBe(true);

    currentFindOneResult = null;
    await expect(service.restoreSnapshot('missing')).resolves.toBe(false);
  });

  it('cleans up old snapshots and returns deleted count', async () => {
    currentFindResults = [{ _id: '1' }, { _id: '2' }];

    const removed = await service.cleanupOldSnapshots(1);

    expect(model.deleteMany).toHaveBeenCalledWith({ _id: { $in: ['1', '2'] } });
    expect(removed).toBe(2);
  });

  it('runs lifecycle hooks and periodic snapshot', async () => {
    const saveSpy = jest.spyOn(service, 'saveSnapshot');

    await service.onModuleInit();
    await service.handlePeriodicSnapshot();
    await service.onModuleDestroy();

    expect(saveSpy).toHaveBeenCalled();
  });
});
