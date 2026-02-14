import { UsersController } from './users.controller';

describe('UsersController', () => {
  const usersService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  let controller: UsersController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new UsersController(usersService as any);
  });

  it('create delegates to service', async () => {
    usersService.create.mockResolvedValue({ id: 'u1' });
    const result = await controller.create({
      email: 'a@b.com',
      password: 'password123',
      displayName: 'A',
    });
    expect(result.id).toBe('u1');
  });

  it('findAll delegates to service', async () => {
    usersService.findAll.mockResolvedValue([{ id: 'u1' }]);
    const result = await controller.findAll();
    expect(result).toHaveLength(1);
  });

  it('findOne delegates to service', async () => {
    usersService.findById.mockResolvedValue({ id: 'u1' });
    const result = await controller.findOne('u1');
    expect(result.id).toBe('u1');
  });

  it('update delegates to service', async () => {
    usersService.update.mockResolvedValue({ id: 'u1', isActive: false });
    const result = await controller.update('u1', { isActive: false });
    expect(result.isActive).toBe(false);
  });

  it('remove delegates to service', async () => {
    usersService.remove.mockResolvedValue(undefined);
    const result = await controller.remove('u1');
    expect(usersService.remove).toHaveBeenCalledWith('u1');
    expect(result).toEqual({ success: true });
  });
});
