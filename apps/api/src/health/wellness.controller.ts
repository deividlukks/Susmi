import {
    Controller,
    Get,
    Post,
    Put,
    Patch,
    Delete,
    Body,
    Param,
    Query,
    UseGuards,
    Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiParam } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
// Medication Services - Refatorados com SRP
import { MedicationManagementService } from './services/medication-management.service';
import { MedicationReminderService } from './services/medication-reminder.service';
import { MedicationAnalyticsService } from './services/medication-analytics.service';
import { ExerciseService } from './services/exercise.service';
import { HealthMetricsService } from './services/health-metrics.service';
import { WearableService } from './services/wearable.service';
import {
    CreateMedicationDto,
    UpdateMedicationDto,
    LogMedicationDto,
    CreateExerciseTypeDto,
    CreateWorkoutDto,
    UpdateWorkoutDto,
    RecordHealthMetricDto,
    HealthMetricFiltersDto,
    CreateHealthGoalDto,
    UpdateHealthGoalDto,
    ConnectWearableDto,
    UpdateWearableSettingsDto,
    HealthMetricType,
    WearableProvider,
} from './dto/health.dto';

@ApiTags('Wellness - Saúde e Bem-estar')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('wellness')
export class WellnessController {
    constructor(
        // Medication Services (SRP compliant)
        private readonly medicationManagement: MedicationManagementService,
        private readonly medicationReminder: MedicationReminderService,
        private readonly medicationAnalytics: MedicationAnalyticsService,
        // Other Health Services
        private readonly exerciseService: ExerciseService,
        private readonly healthMetricsService: HealthMetricsService,
        private readonly wearableService: WearableService,
    ) {}

    // ==========================================
    // Medications - Medicamentos
    // ==========================================

    @Post('medications')
    @ApiOperation({ summary: 'Criar um medicamento' })
    createMedication(@Request() req: any, @Body() dto: CreateMedicationDto) {
        return this.medicationManagement.create(req.user.id, dto);
    }

    @Get('medications')
    @ApiOperation({ summary: 'Listar medicamentos' })
    @ApiQuery({ name: 'activeOnly', required: false, type: Boolean })
    getMedications(@Request() req: any, @Query('activeOnly') activeOnly = 'true') {
        return this.medicationManagement.findAll(req.user.id, activeOnly === 'true');
    }

    @Get('medications/schedule/today')
    @ApiOperation({ summary: 'Agenda de medicamentos de hoje' })
    getTodaySchedule(@Request() req: any) {
        return this.medicationReminder.getTodaySchedule(req.user.id);
    }

    @Get('medications/low-stock')
    @ApiOperation({ summary: 'Medicamentos com estoque baixo' })
    getLowStockMedications(@Request() req: any) {
        return this.medicationManagement.getLowStockMedications(req.user.id);
    }

    @Get('medications/adherence')
    @ApiOperation({ summary: 'Estatísticas de adesão aos medicamentos' })
    @ApiQuery({ name: 'days', required: false, type: Number })
    getAdherenceStats(@Request() req: any, @Query('days') days = '30') {
        return this.medicationAnalytics.getAdherenceStats(req.user.id, parseInt(days));
    }

    @Get('medications/:id')
    @ApiOperation({ summary: 'Obter medicamento por ID' })
    @ApiParam({ name: 'id', description: 'ID do medicamento' })
    getMedication(@Request() req: any, @Param('id') id: string) {
        return this.medicationManagement.findOne(req.user.id, id);
    }

    @Put('medications/:id')
    @ApiOperation({ summary: 'Atualizar medicamento' })
    @ApiParam({ name: 'id', description: 'ID do medicamento' })
    updateMedication(@Request() req: any, @Param('id') id: string, @Body() dto: UpdateMedicationDto) {
        return this.medicationManagement.update(req.user.id, id, dto);
    }

    @Delete('medications/:id')
    @ApiOperation({ summary: 'Remover medicamento' })
    @ApiParam({ name: 'id', description: 'ID do medicamento' })
    deleteMedication(@Request() req: any, @Param('id') id: string) {
        return this.medicationManagement.delete(req.user.id, id);
    }

