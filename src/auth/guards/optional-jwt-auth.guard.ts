import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

// Igual que JwtAuthGuard pero no falla si no hay token.
// Útil para endpoints que funcionan tanto para guests como para usuarios logueados.
// Si hay token válido → req.user se popula. Si no hay token → req.user = undefined.
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }

  handleRequest(err: any, user: any) {
    // En lugar de tirar UnauthorizedException, simplemente devuelve null
    return user ?? null;
  }
}