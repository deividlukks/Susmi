import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { ITransactionRepository } from '../../domain/repositories/transaction.repository.interface';
import { TransactionEntity } from '../../domain/entities/transaction.entity';
import { BalanceCalculatorService } from '../../domain/services/balance-calculator.service';
import { CreateTransactionDto, TransactionType } from '../../dto/finance.dto';
import { PrismaService } from '../../../prisma/prisma.service';

/**
 * Create Transaction Use Case - Application Layer
 *
 * Orquestra criação de transação validando conta e categoria
 */
@Injectable()
export class CreateTransactionUseCase {
    constructor(
        private readonly transactionRepository: ITransactionRepository,
        private readonly balanceCalculator: BalanceCalculatorService,
        private readonly prisma: PrismaService,
    ) {}

    async execute(userId: string, dto: CreateTransactionDto): Promise<TransactionEntity> {
        // Verify account ownership
        const account = await this.prisma.bankAccount.findFirst({
            where: { id: dto.accountId, userId },
        });

        if (!account) {
            throw new NotFoundException('Account not found');
        }

        // Verify category if provided
        if (dto.categoryId) {
            const category = await this.prisma.transactionCategory.findFirst({
                where: {
                    id: dto.categoryId,
                    OR: [{ userId }, { isSystem: true }],
                },
            });

            if (!category) {
                throw new NotFoundException('Category not found');
            }
        }

        // Create transaction entity
        const transaction = new TransactionEntity(
            randomUUID(),
            userId,
            dto.accountId,
            dto.type,
            dto.amount,
            dto.description,
            dto.date ? new Date(dto.date) : new Date(),
            dto.categoryId || null,
            dto.notes || null,
            dto.isPending || false,
            dto.isPending ? 'PENDING' : 'COMPLETED',
            dto.merchantName || null,
            null, // transferAccountId
            null, // transferPairId
            new Date(),
            new Date(),
        );

        // Save transaction
        const created = await this.transactionRepository.create(transaction);

        // Update account balance
        await this.balanceCalculator.updateAccountBalance(
            dto.accountId,
            dto.type,
            dto.amount
        );

        return created;
    }
}
