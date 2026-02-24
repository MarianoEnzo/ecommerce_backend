import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Req,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import type { Request } from 'express';

import { CartService } from './cart.service';
import { AddItemDto } from './dto/add-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';

@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  /**
   * Obtener carrito actual
   */
  @Get()
  async getCart(@Req() req: Request) {
    return this.cartService.getCart(req.cartId!);
  }

  /**
   * Agregar producto al carrito
   */
  @Post('items')
  @HttpCode(HttpStatus.OK)
  async addItem(@Req() req: Request, @Body() dto: AddItemDto) {
    return this.cartService.addItem(req.cartId!, dto);
  }

  /**
   * Actualizar cantidad de un item
   */
  @Patch('items/:itemId')
  async updateItem(
    @Req() req: Request,
    @Param('itemId', ParseIntPipe) itemId: number,
    @Body() dto: UpdateItemDto,
  ) {
    return this.cartService.updateItem(req.cartId!, itemId, dto);
  }

  /**
   * Eliminar item del carrito
   */
  @Delete('items/:itemId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeItem(
    @Req() req: Request,
    @Param('itemId', ParseIntPipe) itemId: number,
  ) {
    await this.cartService.removeItem(req.cartId!, itemId);
  }

  /**
   * Vaciar carrito completo
   */
  @Delete('clear')
  @HttpCode(HttpStatus.NO_CONTENT)
  async clearCart(@Req() req: Request) {
    await this.cartService.clearCart(req.cartId!);
  }
}
