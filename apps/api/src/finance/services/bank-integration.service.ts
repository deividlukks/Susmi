import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { ConnectBankDto, ImportTransactionsDto, TransactionType, AccountType } from '../dto/finance.dto';

interface PluggyAccount {
    id: string;
    name: string;
    bankCode: string;
    bankName: string;
    number: string;
    type: string;
    balance: number;
    currencyCode: string;
}

interface PluggyTransaction {
    id: string;
    description: string;
    amount: number;
    date: string;
    category: string;
    type: 'DEBIT' | 'CREDIT';
    status: string;
}

interface OFXTransaction {
    fitId: string;
    date: string;
    amount: number;
    description: string;
    type: string;
}

@Injectable()
export class BankIntegrationService {
    private readonly logger = new Logger(BankIntegrationService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly config: ConfigService,
    ) {}

    // ==========================================
    // Pluggy Integration (Brazilian Open Banking)
    // ==========================================

    async connectPluggy(userId: string, dto: ConnectBankDto) {
        // Store connection info
        // Note: In production, you would use Pluggy's SDK to validate the connection
        this.logger.log(`Connecting Pluggy account for user ${userId}`);

        // Create bank connection record
        const connection = await this.prisma.bankConnection.create({
            data: {
                userId,
                provider: 'pluggy',
                connectionId: dto.connectionId,
                itemId: dto.itemId,
                accessToken: dto.accessToken,
                status: 'CONNECTED',
                lastSyncAt: new Date(),
            },
        });

        return {
            connectionId: connection.id,
            provider: 'pluggy',
            status: 'CONNECTED',
            message: 'Conexão com Pluggy estabelecida com sucesso',
        };
    }

    async syncPluggyAccounts(userId: string, connectionId: string) {
        const connection = await this.prisma.bankConnection.findFirst({
            where: { id: connectionId, userId },
        });

        if (!connection) {
            throw new BadRequestException('Connection not found');
        }

        // In production, you would call Pluggy API here
        // For now, we simulate the response
        const mockAccounts: PluggyAccount[] = [
            {
                id: 'pluggy-acc-1',
                name: 'Conta Corrente',
                bankCode: '001',
                bankName: 'Banco do Brasil',
                number: '12345-6',
                type: 'CHECKING',
                balance: 5000.0,
                currencyCode: 'BRL',
            },
        ];

        const importedAccounts = [];

        for (const acc of mockAccounts) {
            // Check if account already exists
            const existing = await this.prisma.bankAccount.findFirst({
                where: {
                    userId,
                    bankCode: acc.bankCode,
                    accountNumber: acc.number,
                },
            });

            if (!existing) {
                const account = await this.prisma.bankAccount.create({
                    data: {
                        userId,
                        name: acc.name,
                        bankName: acc.bankName,
                        bankCode: acc.bankCode,
                        accountNumber: acc.number,
                        accountType: this.mapAccountType(acc.type),
                        currentBalance: acc.balance,
                        currency: acc.currencyCode,
                        externalId: acc.id,
                    },
                });
                importedAccounts.push(account);
            }
        }

        // Update sync timestamp
        await this.prisma.bankConnection.update({
            where: { id: connectionId },
            data: { lastSyncAt: new Date() },
        });

        return {
            imported: importedAccounts.length,
            accounts: importedAccounts,
        };
    }

    async syncPluggyTransactions(userId: string, connectionId: string, accountId: string) {
        const connection = await this.prisma.bankConnection.findFirst({
            where: { id: connectionId, userId },
        });

        if (!connection) {
            throw new BadRequestException('Connection not found');
        }

        const account = await this.prisma.bankAccount.findFirst({
            where: { id: accountId, userId },
        });

        if (!account) {
            throw new BadRequestException('Account not found');
        }

        // In production, you would call Pluggy API here
        const mockTransactions: PluggyTransaction[] = [
            {
                id: 'pluggy-tx-1',
                description: 'UBER *TRIP',
                amount: 25.5,
                date: new Date().toISOString(),
                category: 'Transporte',
                type: 'DEBIT',
                status: 'POSTED',
            },
        ];

        const importedTransactions = [];

        for (const tx of mockTransactions) {
            // Check for duplicates
            const existing = await this.prisma.transaction.findFirst({
                where: {
                    accountId,
                    externalId: tx.id,
                },
            });

            if (!existing) {
                const transaction = await this.prisma.transaction.create({
                    data: {
                        userId,
                        accountId,
                        type: tx.type === 'CREDIT' ? 'INCOME' : 'EXPENSE',
                        amount: Math.abs(tx.amount),
                        description: tx.description,
                        date: new Date(tx.date),
                        status: tx.status === 'POSTED' ? 'COMPLETED' : 'PENDING',
                        externalId: tx.id,
                        importSource: 'pluggy',
                    },
                });
                importedTransactions.push(transaction);

                // Try to auto-categorize
                await this.autoCategorize(userId, transaction.id, tx.description);
            }
        }

        return {
            imported: importedTransactions.length,
            transactions: importedTransactions,
        };
    }

