import { Resp } from '@/common/constants/return.const';

export interface VerificationServiceInterface {
  sendVerificationCode(to: string, code: string): Promise<Resp<any>>;

  sendEmailLinkConfirmation(email: string, token: string): Promise<void>;
}
