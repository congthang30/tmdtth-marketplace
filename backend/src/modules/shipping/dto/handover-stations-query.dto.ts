import { IsIn } from 'class-validator';

const handoverMethods = ['Pickup', 'Dropoff'] as const;

export class HandoverStationsQueryDto {
  @IsIn(handoverMethods)
  handoverMethod!: (typeof handoverMethods)[number];
}
