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
import { Billing, BillingDto, BillingQuery, UpdateDto } from './billing.entity';
import { billingService } from './billing.service';

@ApiTags(Endpoint.Billing)
@Controller(Endpoint.Billing)
export class BillingsController {
  constructor(private readonly billingService: billingService) {}

  @Post()
  @Roles(RoleType.ADMIN, RoleType.Customer)
  @UseGuards(JwtGuard)
  async createOne(@Body() createDto: BillingDto): Promise<Billing> {
    const resp = await this.billingService.createOne(createDto);
    if (!resp.ok) throw new HttpException(resp.errMessage, resp.code);
    return resp.val;
  }

  @Patch(':id')
  @UseGuards(JwtGuard)
  @Roles(RoleType.ADMIN)
  async update(@Param('id') id: string, @Body() updateDto: UpdateDto) {
    const res = await this.billingService.updateById(id, updateDto);
    if (!res.ok) throw new HttpException(res.errMessage, res.code);
    return res.val;
  }

  @Delete(':id')
  @UseGuards(JwtGuard)
  @Roles(RoleType.ADMIN)
  async remove(@Param('id') id: string) {
    const res = await this.billingService.findByIdAndDelete(id);
    if (!res.ok) throw new HttpException(res.errMessage, res.code);
    return res.val;
  }

  // == below queries dont need authentication
  @Get()
  @UseGuards(JwtGuard)
  @UseGuards(JwtGuard)
  async filterAndPaginate(@Query() inputQuery: BillingQuery): Promise<PaginatedRes<Billing>> {
    const res = await this.billingService.searchWithPaginate(['name'], inputQuery);
    if (!res.ok) throw new HttpException(res.errMessage, res.code);
    return res.val;
  }

  @Get(':id')
  @UseGuards(JwtGuard)
  async findOne(@Param('id') id: string) {
    const res = await this.billingService.findById(id);
    if (!res.ok) throw new HttpException(res.errMessage, res.code);
    return res.val;
  }
}
