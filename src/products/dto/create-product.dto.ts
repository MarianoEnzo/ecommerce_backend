import {
  IsString,
  IsNumber,
  IsEnum,
  IsBoolean,
  IsArray,
  ValidateNested,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Category, Gender } from '@prisma/client';
import { CreateVariantDto } from './create-variant.dto';

export class CreateProductDto {
  @IsString()
  name: string;

  @IsString()
  description: string;

  @IsNumber()
  @Type(() => Number)
  @Min(0)
  price: string;

  @IsEnum(Category)
  category: Category;

  @IsEnum(Gender)
  gender: Gender;

  @IsBoolean()
  isActive: boolean;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateVariantDto)
  variants: CreateVariantDto[];
}
