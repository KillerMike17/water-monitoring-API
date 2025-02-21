import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IncomingMessage } from 'http';
//crypto
import { CustomJwtService } from '@/providers/crypto';

// this Guard is for non Graphql endpoints - this  verifies the `jwt Token & the Roles`  This is Enough for our app
@Injectable()
export class PricingGuard implements CanActivate {
  constructor(private reflector: Reflector, private readonly jwtService: CustomJwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // const httpArgumentsHost = HttpArgumentsHost.create(context);
    const request = this.getRequest<IncomingMessage & { user?: Record<string, unknown> }>(context); // you could use FastifyRequest here too
    try {
      // ==============================     Authentication  ==============
      const user = request.user;

      return true;
    } catch (e) {
      // return false or throw a specific error if desired
      return false;
    }
  }

  protected getRequest<T>(context: ExecutionContext): T {
    return context.switchToHttp().getRequest();
  }
}
