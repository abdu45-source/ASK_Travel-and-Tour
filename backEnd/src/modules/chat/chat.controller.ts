import { Controller, Get, Post, Param, Query, UseGuards } from '@nestjs/common';
import { ChatService } from './chat.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('conversations')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private chatService: ChatService) {}

  @Get()
  async getMyConversations(@CurrentUser('id') userId: string) {
    return this.chatService.getUserConversations(userId);
  }

  @Get(':id/messages')
  async getMessages(
    @Param('id') conversationId: string,
    @CurrentUser('id') userId: string,
    @Query('page') page = '1',
    @Query('limit') limit = '50',
  ) {
    return this.chatService.getMessages(
      conversationId,
      userId,
      parseInt(page, 10),
      parseInt(limit, 10),
    );
  }

  @Post('support')
  async getOrCreateSupport(@CurrentUser('id') clientId: string) {
    return this.chatService.getOrCreateClientSupportConversation(clientId);
  }

  @Post('agent-manager')
  async getOrCreateAgentManager(@CurrentUser('id') agentUserId: string) {
    return this.chatService.getOrCreateAgentManagerConversation(agentUserId);
  }
}
