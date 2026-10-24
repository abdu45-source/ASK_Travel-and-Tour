import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
  Req,
  NotFoundException,
} from '@nestjs/common';
import { AgentsService } from './agents.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { Permission, PermissionScope } from '../../common/enums/permissions.enum';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('agents')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AgentsController {
  constructor(private agentsService: AgentsService) {}

  @Get()
  @RequirePermission(Permission.AGENT_READ)
  async getAgents(
    @Query('search') search?: string,
    @Query('status') status?: string,
    @CurrentUser('id') userId?: string,
    @Req() req?: any,
  ) {
    const scope = req?.userPermissionScope;
    let managerId: string | undefined = undefined;
    if (scope === PermissionScope.TEAM) {
      managerId = userId;
    }
    return this.agentsService.findAll({ search, status, managerId });
  }

  @Post()
  @RequirePermission(Permission.AGENT_CREATE)
  async registerAgent(
    @Body()
    body: {
      name: string;
      email: string;
      phone?: string;
      payout_details?: string;
      password?: string;
    },
    @CurrentUser('id') managerId: string,
  ) {
    return this.agentsService.registerAgent(body, managerId);
  }

  @Get('my-pipeline')
  @RequirePermission(Permission.AGENT_PERFORMANCE_READ)
  async getMyPipeline(@CurrentUser('id') userId: string) {
    const agent = await this.agentsService.findByUserId(userId);
    if (!agent) {
      return { message: 'User is not an agent profile' };
    }
    return this.agentsService.getPipelineStats(agent.id);
  }

  @Post('send-referral-email')
  @RequirePermission(Permission.AGENT_PERFORMANCE_READ)
  async sendReferralEmail(
    @CurrentUser('id') agentUserId: string,
    @Body() body: { email: string; name?: string; personalNote?: string },
  ) {
    return this.agentsService.sendReferralEmailToClient(agentUserId, body);
  }

  @Post('generate-dynamic-code')
  @RequirePermission(Permission.AGENT_PERFORMANCE_READ)
  async generateDynamicCode(@CurrentUser('id') agentUserId: string) {
    const agent = await this.agentsService.findByUserId(agentUserId);
    if (!agent) {
      throw new NotFoundException('Agent profile not found');
    }
    return this.agentsService.generateDynamicReferralCode(agent.id);
  }

  @Get('dynamic-codes')
  @RequirePermission(Permission.AGENT_PERFORMANCE_READ)
  async getDynamicCodes(@CurrentUser('id') agentUserId: string) {
    const agent = await this.agentsService.findByUserId(agentUserId);
    if (!agent) {
      throw new NotFoundException('Agent profile not found');
    }
    return this.agentsService.getAgentDynamicCodes(agent.id);
  }

  @Post('resend-referral-email/:id')
  @RequirePermission(Permission.AGENT_PERFORMANCE_READ)
  async resendReferralEmail(
    @CurrentUser('id') agentUserId: string,
    @Param('id') codeId: string,
  ) {
    return this.agentsService.resendReferralEmail(agentUserId, codeId);
  }

  @Get(':id/pipeline')
  @RequirePermission(Permission.AGENT_PERFORMANCE_READ)
  async getAgentPipeline(@Param('id') id: string) {
    return this.agentsService.getPipelineStats(id);
  }

  @Post(':id/deactivate')
  @RequirePermission(Permission.AGENT_DEACTIVATE)
  async toggleDeactivate(
    @Param('id') id: string,
    @CurrentUser('id') actorId: string,
  ) {
    return this.agentsService.toggleDeactivate(id, actorId);
  }

  @Post(':id/rotate-referral')
  @RequirePermission(Permission.AGENT_UPDATE)
  async rotateReferralCode(
    @Param('id') id: string,
    @CurrentUser('id') actorId: string,
  ) {
    return this.agentsService.rotateReferralCode(id, actorId);
  }

  @Get(':id')
  @RequirePermission(Permission.AGENT_READ)
  async getAgent(@Param('id') id: string) {
    return this.agentsService.findOne(id);
  }
}
