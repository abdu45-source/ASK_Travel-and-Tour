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
        // Allow public visitors as guest sockets
        client.data.userId = 'guest_' + client.id;
        client.data.isGuest = true;
        client.join(`guest_${client.id}`);
        return;
      }

      const payload = this.jwtService.verify(token, {
        secret: process.env.JWT_SECRET || 'ask_digital_jwt_secret_key_2026',
      });
      client.data.userId = payload.sub;
      client.data.isGuest = false;
      client.join(`user_${payload.sub}`);
    } catch {
      // Fallback to guest connection rather than disconnecting
      client.data.userId = 'guest_' + client.id;
      client.data.isGuest = true;
      client.join(`guest_${client.id}`);
    }
  }

  handleDisconnect(client: Socket) {
    // Socket cleanup handled automatically by Socket.IO
  }

  @SubscribeMessage('join:conversation')
  async handleJoinConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string },
  ) {
    if (!data?.conversationId) return { error: 'Missing conversationId' };
    client.join(`conversation_${data.conversationId}`);
    return { joined: true, conversationId: data.conversationId };
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
    const senderId = client.data.userId || 'guest_' + client.id;
    if (!data?.body?.trim() || !data?.conversationId) {
      return { error: 'Message body and conversationId required' };
    }

    const trimmedBody = data.body.trim();

    // Guest or public concierge conversation
    if (client.data?.isGuest || data.conversationId.startsWith('guest_')) {
      const guestMessage = {
        id: 'msg_' + Date.now(),
        conversation_id: data.conversationId,
        sender_id: senderId,
        body: trimmedBody,
        created_at: new Date().toISOString(),
        sender: {
          id: senderId,
          name: 'You (Traveler)',
        },
      };

      // Broadcast traveler message to the conversation room
      this.server
        .to(`conversation_${data.conversationId}`)
        .emit('message:new', guestMessage);

      // Trigger Concierge automated real-time reply
      this.triggerConciergeReply(data.conversationId, trimmedBody);
      return guestMessage;
    }

    // Authenticated member message
    try {
      const message = await this.chatService.sendMessage(
        data.conversationId,
        senderId,
        trimmedBody,
        data.clientMsgId,
      );

      // Broadcast to conversation room
      this.server
        .to(`conversation_${data.conversationId}`)
        .emit('message:new', message);

      return message;
    } catch {
      // In case user is in direct support or agent line
      const fallbackMsg = {
        id: 'msg_' + Date.now(),
        conversation_id: data.conversationId,
        sender_id: senderId,
        body: trimmedBody,
        created_at: new Date().toISOString(),
        sender: {
          id: senderId,
          name: 'Traveler',
        },
      };
      this.server
        .to(`conversation_${data.conversationId}`)
        .emit('message:new', fallbackMsg);
      this.triggerConciergeReply(data.conversationId, trimmedBody);
      return fallbackMsg;
    }
  }

  @SubscribeMessage('typing')
  handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string; isTyping: boolean },
  ) {
    if (!data?.conversationId) return;
    client.to(`conversation_${data.conversationId}`).emit('typing:status', {
      userId: client.data.userId,
      isTyping: data.isTyping,
    });
  }

  private triggerConciergeReply(conversationId: string, userText: string) {
    const lower = userText.toLowerCase();
    let reply =
      'Hello and welcome to ASK Tour & Travel! Our certified agency guides in Bahir Dar and Addis Ababa are available 24/7 to design your authentic Ethiopian journey. How can we assist you today?';

    if (
      lower.includes('price') ||
      lower.includes('cost') ||
      lower.includes('rate') ||
      lower.includes('how much') ||
      lower.includes('etb')
    ) {
      reply =
        'Our transparent expedition packages range from 11,500 ETB for Addis Ababa city tours, 12,000 ETB for Lake Tana & Blue Nile Falls, up to 35,000 ETB for Danakil Depression volcano expeditions. Click "Explore Destinations" to view detailed quotes!';
    } else if (
      lower.includes('destination') ||
      lower.includes('tour') ||
      lower.includes('place') ||
      lower.includes('circuit') ||
      lower.includes('lalibela') ||
      lower.includes('simien') ||
      lower.includes('gondar') ||
      lower.includes('tana')
    ) {
      reply =
        'We offer 12 signature Ethiopian circuits across Amhara, Afar, Sidama, Oromia, and South Ethiopia — including Lalibela Monolithic Heritage, Simien Mountains Escarpments, Gondar Imperial Castles, Lake Tana Islands, and Omo Valley Cultural Expeditions. Click any package to view day-by-day itineraries and photos!';
    } else if (
      lower.includes('pay') ||
      lower.includes('telebirr') ||
      lower.includes('cbe') ||
      lower.includes('bank') ||
      lower.includes('book')
    ) {
      reply =
        'We accept all major Ethiopian payment methods: Telebirr (Instant Account / QR), Commercial Bank of Ethiopia (CBE Birr & Account Transfer), and Bank of Abyssinia. You can book directly online through our secure checkout modal!';
    } else if (
      lower.includes('agent') ||
      lower.includes('partner') ||
      lower.includes('commission') ||
      lower.includes('join')
    ) {
      reply =
        'Interested in earning an automated 10% commission on every traveler booking? Click "Join Agent Network" on our website to submit your Partner Application to our Agency Manager and Owner!';
    } else if (
      lower.includes('contact') ||
      lower.includes('phone') ||
      lower.includes('call') ||
      lower.includes('office') ||
      lower.includes('location')
    ) {
      reply =
        'Our main headquarters is situated on the Lake Tana Promenade in Bahir Dar, Ethiopia, with operations in Addis Ababa. You can call our direct dispatch line at +251 911 00 22 33 or email us at owner@askdigital.et.';
    }

    // Emit live typing animation
    setTimeout(() => {
      this.server
        .to(`conversation_${conversationId}`)
        .emit('typing:status', { userId: 'concierge_support', isTyping: true });
    }, 400);

    // Send concierge reply after short realistic delay
    setTimeout(() => {
      this.server
        .to(`conversation_${conversationId}`)
        .emit('typing:status', { userId: 'concierge_support', isTyping: false });

      this.server
        .to(`conversation_${conversationId}`)
        .emit('message:new', {
          id: 'reply_' + Date.now(),
          conversation_id: conversationId,
          sender_id: 'concierge_support',
          body: reply,
          created_at: new Date().toISOString(),
          sender: {
            id: 'concierge_support',
            name: 'ASK Support Concierge',
          },
        });
    }, 1400);
  }
}
