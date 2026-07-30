import { Transform } from 'class-transformer';
import { IsIn, IsInt, Min, ValidateIf } from 'class-validator';

const handoverMethods = ['Pickup', 'Dropoff'] as const;

export class CreateShipmentDto {
  @IsIn(handoverMethods)
  handoverMethod!: (typeof handoverMethods)[number];

  @ValidateIf(
    (dto: CreateShipmentDto) =>
      dto.handoverMethod === 'Dropoff' || dto.pickupStationId !== undefined,
  )
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  pickupStationId?: number;
}
