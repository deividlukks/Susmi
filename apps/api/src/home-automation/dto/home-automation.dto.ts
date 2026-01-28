import {
    IsString,
    IsOptional,
    IsEnum,
    IsNumber,
    IsBoolean,
    IsArray,
    IsObject,
    Min,
    Max,
    ValidateNested,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
// Import enums from shared package - DRY principle
import {
    DeviceType,
    RoomType,
    DeviceProtocol,
    IntegrationProvider,
    HomeAutomationTriggerType,
    HomeAutomationActionType,
    VoiceProvider,
} from '@susmi/shared';

// Re-export for backward compatibility
export {
    DeviceType,
    RoomType,
    DeviceProtocol,
    IntegrationProvider,
    VoiceProvider,
};

// Alias for home automation specific enums
export const TriggerType = HomeAutomationTriggerType;
export const ActionType = HomeAutomationActionType;
export type TriggerType = HomeAutomationTriggerType;
export type ActionType = HomeAutomationActionType;

// ==========================================
// Smart Home DTOs
// ==========================================

export class CreateSmartHomeDto {
    @ApiProperty({ description: 'Home name' })
    @IsString()
    name: string;

    @ApiProperty({ description: 'Address', required: false })
    @IsString()
    @IsOptional()
    address?: string;

    @ApiProperty({ description: 'Timezone', default: 'America/Sao_Paulo' })
    @IsString()
    @IsOptional()
    timezone?: string;
}

export class UpdateSmartHomeDto {
    @ApiProperty({ required: false })
    @IsString()
    @IsOptional()
    name?: string;

    @ApiProperty({ required: false })
    @IsString()
    @IsOptional()
    address?: string;

    @ApiProperty({ required: false })
    @IsBoolean()
    @IsOptional()
    awayMode?: boolean;

    @ApiProperty({ required: false })
    @IsBoolean()
    @IsOptional()
    guestMode?: boolean;

    @ApiProperty({ required: false })
    @IsBoolean()
    @IsOptional()
    vacationMode?: boolean;
}

// ==========================================
// Room DTOs
// ==========================================

export class CreateRoomDto {
    @ApiProperty({ description: 'Room name' })
    @IsString()
    name: string;

    @ApiProperty({ enum: RoomType, description: 'Room type' })
    @IsEnum(RoomType)
    type: RoomType;

    @ApiProperty({ description: 'Floor number', default: 0 })
    @IsNumber()
    @IsOptional()
    floor?: number;

    @ApiProperty({ description: 'Icon name', required: false })
    @IsString()
    @IsOptional()
    icon?: string;

    @ApiProperty({ description: 'Color hex code', required: false })
    @IsString()
    @IsOptional()
    color?: string;
}

export class UpdateRoomDto {
    @ApiProperty({ required: false })
    @IsString()
    @IsOptional()
    name?: string;

    @ApiProperty({ enum: RoomType, required: false })
    @IsEnum(RoomType)
    @IsOptional()
    type?: RoomType;

    @ApiProperty({ required: false })
    @IsNumber()
    @IsOptional()
    floor?: number;

    @ApiProperty({ required: false })
    @IsString()
    @IsOptional()
    icon?: string;

    @ApiProperty({ required: false })
    @IsString()
    @IsOptional()
    color?: string;
}

// ==========================================
// Device DTOs
// ==========================================

export class CreateDeviceDto {
    @ApiProperty({ description: 'Device name' })
    @IsString()
    name: string;

    @ApiProperty({ enum: DeviceType, description: 'Device type' })
    @IsEnum(DeviceType)
    type: DeviceType;

    @ApiProperty({ description: 'Room ID', required: false })
    @IsString()
    @IsOptional()
    roomId?: string;

    @ApiProperty({ description: 'Manufacturer', required: false })
    @IsString()
    @IsOptional()
    manufacturer?: string;

    @ApiProperty({ description: 'Model', required: false })
    @IsString()
    @IsOptional()
    model?: string;

    @ApiProperty({ enum: DeviceProtocol, description: 'Communication protocol' })
    @IsEnum(DeviceProtocol)
    @IsOptional()
    protocol?: DeviceProtocol;

    @ApiProperty({ description: 'IP Address', required: false })
    @IsString()
    @IsOptional()
    ipAddress?: string;

    @ApiProperty({ description: 'MAC Address', required: false })
    @IsString()
    @IsOptional()
    macAddress?: string;

    @ApiProperty({ enum: IntegrationProvider, description: 'Integration provider', required: false })
    @IsString()
    @IsOptional()
    integrationProvider?: string;

    @ApiProperty({ description: 'Integration config', required: false })
    @IsObject()
    @IsOptional()
    integrationConfig?: Record<string, any>;

    @ApiProperty({ description: 'Device capabilities', required: false })
    @IsArray()
    @IsOptional()
    capabilities?: string[];

    @ApiProperty({ description: 'Icon name', required: false })
    @IsString()
    @IsOptional()
    icon?: string;

    @ApiProperty({ description: 'Color hex code', required: false })
    @IsString()
    @IsOptional()
    color?: string;
}

export class UpdateDeviceDto {
    @ApiProperty({ required: false })
    @IsString()
    @IsOptional()
    name?: string;

    @ApiProperty({ required: false })
    @IsString()
    @IsOptional()
    roomId?: string;

    @ApiProperty({ required: false })
    @IsString()
    @IsOptional()
    ipAddress?: string;

    @ApiProperty({ required: false })
    @IsObject()
    @IsOptional()
    integrationConfig?: Record<string, any>;

    @ApiProperty({ required: false })
    @IsString()
    @IsOptional()
    icon?: string;

    @ApiProperty({ required: false })
    @IsString()
    @IsOptional()
    color?: string;

    @ApiProperty({ required: false })
    @IsBoolean()
    @IsOptional()
    isActive?: boolean;

    @ApiProperty({ required: false })
    @IsBoolean()
    @IsOptional()
    isFavorite?: boolean;
}

export class DeviceCommandDto {
    @ApiProperty({ description: 'Command name (on, off, toggle, setBrightness, setColor, etc.)' })
    @IsString()
    command: string;

    @ApiProperty({ description: 'Command parameters', required: false })
    @IsObject()
    @IsOptional()
    params?: Record<string, any>;
}

export class DeviceStateDto {
    @ApiProperty({ description: 'Is device on' })
    @IsBoolean()
    @IsOptional()
    isOn?: boolean;

    @ApiProperty({ description: 'Brightness (0-100)', required: false })
    @IsNumber()
    @IsOptional()
    @Min(0)
    @Max(100)
    brightness?: number;

    @ApiProperty({ description: 'Color in hex', required: false })
    @IsString()
    @IsOptional()
    color?: string;

    @ApiProperty({ description: 'Color temperature in Kelvin', required: false })
    @IsNumber()
    @IsOptional()
    colorTemperature?: number;

    @ApiProperty({ description: 'Temperature setpoint', required: false })
    @IsNumber()
    @IsOptional()
    temperature?: number;

    @ApiProperty({ description: 'Fan speed (0-100)', required: false })
    @IsNumber()
    @IsOptional()
    fanSpeed?: number;

    @ApiProperty({ description: 'Position (0-100) for blinds', required: false })
    @IsNumber()
    @IsOptional()
    position?: number;

    @ApiProperty({ description: 'Lock state', required: false })
    @IsBoolean()
    @IsOptional()
    isLocked?: boolean;
}

// ==========================================
// Routine DTOs
// ==========================================

export class TriggerConfigDto {
    @ApiProperty({ description: 'Time in HH:MM format (for TIME trigger)', required: false })
    @IsString()
    @IsOptional()
    time?: string;

    @ApiProperty({ description: 'Days of week (0-6, Sunday=0)', required: false })
    @IsArray()
    @IsOptional()
    daysOfWeek?: number[];

    @ApiProperty({ description: 'Offset in minutes (for SUNRISE/SUNSET)', required: false })
    @IsNumber()
    @IsOptional()
    offset?: number;

    @ApiProperty({ description: 'Device ID (for DEVICE_STATE trigger)', required: false })
    @IsString()
    @IsOptional()
    deviceId?: string;

    @ApiProperty({ description: 'Device state condition', required: false })
    @IsObject()
    @IsOptional()
    stateCondition?: Record<string, any>;

    @ApiProperty({ description: 'Sensor threshold', required: false })
    @IsNumber()
    @IsOptional()
    threshold?: number;

    @ApiProperty({ description: 'Comparison operator (gt, lt, eq)', required: false })
    @IsString()
    @IsOptional()
    operator?: string;

    @ApiProperty({ description: 'Voice phrase (for VOICE trigger)', required: false })
    @IsString()
    @IsOptional()
    voicePhrase?: string;

    @ApiProperty({ description: 'Location geofence', required: false })
    @IsObject()
    @IsOptional()
    geofence?: { lat: number; lng: number; radius: number; trigger: 'enter' | 'exit' };
}

export class ConditionDto {
    @ApiProperty({ description: 'Condition type (time_range, device_state, mode)' })
    @IsString()
    type: string;

    @ApiProperty({ description: 'Condition configuration' })
    @IsObject()
    config: Record<string, any>;
}

export class RoutineActionDto {
    @ApiProperty({ enum: ActionType, description: 'Action type' })
    @IsEnum(ActionType)
    actionType: ActionType;

    @ApiProperty({ description: 'Device ID (for DEVICE_CONTROL)', required: false })
    @IsString()
    @IsOptional()
    deviceId?: string;

    @ApiProperty({ description: 'Action data/parameters' })
    @IsObject()
    actionData: Record<string, any>;

    @ApiProperty({ description: 'Delay in seconds before action', default: 0 })
    @IsNumber()
    @IsOptional()
    delaySeconds?: number;
}

export class CreateRoutineDto {
    @ApiProperty({ description: 'Routine name' })
    @IsString()
    name: string;

    @ApiProperty({ description: 'Description', required: false })
    @IsString()
    @IsOptional()
    description?: string;

    @ApiProperty({ enum: TriggerType, description: 'Trigger type' })
    @IsEnum(TriggerType)
    triggerType: TriggerType;

    @ApiProperty({ description: 'Trigger configuration' })
    @ValidateNested()
    @Type(() => TriggerConfigDto)
    triggerConfig: TriggerConfigDto;

    @ApiProperty({ description: 'Conditions (all must be true)', type: [ConditionDto], required: false })
    @IsArray()
    @IsOptional()
    @ValidateNested({ each: true })
    @Type(() => ConditionDto)
    conditions?: ConditionDto[];

    @ApiProperty({ description: 'Actions to execute', type: [RoutineActionDto] })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => RoutineActionDto)
    actions: RoutineActionDto[];

    @ApiProperty({ description: 'Icon name', required: false })
    @IsString()
    @IsOptional()
    icon?: string;

    @ApiProperty({ description: 'Color hex code', required: false })
    @IsString()
    @IsOptional()
    color?: string;

    @ApiProperty({ description: 'Run once and disable', default: false })
    @IsBoolean()
    @IsOptional()
    runOnce?: boolean;

    @ApiProperty({ description: 'Cooldown in seconds', default: 0 })
    @IsNumber()
    @IsOptional()
    cooldownSecs?: number;
}

