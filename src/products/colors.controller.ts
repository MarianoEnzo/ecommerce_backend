import { Controller, Get } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Controller('colors')
export class ColorsController {
  constructor(private prisma: PrismaService) {}

  @Get()
  findAll() {
    return this.prisma.color.findMany();
  }
}
