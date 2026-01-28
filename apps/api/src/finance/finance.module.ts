import { Module, OnModuleInit } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';

import { FinanceController } from './finance.controller';

// Legacy Services (ainda em uso)
import { AccountService } from './services/account.service';
import { CategoryService } from './services/category.service';
import { BudgetService } from './services/budget.service';
import { GoalService } from './services/goal.service';
import { ReportService } from './services/report.service';
import { BankIntegrationService } from './services/bank-integration.service';

// DDD Architecture - Domain Services
import { BalanceCalculatorService } from './domain/services/balance-calculator.service';
import { CategorySuggesterService } from './domain/services/category-suggester.service';

// DDD Architecture - Repositories
import { TransactionRepository } from './infrastructure/repositories/transaction.repository';

// DDD Architecture - Use Cases
import { CreateTransactionUseCase } from './application/use-cases/create-transaction.use-case';
import { CreateTransferUseCase } from './application/use-cases/create-transfer.use-case';
import { AutoCategorizeTransactionsUseCase } from './application/use-cases/auto-categorize-transactions.use-case';
import { GetTransactionStatsUseCase } from './application/use-cases/get-transaction-stats.use-case';

@Module({
    imports: [PrismaModule, ConfigModule],
    controllers: [FinanceController],
    providers: [
        // Legacy Services
        AccountService,
        CategoryService,
        BudgetService,
        GoalService,
        ReportService,
        BankIntegrationService,

        // DDD - Domain Services
        BalanceCalculatorService,
        CategorySuggesterService,

        // DDD - Repositories
        {
            provide: 'ITransactionRepository',
            useClass: TransactionRepository,
        },

        // DDD - Use Cases
        CreateTransactionUseCase,
        CreateTransferUseCase,
        AutoCategorizeTransactionsUseCase,
        GetTransactionStatsUseCase,
    ],
    exports: [
        AccountService,
        CategoryService,
        BudgetService,
        GoalService,
        ReportService,
        BankIntegrationService,
        BalanceCalculatorService,
    ],
})
export class FinanceModule implements OnModuleInit {
    constructor(private readonly categoryService: CategoryService) {}

    async onModuleInit() {
        // Initialize system categories on startup
        await this.categoryService.initializeSystemCategories();
    }
}
