import {
    IsString,
    IsOptional,
    IsEnum,
    IsNumber,
    IsBoolean,
    IsArray,
    IsObject,
    ValidateNested,
    IsDateString,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
// Import enums from shared package - DRY principle
import {
    TriggerType,
    ActionType,
    ConditionOperator,
    AutomationStatus,
    WorkflowStatus,
} from '@susmi/shared';

// Re-export for backward compatibility
export {
    TriggerType,
    ActionType,
    ConditionOperator,
    AutomationStatus,
    WorkflowStatus,
};

// ==========================================
// Trigger DTOs
// ==========================================

export class TriggerConfig {
    @ApiProperty({ enum: TriggerType })
    @IsEnum(TriggerType)
    type: TriggerType;

    // For TIME trigger
    @ApiProperty({ required: false })
    @IsDateString()
    @IsOptional()
    executeAt?: string;

    // For CRON trigger
    @ApiProperty({ required: false })
    @IsString()
    @IsOptional()
    cronExpression?: string;

    // For EVENT trigger
    @ApiProperty({ required: false })
    @IsString()
    @IsOptional()
    eventName?: string;

    // For WEBHOOK trigger
    @ApiProperty({ required: false })
    @IsString()
    @IsOptional()
    webhookPath?: string;

    // For DEVICE_STATE trigger
    @ApiProperty({ required: false })
    @IsString()
    @IsOptional()
    deviceId?: string;

    @ApiProperty({ required: false })
    @IsString()
    @IsOptional()
    stateProperty?: string;

    @ApiProperty({ required: false })
    @IsOptional()
    stateValue?: any;

    // Generic config
    @ApiProperty({ required: false })
    @IsObject()
    @IsOptional()
    config?: Record<string, any>;
}

// ==========================================
// Condition DTOs
// ==========================================

export class ConditionConfig {
    @ApiProperty({ description: 'Variable or path to check' })
    @IsString()
    left: string;

    @ApiProperty({ enum: ConditionOperator })
    @IsEnum(ConditionOperator)
    operator: ConditionOperator;

    @ApiProperty({ description: 'Value to compare against', required: false })
    @IsOptional()
    right?: any;
}

export class ConditionGroup {
    @ApiProperty({ description: 'Logic operator (AND/OR)', default: 'AND' })
    @IsString()
    @IsOptional()
    logic?: 'AND' | 'OR';

    @ApiProperty({ description: 'Conditions to evaluate', type: [ConditionConfig] })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => ConditionConfig)
    conditions: ConditionConfig[];
}

// ==========================================
// Action DTOs
// ==========================================

export class ActionConfig {
    @ApiProperty({ enum: ActionType })
    @IsEnum(ActionType)
    type: ActionType;

    @ApiProperty({ description: 'Action order in sequence' })
    @IsNumber()
    @IsOptional()
    order?: number;

    // For AGENT_EXECUTE
    @ApiProperty({ required: false })
    @IsString()
    @IsOptional()
    agentId?: string;

    @ApiProperty({ required: false })
    @IsString()
    @IsOptional()
    input?: string;

    // For API_CALL
    @ApiProperty({ required: false })
    @IsString()
    @IsOptional()
    url?: string;

    @ApiProperty({ required: false })
    @IsString()
    @IsOptional()
    method?: string;

    @ApiProperty({ required: false })
    @IsObject()
    @IsOptional()
    headers?: Record<string, string>;

    @ApiProperty({ required: false })
    @IsObject()
    @IsOptional()
    body?: Record<string, any>;

    // For DEVICE_CONTROL
    @ApiProperty({ required: false })
    @IsString()
    @IsOptional()
    deviceId?: string;

    @ApiProperty({ required: false })
    @IsString()
    @IsOptional()
    command?: string;

    @ApiProperty({ required: false })
    @IsOptional()
    commandValue?: any;

    // For SEND_NOTIFICATION/EMAIL/MESSAGE
    @ApiProperty({ required: false })
    @IsString()
    @IsOptional()
    recipient?: string;

    @ApiProperty({ required: false })
    @IsString()
    @IsOptional()
    title?: string;

    @ApiProperty({ required: false })
    @IsString()
    @IsOptional()
    message?: string;

    // For DELAY
    @ApiProperty({ required: false })
    @IsNumber()
    @IsOptional()
    delayMs?: number;

    // For CONDITION
    @ApiProperty({ required: false })
    @ValidateNested()
    @Type(() => ConditionGroup)
    @IsOptional()
    condition?: ConditionGroup;

    @ApiProperty({ required: false })
    @IsArray()
    @IsOptional()
    thenActions?: ActionConfig[];

    @ApiProperty({ required: false })
    @IsArray()
    @IsOptional()
    elseActions?: ActionConfig[];

