import { IsEnum, IsInt, IsNotEmpty, IsString, Min } from 'class-validator';
import { Size } from '@prisma/client';

export class CreateVariantDto {
  @IsInt()
  colorId: number;

  @IsEnum(Size)
  size: Size;

  @IsInt()
  @Min(0)
  stock: number;

  @IsString()
  @IsNotEmpty()
  imageUrl: string;
}