    @Post('medications/:id/log')
    @ApiOperation({ summary: 'Registrar tomada de medicamento' })
    @ApiParam({ name: 'id', description: 'ID do medicamento' })
    logMedication(@Request() req: any, @Param('id') id: string, @Body() dto: LogMedicationDto) {
        return this.medicationReminder.logMedication(req.user.id, id, dto);
    }

    @Get('medications/:id/history')
    @ApiOperation({ summary: 'Histórico do medicamento' })
    @ApiParam({ name: 'id', description: 'ID do medicamento' })
    @ApiQuery({ name: 'days', required: false, type: Number })
    getMedicationHistory(@Request() req: any, @Param('id') id: string, @Query('days') days = '30') {
        return this.medicationReminder.getMedicationHistory(req.user.id, id, parseInt(days));
    }

    @Patch('medications/:id/stock')
    @ApiOperation({ summary: 'Atualizar estoque do medicamento' })
    @ApiParam({ name: 'id', description: 'ID do medicamento' })
    @ApiQuery({ name: 'quantity', required: true, type: Number })
    @ApiQuery({ name: 'action', required: true, enum: ['add', 'set'] })
    updateStock(
        @Request() req: any,
        @Param('id') id: string,
        @Query('quantity') quantity: string,
        @Query('action') action: 'add' | 'set',
    ) {
        return this.medicationManagement.updateStock(req.user.id, id, parseInt(quantity), action);
    }

    // ==========================================
    // Exercise Types - Tipos de Exercício
    // ==========================================

    @Post('exercises/types')
    @ApiOperation({ summary: 'Criar tipo de exercício' })
    createExerciseType(@Request() req: any, @Body() dto: CreateExerciseTypeDto) {
        return this.exerciseService.createExerciseType(req.user.id, dto);
    }

    @Get('exercises/types')
    @ApiOperation({ summary: 'Listar tipos de exercício' })
    @ApiQuery({ name: 'category', required: false })
    getExerciseTypes(@Request() req: any, @Query('category') category?: string) {
        return this.exerciseService.getExerciseTypes(req.user.id, category);
    }

    @Get('exercises/types/:id')
    @ApiOperation({ summary: 'Obter tipo de exercício por ID' })
    @ApiParam({ name: 'id', description: 'ID do tipo de exercício' })
    getExerciseType(@Request() req: any, @Param('id') id: string) {
        return this.exerciseService.getExerciseType(req.user.id, id);
    }

    @Delete('exercises/types/:id')
    @ApiOperation({ summary: 'Remover tipo de exercício' })
    @ApiParam({ name: 'id', description: 'ID do tipo de exercício' })
    deleteExerciseType(@Request() req: any, @Param('id') id: string) {
        return this.exerciseService.deleteExerciseType(req.user.id, id);
    }

    // ==========================================
    // Workouts - Treinos
    // ==========================================

    @Post('workouts')
    @ApiOperation({ summary: 'Registrar treino' })
    createWorkout(@Request() req: any, @Body() dto: CreateWorkoutDto) {
        return this.exerciseService.createWorkout(req.user.id, dto);
    }

    @Get('workouts')
    @ApiOperation({ summary: 'Listar treinos' })
    @ApiQuery({ name: 'startDate', required: false })
    @ApiQuery({ name: 'endDate', required: false })
    @ApiQuery({ name: 'exerciseTypeId', required: false })
    @ApiQuery({ name: 'page', required: false, type: Number })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    getWorkouts(
        @Request() req: any,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
        @Query('exerciseTypeId') exerciseTypeId?: string,
        @Query('page') page = '1',
        @Query('limit') limit = '20',
    ) {
        return this.exerciseService.getWorkouts(req.user.id, {
            startDate,
            endDate,
            exerciseTypeId,
            page: parseInt(page),
            limit: parseInt(limit),
        });
    }

    @Get('workouts/stats')
    @ApiOperation({ summary: 'Estatísticas de treinos' })
    @ApiQuery({ name: 'days', required: false, type: Number })
    getWorkoutStats(@Request() req: any, @Query('days') days = '30') {
        return this.exerciseService.getWorkoutStats(req.user.id, parseInt(days));
    }

    @Get('workouts/weekly')
    @ApiOperation({ summary: 'Resumo semanal de treinos' })
    getWeeklySummary(@Request() req: any) {
        return this.exerciseService.getWeeklySummary(req.user.id);
    }

