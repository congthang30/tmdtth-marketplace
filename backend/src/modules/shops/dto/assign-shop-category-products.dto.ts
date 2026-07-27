import { ArrayMaxSize, ArrayUnique, IsArray, IsString, Matches } from 'class-validator';

export class AssignShopCategoryProductsDto {
  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(200)
  @IsString({ each: true })
  @Matches(/^\d+$/, { each: true })
  productIds!: string[];
}
