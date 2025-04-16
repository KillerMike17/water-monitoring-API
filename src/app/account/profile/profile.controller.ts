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

import { CreateUsers, CreateUsersTECHNICIAN, UpdateMeDto } from '../users/entities/user.mut.dto';
import { JwtGuard } from '@/providers/guards/guard.rest';
import { UserService } from '../users';
import { Request } from 'express';
import { User } from '../users';

import { ProfileService } from './profile.service';

import { RoleType, UserFromToken } from '@/shared/models';
import { ApiTags } from '@nestjs/swagger';
import { Endpoint } from '@/shared/modelConsts';
import { Roles } from '@/providers/guards/roles.decorators';

@ApiTags(Endpoint.Profile)
@Controller(Endpoint.Profile)
export class ProfileController {
  constructor(private usersService: UserService, private profileServ: ProfileService) {}

  @Post('customer')
  @UseGuards(JwtGuard)
  @Roles(RoleType.ADMIN)
  async createCustomerAccount(@Req() req: Request, @Body() input: CreateUsers): Promise<User> {
    const res = await this.profileServ.createCusomer(input);
    if (!res.ok) throw new HttpException(res.errMessage, res.code);
    return res.val;
  }

  @Post('technician')
  @UseGuards(JwtGuard)
  @Roles(RoleType.ADMIN)
  async createTechnicainAccount(
    @Req() req: Request,
    @Body() input: CreateUsersTECHNICIAN,
  ): Promise<User> {
    const res = await this.profileServ.createTechnician(input);
    if (!res.ok) throw new HttpException(res.errMessage, res.code);
    return res.val;
  }

  @Get('me')
  @UseGuards(JwtGuard)
  async getMe(@Req() req: Request) {
    const user: UserFromToken = req['user'];
    const res = await this.usersService.findById(user._id);
    if (!res.ok) throw new HttpException(res.errMessage, res.code);
    return res.val;
  }

  //Au.M-9 Update user
  @Patch('me')
  @UseGuards(JwtGuard)
  async updateMe(@Req() req: Request, @Body() input: UpdateMeDto): Promise<User> {
    const user: UserFromToken = req['user'];

    const res = await this.usersService.updateById(user._id, input);
    if (!res.ok) throw new HttpException(res.errMessage, res.code);
    return res.val;
  }
}
