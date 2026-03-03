import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AddItemDto } from './dto/add-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';

@Injectable()
export class CartService {
  constructor(private prisma: PrismaService) {}

  async getCart(cartId: string) {
    const cart = await this.prisma.cart.findUnique({
      where: { id: cartId },
      include: {
        items: {
          include: {
            productVariant: {
              include: {
                product: true,
                color: true,
              },
            },
          },
        },
      },
    });

    if (!cart) throw new NotFoundException('Cart not found');

    const total = cart.items.reduce((acc, item) => {
      return acc.add(new Prisma.Decimal(item.unitPrice).mul(item.quantity));
    }, new Prisma.Decimal(0));

    return {
      ...cart,
      total: total.toFixed(2),
    };
  }

  async addItem(cartId: string, dto: AddItemDto) {
    const { productVariantId, quantity } = dto;

    const variant = await this.prisma.productVariant.findUnique({
      where: { id: productVariantId },
      include: { product: true },
    });

    if (!variant || !variant.product.isActive) {
      throw new NotFoundException('Product not available');
    }

    const existingItem = await this.prisma.cartItem.findUnique({
      where: {
        cartId_productVariantId: { cartId, productVariantId },
      },
    });

    const currentQty = existingItem?.quantity ?? 0;
    const newQty = currentQty + quantity;

    if (newQty > variant.stock) {
      throw new BadRequestException(
        `Insufficient stock. Available: ${variant.stock - currentQty}`,
      );
    }

    if (existingItem) {
      return this.prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: newQty },
        include: {
          productVariant: { include: { product: true, color: true } },
        },
      });
    }

    return this.prisma.cartItem.create({
      data: {
        cartId,
        productVariantId,
        quantity,
        unitPrice: variant.product.price,
      },
      include: {
        productVariant: { include: { product: true, color: true } },
      },
    });
  }

  async updateItem(cartId: string, itemId: number, dto: UpdateItemDto) {
    const { quantity } = dto;

    const item = await this.prisma.cartItem.findFirst({
      where: { id: itemId, cartId },
      include: {
        productVariant: { include: { product: true } },
      },
    });

    if (!item) throw new NotFoundException('Cart item not found');

    if (!item.productVariant.product.isActive) {
      throw new BadRequestException('Product is no longer available');
    }

    if (quantity > item.productVariant.stock) {
      throw new BadRequestException(
        `Insufficient stock. Available: ${item.productVariant.stock}`,
      );
    }

    return this.prisma.cartItem.update({
      where: { id: itemId },
      data: { quantity },
      include: {
        productVariant: { include: { product: true, color: true } },
      },
    });
  }

  async removeItem(cartId: string, itemId: number): Promise<void> {
    const item = await this.prisma.cartItem.findFirst({
      where: { id: itemId, cartId },
    });

    if (!item) throw new NotFoundException('Cart item not found');

    await this.prisma.cartItem.delete({ where: { id: itemId } });
  }

  async clearCart(cartId: string): Promise<void> {
    const cart = await this.prisma.cart.findFirst({
      where: { id: cartId, status: 'ACTIVE' },
    });

    if (!cart) throw new NotFoundException('Cart not found');

    await this.prisma.cartItem.deleteMany({ where: { cartId } });
  }

  async checkoutCart(cartId: string) {
    const cart = await this.prisma.cart.findFirst({
      where: { id: cartId, status: 'ACTIVE' },
      include: { items: true },
    });

    if (!cart) throw new NotFoundException('Cart not found');
    if (cart.items.length === 0) {
      throw new BadRequestException('Cannot checkout an empty cart');
    }

    return this.prisma.cart.update({
      where: { id: cartId },
      data: { status: 'CHECKED_OUT' },
    });
  }
}
