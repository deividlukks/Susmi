import {
    Controller,
    Get,
    Post,
    Put,
    Delete,
    Body,
    Param,
    Query,
    UseGuards,
    Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

import { AccountService } from './services/account.service';
import { CategoryService } from './services/category.service';
import { BudgetService } from './services/budget.service';
import { GoalService } from './services/goal.service';
import { ReportService } from './services/report.service';
import { BankIntegrationService } from './services/bank-integration.service';

// DDD Use Cases
import { CreateTransactionUseCase } from './application/use-cases/create-transaction.use-case';
import { CreateTransferUseCase } from './application/use-cases/create-transfer.use-case';
import { AutoCategorizeTransactionsUseCase } from './application/use-cases/auto-categorize-transactions.use-case';
import { GetTransactionStatsUseCase } from './application/use-cases/get-transaction-stats.use-case';
import { TransactionRepository } from './infrastructure/repositories/transaction.repository';

import {
    CreateBankAccountDto,
    UpdateBankAccountDto,
    CreateTransactionDto,
    UpdateTransactionDto,
    TransactionFiltersDto,
    CreateCategoryDto,
    CreateBudgetDto,
    UpdateBudgetDto,
    CreateGoalDto,
    UpdateGoalDto,
    AddGoalContributionDto,
    ReportFiltersDto,
    ConnectBankDto,
    ImportTransactionsDto,
    TransactionType,
    GoalStatus,
} from './dto/finance.dto';

@ApiTags('Finance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('finance')
export class FinanceController {
    constructor(
        private readonly accountService: AccountService,
        private readonly categoryService: CategoryService,
        private readonly budgetService: BudgetService,
        private readonly goalService: GoalService,
        private readonly reportService: ReportService,
        private readonly bankIntegrationService: BankIntegrationService,
        // DDD Use Cases
        private readonly createTransactionUseCase: CreateTransactionUseCase,
        private readonly createTransferUseCase: CreateTransferUseCase,
        private readonly autoCategorizeUseCase: AutoCategorizeTransactionsUseCase,
        private readonly getStatsUseCase: GetTransactionStatsUseCase,
        private readonly transactionRepository: TransactionRepository,
    ) {}

    // ==========================================
    // Accounts
    // ==========================================

    @Post('accounts')
    @ApiOperation({ summary: 'Create bank account' })
    async createAccount(@Request() req, @Body() dto: CreateBankAccountDto) {
        return this.accountService.create(req.user.id, dto);
    }

    @Get('accounts')
    @ApiOperation({ summary: 'List all accounts' })
    async getAccounts(@Request() req, @Query('includeHidden') includeHidden?: string) {
        return this.accountService.findAll(req.user.id, includeHidden === 'true');
    }

    @Get('accounts/balance')
    @ApiOperation({ summary: 'Get total balance' })
    async getTotalBalance(@Request() req) {
        return this.accountService.getTotalBalance(req.user.id);
    }

    @Get('accounts/:id')
    @ApiOperation({ summary: 'Get account by ID' })
    async getAccount(@Request() req, @Param('id') id: string) {
        return this.accountService.findOne(req.user.id, id);
    }

    @Put('accounts/:id')
    @ApiOperation({ summary: 'Update account' })
    async updateAccount(
        @Request() req,
        @Param('id') id: string,
        @Body() dto: UpdateBankAccountDto,
    ) {
        return this.accountService.update(req.user.id, id, dto);
    }

    @Delete('accounts/:id')
    @ApiOperation({ summary: 'Delete account' })
    async deleteAccount(@Request() req, @Param('id') id: string) {
        return this.accountService.delete(req.user.id, id);
    }

    @Post('accounts/:id/recalculate')
    @ApiOperation({ summary: 'Recalculate account balance' })
    async recalculateBalance(@Request() req, @Param('id') id: string) {
        return this.accountService.recalculateBalance(req.user.id, id);
    }

    @Post('accounts/:id/adjust')
    @ApiOperation({ summary: 'Adjust account balance' })
    async adjustBalance(
        @Request() req,
        @Param('id') id: string,
        @Body() body: { newBalance: number; notes?: string },
    ) {
        return this.accountService.adjustBalance(req.user.id, id, body.newBalance, body.notes);
    }

    @Get('accounts/:id/summary')
    @ApiOperation({ summary: 'Get account summary' })
    async getAccountSummary(
        @Request() req,
        @Param('id') id: string,
        @Query('startDate') startDate: string,
        @Query('endDate') endDate: string,
    ) {
        return this.accountService.getAccountSummary(
            req.user.id,
            id,
            new Date(startDate),
            new Date(endDate),
        );
    }

    // ==========================================
    // Transactions
    // ==========================================

    @Post('transactions')
    @ApiOperation({ summary: 'Create transaction' })
    async createTransaction(@Request() req, @Body() dto: CreateTransactionDto) {
        // DDD: Decide entre transfer ou transaction regular
        if (dto.type === TransactionType.TRANSFER && dto.transferAccountId) {
            return this.createTransferUseCase.execute(req.user.id, dto);
        }
        return this.createTransactionUseCase.execute(req.user.id, dto);
    }

    @Get('transactions')
    @ApiOperation({ summary: 'List transactions with filters' })
    async getTransactions(@Request() req, @Query() filters: TransactionFiltersDto) {
        return this.transactionRepository.findAll(req.user.id, filters);
    }

    @Get('transactions/stats')
    @ApiOperation({ summary: 'Get transaction statistics' })
    async getTransactionStats(
        @Request() req,
        @Query('startDate') startDate: string,
        @Query('endDate') endDate: string,
    ) {
        return this.getStatsUseCase.execute(
            req.user.id,
            new Date(startDate),
            new Date(endDate),
        );
    }

    @Get('transactions/by-category')
    @ApiOperation({ summary: 'Get transactions grouped by category' })
    async getByCategory(
        @Request() req,
        @Query('startDate') startDate: string,
        @Query('endDate') endDate: string,
        @Query('type') type?: TransactionType,
    ) {
        return this.getStatsUseCase.executeByCategory(
            req.user.id,
            new Date(startDate),
            new Date(endDate),
            type,
        );
    }

    @Get('transactions/:id')
    @ApiOperation({ summary: 'Get transaction by ID' })
    async getTransaction(@Request() req, @Param('id') id: string) {
        return this.transactionRepository.findById(id, req.user.id);
    }

    @Put('transactions/:id')
    @ApiOperation({ summary: 'Update transaction' })
    async updateTransaction(
        @Request() req,
        @Param('id') id: string,
        @Body() dto: UpdateTransactionDto,
    ) {
        // TODO: Criar UpdateTransactionUseCase
        const transaction = await this.transactionRepository.findById(id, req.user.id);
        if (!transaction) throw new Error('Transaction not found');

        // Update fields
        if (dto.amount) transaction.updateAmount(dto.amount);
        if (dto.description) transaction.updateDescription(dto.description);
        if (dto.categoryId) transaction.categorize(dto.categoryId);

        return this.transactionRepository.update(transaction);
    }

    @Delete('transactions/:id')
    @ApiOperation({ summary: 'Delete transaction' })
    async deleteTransaction(@Request() req, @Param('id') id: string) {
        // TODO: Criar DeleteTransactionUseCase
        await this.transactionRepository.delete(id, req.user.id);
        return { message: 'Transaction deleted successfully' };
    }

    @Put('transactions/:id/categorize')
    @ApiOperation({ summary: 'Categorize transaction' })
    async categorizeTransaction(
        @Request() req,
        @Param('id') id: string,
        @Body() body: { categoryId: string },
    ) {
        await this.transactionRepository.categorize(id, body.categoryId);
        return { message: 'Transaction categorized successfully' };
    }

    @Post('transactions/:id/auto-categorize')
    @ApiOperation({ summary: 'Auto-categorize single transaction' })
    async autoCategorizeSingle(@Request() req, @Param('id') id: string) {
        return this.autoCategorizeUseCase.executeForSingle(req.user.id, id);
    }

    @Post('transactions/auto-categorize-all')
    @ApiOperation({ summary: 'Auto-categorize all uncategorized transactions' })
    async autoCategorizeAll(@Request() req) {
        return this.autoCategorizeUseCase.executeForAll(req.user.id);
    }

    // ==========================================
    // Categories
    // ==========================================

    @Post('categories')
    @ApiOperation({ summary: 'Create category' })
    async createCategory(@Request() req, @Body() dto: CreateCategoryDto) {
        return this.categoryService.create(req.user.id, dto);
    }

    @Get('categories')
    @ApiOperation({ summary: 'List all categories' })
    async getCategories(@Request() req, @Query('type') type?: TransactionType) {
        return this.categoryService.findAll(req.user.id, type);
    }

    @Get('categories/:id')
    @ApiOperation({ summary: 'Get category by ID' })
    async getCategory(@Request() req, @Param('id') id: string) {
        return this.categoryService.findOne(req.user.id, id);
    }

    @Put('categories/:id')
    @ApiOperation({ summary: 'Update category' })
    async updateCategory(
        @Request() req,
        @Param('id') id: string,
        @Body() dto: Partial<CreateCategoryDto>,
    ) {
        return this.categoryService.update(req.user.id, id, dto);
    }

    @Delete('categories/:id')
    @ApiOperation({ summary: 'Delete category' })
    async deleteCategory(@Request() req, @Param('id') id: string) {
        return this.categoryService.delete(req.user.id, id);
    }

    @Post('categories/:id/keywords')
    @ApiOperation({ summary: 'Add keyword to category' })
    async addKeyword(@Request() req, @Param('id') id: string, @Body() body: { keyword: string }) {
        return this.categoryService.addKeyword(req.user.id, id, body.keyword);
    }

    @Delete('categories/:id/keywords/:keyword')
    @ApiOperation({ summary: 'Remove keyword from category' })
    async removeKeyword(@Request() req, @Param('id') id: string, @Param('keyword') keyword: string) {
        return this.categoryService.removeKeyword(req.user.id, id, keyword);
    }

    @Get('categories/:id/stats')
    @ApiOperation({ summary: 'Get category statistics' })
    async getCategoryStats(
        @Request() req,
        @Param('id') id: string,
        @Query('startDate') startDate: string,
        @Query('endDate') endDate: string,
    ) {
        return this.categoryService.getCategoryStats(
            req.user.id,
            id,
            new Date(startDate),
            new Date(endDate),
        );
    }

    @Post('categories/initialize')
    @ApiOperation({ summary: 'Initialize system categories' })
    async initializeCategories() {
        return this.categoryService.initializeSystemCategories();
    }

    // ==========================================
    // Budgets
    // ==========================================

    @Post('budgets')
    @ApiOperation({ summary: 'Create budget' })
    async createBudget(@Request() req, @Body() dto: CreateBudgetDto) {
        return this.budgetService.create(req.user.id, dto);
    }

    @Get('budgets')
    @ApiOperation({ summary: 'List all budgets' })
    async getBudgets(@Request() req, @Query('activeOnly') activeOnly?: string) {
        return this.budgetService.findAll(req.user.id, activeOnly !== 'false');
    }

    @Get('budgets/overview')
    @ApiOperation({ summary: 'Get budgets overview' })
    async getBudgetOverview(@Request() req) {
        return this.budgetService.getOverview(req.user.id);
    }

    @Get('budgets/alerts')
    @ApiOperation({ summary: 'Check budget alerts' })
    async checkBudgetAlerts(@Request() req) {
        return this.budgetService.checkAlerts(req.user.id);
    }

    @Get('budgets/:id')
    @ApiOperation({ summary: 'Get budget by ID' })
    async getBudget(@Request() req, @Param('id') id: string) {
        return this.budgetService.findOne(req.user.id, id);
    }

    @Put('budgets/:id')
    @ApiOperation({ summary: 'Update budget' })
    async updateBudget(@Request() req, @Param('id') id: string, @Body() dto: UpdateBudgetDto) {
        return this.budgetService.update(req.user.id, id, dto);
    }

    @Delete('budgets/:id')
    @ApiOperation({ summary: 'Delete budget' })
    async deleteBudget(@Request() req, @Param('id') id: string) {
        return this.budgetService.delete(req.user.id, id);
    }

    @Get('budgets/:id/daily-allowance')
    @ApiOperation({ summary: 'Get daily spending allowance' })
    async getDailyAllowance(@Request() req, @Param('id') id: string) {
        return this.budgetService.getDailyAllowance(req.user.id, id);
    }

    @Post('budgets/renew')
    @ApiOperation({ summary: 'Renew expired budgets' })
    async renewBudgets(@Request() req) {
        return this.budgetService.renewBudgets(req.user.id);
    }

    // ==========================================
    // Goals
    // ==========================================

    @Post('goals')
    @ApiOperation({ summary: 'Create financial goal' })
    async createGoal(@Request() req, @Body() dto: CreateGoalDto) {
        return this.goalService.create(req.user.id, dto);
    }

    @Get('goals')
    @ApiOperation({ summary: 'List all goals' })
    async getGoals(@Request() req, @Query('status') status?: GoalStatus) {
        return this.goalService.findAll(req.user.id, status);
    }

    @Get('goals/overview')
    @ApiOperation({ summary: 'Get goals overview' })
    async getGoalsOverview(@Request() req) {
        return this.goalService.getOverview(req.user.id);
    }

    @Get('goals/:id')
    @ApiOperation({ summary: 'Get goal by ID' })
    async getGoal(@Request() req, @Param('id') id: string) {
        return this.goalService.findOne(req.user.id, id);
    }

    @Put('goals/:id')
    @ApiOperation({ summary: 'Update goal' })
    async updateGoal(@Request() req, @Param('id') id: string, @Body() dto: UpdateGoalDto) {
        return this.goalService.update(req.user.id, id, dto);
    }

    @Delete('goals/:id')
    @ApiOperation({ summary: 'Delete goal' })
    async deleteGoal(@Request() req, @Param('id') id: string) {
        return this.goalService.delete(req.user.id, id);
    }

    @Post('goals/:id/contribute')
    @ApiOperation({ summary: 'Add contribution to goal' })
    async contributeToGoal(
        @Request() req,
        @Param('id') id: string,
        @Body() dto: AddGoalContributionDto,
    ) {
        return this.goalService.addContribution(req.user.id, id, dto);
    }

    @Post('goals/:id/withdraw')
    @ApiOperation({ summary: 'Withdraw from goal' })
    async withdrawFromGoal(
        @Request() req,
        @Param('id') id: string,
        @Body() body: { amount: number },
    ) {
        return this.goalService.withdrawContribution(req.user.id, id, body.amount);
    }

    @Get('goals/:id/projections')
    @ApiOperation({ summary: 'Get goal projections' })
    async getGoalProjections(@Request() req, @Param('id') id: string) {
        return this.goalService.getProjections(req.user.id, id);
    }

    // ==========================================
    // Reports
    // ==========================================

    @Get('reports/summary')
    @ApiOperation({ summary: 'Get financial summary' })
    async getFinancialSummary(@Request() req, @Query() filters: ReportFiltersDto) {
        return this.reportService.getFinancialSummary(req.user.id, filters);
    }

    @Get('reports/income-vs-expenses')
    @ApiOperation({ summary: 'Get income vs expenses report' })
    async getIncomeVsExpenses(@Request() req, @Query() filters: ReportFiltersDto) {
        return this.reportService.getIncomeVsExpenses(req.user.id, filters);
    }

    @Get('reports/expenses-by-category')
    @ApiOperation({ summary: 'Get expenses by category' })
    async getExpensesByCategory(@Request() req, @Query() filters: ReportFiltersDto) {
        return this.reportService.getExpensesByCategory(req.user.id, filters);
    }

    @Get('reports/income-by-category')
    @ApiOperation({ summary: 'Get income by category' })
    async getIncomeByCategory(@Request() req, @Query() filters: ReportFiltersDto) {
        return this.reportService.getIncomeByCategory(req.user.id, filters);
    }

    @Get('reports/trends')
    @ApiOperation({ summary: 'Get financial trends' })
    async getTrends(@Request() req, @Query() filters: ReportFiltersDto) {
        return this.reportService.getTrends(req.user.id, filters);
    }

    @Get('reports/cash-flow')
    @ApiOperation({ summary: 'Get cash flow report' })
    async getCashFlow(@Request() req, @Query() filters: ReportFiltersDto) {
        return this.reportService.getCashFlow(req.user.id, filters);
    }

    @Get('reports/account-balances')
    @ApiOperation({ summary: 'Get account balances' })
    async getAccountBalances(@Request() req) {
        return this.reportService.getAccountBalances(req.user.id);
    }

    @Get('reports/account-history/:accountId')
    @ApiOperation({ summary: 'Get account history' })
    async getAccountHistory(
        @Request() req,
        @Param('accountId') accountId: string,
        @Query() filters: ReportFiltersDto,
    ) {
        return this.reportService.getAccountHistory(req.user.id, accountId, filters);
    }

    @Get('reports/export')
    @ApiOperation({ summary: 'Export transactions' })
    async exportTransactions(
        @Request() req,
        @Query() filters: ReportFiltersDto,
        @Query('format') format?: 'json' | 'csv',
    ) {
        return this.reportService.exportTransactions(req.user.id, filters, format);
    }

    // ==========================================
    // Bank Integration
    // ==========================================

    @Post('bank/connect/pluggy')
    @ApiOperation({ summary: 'Connect bank via Pluggy' })
    async connectPluggy(@Request() req, @Body() dto: ConnectBankDto) {
        return this.bankIntegrationService.connectPluggy(req.user.id, dto);
    }

    @Post('bank/connect/belvo')
    @ApiOperation({ summary: 'Connect bank via Belvo' })
    async connectBelvo(@Request() req, @Body() dto: ConnectBankDto) {
        return this.bankIntegrationService.connectBelvo(req.user.id, dto);
    }

    @Get('bank/connections')
    @ApiOperation({ summary: 'List bank connections' })
    async getConnections(@Request() req) {
        return this.bankIntegrationService.getConnections(req.user.id);
    }

    @Post('bank/connections/:id/sync-accounts')
    @ApiOperation({ summary: 'Sync accounts from bank' })
    async syncAccounts(@Request() req, @Param('id') id: string) {
        return this.bankIntegrationService.syncPluggyAccounts(req.user.id, id);
    }

    @Post('bank/connections/:id/sync-transactions/:accountId')
    @ApiOperation({ summary: 'Sync transactions from bank' })
    async syncTransactions(
        @Request() req,
        @Param('id') id: string,
        @Param('accountId') accountId: string,
    ) {
        return this.bankIntegrationService.syncPluggyTransactions(req.user.id, id, accountId);
    }

    @Post('bank/connections/:id/refresh')
    @ApiOperation({ summary: 'Refresh bank connection' })
    async refreshConnection(@Request() req, @Param('id') id: string) {
        return this.bankIntegrationService.refreshConnection(req.user.id, id);
    }

    @Delete('bank/connections/:id')
    @ApiOperation({ summary: 'Disconnect bank' })
    async disconnectBank(@Request() req, @Param('id') id: string) {
        return this.bankIntegrationService.disconnectBank(req.user.id, id);
    }

    @Post('bank/import')
    @ApiOperation({ summary: 'Import transactions from file (CSV/OFX)' })
    async importTransactions(@Request() req, @Body() dto: ImportTransactionsDto) {
        return this.bankIntegrationService.importFromFile(req.user.id, dto);
    }
}
