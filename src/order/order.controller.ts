import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiCookieAuth,
} from '@nestjs/swagger';
import * as express from 'express';
import { Role } from '@prisma/client';
import { OrderService } from './order-service';
import { CreateOrderDto } from './dto/create-order-dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { OptionalJwtAuthGuard } from 'src/auth/guards/optional-jwt-auth.guard';

@ApiTags('orders')
@Controller('orders')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @UseGuards(OptionalJwtAuthGuard)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiCookieAuth('cartId')
  @ApiOperation({ summary: 'Crear orden desde el carrito actual (guest o logueado)' })
  @ApiResponse({ status: 201, description: 'Orden creada, cookie de carrito borrada' })
  @ApiResponse({ status: 400, description: 'Carrito vacío o stock insuficiente' })
  createOrder(
    @Req() req: any,
    @Res({ passthrough: true }) res: express.Response,
    @Body() dto: CreateOrderDto,
  ) {
    const userId = req.user?.id ?? null;
    return this.orderService.createOrder(req.cartId!, dto, userId, res);
  }

  @UseGuards(JwtAuthGuard)
  @Get('my-orders')
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Órdenes del usuario logueado' })
  @ApiResponse({ status: 200, description: 'Lista de órdenes del usuario' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  findMyOrders(@Req() req: any) {
    return this.orderService.findMyOrders(req.user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener orden por ID' })
  @ApiResponse({ status: 200, description: 'Orden encontrada' })
  @ApiResponse({ status: 404, description: 'Orden no encontrada' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.orderService.findOne(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Get()
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Listar todas las órdenes (admin)' })
  @ApiResponse({ status: 200, description: 'Lista de todas las órdenes' })
  @ApiResponse({ status: 403, description: 'Sin permisos' })
  findAll() {
    return this.orderService.findAll();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Patch(':id/status')
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Cambiar estado de una orden (admin)' })
  @ApiResponse({ status: 200, description: 'Estado actualizado' })
  @ApiResponse({ status: 400, description: 'Transición de estado inválida' })
  @ApiResponse({ status: 404, description: 'Orden no encontrada' })
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    return this.orderService.updateStatus(id, dto);
  }
}