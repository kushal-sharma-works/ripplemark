import { LoginDto } from './login.dto';

describe('LoginDto', () => {
  it('can be instantiated', () => {
    const dto = new LoginDto();
    dto.email = 'user@example.com';
    dto.password = 'password123';

    expect(dto.email).toBe('user@example.com');
    expect(dto.password).toBe('password123');
  });
});
