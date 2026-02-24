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
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiCookieAuth,
} from '@nestjs/swagger';
import * as express from 'express';
import { CartService } from './cart.service';
import { AddItemDto } from './dto/add-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';

@ApiTags('cart')
@ApiCookieAuth('cartId')
@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  @ApiOperation({ summary: 'Obtener carrito actual (se crea si no existe)' })
  @ApiResponse({ status: 200, description: 'Carrito con sus items' })
  getCart(@Req() req: express.Request) {
    return this.cartService.getCart(req.cartId!);
  }

  @Post('items')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Agregar item al carrito' })
  @ApiResponse({ status: 200, description: 'Item agregado o cantidad acumulada' })
  @ApiResponse({ status: 400, description: 'Stock insuficiente' })
  @ApiResponse({ status: 404, description: 'Variante no encontrada' })
  addItem(@Req() req: express.Request, @Body() dto: AddItemDto) {
    return this.cartService.addItem(req.cartId!, dto);
  }

  @Patch('items/:itemId')
  @ApiOperation({ summary: 'Actualizar cantidad de un item' })
  @ApiResponse({ status: 200, description: 'Cantidad actualizada' })
  @ApiResponse({ status: 404, description: 'Item no encontrado' })
  updateItem(
    @Req() req: express.Request,
    @Param('itemId', ParseIntPipe) itemId: number,
    @Body() dto: UpdateItemDto,
  ) {
    return this.cartService.updateItem(req.cartId!, itemId, dto);
  }

  @Delete('items/:itemId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar item del carrito' })
  @ApiResponse({ status: 204, description: 'Item eliminado' })
  @ApiResponse({ status: 404, description: 'Item no encontrado' })
  async removeItem(
    @Req() req: express.Request,
    @Param('itemId', ParseIntPipe) itemId: number,
  ) {
    await this.cartService.removeItem(req.cartId!, itemId);
  }

  @Delete('clear')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Vaciar carrito completo' })
  @ApiResponse({ status: 204, description: 'Carrito vaciado' })
  async clearCart(@Req() req: express.Request) {
    await this.cartService.clearCart(req.cartId!);
  }
}