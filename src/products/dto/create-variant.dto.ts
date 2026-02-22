import { IsEnum, IsInt, IsString, Min } from 'class-validator';
import { Size } from '@prisma/client';

export class CreateVariantDto {
  
  @IsEnum(Size)
  size: Size;

  @IsInt()
  @Min(0)
  stock: number;

  @IsString()
  imageUrl: string;

  @IsInt()
  colorId: number;
}