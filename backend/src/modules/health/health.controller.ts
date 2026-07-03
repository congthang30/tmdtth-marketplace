import { Controller, Get } from '@nestjs/common';

type HealthResponse = {
  status: 'ok';
  service: string;
  timestamp: string;
  uptimeSeconds: number;
};

@Controller('health')
export class HealthController {
  @Get()
  getHealth(): HealthResponse {
    return {
      status: 'ok',
      service: 'tmdtth-backend',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.round(process.uptime()),
    };
  }
}
