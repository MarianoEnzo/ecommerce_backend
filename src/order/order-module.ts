import { Module } from '@nestjs/common';
import { OrderController } from './order.controller';
import { OrderService } from './order-service';

// PrismaService no hace falta agregarlo acá — PrismaModule es @Global()

@Module({
  controllers: [OrderController],
  providers: [OrderService],
})
export class OrderModule {}