    // ==========================================
    // Belvo Integration (Alternative Open Banking)
    // ==========================================

    async connectBelvo(userId: string, dto: ConnectBankDto) {
        this.logger.log(`Connecting Belvo account for user ${userId}`);

        const connection = await this.prisma.bankConnection.create({
            data: {
                userId,
                provider: 'belvo',
                connectionId: dto.connectionId,
                itemId: dto.itemId,
                accessToken: dto.accessToken,
                status: 'CONNECTED',
                lastSyncAt: new Date(),
            },
        });

        return {
            connectionId: connection.id,
            provider: 'belvo',
            status: 'CONNECTED',
            message: 'Conexão com Belvo estabelecida com sucesso',
        };
    }

    // ==========================================
    // File Import (CSV/OFX)
    // ==========================================

    async importFromFile(userId: string, dto: ImportTransactionsDto) {
        const account = await this.prisma.bankAccount.findFirst({
            where: { id: dto.accountId, userId },
        });

        if (!account) {
            throw new BadRequestException('Account not found');
        }

        const format = dto.format?.toLowerCase() || 'csv';

        if (format === 'ofx') {
            return this.importOFX(userId, dto.accountId, dto.content);
        }

        return this.importCSV(userId, dto.accountId, dto.content);
    }

    private async importCSV(userId: string, accountId: string, content: string) {
        const lines = content.split('\n').filter(line => line.trim());

        if (lines.length < 2) {
            throw new BadRequestException('Invalid CSV: No data rows found');
        }

        const headers = lines[0].toLowerCase().split(',').map(h => h.trim().replace(/"/g, ''));
        const imported: any[] = [];
        const errors: any[] = [];

        // Try to detect column mapping
        const dateIndex = headers.findIndex(h => ['data', 'date', 'dt'].includes(h));
        const descIndex = headers.findIndex(h => ['descrição', 'descricao', 'description', 'memo', 'histórico'].includes(h));
        const amountIndex = headers.findIndex(h => ['valor', 'amount', 'value', 'quantia'].includes(h));
        const typeIndex = headers.findIndex(h => ['tipo', 'type', 'natureza'].includes(h));

        if (dateIndex === -1 || descIndex === -1 || amountIndex === -1) {
            throw new BadRequestException('CSV must have date, description, and amount columns');
        }

        for (let i = 1; i < lines.length; i++) {
            try {
                const values = this.parseCSVLine(lines[i]);

                const dateStr = values[dateIndex]?.replace(/"/g, '');
                const description = values[descIndex]?.replace(/"/g, '') || 'Sem descrição';
                const amountStr = values[amountIndex]?.replace(/"/g, '').replace(',', '.');
                const typeStr = typeIndex !== -1 ? values[typeIndex]?.replace(/"/g, '') : null;

                const amount = parseFloat(amountStr);
                if (isNaN(amount)) continue;

                const date = this.parseDate(dateStr);
                if (!date) continue;

                // Determine type
                let type: TransactionType = TransactionType.EXPENSE;
                if (typeStr) {
                    if (['entrada', 'credit', 'crédito', 'receita', 'income'].includes(typeStr.toLowerCase())) {
                        type = TransactionType.INCOME;
                    }
                } else if (amount > 0) {
                    type = TransactionType.INCOME;
                }

                const transaction = await this.prisma.transaction.create({
                    data: {
                        userId,
                        accountId,
                        type,
                        amount: Math.abs(amount),
                        description,
                        date,
                        status: 'COMPLETED',
                        importSource: 'csv',
                    },
                });

                imported.push(transaction);

                // Update account balance
                await this.updateAccountBalance(accountId, type, Math.abs(amount));

                // Auto-categorize
                await this.autoCategorize(userId, transaction.id, description);
            } catch (error) {
                errors.push({ line: i + 1, error: (error as Error).message });
            }
        }

        return {
            imported: imported.length,
            errors: errors.length,
            errorDetails: errors,
            transactions: imported,
        };
    }

    private async importOFX(userId: string, accountId: string, content: string) {
        const transactions = this.parseOFX(content);
        const imported: any[] = [];

        for (const tx of transactions) {
            // Check for duplicates using fitId
            const existing = await this.prisma.transaction.findFirst({
                where: {
                    accountId,
                    externalId: tx.fitId,
                },
            });

            if (!existing) {
                const type = tx.amount >= 0 ? TransactionType.INCOME : TransactionType.EXPENSE;

                const transaction = await this.prisma.transaction.create({
                    data: {
                        userId,
                        accountId,
                        type,
                        amount: Math.abs(tx.amount),
                        description: tx.description,
                        date: new Date(tx.date),
                        status: 'COMPLETED',
                        externalId: tx.fitId,
                        importSource: 'ofx',
                    },
                });

                imported.push(transaction);

                // Update balance
                await this.updateAccountBalance(accountId, type, Math.abs(tx.amount));

                // Auto-categorize
                await this.autoCategorize(userId, transaction.id, tx.description);
            }
        }

        return {
            imported: imported.length,
            transactions: imported,
        };
    }

    private parseOFX(content: string): OFXTransaction[] {
        const transactions: OFXTransaction[] = [];

        // Simple OFX parser - extracts STMTTRN blocks
        const txRegex = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi;
        let match;

        while ((match = txRegex.exec(content)) !== null) {
            const block = match[1];

            const fitId = this.extractOFXTag(block, 'FITID');
            const date = this.extractOFXTag(block, 'DTPOSTED');
            const amount = parseFloat(this.extractOFXTag(block, 'TRNAMT') || '0');
            const description = this.extractOFXTag(block, 'MEMO') || this.extractOFXTag(block, 'NAME') || '';
            const type = this.extractOFXTag(block, 'TRNTYPE') || '';

            if (fitId && date) {
                transactions.push({
                    fitId,
                    date: this.parseOFXDate(date),
                    amount,
                    description: description.trim(),
                    type,
                });
            }
        }

        return transactions;
    }

    private extractOFXTag(content: string, tag: string): string | null {
        const regex = new RegExp(`<${tag}>([^<\\n]+)`, 'i');
        const match = content.match(regex);
        return match ? match[1].trim() : null;
    }

    private parseOFXDate(dateStr: string): string {
        // OFX date format: YYYYMMDDHHMMSS or YYYYMMDD
        const year = dateStr.substring(0, 4);
        const month = dateStr.substring(4, 6);
        const day = dateStr.substring(6, 8);
        return `${year}-${month}-${day}`;
    }

    // ==========================================
    // Connection Management
    // ==========================================

    async getConnections(userId: string) {
        return this.prisma.bankConnection.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
        });
    }

    async refreshConnection(userId: string, connectionId: string) {
        const connection = await this.prisma.bankConnection.findFirst({
            where: { id: connectionId, userId },
        });

        if (!connection) {
            throw new BadRequestException('Connection not found');
        }

        // In production, you would refresh the token with the provider
        await this.prisma.bankConnection.update({
            where: { id: connectionId },
            data: { lastSyncAt: new Date() },
        });

        return {
            connectionId,
            status: 'REFRESHED',
            lastSyncAt: new Date(),
        };
    }

    async disconnectBank(userId: string, connectionId: string) {
        const connection = await this.prisma.bankConnection.findFirst({
            where: { id: connectionId, userId },
        });

        if (!connection) {
            throw new BadRequestException('Connection not found');
        }

        await this.prisma.bankConnection.update({
            where: { id: connectionId },
            data: { status: 'DISCONNECTED' },
        });

        return { message: 'Conexão removida com sucesso' };
    }

    // ==========================================
    // Helpers
    // ==========================================

    private mapAccountType(type: string): AccountType {
        const mapping: Record<string, AccountType> = {
            CHECKING: AccountType.CHECKING,
            SAVINGS: AccountType.SAVINGS,
            CREDIT: AccountType.CREDIT_CARD,
            CREDIT_CARD: AccountType.CREDIT_CARD,
            INVESTMENT: AccountType.INVESTMENT,
        };
        return mapping[type.toUpperCase()] || AccountType.CHECKING;
    }

    private parseCSVLine(line: string): string[] {
        const result: string[] = [];
        let current = '';
        let inQuotes = false;

        for (const char of line) {
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                result.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        result.push(current.trim());

        return result;
    }

    private parseDate(dateStr: string): Date | null {
        if (!dateStr) return null;

        // Try different date formats
        const formats = [
            /(\d{4})-(\d{2})-(\d{2})/, // YYYY-MM-DD
            /(\d{2})\/(\d{2})\/(\d{4})/, // DD/MM/YYYY
            /(\d{2})-(\d{2})-(\d{4})/, // DD-MM-YYYY
        ];

        for (const format of formats) {
            const match = dateStr.match(format);
            if (match) {
                if (format === formats[0]) {
                    return new Date(parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]));
                } else {
                    return new Date(parseInt(match[3]), parseInt(match[2]) - 1, parseInt(match[1]));
                }
            }
        }

        return null;
    }

    private async updateAccountBalance(accountId: string, type: TransactionType, amount: number) {
        const increment = type === TransactionType.INCOME ? amount : -amount;

        await this.prisma.bankAccount.update({
            where: { id: accountId },
            data: {
                currentBalance: { increment },
            },
        });
    }

    private async autoCategorize(userId: string, transactionId: string, description: string) {
        const searchText = description.toLowerCase();

        const categories = await this.prisma.transactionCategory.findMany({
            where: {
                OR: [{ userId }, { isSystem: true }],
            },
        });

        for (const category of categories) {
            const keywords = JSON.parse(category.keywords || '[]') as string[];
            for (const keyword of keywords) {
                if (searchText.includes(keyword.toLowerCase())) {
                    await this.prisma.transaction.update({
                        where: { id: transactionId },
                        data: {
                            categoryId: category.id,
                            aiCategory: category.name,
                            aiConfidence: 0.8,
                        },
                    });
                    return;
                }
            }
        }
    }
}
