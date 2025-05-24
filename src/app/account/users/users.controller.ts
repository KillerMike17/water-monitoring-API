import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpException,
  UseGuards,
  Query,
  Req,
} from '@nestjs/common';
import { UserService } from './users.service';
import { CreateUser, FilterUser, FilterUserNew, UpdateUserWithRole } from './entities/user.mut.dto';
import { User } from './entities/user.entity';

import { Roles } from '@/providers/guards/roles.decorators';
import { JwtGuard } from '@/providers/guards/guard.rest';
import { RoleType } from '@/shared/models';
import { ApiTags } from '@nestjs/swagger';
import { Endpoint } from '@/shared/modelConsts';
import { PaginatedRes } from '@/common/common.types.dto';

@ApiTags(Endpoint.Users)
@Controller(Endpoint.Users)
@Roles(RoleType.ADMIN)
// @UseGuards(JwtGuard)
export class UsersController {
  constructor(private readonly usersService: UserService) {}

  //FIXME this function is used by admins to add other admins
  @Post()
  @Roles(RoleType.ADMIN)
  @UseGuards(JwtGuard)
  async createUser(@Body() createDto: CreateUser): Promise<User> {
    const resp = await this.usersService.createUser(createDto);
    if (!resp.ok) throw new HttpException(resp.errMessage, resp.code);
    return resp.val;
  }

  // @Get('search')
  // @Roles(RoleType.ADMIN, RoleType.TECHNICIAN, RoleType.Customer)
  // @UseGuards(JwtGuard)
  // async findManyNew(@Query() inputQuery: FilterUserNew): Promise<PaginatedRes<User>> {
  //   const res = await this.usersService.searchWithPaginateNew([], inputQuery);
  //   if (!res.ok) throw new HttpException(res.errMessage, 500);
  //   return res.val;
  // }

  @Get()
  // @Roles(RoleType.ADMIN, RoleType.TECHNICIAN)
  // @UseGuards(JwtGuard)
  async findMany(@Query() inputQuery: FilterUser): Promise<PaginatedRes<User>> {
    const res = await this.usersService.searchWithPaginate([], inputQuery);
    if (!res.ok) throw new HttpException(res.errMessage, 500);
    return res.val;
  }

  @Get(':id')
  // @Roles(RoleType.ADMIN, RoleType.TECHNICIAN)
  // @UseGuards(JwtGuard)
  async findOne(@Param('id') id: string): Promise<User> {
    const res = await this.usersService.findById(id);
    if (!res.ok) throw new HttpException(res.errMessage, res.code);
    return res.val;
  }

  @Patch(':id')
  @Roles(RoleType.ADMIN)
  @UseGuards(JwtGuard)
  async update(@Param('id') id: string, @Body() updateUserDto: UpdateUserWithRole): Promise<User> {
    const res = await this.usersService.updateById(id, updateUserDto);
    if (!res.ok) throw new HttpException(res.errMessage, res.code);
    return res.val;
  }

  @Delete(':id')
  @Roles(RoleType.ADMIN)
  @UseGuards(JwtGuard)
  async remove(@Param('id') id: string): Promise<User> {
    const res = await this.usersService.findByIdAndDelete(id);
    if (!res.ok) throw new HttpException(res.errMessage, res.code);
    return res.val;
  }
}
