import {
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateChargingPortDto {
  @IsInt()
  @Min(1)
  portNumber!: number;

  @IsIn(['usb_a', 'usb_c', 'wireless', 'other'])
  portType!: string;

  @IsOptional()
  @IsString()
  hardwareChannel?: string;

  @IsOptional()
  @IsNumber()
  @Min(0.01)
  maximumVoltage?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  maximumCurrentMa?: number;

  @IsOptional()
  @IsNumber()
  @Min(0.01)
  maximumPowerWatts?: number;
}
