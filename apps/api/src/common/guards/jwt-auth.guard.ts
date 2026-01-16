import { Injectable, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    // Verificar se é um contexto HTTP válido
    const contextType = context.getType();
    if (contextType !== 'http') {
      // Para contextos não-HTTP (como WebSocket, RPC, etc), retornar false
      // Isso evita que o guard tente acessar headers que não existem
      return false;
    }

    // Verificar se o request tem headers antes de tentar validar o JWT
    const request = context.switchToHttp().getRequest();
    if (!request || !request.headers) {
      return false;
    }

    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    // Se houver erro ou não houver usuário, lançar exceção
    if (err || !user) {
      // Se o contexto não for HTTP, apenas retornar undefined
      if (context.getType() !== 'http') {
        return undefined;
      }
      return super.handleRequest(err, user, info, context);
    }
    return user;
  }
}