    @Get('workouts/streak')
    @ApiOperation({ summary: 'Sequência de treinos' })
    getStreak(@Request() req: any) {
        return this.exerciseService.getStreak(req.user.id);
    }

    @Get('workouts/:id')
    @ApiOperation({ summary: 'Obter treino por ID' })
    @ApiParam({ name: 'id', description: 'ID do treino' })
    getWorkout(@Request() req: any, @Param('id') id: string) {
        return this.exerciseService.getWorkout(req.user.id, id);
    }

    @Put('workouts/:id')
    @ApiOperation({ summary: 'Atualizar treino' })
    @ApiParam({ name: 'id', description: 'ID do treino' })
    updateWorkout(@Request() req: any, @Param('id') id: string, @Body() dto: UpdateWorkoutDto) {
        return this.exerciseService.updateWorkout(req.user.id, id, dto);
    }

    @Delete('workouts/:id')
    @ApiOperation({ summary: 'Remover treino' })
    @ApiParam({ name: 'id', description: 'ID do treino' })
    deleteWorkout(@Request() req: any, @Param('id') id: string) {
        return this.exerciseService.deleteWorkout(req.user.id, id);
    }

    // ==========================================
    // Health Metrics - Métricas de Saúde
    // ==========================================

    @Post('metrics')
    @ApiOperation({ summary: 'Registrar métrica de saúde' })
    recordMetric(@Request() req: any, @Body() dto: RecordHealthMetricDto) {
        return this.healthMetricsService.recordMetric(req.user.id, dto);
    }

    @Get('metrics')
    @ApiOperation({ summary: 'Listar métricas de saúde' })
    @ApiQuery({ name: 'type', required: false, enum: HealthMetricType })
    @ApiQuery({ name: 'startDate', required: false })
    @ApiQuery({ name: 'endDate', required: false })
    @ApiQuery({ name: 'page', required: false, type: Number })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    getMetrics(@Request() req: any, @Query() filters: HealthMetricFiltersDto) {
        return this.healthMetricsService.getMetrics(req.user.id, filters);
    }

    @Get('metrics/summary')
    @ApiOperation({ summary: 'Resumo de saúde' })
    getHealthSummary(@Request() req: any) {
        return this.healthMetricsService.getHealthSummary(req.user.id);
    }

    @Get('metrics/trends/:type')
    @ApiOperation({ summary: 'Tendências de uma métrica' })
    @ApiParam({ name: 'type', enum: HealthMetricType })
    @ApiQuery({ name: 'days', required: false, type: Number })
    getMetricTrends(
        @Request() req: any,
        @Param('type') type: HealthMetricType,
        @Query('days') days = '30',
    ) {
        return this.healthMetricsService.getMetricTrends(req.user.id, type, parseInt(days));
    }

    @Get('metrics/latest/:type')
    @ApiOperation({ summary: 'Última leitura de uma métrica' })
    @ApiParam({ name: 'type', enum: HealthMetricType })
    getLatestMetric(@Request() req: any, @Param('type') type: HealthMetricType) {
        return this.healthMetricsService.getLatestMetric(req.user.id, type);
    }

    @Get('metrics/blood-pressure')
    @ApiOperation({ summary: 'Histórico de pressão arterial' })
    @ApiQuery({ name: 'days', required: false, type: Number })
    getBloodPressureHistory(@Request() req: any, @Query('days') days = '30') {
        return this.healthMetricsService.getBloodPressureHistory(req.user.id, parseInt(days));
    }

    @Delete('metrics/:id')
    @ApiOperation({ summary: 'Remover métrica' })
    @ApiParam({ name: 'id', description: 'ID da métrica' })
    deleteMetric(@Request() req: any, @Param('id') id: string) {
        return this.healthMetricsService.deleteMetric(req.user.id, id);
    }

    // ==========================================
    // Health Goals - Metas de Saúde
    // ==========================================

    @Post('goals')
    @ApiOperation({ summary: 'Criar meta de saúde' })
    createGoal(@Request() req: any, @Body() dto: CreateHealthGoalDto) {
        return this.healthMetricsService.createGoal(req.user.id, dto);
    }

    @Get('goals')
    @ApiOperation({ summary: 'Listar metas de saúde' })
    @ApiQuery({ name: 'activeOnly', required: false, type: Boolean })
    getGoals(@Request() req: any, @Query('activeOnly') activeOnly = 'true') {
        return this.healthMetricsService.getGoals(req.user.id, activeOnly === 'true');
    }

