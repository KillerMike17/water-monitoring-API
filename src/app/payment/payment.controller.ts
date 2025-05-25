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
import { Payment, PaymentBill, PaymentDto, PaymentQuery, UpdateDto } from './payment.entity';
import { paymentService } from './payment.service';

@ApiTags(Endpoint.Payment)
@Controller(Endpoint.Payment)
export class PaymentsController {
  constructor(private readonly paymentService: paymentService) {}

  @Post('payment-bill')
  @Roles(RoleType.ADMIN, RoleType.Customer)
  @UseGuards(JwtGuard)
  async getPaymentBill(@Body() createDto: { uuid: string }): Promise<PaymentBill> {
    const resp = await this.paymentService.getPaymentData(createDto.uuid);
    if (!resp.ok) throw new HttpException(resp.errMessage, resp.code);
    return resp.val;
  }

  @Post()
  @Roles(RoleType.ADMIN, RoleType.Customer)
  @UseGuards(JwtGuard)
  async createOne(@Body() createDto: PaymentDto): Promise<Payment> {
    const resp = await this.paymentService.createOne(createDto);
    if (!resp.ok) throw new HttpException(resp.errMessage, resp.code);
    return resp.val;
  }

  @Patch(':id')
  @UseGuards(JwtGuard)
  @Roles(RoleType.ADMIN)
  async update(@Param('id') id: string, @Body() updateDto: UpdateDto) {
    const res = await this.paymentService.updateById(id, updateDto);
    if (!res.ok) throw new HttpException(res.errMessage, res.code);
    return res.val;
  }

  @Delete(':id')
  @UseGuards(JwtGuard)
  @Roles(RoleType.ADMIN)
  async remove(@Param('id') id: string) {
    const res = await this.paymentService.findByIdAndDelete(id);
    if (!res.ok) throw new HttpException(res.errMessage, res.code);
    return res.val;
  }

  // == below queries dont need authentication
  @Get()
  @UseGuards(JwtGuard)
  @Roles(RoleType.ADMIN, RoleType.Customer)
  async filterAndPaginate(@Query() inputQuery: PaymentQuery): Promise<PaginatedRes<Payment>> {
    const res = await this.paymentService.searchWithPaginate(['name'], inputQuery);
    if (!res.ok) throw new HttpException(res.errMessage, res.code);
    return res.val;
  }

  @Get('info/:id')
  async getPaymentInfo(@Param('id') uuid: string) {
    return this.paymentService.getPaymentData(uuid);
  }

  @Get('history/:id')
  async getPaymentHistory(@Param('id') id: string) {
    return this.paymentService.getPaymentHistory(id);
  }

  @Get(':id')
  @UseGuards(JwtGuard)
  async findOne(@Param('id') id: string) {
    const res = await this.paymentService.findById(id);
    if (!res.ok) throw new HttpException(res.errMessage, res.code);
    return res.val;
  }
}
