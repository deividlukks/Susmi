import {
    IsString,
    IsOptional,
    IsEnum,
    IsNumber,
    IsBoolean,
    IsArray,
    IsDateString,
    Min,
    Max,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

// ==========================================
// Enums
// ==========================================

export enum AccountType {
    CHECKING = 'CHECKING',
    SAVINGS = 'SAVINGS',
    CREDIT_CARD = 'CREDIT_CARD',
    INVESTMENT = 'INVESTMENT',
    CASH = 'CASH',
}

export enum TransactionType {
    INCOME = 'INCOME',
    EXPENSE = 'EXPENSE',
    TRANSFER = 'TRANSFER',
}

export enum TransactionStatus {
    PENDING = 'PENDING',
    COMPLETED = 'COMPLETED',
    CANCELLED = 'CANCELLED',
    SCHEDULED = 'SCHEDULED',
}

export enum BudgetPeriod {
    WEEKLY = 'WEEKLY',
    MONTHLY = 'MONTHLY',
    YEARLY = 'YEARLY',
    CUSTOM = 'CUSTOM',
}

export enum RecurrenceFrequency {
    DAILY = 'DAILY',
    WEEKLY = 'WEEKLY',
    BIWEEKLY = 'BIWEEKLY',
    MONTHLY = 'MONTHLY',
    YEARLY = 'YEARLY',
}

export enum GoalStatus {
    ACTIVE = 'ACTIVE',
    COMPLETED = 'COMPLETED',
    CANCELLED = 'CANCELLED',
    PAUSED = 'PAUSED',
}

// ==========================================
// Bank Account DTOs
// ==========================================

export class CreateBankAccountDto {
    @ApiProperty({ description: 'Account name' })
    @IsString()
    name: string;

    @ApiProperty({ description: 'Bank name' })
    @IsString()
    bankName: string;

    @ApiProperty({ description: 'Bank code', required: false })
    @IsString()
    @IsOptional()
    bankCode?: string;

    @ApiProperty({ enum: AccountType, description: 'Account type' })
    @IsEnum(AccountType)
    accountType: AccountType;

    @ApiProperty({ description: 'Account number', required: false })
    @IsString()
    @IsOptional()
    accountNumber?: string;

    @ApiProperty({ description: 'Agency number', required: false })
    @IsString()
    @IsOptional()
    agencyNumber?: string;

    @ApiProperty({ description: 'Initial balance', default: 0 })
    @IsNumber()
    @IsOptional()
    currentBalance?: number;

    @ApiProperty({ description: 'Credit limit (for credit cards)', required: false })
    @IsNumber()
    @IsOptional()
    creditLimit?: number;

    @ApiProperty({ description: 'Currency', default: 'BRL' })
    @IsString()
    @IsOptional()
    currency?: string;

    @ApiProperty({ description: 'Color hex code', required: false })
    @IsString()
    @IsOptional()
    color?: string;

    @ApiProperty({ description: 'Icon name', required: false })
    @IsString()
    @IsOptional()
    icon?: string;
}

export class UpdateBankAccountDto {
    @ApiProperty({ required: false })
    @IsString()
    @IsOptional()
    name?: string;

    @ApiProperty({ required: false })
    @IsNumber()
    @IsOptional()
    currentBalance?: number;

    @ApiProperty({ required: false })
    @IsNumber()
    @IsOptional()
    creditLimit?: number;

    @ApiProperty({ required: false })
    @IsString()
    @IsOptional()
    color?: string;

    @ApiProperty({ required: false })
    @IsString()
    @IsOptional()
    icon?: string;

    @ApiProperty({ required: false })
    @IsBoolean()
    @IsOptional()
    isHidden?: boolean;
}

// ==========================================
// Transaction DTOs
// ==========================================

export class CreateTransactionDto {
    @ApiProperty({ description: 'Account ID' })
    @IsString()
    accountId: string;

    @ApiProperty({ enum: TransactionType, description: 'Transaction type' })
    @IsEnum(TransactionType)
    type: TransactionType;

    @ApiProperty({ description: 'Amount (positive value)' })
    @IsNumber()
    @Min(0.01)
    amount: number;

    @ApiProperty({ description: 'Description' })
    @IsString()
    description: string;

    @ApiProperty({ description: 'Category ID', required: false })
    @IsString()
    @IsOptional()
    categoryId?: string;

    @ApiProperty({ description: 'Transaction date', required: false })
    @IsDateString()
    @IsOptional()
    date?: string;

    @ApiProperty({ description: 'Notes', required: false })
    @IsString()
    @IsOptional()
    notes?: string;

    @ApiProperty({ description: 'Is pending transaction', required: false })
    @IsBoolean()
    @IsOptional()
    isPending?: boolean;

    @ApiProperty({ description: 'Merchant name', required: false })
    @IsString()
    @IsOptional()
    merchantName?: string;

    @ApiProperty({ description: 'Transfer to account ID (for transfers)', required: false })
    @IsString()
    @IsOptional()
    transferAccountId?: string;
}

export class UpdateTransactionDto {
    @ApiProperty({ required: false })
    @IsNumber()
    @IsOptional()
    amount?: number;

    @ApiProperty({ required: false })
    @IsString()
    @IsOptional()
    description?: string;

    @ApiProperty({ required: false })
    @IsString()
    @IsOptional()
    categoryId?: string;

    @ApiProperty({ required: false })
    @IsDateString()
    @IsOptional()
    date?: string;

    @ApiProperty({ required: false })
    @IsString()
    @IsOptional()
    notes?: string;

    @ApiProperty({ required: false })
    @IsBoolean()
    @IsOptional()
    isPending?: boolean;

    @ApiProperty({ required: false })
    @IsBoolean()
    @IsOptional()
    isConfirmed?: boolean;

    @ApiProperty({ enum: TransactionStatus, required: false })
    @IsEnum(TransactionStatus)
    @IsOptional()
    status?: TransactionStatus;
}

export class TransactionFiltersDto {
    @ApiProperty({ required: false })
    @IsString()
    @IsOptional()
    accountId?: string;

    @ApiProperty({ required: false })
    @IsString()
    @IsOptional()
    categoryId?: string;

    @ApiProperty({ enum: TransactionType, required: false })
    @IsEnum(TransactionType)
    @IsOptional()
    type?: TransactionType;

    @ApiProperty({ required: false })
    @IsDateString()
    @IsOptional()
    startDate?: string;

    @ApiProperty({ required: false })
    @IsDateString()
    @IsOptional()
    endDate?: string;

    @ApiProperty({ required: false })
    @IsNumber()
    @IsOptional()
    minAmount?: number;

    @ApiProperty({ required: false })
    @IsNumber()
    @IsOptional()
    maxAmount?: number;

    @ApiProperty({ required: false })
    @IsString()
    @IsOptional()
    search?: string;

    @ApiProperty({ required: false, default: 1 })
    @IsNumber()
    @IsOptional()
    page?: number;

    @ApiProperty({ required: false, default: 50 })
    @IsNumber()
    @IsOptional()
    limit?: number;
}

// ==========================================
// Category DTOs
// ==========================================

export class CreateCategoryDto {
    @ApiProperty({ description: 'Category name' })
    @IsString()
    name: string;

    @ApiProperty({ enum: TransactionType, description: 'Category type' })
    @IsEnum(TransactionType)
    type: TransactionType;

    @ApiProperty({ description: 'Icon name', required: false })
    @IsString()
    @IsOptional()
    icon?: string;

    @ApiProperty({ description: 'Color hex code', required: false })
    @IsString()
    @IsOptional()
    color?: string;

    @ApiProperty({ description: 'Parent category ID', required: false })
    @IsString()
    @IsOptional()
    parentId?: string;

    @ApiProperty({ description: 'Keywords for auto-categorization', type: [String], required: false })
    @IsArray()
    @IsOptional()
    keywords?: string[];
}

// ==========================================
// Budget DTOs
// ==========================================

export class CreateBudgetDto {
    @ApiProperty({ description: 'Budget name' })
    @IsString()
    name: string;

    @ApiProperty({ description: 'Category ID (null for total budget)', required: false })
    @IsString()
    @IsOptional()
    categoryId?: string;

    @ApiProperty({ description: 'Budget amount' })
    @IsNumber()
    @Min(0)
    amount: number;

    @ApiProperty({ enum: BudgetPeriod, description: 'Budget period' })
    @IsEnum(BudgetPeriod)
    period: BudgetPeriod;

    @ApiProperty({ description: 'Start date' })
    @IsDateString()
    startDate: string;

    @ApiProperty({ description: 'End date (for custom period)', required: false })
    @IsDateString()
    @IsOptional()
    endDate?: string;

    @ApiProperty({ description: 'Alert at percentage (e.g., 80)', required: false })
    @IsNumber()
    @IsOptional()
    @Min(1)
    @Max(100)
    alertAt?: number;
}

export class UpdateBudgetDto {
    @ApiProperty({ required: false })
    @IsString()
    @IsOptional()
    name?: string;

    @ApiProperty({ required: false })
    @IsNumber()
    @IsOptional()
    amount?: number;

    @ApiProperty({ required: false })
    @IsNumber()
    @IsOptional()
    alertAt?: number;

    @ApiProperty({ required: false })
    @IsBoolean()
    @IsOptional()
    isActive?: boolean;
}

// ==========================================
// Financial Goal DTOs
// ==========================================

export class CreateGoalDto {
    @ApiProperty({ description: 'Goal name' })
    @IsString()
    name: string;

    @ApiProperty({ description: 'Description', required: false })
    @IsString()
    @IsOptional()
    description?: string;

    @ApiProperty({ description: 'Target amount' })
    @IsNumber()
    @Min(0)
    targetAmount: number;

    @ApiProperty({ description: 'Current amount', required: false })
    @IsNumber()
    @IsOptional()
    currentAmount?: number;

    @ApiProperty({ description: 'Target date', required: false })
    @IsDateString()
    @IsOptional()
    targetDate?: string;

    @ApiProperty({ description: 'Icon name', required: false })
    @IsString()
    @IsOptional()
    icon?: string;

    @ApiProperty({ description: 'Color hex code', required: false })
    @IsString()
    @IsOptional()
    color?: string;

    @ApiProperty({ description: 'Linked account ID', required: false })
    @IsString()
    @IsOptional()
    linkedAccountId?: string;
}

export class UpdateGoalDto {
    @ApiProperty({ required: false })
    @IsString()
    @IsOptional()
    name?: string;

    @ApiProperty({ required: false })
    @IsNumber()
    @IsOptional()
    targetAmount?: number;

    @ApiProperty({ required: false })
    @IsNumber()
    @IsOptional()
    currentAmount?: number;

    @ApiProperty({ required: false })
    @IsDateString()
    @IsOptional()
    targetDate?: string;

    @ApiProperty({ enum: GoalStatus, required: false })
    @IsEnum(GoalStatus)
    @IsOptional()
    status?: GoalStatus;
}

export class AddGoalContributionDto {
    @ApiProperty({ description: 'Contribution amount' })
    @IsNumber()
    @Min(0.01)
    amount: number;

    @ApiProperty({ description: 'Notes', required: false })
    @IsString()
    @IsOptional()
    notes?: string;
}

// ==========================================
// Report DTOs
// ==========================================

export class ReportFiltersDto {
    @ApiProperty({ description: 'Start date' })
    @IsDateString()
    startDate: string;

    @ApiProperty({ description: 'End date' })
    @IsDateString()
    endDate: string;

    @ApiProperty({ description: 'Account IDs', type: [String], required: false })
    @IsArray()
    @IsOptional()
    accountIds?: string[];

    @ApiProperty({ description: 'Category IDs', type: [String], required: false })
    @IsArray()
    @IsOptional()
    categoryIds?: string[];

    @ApiProperty({ description: 'Group by (day, week, month, year)', required: false })
    @IsString()
    @IsOptional()
    groupBy?: string;
}

// ==========================================
// Bank Integration DTOs
// ==========================================

export class ConnectBankDto {
    @ApiProperty({ description: 'Provider (pluggy, belvo)' })
    @IsString()
    provider: string;

    @ApiProperty({ description: 'Connection ID from provider' })
    @IsString()
    connectionId: string;

    @ApiProperty({ description: 'Item ID from provider' })
    @IsString()
    itemId: string;

    @ApiProperty({ description: 'Access token', required: false })
    @IsString()
    @IsOptional()
    accessToken?: string;
}

export class ImportTransactionsDto {
    @ApiProperty({ description: 'Account ID' })
    @IsString()
    accountId: string;

    @ApiProperty({ description: 'CSV or OFX content' })
    @IsString()
    content: string;

    @ApiProperty({ description: 'File format (csv, ofx)', default: 'csv' })
    @IsString()
    @IsOptional()
    format?: string;
}
