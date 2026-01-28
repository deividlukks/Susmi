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

import { HomeService } from './services/home.service';
import { DeviceService } from './services/device.service';
import { RoutineService } from './services/routine.service';
import { MqttService } from './services/mqtt.service';
import { VoiceAssistantService } from './services/voice-assistant.service';

import {
    CreateSmartHomeDto,
    UpdateSmartHomeDto,
    CreateRoomDto,
    UpdateRoomDto,
    CreateDeviceDto,
    UpdateDeviceDto,
    DeviceCommandDto,
    DeviceStateDto,
    CreateRoutineDto,
    UpdateRoutineDto,
    CreateSceneDto,
    UpdateSceneDto,
    ConnectVoiceAssistantDto,
    VoiceCommandDto,
    DiscoverDevicesDto,
    DeviceType,
} from './dto/home-automation.dto';

@ApiTags('Home Automation')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('home-automation')
export class HomeAutomationController {
    constructor(
        private readonly homeService: HomeService,
        private readonly deviceService: DeviceService,
        private readonly routineService: RoutineService,
        private readonly mqttService: MqttService,
        private readonly voiceService: VoiceAssistantService,
    ) {}

    // ==========================================
    // Smart Homes
    // ==========================================

    @Post('homes')
    @ApiOperation({ summary: 'Create smart home' })
    async createHome(@Request() req, @Body() dto: CreateSmartHomeDto) {
        return this.homeService.createHome(req.user.id, dto);
    }

    @Get('homes')
    @ApiOperation({ summary: 'List all smart homes' })
    async getHomes(@Request() req) {
        return this.homeService.findAllHomes(req.user.id);
    }

    @Get('homes/:homeId')
    @ApiOperation({ summary: 'Get smart home by ID' })
    async getHome(@Request() req, @Param('homeId') homeId: string) {
        return this.homeService.findOneHome(req.user.id, homeId);
    }

    @Put('homes/:homeId')
    @ApiOperation({ summary: 'Update smart home' })
    async updateHome(
        @Request() req,
        @Param('homeId') homeId: string,
        @Body() dto: UpdateSmartHomeDto,
    ) {
        return this.homeService.updateHome(req.user.id, homeId, dto);
    }

    @Delete('homes/:homeId')
    @ApiOperation({ summary: 'Delete smart home' })
    async deleteHome(@Request() req, @Param('homeId') homeId: string) {
        return this.homeService.deleteHome(req.user.id, homeId);
    }

    @Get('homes/:homeId/dashboard')
    @ApiOperation({ summary: 'Get home dashboard' })
    async getDashboard(@Request() req, @Param('homeId') homeId: string) {
        return this.homeService.getDashboard(req.user.id, homeId);
    }

    @Post('homes/:homeId/away-mode')
    @ApiOperation({ summary: 'Set away mode' })
    async setAwayMode(
        @Request() req,
        @Param('homeId') homeId: string,
        @Body() body: { enabled: boolean },
    ) {
        return this.homeService.setAwayMode(req.user.id, homeId, body.enabled);
    }

    @Post('homes/:homeId/vacation-mode')
    @ApiOperation({ summary: 'Set vacation mode' })
    async setVacationMode(
        @Request() req,
        @Param('homeId') homeId: string,
        @Body() body: { enabled: boolean },
    ) {
        return this.homeService.setVacationMode(req.user.id, homeId, body.enabled);
    }

    // ==========================================
    // Rooms
    // ==========================================

    @Post('homes/:homeId/rooms')
    @ApiOperation({ summary: 'Create room' })
    async createRoom(@Param('homeId') homeId: string, @Body() dto: CreateRoomDto) {
        return this.homeService.createRoom(homeId, dto);
    }

    @Get('homes/:homeId/rooms')
    @ApiOperation({ summary: 'List all rooms' })
    async getRooms(@Param('homeId') homeId: string) {
        return this.homeService.findAllRooms(homeId);
    }

    @Get('homes/:homeId/rooms/:roomId')
    @ApiOperation({ summary: 'Get room by ID' })
    async getRoom(@Param('homeId') homeId: string, @Param('roomId') roomId: string) {
        return this.homeService.findOneRoom(homeId, roomId);
    }

    @Put('homes/:homeId/rooms/:roomId')
    @ApiOperation({ summary: 'Update room' })
    async updateRoom(
        @Param('homeId') homeId: string,
        @Param('roomId') roomId: string,
        @Body() dto: UpdateRoomDto,
    ) {
        return this.homeService.updateRoom(homeId, roomId, dto);
    }

    @Delete('homes/:homeId/rooms/:roomId')
    @ApiOperation({ summary: 'Delete room' })
    async deleteRoom(@Param('homeId') homeId: string, @Param('roomId') roomId: string) {
        return this.homeService.deleteRoom(homeId, roomId);
    }

