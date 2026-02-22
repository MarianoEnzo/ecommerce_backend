import {
  Body,
  Controller,
  Get,
  Post,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ProductService } from './product.service';
import { CreateProductDto } from './dto/create-product.dto';
import { FilterProductDto } from './dto/filter-product.dto';

@Controller('product') // ✅ CORRECTO
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  // 🔐 Crear producto (protegido)
  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Body() createProductDto: CreateProductDto) {
    return this.productService.create(createProductDto);
  }

  // 📦 Listar productos con filtros + paginación
  @Get()
  findAll(@Query() filters: FilterProductDto) {
    return this.productService.findAll(filters);
  }

  // 🔎 Obtener producto por slug
  @Get(':slug')
  findOne(@Param('slug') slug: string) {
    return this.productService.findOneBySlug(slug);
  }
}