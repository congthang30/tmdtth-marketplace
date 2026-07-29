import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import {
  AdminCategoryResponse,
  CategoryTreeNode,
  DeleteCategoryResponse,
} from './types';

type CategoryEntity = Awaited<
  ReturnType<CategoriesService['findActiveCategories']>
>[number];

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async getPublicTree(): Promise<CategoryTreeNode[]> {
    const categories = await this.findActiveCategories();
    const nodeById = new Map<bigint, CategoryTreeNode>();
    const roots: CategoryTreeNode[] = [];

    for (const category of categories) {
      nodeById.set(category.id, this.toTreeNode(category));
    }

    for (const category of categories) {
      const node = nodeById.get(category.id);

      if (!node) {
        continue;
      }

      const parentNode = category.parentCategoryId
        ? nodeById.get(category.parentCategoryId)
        : null;

      if (parentNode) {
        parentNode.children.push(node);
      } else {
        roots.push(node);
      }
    }

    return roots;
  }

  async getAdminList(): Promise<AdminCategoryResponse[]> {
    const categories = await this.prisma.category.findMany({
      orderBy: [{ sortOrder: 'asc' }, { categoryName: 'asc' }],
    });

    return categories.map((category) => this.toAdminResponse(category));
  }

  async createCategory(dto: CreateCategoryDto): Promise<AdminCategoryResponse> {
    const parentCategoryId = this.parseOptionalCategoryId(dto.parentCategoryId);
    await this.ensureSlugAvailable(dto.slug);

    if (parentCategoryId !== null) {
      await this.requireCategory(parentCategoryId, 'PARENT_CATEGORY_NOT_FOUND');
    }

    const now = new Date();
    const category = await this.prisma.category.create({
      data: {
        categoryName: dto.categoryName,
        slug: dto.slug,
        description: this.normalizeNullableText(dto.description ?? null),
        imageUrl: this.normalizeNullableText(dto.imageUrl ?? null),
        parentCategoryId,
        sortOrder: dto.sortOrder ?? 0,
        isActive: dto.isActive ?? true,
        createdAt: now,
        updatedAt: now,
      },
    });

    return this.toAdminResponse(category);
  }

  async updateCategory(
    categoryId: string,
    dto: UpdateCategoryDto,
  ): Promise<AdminCategoryResponse> {
    const id = this.parseCategoryId(categoryId);
    await this.requireCategory(id, 'CATEGORY_NOT_FOUND');
    const data = await this.buildUpdateData(id, dto);

    if (Object.keys(data).length === 0) {
      const category = await this.requireCategory(id, 'CATEGORY_NOT_FOUND');
      return this.toAdminResponse(category);
    }

    const category = await this.prisma.category.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    });

    return this.toAdminResponse(category);
  }

  async deactivateCategory(
    categoryId: string,
  ): Promise<DeleteCategoryResponse> {
    const id = this.parseCategoryId(categoryId);
    await this.requireCategory(id, 'CATEGORY_NOT_FOUND');

    await this.prisma.category.update({
      where: { id },
      data: {
        isActive: false,
        updatedAt: new Date(),
      },
    });

    return {
      id: id.toString(),
      deactivated: true,
    };
  }

  private findActiveCategories() {
    return this.prisma.category.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { categoryName: 'asc' }],
    });
  }

  private async buildUpdateData(categoryId: bigint, dto: UpdateCategoryDto) {
    const data: {
      categoryName?: string;
      slug?: string;
      description?: string | null;
      imageUrl?: string | null;
      parentCategoryId?: bigint | null;
      sortOrder?: number;
      isActive?: boolean;
    } = {};

    if (dto.categoryName !== undefined) {
      data.categoryName = dto.categoryName;
    }

    if (dto.slug !== undefined) {
      await this.ensureSlugAvailable(dto.slug, categoryId);
      data.slug = dto.slug;
    }

    if (dto.description !== undefined) {
      data.description = this.normalizeNullableText(dto.description);
    }

    if (dto.imageUrl !== undefined) {
      data.imageUrl = this.normalizeNullableText(dto.imageUrl);
    }

    if (dto.parentCategoryId !== undefined) {
      const parentCategoryId = this.parseOptionalCategoryId(
        dto.parentCategoryId,
      );
      await this.ensureNoParentCycle(categoryId, parentCategoryId);
      data.parentCategoryId = parentCategoryId;
    }

    if (dto.sortOrder !== undefined) {
      data.sortOrder = dto.sortOrder;
    }

    if (dto.isActive !== undefined) {
      data.isActive = dto.isActive;
    }

    return data;
  }

  private async ensureSlugAvailable(
    slug: string,
    currentCategoryId?: bigint,
  ): Promise<void> {
    const existingCategory = await this.prisma.category.findUnique({
      where: { slug },
    });

    if (existingCategory && existingCategory.id !== currentCategoryId) {
      throw new ConflictException({
        code: 'SLUG_EXISTS',
        message: 'Slug danh mục đã tồn tại',
        details: [{ field: 'slug' }],
      });
    }
  }

  private async ensureNoParentCycle(
    categoryId: bigint,
    parentCategoryId: bigint | null,
  ): Promise<void> {
    let currentParentId = parentCategoryId;

    while (currentParentId !== null) {
      if (currentParentId === categoryId) {
        throw new BadRequestException({
          code: 'CATEGORY_PARENT_CYCLE',
          message: 'Parent category không được tạo vòng lặp',
          details: [{ field: 'parentCategoryId' }],
        });
      }

      const parentCategory = await this.requireCategory(
        currentParentId,
        'PARENT_CATEGORY_NOT_FOUND',
      );
      currentParentId = parentCategory.parentCategoryId;
    }
  }

  private async requireCategory(categoryId: bigint, code: string) {
    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
    });

    if (!category) {
      throw new NotFoundException({
        code,
        message: 'Không tìm thấy danh mục',
        details: [{ field: 'id' }],
      });
    }

    return category;
  }

  private parseOptionalCategoryId(
    categoryId: string | null | undefined,
  ): bigint | null {
    if (categoryId === undefined || categoryId === null || categoryId === '') {
      return null;
    }

    return this.parseCategoryId(categoryId);
  }

  private parseCategoryId(categoryId: string): bigint {
    if (!/^\d+$/.test(categoryId)) {
      throw new BadRequestException({
        code: 'INVALID_CATEGORY_ID',
        message: 'Id danh mục không hợp lệ',
        details: [{ field: 'id' }],
      });
    }

    return BigInt(categoryId);
  }

  private normalizeNullableText(value: string | null): string | null {
    if (value === null) {
      return null;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  private toTreeNode(category: CategoryEntity): CategoryTreeNode {
    return {
      id: category.id.toString(),
      idString: category.id.toString(),
      parentCategoryId: category.parentCategoryId?.toString() ?? null,
      categoryName: category.categoryName,
      slug: category.slug,
      description: category.description,
      imageUrl: category.imageUrl,
      sortOrder: category.sortOrder,
      children: [],
    };
  }

  private toAdminResponse(category: CategoryEntity): AdminCategoryResponse {
    return {
      id: category.id.toString(),
      idString: category.id.toString(),
      parentCategoryId: category.parentCategoryId?.toString() ?? null,
      categoryName: category.categoryName,
      slug: category.slug,
      description: category.description,
      imageUrl: category.imageUrl,
      sortOrder: category.sortOrder,
      isActive: category.isActive,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
    };
  }
}
