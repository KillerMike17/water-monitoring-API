import { Injectable } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { User, UserService } from '../users';
import { CreateUsers } from '../users/entities/user.mut.dto';
import { Resp } from '@/common/constants/return.const';
import { ACCOUNT_STATUS } from './dto/profile.dto';
import { RoleType } from '@/shared/models';
import { CryptoService } from '@/providers/crypto/crypto.service';

@Injectable()
export class ProfileService {
  constructor(private usersService: UserService, private cryptoService: CryptoService) {}

  public async createCusomer(createDto: CreateUsers): Promise<Resp<User>> {
    createDto.accountStatus = ACCOUNT_STATUS.PENDING;
    createDto.role = RoleType.Customer;

    // Generate a UUID and append 8 random numbers
    // Generate a UUID without dashes
    const uuid = uuidv4().replace(/-/g, '');

    // Generate a 6-digit random number
    const randomNumbers = Math.floor(100000 + Math.random() * 900000);
    createDto.uuid = `${uuid}-${randomNumbers}`; // Assign it to your user ID

    createDto.password = await this.cryptoService.createHash(createDto.password);
    return this.usersService.createOne(createDto);
  }

  public async createTechnician(createDto: CreateUsers): Promise<Resp<User>> {
    createDto.accountStatus = ACCOUNT_STATUS.ACTIVE;
    createDto.role = RoleType.TECHNICIAN;

    createDto.password = await this.cryptoService.createHash(createDto.password);
    return this.usersService.createOne(createDto);
  }
}
