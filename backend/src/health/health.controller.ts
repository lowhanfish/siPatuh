import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  check() {
    return {
      status: 'ok',
      service: 'sipatuh-backend',
      timestamp: new Date().toISOString(),
    };
  }
}
