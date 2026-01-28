import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCategoryDto, TransactionType } from '../dto/finance.dto';

@Injectable()
export class CategoryService {
    private readonly logger = new Logger(CategoryService.name);

    constructor(private readonly prisma: PrismaService) {}

    // ==========================================
    // Category CRUD
    // ==========================================

    async create(userId: string, dto: CreateCategoryDto) {
        // Check for duplicate name
        const existing = await this.prisma.transactionCategory.findFirst({
            where: {
                userId,
                name: dto.name,
                type: dto.type,
            },
        });

        if (existing) {
            throw new BadRequestException('A category with this name already exists');
        }

        // Validate parent if provided
        if (dto.parentId) {
            const parent = await this.prisma.transactionCategory.findFirst({
                where: {
                    id: dto.parentId,
                    OR: [{ userId }, { isSystem: true }],
                },
            });

            if (!parent) {
                throw new NotFoundException('Parent category not found');
            }
        }

        const category = await this.prisma.transactionCategory.create({
            data: {
                userId,
                name: dto.name,
                type: dto.type,
                icon: dto.icon || 'tag',
                color: dto.color || this.getDefaultColor(dto.type),
                parentId: dto.parentId,
                keywords: JSON.stringify(dto.keywords || []),
            },
        });

        this.logger.log(`Created category: ${category.id} for user ${userId}`);
        return category;
    }

    async findAll(userId: string, type?: TransactionType) {
        const where: any = {
            OR: [{ userId }, { isSystem: true }],
        };

        if (type) {
            where.type = type;
        }

        const categories = await this.prisma.transactionCategory.findMany({
            where,
            orderBy: [{ isSystem: 'desc' }, { name: 'asc' }],
        });

        // Build hierarchy
        const rootCategories = categories.filter(c => !c.parentId);
        const childCategories = categories.filter(c => c.parentId);

        return rootCategories.map(root => ({
            ...root,
            keywords: JSON.parse(root.keywords || '[]'),
            children: childCategories
                .filter(c => c.parentId === root.id)
                .map(c => ({
                    ...c,
                    keywords: JSON.parse(c.keywords || '[]'),
                })),
        }));
    }

    async findOne(userId: string, categoryId: string) {
        const category = await this.prisma.transactionCategory.findFirst({
            where: {
                id: categoryId,
                OR: [{ userId }, { isSystem: true }],
            },
        });

        if (!category) {
            throw new NotFoundException('Category not found');
        }

        return {
            ...category,
            keywords: JSON.parse(category.keywords || '[]'),
        };
    }

    async update(userId: string, categoryId: string, dto: Partial<CreateCategoryDto>) {
        const category = await this.findOne(userId, categoryId);

        if ((category as any).isSystem) {
            throw new BadRequestException('Cannot modify system categories');
        }

        return this.prisma.transactionCategory.update({
            where: { id: categoryId },
            data: {
                ...(dto.name && { name: dto.name }),
                ...(dto.icon && { icon: dto.icon }),
                ...(dto.color && { color: dto.color }),
                ...(dto.keywords && { keywords: JSON.stringify(dto.keywords) }),
            },
        });
    }

    async delete(userId: string, categoryId: string) {
        const category = await this.findOne(userId, categoryId);

        if ((category as any).isSystem) {
            throw new BadRequestException('Cannot delete system categories');
        }

        // Check for transactions using this category
        const transactionCount = await this.prisma.transaction.count({
            where: { categoryId },
        });

        if (transactionCount > 0) {
            throw new BadRequestException(
                `Cannot delete category with ${transactionCount} transactions. Reassign transactions first.`,
            );
        }

        // Delete child categories first
        await this.prisma.transactionCategory.deleteMany({
            where: { parentId: categoryId },
        });

        await this.prisma.transactionCategory.delete({
            where: { id: categoryId },
        });

        return { message: 'Category deleted successfully' };
    }

    // ==========================================
    // Keywords Management
    // ==========================================

    async addKeyword(userId: string, categoryId: string, keyword: string) {
        const category = await this.findOne(userId, categoryId);
        const keywords = JSON.parse((category as any).keywords || '[]') as string[];

        if (!keywords.includes(keyword.toLowerCase())) {
            keywords.push(keyword.toLowerCase());
        }

        return this.prisma.transactionCategory.update({
            where: { id: categoryId },
            data: { keywords: JSON.stringify(keywords) },
        });
    }

