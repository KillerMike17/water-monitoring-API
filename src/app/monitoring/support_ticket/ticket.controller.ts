import { PaginatedRes } from '@/common/common.types.dto';
import { JwtGuard } from '@/providers/guards/guard.rest';
import { Roles } from '@/providers/guards/roles.decorators';
import { Endpoint } from '@/shared/modelConsts';
import { RoleType } from '@/shared/models';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Ticket, TicketDto, TicketQuery, UpdateDto } from './ticket.entity';
import { ticketService } from './ticket.service';
import { NotificationService } from '../notification/notification.service';
import { NotificationMessage, NotificationPurpose } from '../notification/dto/notification.dto';

@ApiTags(Endpoint.Ticket)
@Controller(Endpoint.Ticket)
export class TicketsController {
  constructor(
    private readonly ticketService: ticketService,
    private readonly notificationService: NotificationService,
  ) {}

  // @Post()
  // @Roles(RoleType.ADMIN, RoleType.Customer)
  // @UseGuards(JwtGuard)
  // async createOne(@Body() createDto: TicketDto): Promise<Ticket> {
  //   const resp = await this.ticketService.createOne(createDto);
  //   if (!resp.ok) throw new HttpException(resp.errMessage, resp.code);
  //   return resp.val;
  // }

  @Post()
  @Roles(RoleType.ADMIN, RoleType.Customer)
  @UseGuards(JwtGuard)
  async createOne(@Body() createDto: TicketDto): Promise<Ticket> {
    // Find the technician with the least current jobs
    const technician = await this.ticketService.findLeastBusyTechnician(createDto.type);
    if (!technician) throw new HttpException('No available technician', 400);

    // Assign technician to the ticket
    createDto.technicianId = technician._id;
    const resp = await this.ticketService.createOne(createDto);
    if (!resp.ok) throw new HttpException(resp.errMessage, resp.code);

    // Notify customer and technician
    await this.ticketService.sendNotification({
      userId: createDto.userId,
      type: 'Ticket',
      title: 'Support Ticket Created',
      body: 'Your support ticket has been created and assigned to a technician.',
      messageType: NotificationMessage.Information,
      purpose: NotificationPurpose.Ticket,
    });
    await this.ticketService.sendNotification({
      userId: technician._id,
      type: 'Ticket',
      title: 'New Ticket Assigned',
      body: 'A new support ticket has been assigned to you.',
      messageType: NotificationMessage.Information,
      purpose: NotificationPurpose.Ticket,
    });

    return resp.val;
  }

  @Patch(':id/resolve')
  @Roles(RoleType.TECHNICIAN)
  @UseGuards(JwtGuard)
  async resolveTicket(@Param('id') id: string) {
    const res = await this.ticketService.updateById(id, { status: 'Resolved' });
    if (!res.ok) throw new HttpException(res.errMessage, res.code);

    // Notify customer and technician
    await this.ticketService.sendNotification({
      userId: res.val.userId,
      type: 'Ticket',
      title: 'Ticket Resolved',
      body: 'Your support ticket has been resolved successfully.',
      messageType: NotificationMessage.Information,
      purpose: NotificationPurpose.Ticket,
    });
    await this.ticketService.sendNotification({
      userId: res.val.technicianId,
      type: 'Ticket',
      title: 'Ticket Marked as Resolved',
      body: 'The support ticket you were assigned to has been marked as resolved.',
      messageType: NotificationMessage.Information,
      purpose: NotificationPurpose.Ticket,
    });

    return res.val;
  }

  @Patch(':id')
  @UseGuards(JwtGuard)
  @Roles(RoleType.ADMIN)
  async update(@Param('id') id: string, @Body() updateDto: UpdateDto) {
    const res = await this.ticketService.updateById(id, updateDto);
    if (!res.ok) throw new HttpException(res.errMessage, res.code);
    return res.val;
  }

  @Delete(':id')
  @UseGuards(JwtGuard)
  @Roles(RoleType.ADMIN)
  async remove(@Param('id') id: string) {
    const res = await this.ticketService.findByIdAndDelete(id);
    if (!res.ok) throw new HttpException(res.errMessage, res.code);
    return res.val;
  }

  // == below queries dont need authentication
  @Get()
  @UseGuards(JwtGuard)
  @UseGuards(JwtGuard)
  async filterAndPaginate(@Query() inputQuery: TicketQuery): Promise<PaginatedRes<Ticket>> {
    const res = await this.ticketService.searchWithPaginate(['name'], inputQuery);
    if (!res.ok) throw new HttpException(res.errMessage, res.code);
    return res.val;
  }

  @Get(':id')
  @UseGuards(JwtGuard)
  async findOne(@Param('id') id: string) {
    const res = await this.ticketService.findById(id);
    if (!res.ok) throw new HttpException(res.errMessage, res.code);
    return res.val;
  }
}
