import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Notification } from '../../entities/notification.entity';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private notifRepo: Repository<Notification>,
  ) {}

  async getUserNotifications(userId: string, page = 1, limit = 20) {
    const [items, total] = await this.notifRepo.findAndCount({
      where: { user_id: userId },
      order: { created_at: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { items, total, page, limit };
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.notifRepo.count({
      where: { user_id: userId, read_at: IsNull() },
    });
  }

  async markAsRead(id: string, userId: string): Promise<Notification | null> {
    const notif = await this.notifRepo.findOne({
      where: { id, user_id: userId },
    });
    if (notif && !notif.read_at) {
      notif.read_at = new Date();
      return this.notifRepo.save(notif);
    }
    return notif;
  }

  async markAllAsRead(userId: string): Promise<{ success: boolean }> {
    await this.notifRepo
      .createQueryBuilder()
      .update(Notification)
      .set({ read_at: new Date() })
      .where('user_id = :userId AND read_at IS NULL', { userId })
      .execute();
    return { success: true };
  }

  async create(data: {
    userId: string;
    type: string;
    title: string;
    body: string;
    refType?: string;
    refId?: string;
  }): Promise<Notification> {
    const notif = this.notifRepo.create({
      user_id: data.userId,
      type: data.type,
      title: data.title,
      body: data.body,
      ref_type: data.refType,
      ref_id: data.refId,
    });
    return this.notifRepo.save(notif);
  }
}
