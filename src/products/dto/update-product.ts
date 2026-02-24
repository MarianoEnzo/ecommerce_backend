import { Category, Gender } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsOptional,
  IsString,
  IsNumber,
  IsBoolean,
  IsEnum,
  Min,
  IsDecimal,
} from 'class-validator';

export class UpdateProductDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsDecimal({ decimal_digits: '0,2' })
  @Type(() => String)
  price?: string;

  @IsOptional()
  @IsString()
  category?: Category;

  @IsOptional()
  @IsString()
  gender?: Gender;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
