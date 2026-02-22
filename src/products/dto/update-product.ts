import { Category, Gender } from '@prisma/client';
import {
  IsOptional,
  IsString,
  IsNumber,
  IsBoolean,
  IsEnum,
  Min,
} from 'class-validator';

export class UpdateProductDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

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