    // For LOOP
    @ApiProperty({ required: false })
    @IsNumber()
    @IsOptional()
    iterations?: number;

    @ApiProperty({ required: false })
    @IsString()
    @IsOptional()
    iterateOver?: string;

    @ApiProperty({ required: false })
    @IsArray()
    @IsOptional()
    loopActions?: ActionConfig[];

    // For SCRIPT
    @ApiProperty({ required: false })
    @IsString()
    @IsOptional()
    script?: string;

    // Generic config
    @ApiProperty({ required: false })
    @IsObject()
    @IsOptional()
    config?: Record<string, any>;
}

// ==========================================
// Automation DTOs
// ==========================================

export class CreateAutomationDto {
    @ApiProperty({ description: 'Automation name' })
    @IsString()
    name: string;

    @ApiProperty({ description: 'Description', required: false })
    @IsString()
    @IsOptional()
    description?: string;

    @ApiProperty({ description: 'Agent ID for this automation' })
    @IsString()
    agentId: string;

    @ApiProperty({ description: 'Trigger configuration' })
    @ValidateNested()
    @Type(() => TriggerConfig)
    trigger: TriggerConfig;

    @ApiProperty({ description: 'Conditions (all must be true)', required: false })
    @ValidateNested()
    @Type(() => ConditionGroup)
    @IsOptional()
    conditions?: ConditionGroup;

    @ApiProperty({ description: 'Actions to execute', type: [ActionConfig] })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => ActionConfig)
    actions: ActionConfig[];

    @ApiProperty({ description: 'Is active', default: true })
    @IsBoolean()
    @IsOptional()
    isActive?: boolean;

    @ApiProperty({ description: 'Cooldown between runs in seconds', required: false })
    @IsNumber()
    @IsOptional()
    cooldownSeconds?: number;

    @ApiProperty({ description: 'Max runs (0 = unlimited)', required: false })
    @IsNumber()
    @IsOptional()
    maxRuns?: number;
}

export class UpdateAutomationDto {
    @ApiProperty({ required: false })
    @IsString()
    @IsOptional()
    name?: string;

    @ApiProperty({ required: false })
    @IsString()
    @IsOptional()
    description?: string;

    @ApiProperty({ required: false })
    @ValidateNested()
    @Type(() => TriggerConfig)
    @IsOptional()
    trigger?: TriggerConfig;

    @ApiProperty({ required: false })
    @ValidateNested()
    @Type(() => ConditionGroup)
    @IsOptional()
    conditions?: ConditionGroup;

    @ApiProperty({ required: false })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => ActionConfig)
    @IsOptional()
    actions?: ActionConfig[];

    @ApiProperty({ required: false })
    @IsBoolean()
    @IsOptional()
    isActive?: boolean;
}

// ==========================================
// Workflow DTOs
// ==========================================

export class WorkflowNode {
    @ApiProperty({ description: 'Node ID' })
    @IsString()
    id: string;

    @ApiProperty({ description: 'Node type (trigger, action, condition)' })
    @IsString()
    type: 'trigger' | 'action' | 'condition' | 'end';

    @ApiProperty({ description: 'Node configuration' })
    @IsObject()
    config: TriggerConfig | ActionConfig | ConditionGroup;

    @ApiProperty({ description: 'Next node IDs' })
    @IsArray()
    next: string[];

    @ApiProperty({ description: 'Position for visual editor', required: false })
    @IsObject()
    @IsOptional()
    position?: { x: number; y: number };
}

export class CreateWorkflowDto {
    @ApiProperty({ description: 'Workflow name' })
    @IsString()
    name: string;

    @ApiProperty({ description: 'Description', required: false })
    @IsString()
    @IsOptional()
    description?: string;

    @ApiProperty({ description: 'Workflow nodes', type: [WorkflowNode] })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => WorkflowNode)
    nodes: WorkflowNode[];

    @ApiProperty({ enum: WorkflowStatus, default: WorkflowStatus.DRAFT })
    @IsEnum(WorkflowStatus)
    @IsOptional()
    status?: WorkflowStatus;
}

// ==========================================
// Execution DTOs
// ==========================================

export class ExecutionContext {
    userId: string;
    automationId: string;
    triggeredBy: string;
    variables: Record<string, any>;
    previousResults: Record<string, any>;
}

export class ExecutionResult {
    automationId: string;
    status: AutomationStatus;
    startedAt: Date;
    completedAt?: Date;
    duration: number;
    actionsExecuted: number;
    results: Array<{
        actionType: ActionType;
        success: boolean;
        result?: any;
        error?: string;
        duration: number;
    }>;
    error?: string;
}

// ==========================================
// Schedule DTOs
// ==========================================

export class ScheduleInfo {
    automationId: string;
    automationName: string;
    nextRun: Date;
    lastRun?: Date;
    cronExpression?: string;
    isActive: boolean;
}
