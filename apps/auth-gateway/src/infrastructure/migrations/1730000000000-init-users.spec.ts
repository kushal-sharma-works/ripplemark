import { InitUsers1730000000000 } from './1730000000000-init-users';

describe('InitUsers1730000000000', () => {
  it('runs up and down queries', async () => {
    const migration = new InitUsers1730000000000();
    const queryRunner = { query: jest.fn().mockResolvedValue(undefined) };

    await migration.up(queryRunner as any);
    await migration.down(queryRunner as any);

    expect(migration.name).toBe('InitUsers1730000000000');
    expect(queryRunner.query).toHaveBeenCalledTimes(2);
    expect(queryRunner.query.mock.calls[1][0]).toContain('DROP TABLE IF EXISTS users');
  });
});
