import { Module } from '@nestjs/common';
import { ticketService } from './ticket.service';
import { TicketsController } from './ticket.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Ticket, TicketSchema } from './ticket.entity';
import { UsersModule } from '@/app/account/users';

@Module({
  imports: [MongooseModule.forFeature([{ name: Ticket.name, schema: TicketSchema }]), UsersModule],
  controllers: [TicketsController],
  providers: [ticketService],
  exports: [ticketService],
})
export class TicketsModule {}
