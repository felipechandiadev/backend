import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AnalyticsService } from './analytics.service';
import { Property } from '../../entities/property.entity';
import { Contract } from '../../entities/contract.entity';
import { User, UserRole } from '../../entities/user.entity';
import { PropertyStatus } from '../../common/enums/property-status.enum';
import { ContractStatus, ContractOperationType } from '../../entities/contract.entity';

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  let propertyRepository: Repository<Property>;
  let contractRepository: Repository<Contract>;
  let userRepository: Repository<User>;

  const mockPropertyRepository = {
    createQueryBuilder: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    innerJoin: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    getCount: jest.fn(),
    getRawOne: jest.fn(),
    getRawMany: jest.fn(),
  };

  const mockContractRepository = {
    createQueryBuilder: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    innerJoin: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    getCount: jest.fn(),
    getRawOne: jest.fn(),
    getRawMany: jest.fn(),
  };

  const mockUserRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        {
          provide: getRepositoryToken(Property),
          useValue: mockPropertyRepository,
        },
        {
          provide: getRepositoryToken(Contract),
          useValue: mockContractRepository,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        // Provide a mock Payment repository because AnalyticsService depends on it
        {
          provide: getRepositoryToken(require('../../entities/payment.entity').Payment),
          useValue: {
            createQueryBuilder: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            andWhere: jest.fn().mockReturnThis(),
            getRawOne: jest.fn().mockResolvedValue({ total: 0 }),
            getCount: jest.fn().mockResolvedValue(0),
          },
        },
      ],
    }).compile();

    service = module.get<AnalyticsService>(AnalyticsService);
    propertyRepository = module.get<Repository<Property>>(getRepositoryToken(Property));
    contractRepository = module.get<Repository<Contract>>(getRepositoryToken(Contract));
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getAgentPerformance', () => {
    it('should return agent performance metrics', async () => {
      const mockAgent = {
        id: 'agent-1',
        name: 'John Doe',
        role: UserRole.AGENT,
      };

      mockUserRepository.findOne.mockResolvedValue(mockAgent);
      mockPropertyRepository.getCount.mockResolvedValue(10);
      mockContractRepository.getCount.mockResolvedValue(3);
      mockContractRepository.getRawOne.mockResolvedValue({ total: 150000 });
      mockPropertyRepository.getRawMany.mockResolvedValue([
        { status: 'PUBLISHED', count: '5' },
        { status: 'SOLD', count: '2' },
      ]);
      mockContractRepository.getRawMany.mockResolvedValue([
        { operation: 'COMPRAVENTA', count: '2' },
        { operation: 'ARRIENDO', count: '1' },
      ]);

      const result = await service.getAgentPerformance('agent-1');

      expect(result).toBeDefined();
      expect(result.agentId).toBe('agent-1');
      expect(result.agentName).toBe('John Doe');
      expect(result.metrics.assignedProperties).toBe(10);
      expect(result.metrics.closedContracts).toBe(3);
      expect(result.metrics.conversionRate).toBe(30);
    });

    it('should throw error if agent not found', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(service.getAgentPerformance('invalid-agent')).rejects.toThrow(
        'Agent with ID invalid-agent not found'
      );
    });
  });

  describe('getDashboardSummary', () => {
    it('counts only COMMUNITY users as new members this month', async () => {
      // Arrange: stub out other internal calls used by getDashboardSummary
      jest.spyOn(service as any, 'getRevenueTrend').mockResolvedValue([]);
      jest.spyOn(service as any, 'getGlobalAverageClosureDays').mockResolvedValue(0);
      jest.spyOn(service as any, 'getPropertyDistribution').mockResolvedValue([]);
      jest.spyOn(service as any, 'getAllAgentsPerformance').mockResolvedValue([]);

      // Mock payment-related calls to avoid DB access
      (service as any).paymentRepository = {
        createQueryBuilder: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          getRawOne: jest.fn().mockResolvedValue({ total: 0 }),
          getCount: jest.fn().mockResolvedValue(0),
        }),
      } as any;

      // Capture calls to userRepository.createQueryBuilder and ensure role filter is applied
      const capturedAndWhere: any[] = [];
      const mockUserQb: any = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn((...args: any[]) => { capturedAndWhere.push(args); return mockUserQb; }),
        getCount: jest.fn().mockResolvedValue(2),
      };
      (mockUserRepository as any).createQueryBuilder = jest.fn().mockReturnValue(mockUserQb as any);

      // Act
      const summary = await service.getDashboardSummary();

      // Assert
      expect(summary).toBeDefined();
      expect(summary.newMembersThisMonth).toBe(2);

      // Verify that an andWhere with role filter was applied
      const roleFilterFound = capturedAndWhere.some(args => typeof args[0] === 'string' && args[0].includes('u.role'));
      expect(roleFilterFound).toBeTruthy();

      // Also verify that the provided role param equals UserRole.COMMUNITY
      const roleParamEntry = capturedAndWhere.find(args => typeof args[1] === 'object' && args[1].role === UserRole.COMMUNITY);
      expect(roleParamEntry).toBeDefined();
    });
  });
});