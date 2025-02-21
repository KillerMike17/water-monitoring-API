import { User } from '@/app/account/users';

export class AuthToken {
  accessToken?: string;

  refreshToken?: string;

  sessionId?: string;
}

export class AuthTokenWithSubscription {
  accessToken?: string;

  refreshToken?: string;

  sessionId?: string;
}

export class AuthTokenResponse {
  authToken?: AuthToken;

  user?: User;
}

export class TokenResponse {
  token?: string;
}
