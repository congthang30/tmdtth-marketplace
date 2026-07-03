export type CategoryTreeNode = {
  id: string;
  idString: string;
  parentCategoryId: string | null;
  categoryName: string;
  slug: string;
  description: string | null;
  sortOrder: number;
  children: CategoryTreeNode[];
};

export type AdminCategoryResponse = Omit<CategoryTreeNode, 'children'> & {
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date | null;
};

export type DeleteCategoryResponse = {
  id: string;
  deactivated: true;
};
