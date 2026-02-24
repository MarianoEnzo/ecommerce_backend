import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class CartMiddleware implements NestMiddleware {
  constructor(private prisma: PrismaService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    let cartId = req.cookies?.cartId;

    if (cartId) {
      const existing = await this.prisma.cart.findFirst({
        where: {
          id: cartId,
          status: 'ACTIVE',
        },
      });

      if (existing) {
        req['cartId'] = existing.id;
        return next();
      }
    }

    // Crear nuevo cart si no existe
    const newCart = await this.prisma.cart.create({
      data: {},
    });

    res.cookie('cartId', newCart.id, {
      httpOnly: true,
      sameSite: 'lax',
    });

    req['cartId'] = newCart.id;

    next();
  }
}
