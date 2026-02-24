import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { PrismaExceptionFilter } from './common/filters/prisma-exception.filter';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useGlobalFilters(
    new HttpExceptionFilter(),
    new PrismaExceptionFilter(),
  );

  app.use(cookieParser());

  // Swagger — solo en desarrollo
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Ecommerce API')
      .setDescription('API REST para ecommerce de indumentaria')
      .setVersion('1.0')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Ingresá tu JWT token',
        },
        'JWT',
      )
      .addCookieAuth('cartId', {
        type: 'apiKey',
        in: 'cookie',
        description: 'Cart ID cookie (se setea automáticamente)',
      })
      .addTag('auth', 'Registro y login')
      .addTag('users', 'Perfil de usuario')
      .addTag('products', 'Catálogo público de productos')
      .addTag('admin/products', 'Gestión de productos (admin/seller)')
      .addTag('cart', 'Carrito de compras')
      .addTag('orders', 'Órdenes de compra')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
      },
    });

    logger.log('Swagger disponible en /api');
  }

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  logger.log(`Application running on port ${port}`);
}
bootstrap();