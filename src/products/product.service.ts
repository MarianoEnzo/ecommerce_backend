import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product';
import { FilterProductDto } from './dto/filter-product.dto';
import slugify from 'slugify';

@Injectable()
export class ProductService {
  constructor(private prisma: PrismaService) {}

  // ===============================
  // CREATE PRODUCT
  // ===============================
  async create(dto: CreateProductDto) {
    const slug = slugify(dto.name, {
      lower: true,
      strict: true,
    });
    return this.prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          name: dto.name,
          slug,
          description: dto.description,
          price: dto.price,
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

  // ===============================
  // FIND ALL WITH FILTER + PAGINATION
  // ===============================
  async findAll(filters: FilterProductDto) {
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

    if (category) where.category = category;
    if (gender) where.gender = gender;

    if (minPrice || maxPrice) {
      where.price = {};
      if (minPrice) where.price.gte = minPrice;
      if (maxPrice) where.price.lte = maxPrice;
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
        skip: (page - 1) * limit,
        take: limit,
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

    return {
      data: products,
      meta: {
        total,
        page,
        lastPage: Math.ceil(total / limit),
      },
    };
  }

  // ===============================
  // FIND ONE
  // ===============================
  async findOne(id: number) {
    const product = await this.prisma.product.findFirst({
      where: {
        id,
        isActive: true,
      },
      include: {
        variants: {
          include: {
            color: true,
          },
        },
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return product;
  }

  // ===============================
  // UPDATE PRODUCT
  // ===============================
  async update(id: number, dto: UpdateProductDto) {
    await this.findOne(id);

    return this.prisma.product.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        price: dto.price,
        category: dto.category,
        gender: dto.gender,
        isActive: dto.isActive,
      },
      include: {
        variants: {
          include: {
            color: true,
          },
        },
      },
    });
  }

  // ===============================
  // SOFT DELETE
  // ===============================
  async remove(id: number) {
    await this.findOne(id);

    return this.prisma.product.update({
      where: { id },
      data: {
        isActive: false,
      },
    });
  }

  async findOneBySlug(slug: string) {
  const product = await this.prisma.product.findFirst({
    where: {
      slug,
      isActive: true,
    },
    include: {
      variants: {
        include: {
          color: true,
        },
      },
    },
  });

  if (!product) {
    throw new NotFoundException('Product not found');
  }

  return product;
}
}
