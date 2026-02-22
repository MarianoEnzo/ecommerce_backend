import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { FilterProductsDto } from './dto/filter-products.dto';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}
  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^\w-]+/g, '');
  }

  async create(createProductDto: CreateProductDto) {
    try {
      const { variants, ...productData } = createProductDto;

      const slug = this.generateSlug(productData.name);

      return this.prisma.product.create({
        data: {
          ...productData,
          slug,
          variants: {
            create: variants.map((v) => ({
              size: v.size,
              stock: v.stock,
              imageUrl: v.imageUrl,
              color: {
                connect: { id: v.colorId },
              },
            })),
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
    } catch (error) {
      console.log(error);
    }
  }

  async findAll(filters: FilterProductsDto) {
    return this.prisma.product.findMany({
      where: {
        isActive: true,
        category: filters.category,
        gender: filters.gender,
        variants: {
          some: {
            color: filters.color ? { name: filters.color } : undefined,
            size: filters.size,
          },
        },
      },
      include: {
        variants: {
          include: { color: true },
        },
      },
    });
  }

  async findFiltered(filters: FilterProductsDto) {
    return this.prisma.product.findMany({
      where: {
        isActive: true,
        category: filters.category,
        gender: filters.gender,
        variants: filters.color
          ? {
              some: {
                color: {
                  name: filters.color,
                },
              },
            }
          : undefined,
      },
      include: {
        variants: {
          include: { color: true },
        },
      },
    });
  }
  async findBySlug(slug: string) {
    return this.prisma.product.findUnique({
      where: { slug },
      include: {
        variants: {
          include: {
            color: true,
          },
        },
      },
    });
  }
}
