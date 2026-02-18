import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from '../../src/auth/auth/auth.controller';
import { AuthService } from '../../src/auth/auth/auth.service';
import { AuditService } from '../../src/audit/audit.service';

describe('AuthController', () => {
  let controller: AuthController;
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            signIn: jest.fn(),
          },
        },
        {
          provide: AuditService,
          useValue: {
            createAuditLog: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('signIn', () => {
    it('should call AuthService.signIn and return its result', async () => {
      const loginDto = { email: 'test@example.com', password: '123456' };
      const result = {
        accessToken: 'token',
        user: { id: '1', email: 'test@example.com' },
      };
      jest.spyOn(service, 'signIn').mockResolvedValue(result as any);
      expect(await controller.signIn(loginDto as any)).toEqual(result);
      expect(service.signIn).toHaveBeenCalledWith(loginDto);
    });
  });
});
