import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { ITransactionRepository } from '../../domain/repositories/transaction.repository.interface';
import { TransactionEntity } from '../../domain/entities/transaction.entity';
import { BalanceCalculatorService } from '../../domain/services/balance-calculator.service';
import { CreateTransactionDto } from '../../dto/finance.dto';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class CreateTransferUseCase {
    constructor(
        private readonly transactionRepository: ITransactionRepository,
        private readonly balanceCalculator: BalanceCalculatorService,
        private readonly prisma: PrismaService,
    ) {}

    async execute(userId: string, dto: CreateTransactionDto): Promise<TransactionEntity> {
        if (!dto.transferAccountId) {
            throw new Error('Transfer requires destination account');
        }

        // Verify both accounts
        const [sourceAccount, destAccount] = await Promise.all([
            this.prisma.bankAccount.findFirst({ where: { id: dto.accountId, userId } }),
            this.prisma.bankAccount.findFirst({ where: { id: dto.transferAccountId, userId } }),
        ]);

        if (!sourceAccount) throw new NotFoundException('Source account not found');
        if (!destAccount) throw new NotFoundException('Destination account not found');

        const transferPairId = `transfer-${Date.now()}`;
        const date = dto.date ? new Date(dto.date) : new Date();

        // Create outgoing transaction
        const outgoing = new TransactionEntity(
            randomUUID(),
            userId,
            dto.accountId,
            'TRANSFER' as any,
            dto.amount,
            dto.description || `Transferência para ${destAccount.name}`,
            date,
            null,
            dto.notes || null,
            false,
            'COMPLETED',
            null,
            dto.transferAccountId,
            transferPairId,
            new Date(),
            new Date(),
        );

        // Create incoming transaction
        const incoming = new TransactionEntity(
            randomUUID(),
            userId,
            dto.transferAccountId,
            'TRANSFER' as any,
            dto.amount,
            dto.description || `Transferência de ${sourceAccount.name}`,
            date,
            null,
            dto.notes || null,
            false,
            'COMPLETED',
            null,
            dto.accountId,
            transferPairId,
            new Date(),
            new Date(),
        );

        // Create transfer pair
        const result = await this.transactionRepository.createTransferPair(userId, outgoing, incoming);

        // Update balances
        await this.balanceCalculator.updateAccountBalance(dto.accountId, 'EXPENSE', dto.amount);
        await this.balanceCalculator.updateAccountBalance(dto.transferAccountId, 'INCOME', dto.amount);

        return result;
    }
}
