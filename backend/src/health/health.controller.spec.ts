import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';

describe('HealthController', () => {
  let controller: HealthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should return health status ok without exposing secrets', () => {
    const result = controller.check();
    expect(result.status).toBe('ok');
    expect(result.service).toBe('sipatuh-backend');
    expect(typeof result.timestamp).toBe('string');
  });
});
