import { Controller, Get } from '@nestjs/common';
import { Public } from '../../common/decorators/require-permission.decorator';

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
}