    async removeKeyword(userId: string, categoryId: string, keyword: string) {
        const category = await this.findOne(userId, categoryId);
        const keywords = JSON.parse((category as any).keywords || '[]') as string[];
        const filtered = keywords.filter(k => k !== keyword.toLowerCase());

        return this.prisma.transactionCategory.update({
            where: { id: categoryId },
            data: { keywords: JSON.stringify(filtered) },
        });
    }

    // ==========================================
    // Statistics
    // ==========================================

    async getCategoryStats(userId: string, categoryId: string, startDate: Date, endDate: Date) {
        await this.findOne(userId, categoryId);

        const transactions = await this.prisma.transaction.findMany({
            where: {
                categoryId,
                userId,
                date: { gte: startDate, lte: endDate },
                status: 'COMPLETED',
            },
        });

        const total = transactions.reduce((sum, t) => sum + t.amount, 0);
        const average = transactions.length > 0 ? total / transactions.length : 0;

        // Group by month
        const byMonth: Record<string, number> = {};
        for (const tx of transactions) {
            const month = tx.date.toISOString().slice(0, 7);
            byMonth[month] = (byMonth[month] || 0) + tx.amount;
        }

        return {
            total,
            average,
            transactionCount: transactions.length,
            byMonth,
            period: { startDate, endDate },
        };
    }

    // ==========================================
    // System Categories Initialization
    // ==========================================

    async initializeSystemCategories() {
        const systemCategories = [
            // Expense categories
            { name: 'Alimentação', type: 'EXPENSE', icon: 'utensils', color: '#ef4444', keywords: ['restaurante', 'ifood', 'uber eats', 'mercado', 'supermercado', 'padaria'] },
            { name: 'Transporte', type: 'EXPENSE', icon: 'car', color: '#f59e0b', keywords: ['uber', '99', 'combustível', 'gasolina', 'estacionamento', 'pedágio'] },
            { name: 'Moradia', type: 'EXPENSE', icon: 'home', color: '#8b5cf6', keywords: ['aluguel', 'condomínio', 'iptu', 'energia', 'água', 'gás'] },
            { name: 'Saúde', type: 'EXPENSE', icon: 'heart-pulse', color: '#ec4899', keywords: ['farmácia', 'médico', 'hospital', 'plano de saúde', 'exame'] },
            { name: 'Educação', type: 'EXPENSE', icon: 'graduation-cap', color: '#06b6d4', keywords: ['escola', 'faculdade', 'curso', 'livro', 'material escolar'] },
            { name: 'Lazer', type: 'EXPENSE', icon: 'gamepad-2', color: '#10b981', keywords: ['netflix', 'spotify', 'cinema', 'teatro', 'show', 'viagem'] },
            { name: 'Compras', type: 'EXPENSE', icon: 'shopping-bag', color: '#f97316', keywords: ['shopping', 'loja', 'roupa', 'sapato', 'eletrônico'] },
            { name: 'Serviços', type: 'EXPENSE', icon: 'wrench', color: '#64748b', keywords: ['internet', 'telefone', 'celular', 'streaming'] },
            { name: 'Outros Gastos', type: 'EXPENSE', icon: 'ellipsis', color: '#9ca3af', keywords: [] },

            // Income categories
            { name: 'Salário', type: 'INCOME', icon: 'briefcase', color: '#22c55e', keywords: ['salário', 'folha', 'pagamento'] },
            { name: 'Freelance', type: 'INCOME', icon: 'laptop', color: '#14b8a6', keywords: ['freelance', 'projeto', 'consultoria'] },
            { name: 'Investimentos', type: 'INCOME', icon: 'trending-up', color: '#6366f1', keywords: ['dividendo', 'rendimento', 'juros', 'ação'] },
            { name: 'Vendas', type: 'INCOME', icon: 'store', color: '#a855f7', keywords: ['venda', 'mercado livre', 'olx'] },
            { name: 'Outras Receitas', type: 'INCOME', icon: 'plus-circle', color: '#84cc16', keywords: [] },
        ];

        for (const cat of systemCategories) {
            const existing = await this.prisma.transactionCategory.findFirst({
                where: { name: cat.name, isSystem: true },
            });

            if (!existing) {
                await this.prisma.transactionCategory.create({
                    data: {
                        name: cat.name,
                        type: cat.type,
                        icon: cat.icon,
                        color: cat.color,
                        keywords: JSON.stringify(cat.keywords),
                        isSystem: true,
                    },
                });
            }
        }

        this.logger.log('System categories initialized');
    }

    // ==========================================
    // Helpers
    // ==========================================

    private getDefaultColor(type: TransactionType): string {
        return type === TransactionType.INCOME ? '#22c55e' : '#ef4444';
    }
}
