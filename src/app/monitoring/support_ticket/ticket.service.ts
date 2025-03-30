import { Injectable } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';

import { Ticket, TicketDocument, TICKETSTATUS } from './ticket.entity';

import { MongoGenericRepository } from '@/providers/database/base/mongo.base.repo';
import mongoose, { Model } from 'mongoose';
import { UserService } from '@/app/account/users/users.service';
import { RoleType } from '@/shared/models';
import { NotificationService } from '../notification/notification.service';
import { SPECIALIZATIONS } from '@/app/account/profile/dto/profile.dto';

@Injectable()
export class ticketService extends MongoGenericRepository<Ticket> {
  constructor(
    @InjectModel(Ticket.name) private resultModel: Model<TicketDocument>,
    @InjectConnection() private readonly connection: mongoose.Connection,
    private usersService: UserService,
    private notifService: NotificationService,
  ) {
    super(resultModel);
  }

  async findLeastBusyTechnician(issueType: SPECIALIZATIONS) {
    const technicians = await this.usersService.find({
      filter: { role: RoleType.TECHNICIAN, specialization: issueType },
    });
    if (!technicians.val.length) return null;

    // Get technician IDs
    const technicianIds = technicians.val.map((t) => t._id);

    // Fetch tickets and count how many each technician has
    const tickets = await this.find({
      filter: { assignedTechnician: { $in: technicianIds } },
    });

    // Count tickets per technician with status not resolved
    const ticketCount = technicianIds.reduce((acc, id) => {
      acc[id] = tickets.val.filter(
        (ticket) => ticket.technicianId === id && ticket.status !== TICKETSTATUS.RESOLVED,
      ).length;
      return acc;
    }, {});

    // Sort technicians by number of assigned tickets
    const sortedTechnicians = technicians.val.sort(
      (a, b) => (ticketCount[a._id] || 0) - (ticketCount[b._id] || 0),
    );

    return sortedTechnicians[0];
  }

  async sendNotification({ userId, type, title, body, messageType, purpose }) {
    await this.notifService.createOne({ userId, type, title, body, messageType, purpose });
  }
}
