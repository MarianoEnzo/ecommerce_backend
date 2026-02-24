import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { CartMiddleware } from './cart.middleware';
import { PrismaModule } from 'src/prisma/prisma.module';
import { CartService } from './cart.service';
import { CartController } from './cart.controller';

@Module({
  imports: [PrismaModule],
  controllers: [CartController],
  providers: [CartService],
})
export class CartModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(CartMiddleware).forRoutes('cart', 'checkout');
  }
}