    @Put('homes/:homeId/rooms/:roomId/environment')
    @ApiOperation({ summary: 'Update room environment data' })
    async updateRoomEnvironment(
        @Param('homeId') homeId: string,
        @Param('roomId') roomId: string,
        @Body() data: { temperature?: number; humidity?: number; luminosity?: number },
    ) {
        return this.homeService.updateRoomEnvironment(homeId, roomId, data);
    }

    // ==========================================
    // Devices
    // ==========================================

    @Post('homes/:homeId/devices')
    @ApiOperation({ summary: 'Create device' })
    async createDevice(@Param('homeId') homeId: string, @Body() dto: CreateDeviceDto) {
        return this.deviceService.create(homeId, dto);
    }

    @Get('homes/:homeId/devices')
    @ApiOperation({ summary: 'List all devices' })
    async getDevices(
        @Param('homeId') homeId: string,
        @Query('roomId') roomId?: string,
        @Query('type') type?: DeviceType,
    ) {
        return this.deviceService.findAll(homeId, roomId, type);
    }

    @Get('homes/:homeId/devices/:deviceId')
    @ApiOperation({ summary: 'Get device by ID' })
    async getDevice(@Param('homeId') homeId: string, @Param('deviceId') deviceId: string) {
        return this.deviceService.findOne(homeId, deviceId);
    }

    @Put('homes/:homeId/devices/:deviceId')
    @ApiOperation({ summary: 'Update device' })
    async updateDevice(
        @Param('homeId') homeId: string,
        @Param('deviceId') deviceId: string,
        @Body() dto: UpdateDeviceDto,
    ) {
        return this.deviceService.update(homeId, deviceId, dto);
    }

    @Delete('homes/:homeId/devices/:deviceId')
    @ApiOperation({ summary: 'Delete device' })
    async deleteDevice(@Param('homeId') homeId: string, @Param('deviceId') deviceId: string) {
        return this.deviceService.delete(homeId, deviceId);
    }

    @Post('homes/:homeId/devices/:deviceId/command')
    @ApiOperation({ summary: 'Send command to device' })
    async sendCommand(
        @Param('homeId') homeId: string,
        @Param('deviceId') deviceId: string,
        @Body() command: DeviceCommandDto,
    ) {
        return this.deviceService.sendCommand(homeId, deviceId, command);
    }

    @Put('homes/:homeId/devices/:deviceId/state')
    @ApiOperation({ summary: 'Set device state' })
    async setDeviceState(
        @Param('homeId') homeId: string,
        @Param('deviceId') deviceId: string,
        @Body() state: DeviceStateDto,
    ) {
        return this.deviceService.setState(homeId, deviceId, state);
    }

    @Get('homes/:homeId/devices/:deviceId/state')
    @ApiOperation({ summary: 'Get device state' })
    async getDeviceState(@Param('homeId') homeId: string, @Param('deviceId') deviceId: string) {
        return this.deviceService.getState(homeId, deviceId);
    }

    @Get('homes/:homeId/devices/:deviceId/logs')
    @ApiOperation({ summary: 'Get device logs' })
    async getDeviceLogs(
        @Param('homeId') homeId: string,
        @Param('deviceId') deviceId: string,
        @Query('limit') limit?: number,
    ) {
        return this.deviceService.getDeviceLogs(homeId, deviceId, limit);
    }

    @Post('homes/:homeId/devices/on-all')
    @ApiOperation({ summary: 'Turn on all devices' })
    async turnOnAll(@Param('homeId') homeId: string, @Query('roomId') roomId?: string) {
        return this.deviceService.turnOnAll(homeId, roomId);
    }

    @Post('homes/:homeId/devices/off-all')
    @ApiOperation({ summary: 'Turn off all devices' })
    async turnOffAll(@Param('homeId') homeId: string, @Query('roomId') roomId?: string) {
        return this.deviceService.turnOffAll(homeId, roomId);
    }

    @Post('homes/:homeId/devices/discover')
    @ApiOperation({ summary: 'Discover devices from provider' })
    async discoverDevices(@Param('homeId') homeId: string, @Body() dto: DiscoverDevicesDto) {
        return this.deviceService.discoverDevices(homeId, dto.provider, dto.config);
    }

    // ==========================================
    // Routines
    // ==========================================

    @Post('homes/:homeId/routines')
    @ApiOperation({ summary: 'Create automation routine' })
    async createRoutine(@Param('homeId') homeId: string, @Body() dto: CreateRoutineDto) {
        return this.routineService.create(homeId, dto);
    }

    @Get('homes/:homeId/routines')
    @ApiOperation({ summary: 'List all routines' })
    async getRoutines(@Param('homeId') homeId: string, @Query('active') active?: string) {
        return this.routineService.findAll(homeId, active === 'true' ? true : undefined);
    }

    @Get('homes/:homeId/routines/:routineId')
    @ApiOperation({ summary: 'Get routine by ID' })
    async getRoutine(@Param('homeId') homeId: string, @Param('routineId') routineId: string) {
        return this.routineService.findOne(homeId, routineId);
    }

