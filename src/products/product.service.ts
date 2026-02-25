import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { generateUniqueSlug } from 'src/common/helpers/slug.helper';
import { CreateProductDto } from './dto/create-product.dto';
import { FilterProductDto } from './dto/filter-product.dto';
import { UpdateProductDto } from './dto/update-product';

// Include reutilizable para no repetirlo en cada query
const PRODUCT_INCLUDE = {
  variants: {
    include: { color: true },
  },
} satisfies Prisma.ProductInclude;

@Injectable()
export class ProductService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateProductDto) {
    return this.prisma.$transaction(async (tx) => {
      // Slug generado dentro de la transacción para evitar race conditions
      const slug = await generateUniqueSlug(tx, 'product', dto.name);

      return tx.product.create({
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
        include: PRODUCT_INCLUDE,
      });
    });
  }

  // findAll para endpoints públicos — solo productos activos
  async findAll(filters: FilterProductDto = {} as FilterProductDto) {
    try{
      console.log('Hola entro', JSON.stringify(filters))
    const {
      page = 1,
      limit = 10,
      category,
      gender,
      minPrice,
      maxPrice,
      size,
      colorId,
      sort = 'createdAt',
      order = 'desc',
    } = filters;

    const safePage = Math.max(1, Number(page) || 1);
    const safeLimit = Math.min(Math.max(1, Number(limit) || 10), 50);

    const where: Prisma.ProductWhereInput = { isActive: true };

    if (category) where.category = category;
    if (gender) where.gender = gender;

    if (minPrice !== undefined || maxPrice !== undefined) {
      where.price = {
        ...(minPrice !== undefined && { gte: new Prisma.Decimal(minPrice) }),
        ...(maxPrice !== undefined && { lte: new Prisma.Decimal(maxPrice) }),
      };
    }

    if (size || colorId) {
      where.variants = {
        some: {
          ...(size && { size }),
          ...(colorId && { colorId }),
        },
      };
    }

    // Whitelist de campos por los que se puede ordenar
    const allowedSortFields: (keyof Prisma.ProductOrderByWithRelationInput)[] =
      ['createdAt', 'price', 'name'];
    const orderBy: Prisma.ProductOrderByWithRelationInput = {
      [allowedSortFields.includes(sort as any) ? sort : 'createdAt']: order,
    };

    const [products, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where,
        skip: (safePage - 1) * safeLimit,
        take: safeLimit,
        include: PRODUCT_INCLUDE,
        orderBy,
      }),
      this.prisma.product.count({ where }),
    ]);
    console.log('Termina',products)
    return {
      data: products,
      meta: {
        total,
        page: safePage,
        limit: safeLimit,
        lastPage: Math.ceil(total / safeLimit),
      },
    };
    }catch(e){
      console.log(e)
    }
  }

  // findAll para el panel admin — ve todos incluyendo inactivos/eliminados
  async findAllAdmin(filters: FilterProductDto = {} as FilterProductDto) {
    const {
      page = 1,
      limit = 10,
      category,
      gender,
      minPrice,
      maxPrice,
      size,
      colorId,
      sort = 'createdAt',
      order = 'desc',
    } = filters;

    const safePage = Math.max(1, Number(page) || 1);
    const safeLimit = Math.min(Math.max(1, Number(limit) || 10), 50);

    // Sin filtro de isActive — el admin ve todo
    const where: Prisma.ProductWhereInput = {};

    if (category) where.category = category;
    if (gender) where.gender = gender;

    if (minPrice !== undefined || maxPrice !== undefined) {
      where.price = {
        ...(minPrice !== undefined && { gte: new Prisma.Decimal(minPrice) }),
        ...(maxPrice !== undefined && { lte: new Prisma.Decimal(maxPrice) }),
      };
    }

    if (size || colorId) {
      where.variants = {
        some: {
          ...(size && { size }),
          ...(colorId && { colorId }),
        },
      };
    }

    const allowedSortFields: (keyof Prisma.ProductOrderByWithRelationInput)[] =
      ['createdAt', 'price', 'name'];
    const orderBy: Prisma.ProductOrderByWithRelationInput = {
      [allowedSortFields.includes(sort as any) ? sort : 'createdAt']: order,
    };

    const [products, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where,
        skip: (safePage - 1) * safeLimit,
        take: safeLimit,
        include: PRODUCT_INCLUDE,
        orderBy,
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      data: products,
      meta: {
        total,
        page: safePage,
        limit: safeLimit,
        lastPage: Math.ceil(total / safeLimit),
      },
    };
  }

  // findOne interno — usado por update/remove, ve productos inactivos también
  async findOne(id: number) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: PRODUCT_INCLUDE,
    });

    if (!product) throw new NotFoundException('Product not found');

    return product;
  }

  // findOne público — solo productos activos
  async findOnePublic(id: number) {
    const product = await this.prisma.product.findFirst({
      where: { id, isActive: true },
      include: PRODUCT_INCLUDE,
    });

    if (!product) throw new NotFoundException('Product not found');

    return product;
  }

  async findOneBySlug(slug: string) {
    const product = await this.prisma.product.findUnique({
      where: { slug },
      include: PRODUCT_INCLUDE,
    });

    if (!product || !product.isActive)
      throw new NotFoundException('Product not found');

    return product;
  }

  async update(id: number, dto: UpdateProductDto) {
    const existing = await this.findOne(id);

    let slug = existing.slug;
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
      include: PRODUCT_INCLUDE,
    });
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
}