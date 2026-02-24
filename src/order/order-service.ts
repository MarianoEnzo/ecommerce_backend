import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OrderStatus, Prisma } from '@prisma/client';
import { Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order-dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';

// Transiciones de estado válidas — evita cambios de estado incoherentes
const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: [OrderStatus.PAID, OrderStatus.CANCELLED],
  PAID: [OrderStatus.CANCELLED],
  CANCELLED: [],
};

const ORDER_INCLUDE = {
  items: {
    include: {
      productVariant: {
        include: { product: true, color: true },
      },
    },
  },
} satisfies Prisma.OrderInclude;

@Injectable()
export class OrderService {
  constructor(private prisma: PrismaService) {}

  async createOrder(
    cartId: string,
    dto: CreateOrderDto,
    userId: number | null,
    res: Response,
  ) {
    const cart = await this.prisma.cart.findFirst({
      where: { id: cartId, status: 'ACTIVE' },
      include: {
        items: {
          include: {
            productVariant: { include: { product: true } },
          },
        },
      },
    });

    if (!cart) throw new NotFoundException('Cart not found');
    if (cart.items.length === 0) {
      throw new BadRequestException('Cannot place an order with an empty cart');
    }

    // Validar stock de todos los items antes de tocar nada
    const stockErrors: string[] = [];

    for (const item of cart.items) {
      if (!item.productVariant.product.isActive) {
        stockErrors.push(
          `Product "${item.productVariant.product.name}" is no longer available`,
        );
        continue;
      }

      if (item.productVariant.stock < item.quantity) {
        stockErrors.push(
          `Insufficient stock for "${item.productVariant.product.name}" (${item.productVariant.size}). ` +
            `Available: ${item.productVariant.stock}, requested: ${item.quantity}`,
        );
      }
    }

    if (stockErrors.length > 0) throw new BadRequestException(stockErrors);

    const totalAmount = cart.items.reduce((acc, item) => {
      return acc.add(new Prisma.Decimal(item.unitPrice).mul(item.quantity));
    }, new Prisma.Decimal(0));

    const order = await this.prisma.$transaction(async (tx) => {
      await Promise.all(
        cart.items.map((item) =>
          tx.productVariant.update({
            where: { id: item.productVariantId },
            data: { stock: { decrement: item.quantity } },
          }),
        ),
      );

      const newOrder = await tx.order.create({
        data: {
          cartId: cart.id,
          userId, // null si es guest, id si está logueado
          contactName: dto.contactName,
          contactEmail: dto.contactEmail,
          totalAmount,
          status: 'PENDING',
          items: {
            create: cart.items.map((item) => ({
              productVariantId: item.productVariantId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
            })),
          },
        },
        include: ORDER_INCLUDE,
      });

      await tx.cart.update({
        where: { id: cart.id },
        data: { status: 'CHECKED_OUT' },
      });

      return newOrder;
    });

    res.clearCookie('cartId', {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    });

    return order;
  }

  async findOne(id: number) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: ORDER_INCLUDE,
    });

    if (!order) throw new NotFoundException('Order not found');

    return order;
  }

  async findMyOrders(userId: number) {
    return this.prisma.order.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: ORDER_INCLUDE,
    });
  }

  async findAll() {
    return this.prisma.order.findMany({
      orderBy: { createdAt: 'desc' },
      include: ORDER_INCLUDE,
    });
  }

  async updateStatus(id: number, dto: UpdateOrderStatusDto) {
    const order = await this.findOne(id);

    const validNext = VALID_TRANSITIONS[order.status];

    if (!validNext.includes(dto.status)) {
      throw new BadRequestException(
        `Cannot transition order from ${order.status} to ${dto.status}`,
      );
    }

    return this.prisma.order.update({
      where: { id },
      data: { status: dto.status },
      include: ORDER_INCLUDE,
    });
  }
}