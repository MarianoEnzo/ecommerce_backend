import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AddItemDto } from './dto/add-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';

@Injectable()
export class CartService {
  constructor(private prisma: PrismaService) {}

  async getOrCreateCart(cartId?: string) {
    if (cartId) {
      const existing = await this.prisma.cart.findFirst({
        where: { id: cartId, status: 'ACTIVE' },
      });

      if (existing) return existing;
    }

    return this.prisma.cart.create({
      data: {},
    });
  }

  async addItem(cartId: string, dto: AddItemDto) {
    const { productVariantId, quantity } = dto;

    if (quantity <= 0) {
      throw new BadRequestException('Quantity must be greater than 0');
    }

    const variant = await this.prisma.productVariant.findUnique({
      where: { id: productVariantId },
      include: { product: true },
    });

    if (!variant || !variant.product.isActive) {
      throw new NotFoundException('Product not available');
    }

    if (variant.stock < quantity) {
      throw new BadRequestException('Insufficient stock');
    }

    const cart = await this.getOrCreateCart(cartId);

    const existingItem = await this.prisma.cartItem.findUnique({
      where: {
        cartId_productVariantId: {
          cartId: cart.id,
          productVariantId,
        },
      },
    });

    if (existingItem) {
      const newQty = existingItem.quantity + quantity;

      if (newQty > variant.stock) {
        throw new BadRequestException('Insufficient stock');
      }

      return this.prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: newQty },
      });
    }

    return this.prisma.cartItem.create({
      data: {
        cartId: cart.id,
        productVariantId,
        quantity,
        unitPrice: variant.product.price, // snapshot
      },
    });
  }

  async getCart(cartId: string) {
    const cart = await this.prisma.cart.findUnique({
      where: { id: cartId },
      include: {
        items: {
          include: {
            productVariant: {
              include: { product: true },
            },
          },
        },
      },
    });

    if (!cart) return null;

    const total = cart.items.reduce((acc, item) => {
      return acc + Number(item.unitPrice) * item.quantity;
    }, 0);

    return {
      ...cart,
      total,
    };
  }

  async updateItem(cartId: string, itemId: number, dto: UpdateItemDto) {
    const { quantity } = dto;

    const item = await this.prisma.cartItem.findFirst({
      where: {
        id: itemId,
        cartId,
      },
      include: {
        productVariant: {
          include: { product: true },
        },
      },
    });

    if (!item) {
      throw new NotFoundException('Cart item not found');
    }

    if (!item.productVariant.product.isActive) {
      throw new BadRequestException('Product is not available');
    }

    if (item.productVariant.stock < quantity) {
      throw new BadRequestException('Insufficient stock');
    }

    return this.prisma.cartItem.update({
      where: { id: itemId },
      data: { quantity },
    });
  }
  async removeItem(cartId: string, itemId: number) {
    const item = await this.prisma.cartItem.findFirst({
      where: {
        id: itemId,
        cartId,
      },
    });

    if (!item) {
      throw new NotFoundException('Cart item not found');
    }

    await this.prisma.cartItem.delete({
      where: { id: itemId },
    });

    return { message: 'Item removed successfully' };
  }

  async clearCart(cartId: string) {
    const cart = await this.prisma.cart.findFirst({
      where: {
        id: cartId,
        status: 'ACTIVE',
      },
    });

    if (!cart) {
      throw new NotFoundException('Cart not found');
    }

    await this.prisma.cartItem.deleteMany({
      where: { cartId },
    });

    return { message: 'Cart cleared successfully' };
  }
}
