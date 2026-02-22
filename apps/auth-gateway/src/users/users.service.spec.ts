import { NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UsersService } from './users.service';

describe('UsersService', () => {
  const usersRepo = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
    update: jest.fn(),
  };

  let service: UsersService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new UsersService(usersRepo as any);
  });

  it('creates user with bcrypt hash', async () => {
    jest.spyOn(bcrypt, 'hash').mockResolvedValue('hash' as never);
    usersRepo.create.mockReturnValue({ id: 'u1' });
    usersRepo.save.mockResolvedValue({ id: 'u1' });

    const result = await service.create({
      email: 'x@y.com',
      password: 'password123',
      displayName: 'X',
    });

    expect(result.id).toBe('u1');
    expect(usersRepo.create).toHaveBeenCalled();
  });

  it('findById throws when missing', async () => {
    usersRepo.findOne.mockResolvedValue(null);
    await expect(service.findById('missing')).rejects.toThrow(NotFoundException);
  });

  it('updates user', async () => {
    usersRepo.findOne.mockResolvedValue({ id: 'u1', displayName: 'Old' });
    usersRepo.save.mockResolvedValue({ id: 'u1', displayName: 'New' });
    const result = await service.update('u1', { displayName: 'New' });
    expect(result.displayName).toBe('New');
  });

  it('findAll returns descending list', async () => {
    usersRepo.find.mockResolvedValue([{ id: 'u2' }, { id: 'u1' }]);
    const result = await service.findAll();
    expect(result).toHaveLength(2);
    expect(usersRepo.find).toHaveBeenCalledWith({ order: { createdAt: 'DESC' } });
  });

  it('findByEmail returns user or null', async () => {
    usersRepo.findOne
      .mockResolvedValueOnce({ id: 'u1', email: 'x@y.com' })
      .mockResolvedValueOnce(null);
    await expect(service.findByEmail('x@y.com')).resolves.toEqual({ id: 'u1', email: 'x@y.com' });
    await expect(service.findByEmail('missing@y.com')).resolves.toBeNull();
  });

  it('updates last login', async () => {
    usersRepo.update.mockResolvedValue(undefined);
    await service.updateLastLogin('u1');
    expect(usersRepo.update).toHaveBeenCalled();
  });

  it('remove deletes found user', async () => {
    usersRepo.findOne.mockResolvedValue({ id: 'u1' });
    usersRepo.remove.mockResolvedValue(undefined);
    await service.remove('u1');
    expect(usersRepo.remove).toHaveBeenCalled();
  });
});
