import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CancelDeviceCommandDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  reason!: string;
}
