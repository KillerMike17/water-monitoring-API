import { Injectable } from '@nestjs/common';
import { UserService } from '../users';

@Injectable()
export class ProfileService {
  constructor(private usersService: UserService) {}
}
