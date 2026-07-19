import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateLockerDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  label?: string;
}