    @Put('homes/:homeId/routines/:routineId')
    @ApiOperation({ summary: 'Update routine' })
    async updateRoutine(
        @Param('homeId') homeId: string,
        @Param('routineId') routineId: string,
        @Body() dto: UpdateRoutineDto,
    ) {
        return this.routineService.update(homeId, routineId, dto);
    }

    @Delete('homes/:homeId/routines/:routineId')
    @ApiOperation({ summary: 'Delete routine' })
    async deleteRoutine(@Param('homeId') homeId: string, @Param('routineId') routineId: string) {
        return this.routineService.delete(homeId, routineId);
    }

    @Post('homes/:homeId/routines/:routineId/execute')
    @ApiOperation({ summary: 'Execute routine manually' })
    async executeRoutine(@Param('homeId') homeId: string, @Param('routineId') routineId: string) {
        return this.routineService.executeRoutine(homeId, routineId, 'manual');
    }

    @Post('homes/:homeId/routines/:routineId/toggle')
    @ApiOperation({ summary: 'Toggle routine active state' })
    async toggleRoutine(@Param('homeId') homeId: string, @Param('routineId') routineId: string) {
        return this.routineService.toggleActive(homeId, routineId);
    }

    // ==========================================
    // Scenes
    // ==========================================

    @Post('homes/:homeId/scenes')
    @ApiOperation({ summary: 'Create scene' })
    async createScene(@Param('homeId') homeId: string, @Body() dto: CreateSceneDto) {
        return this.routineService.createScene(homeId, dto);
    }

    @Get('homes/:homeId/scenes')
    @ApiOperation({ summary: 'List all scenes' })
    async getScenes(@Param('homeId') homeId: string) {
        return this.routineService.findAllScenes(homeId);
    }

    @Get('homes/:homeId/scenes/:sceneId')
    @ApiOperation({ summary: 'Get scene by ID' })
    async getScene(@Param('homeId') homeId: string, @Param('sceneId') sceneId: string) {
        return this.routineService.findOneScene(homeId, sceneId);
    }

    @Put('homes/:homeId/scenes/:sceneId')
    @ApiOperation({ summary: 'Update scene' })
    async updateScene(
        @Param('homeId') homeId: string,
        @Param('sceneId') sceneId: string,
        @Body() dto: UpdateSceneDto,
    ) {
        return this.routineService.updateScene(homeId, sceneId, dto);
    }

    @Delete('homes/:homeId/scenes/:sceneId')
    @ApiOperation({ summary: 'Delete scene' })
    async deleteScene(@Param('homeId') homeId: string, @Param('sceneId') sceneId: string) {
        return this.routineService.deleteScene(homeId, sceneId);
    }

    @Post('homes/:homeId/scenes/:sceneId/execute')
    @ApiOperation({ summary: 'Execute scene' })
    async executeScene(@Param('homeId') homeId: string, @Param('sceneId') sceneId: string) {
        return this.routineService.executeScene(homeId, sceneId);
    }

    // ==========================================
    // Voice Assistants
    // ==========================================

    @Post('homes/:homeId/voice/connect')
    @ApiOperation({ summary: 'Connect voice assistant' })
    async connectVoice(@Param('homeId') homeId: string, @Body() dto: ConnectVoiceAssistantDto) {
        return this.voiceService.connect(homeId, dto);
    }

    @Get('homes/:homeId/voice/assistants')
    @ApiOperation({ summary: 'List connected voice assistants' })
    async getVoiceAssistants(@Param('homeId') homeId: string) {
        return this.voiceService.getAssistants(homeId);
    }

    @Delete('homes/:homeId/voice/:assistantId')
    @ApiOperation({ summary: 'Disconnect voice assistant' })
    async disconnectVoice(
        @Param('homeId') homeId: string,
        @Param('assistantId') assistantId: string,
    ) {
        return this.voiceService.disconnect(homeId, assistantId);
    }

    @Post('homes/:homeId/voice/command')
    @ApiOperation({ summary: 'Process voice command' })
    async processVoiceCommand(@Param('homeId') homeId: string, @Body() command: VoiceCommandDto) {
        return this.voiceService.processVoiceCommand(homeId, command);
    }

    // ==========================================
    // Alexa Smart Home Skill Endpoint
    // ==========================================

    @Post('homes/:homeId/alexa')
    @ApiOperation({ summary: 'Alexa Smart Home Skill endpoint' })
    async handleAlexaRequest(@Param('homeId') homeId: string, @Body() request: any) {
        return this.voiceService.handleAlexaRequest(homeId, request);
    }

    // ==========================================
    // Google Home Actions Endpoint
    // ==========================================

    @Post('homes/:homeId/google')
    @ApiOperation({ summary: 'Google Home Actions endpoint' })
    async handleGoogleRequest(@Param('homeId') homeId: string, @Body() request: any) {
        return this.voiceService.handleGoogleRequest(homeId, request);
    }

    // ==========================================
    // MQTT Status
    // ==========================================

    @Get('mqtt/status')
    @ApiOperation({ summary: 'Get MQTT connection status' })
    async getMqttStatus() {
        return this.mqttService.getConnectionStatus();
    }
}
