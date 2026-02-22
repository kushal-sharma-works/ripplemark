import { GraphGateway } from './graph.gateway';

describe('GraphGateway', () => {
  let gateway: GraphGateway;

  beforeEach(() => {
    gateway = new GraphGateway();
    (gateway as any).server = {
      emit: jest.fn(),
      to: jest.fn(() => ({ emit: jest.fn() })),
      sockets: { adapter: { rooms: new Map([['all', new Set(['c1'])]]) } },
    } as any;
  });

  it('tracks client connection and disconnection', () => {
    const client = { id: 'c1', emit: jest.fn(), join: jest.fn(), leave: jest.fn() } as any;

    gateway.handleConnection(client);
    expect(client.emit).toHaveBeenCalledWith('connected', expect.objectContaining({ clientId: 'c1' }));

    gateway.handleDisconnect(client);
    expect(gateway.getConnectionStats().connectedClients).toBe(0);
  });

  it('handles subscribe and unsubscribe', () => {
    const client = { id: 'c1', emit: jest.fn(), join: jest.fn(), leave: jest.fn() } as any;

    const subscribed = gateway.handleSubscribe(client, { eventTypes: ['node_added', 'edge_added'] });
    const unsubscribed = gateway.handleUnsubscribe(client, { eventTypes: ['edge_added'] });

    expect(client.join).toHaveBeenCalledTimes(2);
    expect(client.leave).toHaveBeenCalledWith('edge_added');
    expect(subscribed.success).toBe(true);
    expect(unsubscribed.success).toBe(true);
  });

  it('handles ping and emits graph updates', () => {
    const pong = gateway.handlePing({} as any);

    gateway.emitGraphUpdate({
      eventType: 'edge_added',
      timestamp: new Date(),
      payload: { source: 'svc-a', target: 'svc-b' },
    });

    expect(pong.event).toBe('pong');
    expect((gateway as any).server.emit).not.toHaveBeenCalled();
    expect((gateway as any).server.to).toHaveBeenCalledWith('edge_added');
    expect((gateway as any).server.to).toHaveBeenCalledWith('all');
  });

  it('returns connection stats', () => {
    const client = { id: 'c1', emit: jest.fn(), join: jest.fn(), leave: jest.fn() } as any;
    gateway.handleConnection(client);

    const stats = gateway.getConnectionStats();
    expect(stats.connectedClients).toBe(1);
    expect(stats.rooms).toBe(1);
  });
});
