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
  Req,
  UseGuards,
} from '@nestjs/common';
import { NotificationService } from './notification.service';
import {
  CreateNotificationInput,
  markReadDto,
  NotificationQuery,
  NotificationStatus,
  UpdateDto,
} from './dto/notification.dto';
import { pagiKeys, PaginatedRes } from '@/common/common.types.dto';

import { pickKeys, removeKeys } from '@/common/util/util';
import { Notification } from './entities/notification.entity';
import { JwtGuard } from '@/providers/guards/guard.rest';
import { Roles } from '@/providers/guards/roles.decorators';
import { RoleType, UserFromToken } from '@/shared/models';
import { ApiTags } from '@nestjs/swagger';
import { Endpoint } from '@/shared/modelConsts';

@ApiTags(Endpoint.Notification)
@Controller(Endpoint.Notification)
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Post()
  @Roles(RoleType.ADMIN)
  @UseGuards(JwtGuard)
  async createOne(@Body() createDto: CreateNotificationInput) {
    const resp = await this.notificationService.createOne(createDto);
    if (!resp.ok) throw new HttpException(resp.errMessage, resp.code);
    return resp.val;
  }

  @Patch(':id')
  @UseGuards(JwtGuard)
  @Roles(RoleType.ADMIN, RoleType.KID)
  async update(@Req() req: Request, @Param('id') id: string, @Body() updateDto: UpdateDto) {
    const user: UserFromToken = req['user'];
    if (user.role == RoleType.KID) {
      const res = await this.notificationService.findById(id);
      if (!res.ok) throw new HttpException(res.errMessage, res.code);

      if (res.val.userId !== user._id) {
        throw new HttpException('Unauthorized', 403);
      }
    }
    const res = await this.notificationService.updateById(id, updateDto);
    if (!res.ok) throw new HttpException(res.errMessage, res.code);
    return res.val;
  }

  @Delete(':id')
  @UseGuards(JwtGuard)
  @Roles(RoleType.ADMIN)
  async remove(@Param('id') id: string) {
    const res = await this.notificationService.findByIdAndDelete(id);
    if (!res.ok) throw new HttpException(res.errMessage, res.code);
    return res.val;
  }

  // == below queries dont need authentication
  @Get()
  @UseGuards(JwtGuard)
  @Roles(RoleType.ADMIN, RoleType.KID)
  async filterAndPaginate(
    @Req() req: Request,
    @Query() inputQuery: NotificationQuery,
  ): Promise<PaginatedRes<Notification>> {
    const user: UserFromToken = req['user'];
    if (user.role == RoleType.KID) {
      inputQuery.userId = user._id;
    }
    const paginateQuery = pickKeys(inputQuery, [...pagiKeys]);
    const query = removeKeys(inputQuery, [...pagiKeys, 'searchText']);

    const res = await this.notificationService.searchManyAndPaginate(
      inputQuery.searchText,
      ['title'],
      query,
      paginateQuery,
    );
    if (!res.ok) throw new HttpException(res.errMessage, res.code);
    return res.val;
  }

  @Get(':id')
  @UseGuards(JwtGuard)
  @Roles(RoleType.ADMIN, RoleType.KID)
  async findOne(@Req() req: Request, @Param('id') id: string) {
    const user: UserFromToken = req['user'];
    const res = await this.notificationService.findById(id);
    if (!res.ok) throw new HttpException(res.errMessage, res.code);
    if (user.role == RoleType.KID && res.val.userId !== user._id) {
      throw new HttpException('Unauthorized', 403);
    }
    return res.val;
  }

  @Post('mark_read')
  @Roles(RoleType.KID, RoleType.ADMIN)
  @UseGuards(JwtGuard)
  async markAsRead(@Req() req: Request, @Body() input: markReadDto): Promise<any> {
    // Mark a single notification as unread

    const notif = await this.notificationService.findById(input.id);

    if (!notif.ok) {
      throw new HttpException(notif.errMessage, notif.code);
    }
    const user: UserFromToken = req['user'];

    if (user.role == RoleType.KID && notif.val.userId !== user._id) {
      throw new HttpException('Unauthorized', 403);
    }

    const res = await this.notificationService.updateById(input.id, {
      status: NotificationStatus.Read,
    });

    return res.val;
  }
}
