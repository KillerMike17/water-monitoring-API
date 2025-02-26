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

@ApiTags(Endpoint.Ticket)
@Controller(Endpoint.Ticket)
export class TicketsController {
  constructor(private readonly ticketService: ticketService) {}

  @Post()
  @Roles(RoleType.ADMIN, RoleType.Customer)
  @UseGuards(JwtGuard)
  async createOne(@Body() createDto: TicketDto): Promise<Ticket> {
    const resp = await this.ticketService.createOne(createDto);
    if (!resp.ok) throw new HttpException(resp.errMessage, resp.code);
    return resp.val;
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