    @Put('goals/:id')
    @ApiOperation({ summary: 'Atualizar meta de saúde' })
    @ApiParam({ name: 'id', description: 'ID da meta' })
    updateGoal(@Request() req: any, @Param('id') id: string, @Body() dto: UpdateHealthGoalDto) {
        return this.healthMetricsService.updateGoal(req.user.id, id, dto);
    }

    @Delete('goals/:id')
    @ApiOperation({ summary: 'Remover meta de saúde' })
    @ApiParam({ name: 'id', description: 'ID da meta' })
    deleteGoal(@Request() req: any, @Param('id') id: string) {
        return this.healthMetricsService.deleteGoal(req.user.id, id);
    }

    // ==========================================
    // Wearables - Dispositivos Vestíveis
    // ==========================================

    @Get('wearables/auth-url')
    @ApiOperation({ summary: 'Obter URL de autenticação OAuth para wearable' })
    @ApiQuery({ name: 'provider', required: true, enum: WearableProvider })
    @ApiQuery({ name: 'redirectUri', required: true })
    @ApiQuery({ name: 'state', required: false })
    getAuthUrl(
        @Query('provider') provider: WearableProvider,
        @Query('redirectUri') redirectUri: string,
        @Query('state') state = '',
    ) {
        return { url: this.wearableService.getAuthUrl(provider, redirectUri, state) };
    }

    @Post('wearables/connect')
    @ApiOperation({ summary: 'Conectar dispositivo wearable' })
    connectWearable(@Request() req: any, @Body() dto: ConnectWearableDto) {
        return this.wearableService.connectDevice(req.user.id, dto);
    }

    @Get('wearables')
    @ApiOperation({ summary: 'Listar dispositivos conectados' })
    getConnectedDevices(@Request() req: any) {
        return this.wearableService.getConnectedDevices(req.user.id);
    }

    @Get('wearables/sync-stats')
    @ApiOperation({ summary: 'Estatísticas de sincronização' })
    getSyncStats(@Request() req: any) {
        return this.wearableService.getSyncStats(req.user.id);
    }

    @Get('wearables/:id')
    @ApiOperation({ summary: 'Obter dispositivo por ID' })
    @ApiParam({ name: 'id', description: 'ID do dispositivo' })
    getDevice(@Request() req: any, @Param('id') id: string) {
        return this.wearableService.getDevice(req.user.id, id);
    }

    @Put('wearables/:id/settings')
    @ApiOperation({ summary: 'Atualizar configurações do dispositivo' })
    @ApiParam({ name: 'id', description: 'ID do dispositivo' })
    updateDeviceSettings(
        @Request() req: any,
        @Param('id') id: string,
        @Body() dto: UpdateWearableSettingsDto,
    ) {
        return this.wearableService.updateDeviceSettings(req.user.id, id, dto);
    }

    @Post('wearables/:id/sync')
    @ApiOperation({ summary: 'Sincronizar dados do dispositivo' })
    @ApiParam({ name: 'id', description: 'ID do dispositivo' })
    syncDevice(@Request() req: any, @Param('id') id: string) {
        return this.wearableService.syncDevice(req.user.id, id);
    }

    @Post('wearables/sync-all')
    @ApiOperation({ summary: 'Sincronizar todos os dispositivos' })
    syncAllDevices(@Request() req: any) {
        return this.wearableService.syncAllDevices(req.user.id);
    }

    @Get('wearables/:id/history')
    @ApiOperation({ summary: 'Histórico de sincronização do dispositivo' })
    @ApiParam({ name: 'id', description: 'ID do dispositivo' })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    getSyncHistory(@Request() req: any, @Param('id') id: string, @Query('limit') limit = '50') {
        return this.wearableService.getSyncHistory(req.user.id, id, parseInt(limit));
    }

    @Delete('wearables/:id')
    @ApiOperation({ summary: 'Desconectar dispositivo' })
    @ApiParam({ name: 'id', description: 'ID do dispositivo' })
    disconnectDevice(@Request() req: any, @Param('id') id: string) {
        return this.wearableService.disconnectDevice(req.user.id, id);
    }
}
