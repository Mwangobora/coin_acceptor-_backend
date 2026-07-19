import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateLockerDto {
  @IsInt()
  @Min(1)
  lockerNumber!: number;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  label?: string;
}