export class UpdateRoutineDto {
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
    @Type(() => TriggerConfigDto)
    @IsOptional()
    triggerConfig?: TriggerConfigDto;

    @ApiProperty({ required: false })
    @IsArray()
    @IsOptional()
    conditions?: ConditionDto[];

    @ApiProperty({ required: false })
    @IsBoolean()
    @IsOptional()
    isActive?: boolean;

    @ApiProperty({ required: false })
    @IsString()
    @IsOptional()
    icon?: string;

    @ApiProperty({ required: false })
    @IsString()
    @IsOptional()
    color?: string;
}

// ==========================================
// Scene DTOs
// ==========================================

export class SceneActionDto {
    @ApiProperty({ description: 'Device ID' })
    @IsString()
    deviceId: string;

    @ApiProperty({ description: 'Target device state' })
    @ValidateNested()
    @Type(() => DeviceStateDto)
    targetState: DeviceStateDto;
}

export class CreateSceneDto {
    @ApiProperty({ description: 'Scene name' })
    @IsString()
    name: string;

    @ApiProperty({ description: 'Description', required: false })
    @IsString()
    @IsOptional()
    description?: string;

    @ApiProperty({ description: 'Scene actions', type: [SceneActionDto] })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => SceneActionDto)
    actions: SceneActionDto[];

    @ApiProperty({ description: 'Icon name', required: false })
    @IsString()
    @IsOptional()
    icon?: string;

    @ApiProperty({ description: 'Color hex code', required: false })
    @IsString()
    @IsOptional()
    color?: string;
}

