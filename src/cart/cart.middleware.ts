import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { PrismaService } from 'src/prisma/prisma.service';

const CART_COOKIE = 'cartId';
const CART_MAX_AGE = 1000 * 60 * 60 * 24 * 30; // 30 días en ms

@Injectable()
export class CartMiddleware implements NestMiddleware {
  private readonly logger = new Logger(CartMiddleware.name);

  constructor(private prisma: PrismaService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    try {
      const cartId = req.cookies?.[CART_COOKIE];

      if (cartId) {
        const existing = await this.prisma.cart.findFirst({
          where: { id: cartId, status: 'ACTIVE' },
        });

        if (existing) {
          req.cartId = existing.id;
          return next();
        }
      }

      // No hay cookie válida — crear nuevo carrito
      const newCart = await this.prisma.cart.create({ data: {} });

      res.cookie(CART_COOKIE, newCart.id, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        maxAge: CART_MAX_AGE,
      });

      req.cartId = newCart.id;
      next();
    } catch (error) {
      this.logger.error('Failed to resolve cart', error);
      next(error); // propaga al filtro global de excepciones
    }
  }
}