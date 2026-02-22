describe('typeorm datasource', () => {
  it('exports postgres datasource with users entity and migrations', async () => {
    process.env.DATABASE_URL = 'postgres://user:pass@localhost:5432/db';
    const module = await import('./typeorm.datasource');
    const dataSource = module.default;
    const options = dataSource.options as any;

    expect(options.type).toBe('postgres');
    expect(options.url).toBe('postgres://user:pass@localhost:5432/db');
    expect((options.entities as unknown[]).length).toBeGreaterThan(0);
    expect(options.migrations).toEqual(['src/infrastructure/migrations/*.ts']);
  });
});
