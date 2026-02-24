import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateOrderDto {
  @IsString()
  @MinLength(2)
  contactName: string;

  @IsOptional()
  @IsEmail()
  contactEmail?: string;
}