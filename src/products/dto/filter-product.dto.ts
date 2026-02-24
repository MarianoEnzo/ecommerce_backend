import {
  IsOptional,
  IsEnum,
  IsInt,
  Min,
  IsString,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Category, Gender, Size } from '@prisma/client';

export class FilterProductDto {
  @IsOptional()
  @IsEnum(Category)
  category?: Category;

  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsEnum(Size)
  size?: Size;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;

  @IsOptional()
  @Min(1)
  @Type(() => Number)
  @IsInt()
  maxPrice: number;

  @IsOptional()
  @Min(1)
  @Type(() => Number)
  @IsInt()
  minPrice: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  colorId: number;

  @IsOptional()
  @IsString()
  sort?: string;

  @IsOptional()
  @IsIn(['asc', 'desc'])
  order?: 'asc' | 'desc';
}
