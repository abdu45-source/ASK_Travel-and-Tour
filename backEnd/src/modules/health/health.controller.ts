import { Controller, Get } from '@nestjs/common';
import { Public } from '../../common/decorators/require-permission.decorator';
import { execSync } from 'child_process';

@Controller('health')
export class HealthController {
  @Public()
  @Get('live')
  getLive() {
    return { status: 'UP', timestamp: new Date().toISOString() };
  }

  @Public()
  @Get('ready')
  getReady() {
    return { status: 'READY', database: 'CONNECTED', timestamp: new Date().toISOString() };
  }

  @Public()
  @Get('seed')
  triggerSeed() {
    try {
      const output = execSync('node dist/seed.js', { env: process.env }).toString();
      return { status: 'SUCCESS', message: 'Seeding executed successfully', output };
    } catch (err: any) {
      return {
        status: 'ERROR',
        error: err.message,
        stderr: err.stderr ? err.stderr.toString() : null,
      };
    }
  }
}
