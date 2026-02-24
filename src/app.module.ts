import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { ProductModule } from './products/product.module';
import { CartModule } from './cart/cart.module';
import { ConfigModule } from '@nestjs/config';
import { OrderModule } from './order/order-module';

@Module({
  imports: [
     ConfigModule.forRoot({ isGlobal: true }),
     PrismaModule, UsersModule, AuthModule, ProductModule, CartModule,OrderModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
