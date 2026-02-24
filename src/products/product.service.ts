import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product';
import { FilterProductDto } from './dto/filter-product.dto';
import slugify from 'slugify';
import { generateUniqueSlug } from 'src/common/helpers/slug.helper';
import { Prisma } from '@prisma/client';

@Injectable()
export class ProductService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateProductDto) {
    const slug = await generateUniqueSlug(this.prisma, 'product', dto.name);
    return this.prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          name: dto.name,
          slug,
          description: dto.description,
          price: new Prisma.Decimal(dto.price),
          category: dto.category,
          gender: dto.gender,
          isActive: dto.isActive ?? true,
          variants: {
            create: dto.variants,
          },
        },
        include: {
          variants: {
            include: {
              color: true,
            },
          },
        },
      });

      return product;
    });
  }

  async findAll(filters: FilterProductDto = {} as FilterProductDto) {
    try {
      const {
        page = 1,
        limit = 10,
        category,
        gender,
        minPrice,
        maxPrice,
        size,
        colorId,
      } = filters;

      const where: any = {
        isActive: true,
      };
      const safePage = Math.max(1, Number(page) || 1);
      const safeLimit = Math.min(Math.max(1, Number(limit) || 10), 50);

      if (category) where.category = category;
      if (gender) where.gender = gender;

      if (minPrice !== undefined || maxPrice !== undefined) {
        where.price = {};
        if (minPrice !== undefined) where.price.gte = Number(minPrice);
        if (maxPrice !== undefined) where.price.lte = Number(maxPrice);
      }

      if (size || colorId) {
        where.variants = {
          some: {},
        };

        if (size) where.variants.some.size = size;
        if (colorId) where.variants.some.colorId = colorId;
      }

      const [products, total] = await this.prisma.$transaction([
        this.prisma.product.findMany({
          where,
          skip: (safePage - 1) * safeLimit,
          take: safeLimit,
          include: {
            variants: {
              include: {
                color: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        }),

        this.prisma.product.count({ where }),
      ]);
      console.log('WHERE:', JSON.stringify(where, null, 2));

      return {
        data: products,
        meta: {
          total,
          page: safePage,
          lastPage: Math.ceil(total / safeLimit),
        },
      };
    } catch (error) {
      console.log(error);
    }
  }

  async findOne(id: number) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        variants: {
          include: { color: true },
        },
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return product;
  }

  async update(id: number, dto: UpdateProductDto) {
    try {
      const all = await this.prisma.product.findMany();
      console.log('ALL PRODUCTS:', all);
      const existing = await this.findOne(id);

      let slug = existing.slug;

      // Si el nombre cambia, regeneramos slug
      if (dto.name && dto.name !== existing.name) {
        slug = await generateUniqueSlug(this.prisma, 'product', dto.name);
      }

      return this.prisma.product.update({
        where: { id },
        data: {
          name: dto.name ?? existing.name,
          slug,
          description: dto.description ?? existing.description,
          price:
            dto.price !== undefined
              ? new Prisma.Decimal(dto.price)
              : existing.price,
          category: dto.category ?? existing.category,
          gender: dto.gender ?? existing.gender,
          isActive: dto.isActive ?? existing.isActive,
        },
        include: {
          variants: {
            include: { color: true },
          },
        },
      });
    } catch (error) {
      console.log(error);
    }
  }
  async remove(id: number) {
    await this.findOne(id);

    return this.prisma.product.update({
      where: { id },
      data: {
        isActive: false,
        deletedAt: new Date(),
      },
    });
  }

  async findOneBySlug(slug: string) {
    const product = await this.prisma.product.findUnique({
      where: { slug },
      include: {
        variants: {
          include: { color: true },
        },
      },
    });

    if (!product || !product.isActive) {
      throw new NotFoundException('Product not found');
    }

    return product;
  }

  async findOnePublic(id: number) {
    const product = await this.prisma.product.findFirst({
      where: {
        id,
        isActive: true,
      },
      include: {
        variants: {
          include: { color: true },
        },
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return product;
  }
}
