import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { JwtService } from '@nestjs/jwt';
import { Constants } from 'src/shared/constants/constants';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private jwtService: JwtService, private reflector: Reflector) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      // 💡 See this condition
      return true;
    }
    
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);
    if (!token) {
      throw new UnauthorizedException();
    }

    try {
      const payload = await this.jwtService.verifyAsync(
        token,
        {
          secret: process.env.JWT_SECRET || 'your-secret-key'
        }
      );
      // 💡 We're assigning the payload to the request object here so that we can access it in our route handlers
      console.log(payload);
      request['user'] = payload;
    } catch(error) {
      if ((error as any)?.name === Constants.EXCEPTION.TOKEN_EXPIRED_ERROR) {
        throw new UnauthorizedException(Constants.AUTH.TOKEN_EXPIRED);
      }
      throw new UnauthorizedException(Constants.AUTH.UN_AUTHORIZED);
    }
    return (await super.canActivate(context)) as boolean;
    //return true;

  }

  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    // If we have an error or no user, throw an error
    if (err) {
      throw err;
    }

    const request = context.switchToHttp().getRequest();
    // Use the decoded user from the request if passport validation fails
    const decodedUser = request.user;

    if (!user && !decodedUser) {
      throw new UnauthorizedException('Invalid or expired token');
    }

    // Return either the passport validated user or our decoded user
    return user || decodedUser;
  }

  private extractTokenFromHeader(request: Request| any): string | undefined {
    const authorizationHeader = request.headers.authorization;
    const [type, token] = authorizationHeader ? authorizationHeader.split(' ') : [];

   //const [type, token] = request.headers.authorization?.split(' ') ? [];
    return type === 'Bearer' ? token : undefined;
  }

}