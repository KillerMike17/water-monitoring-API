import { Injectable } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';

import { Ticket, TicketDocument } from './ticket.entity';

import { MongoGenericRepository } from '@/providers/database/base/mongo.base.repo';
import mongoose, { Model } from 'mongoose';
import { UserService } from '@/app/account/users/users.service';

@Injectable()
export class ticketService extends MongoGenericRepository<Ticket> {
  constructor(
    @InjectModel(Ticket.name) private resultModel: Model<TicketDocument>,
    @InjectConnection() private readonly connection: mongoose.Connection,
    private usersService: UserService,
  ) {
    super(resultModel);
  }
}