export class UpdateSceneDto {
    @ApiProperty({ required: false })
    @IsString()
    @IsOptional()
    name?: string;

    @ApiProperty({ required: false })
    @IsString()
    @IsOptional()
    description?: string;

    @ApiProperty({ required: false })
    @IsBoolean()
    @IsOptional()
    isActive?: boolean;

    @ApiProperty({ required: false })
    @IsBoolean()
    @IsOptional()
    isFavorite?: boolean;

    @ApiProperty({ required: false })
    @IsString()
    @IsOptional()
    icon?: string;

    @ApiProperty({ required: false })
    @IsString()
    @IsOptional()
    color?: string;
}

// ==========================================
// Voice Assistant DTOs
// ==========================================

export class ConnectVoiceAssistantDto {
    @ApiProperty({ enum: VoiceProvider, description: 'Voice assistant provider' })
    @IsEnum(VoiceProvider)
    provider: VoiceProvider;

    @ApiProperty({ description: 'Friendly name' })
    @IsString()
    name: string;

    @ApiProperty({ description: 'Access token', required: false })
    @IsString()
    @IsOptional()
    accessToken?: string;

    @ApiProperty({ description: 'Refresh token', required: false })
    @IsString()
    @IsOptional()
    refreshToken?: string;

    @ApiProperty({ description: 'OAuth authorization code', required: false })
    @IsString()
    @IsOptional()
    authCode?: string;
}

export class VoiceCommandDto {
    @ApiProperty({ description: 'Voice command text' })
    @IsString()
    command: string;

    @ApiProperty({ enum: VoiceProvider, description: 'Source provider' })
    @IsEnum(VoiceProvider)
    provider: VoiceProvider;

    @ApiProperty({ description: 'Request ID from provider', required: false })
    @IsString()
    @IsOptional()
    requestId?: string;
}

// ==========================================
// Discovery DTOs
// ==========================================

export class DiscoverDevicesDto {
    @ApiProperty({ enum: IntegrationProvider, description: 'Provider to discover from' })
    @IsString()
    provider: string;

    @ApiProperty({ description: 'Provider credentials/config' })
    @IsObject()
    config: Record<string, any>;
}

export class ImportDeviceDto {
    @ApiProperty({ description: 'External device data' })
    @IsObject()
    deviceData: Record<string, any>;

    @ApiProperty({ description: 'Room ID to assign', required: false })
    @IsString()
    @IsOptional()
    roomId?: string;
}
