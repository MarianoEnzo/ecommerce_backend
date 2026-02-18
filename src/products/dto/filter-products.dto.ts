import { IsOptional, IsEnum } from 'class-validator';
import { Category, Gender } from '@prisma/client';

export class FilterProductsDto {
  @IsOptional()
  @IsEnum(Category)
  category?: Category;

  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @IsOptional()
  color?: string;
}
