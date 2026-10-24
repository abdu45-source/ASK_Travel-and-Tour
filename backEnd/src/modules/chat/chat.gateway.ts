import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ChatService } from './chat.service';

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    private chatService: ChatService,
    private jwtService: JwtService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.replace('Bearer ', '') ||
        (client.handshake.query?.token as string);

      if (!token) {
        return;
      }

      const payload = this.jwtService.verify(token, {
        secret: process.env.JWT_SECRET || 'ask_digital_jwt_secret_key_2026',
      });
      client.data.userId = payload.sub;
      client.join(`user_${payload.sub}`);
    } catch (err) {
      // Disconnect unauthenticated socket
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    // Clean up
  }

  @SubscribeMessage('join:conversation')
  async handleJoinConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string },
  ) {
    client.join(`conversation_${data.conversationId}`);
    return { joined: true };
  }

  @SubscribeMessage('message:send')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: {
      conversationId: string;
      body: string;
      clientMsgId?: string;
    },
  ) {
    const senderId = client.data.userId;
    if (!senderId) {
      return { error: 'Unauthorized' };
    }

    const message = await this.chatService.sendMessage(
      data.conversationId,
      senderId,
      data.body,
      data.clientMsgId,
    );

    // Broadcast to conversation room
    this.server
      .to(`conversation_${data.conversationId}`)
      .emit('message:new', message);

    return message;
  }

  @SubscribeMessage('typing')
  handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string; isTyping: boolean },
  ) {
    client.to(`conversation_${data.conversationId}`).emit('typing:status', {
      userId: client.data.userId,
      isTyping: data.isTyping,
    });
  }
}
