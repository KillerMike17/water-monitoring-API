import { IsOptional } from 'class-validator';
import { UserFromToken } from '@/shared/models';

export interface PayloadUserForJwtToken {
  user: UserFromToken;
}

export const pagiKeys = ['limit', 'sort', 'page', 'sortOrder', 'searchText'];

enum SortOrder {
  asc = 1,
  desc = -1,
}

export class PaginationInputs {
  @IsOptional()
  searchText?: string;

  @IsOptional()
  limit?: number = 25;

  @IsOptional()
  page?: number = 1;

  @IsOptional()
  sort?: string = '_id';

  @IsOptional()
  sortOrder?: SortOrder = 1;
}

export interface IAuthToken {
  accessToken?: string;
  refreshToken?: string;
}

export class PaginatedRes<T> {
  count: number;

  data: T[];
}
