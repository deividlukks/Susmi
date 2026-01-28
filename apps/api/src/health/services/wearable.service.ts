import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
    ConnectWearableDto,
    UpdateWearableSettingsDto,
    WearableProvider,
    HealthMetricType,
} from '../dto/health.dto';

// Provider-specific API interfaces
interface WearableApiConfig {
    authUrl: string;
    tokenUrl: string;
    apiBaseUrl: string;
    scopes: string[];
}

export interface SyncResult {
    provider: WearableProvider;
    syncedAt: Date;
    metrics: {
        steps?: number;
        heartRate?: number;
        sleep?: number;
        calories?: number;
        distance?: number;
        workouts?: number;
    };
    errors?: string[];
}

@Injectable()
export class WearableService {
    private readonly logger = new Logger(WearableService.name);

    // API configurations for each provider
    private readonly providerConfigs: Record<WearableProvider, WearableApiConfig> = {
        [WearableProvider.FITBIT]: {
            authUrl: 'https://www.fitbit.com/oauth2/authorize',
            tokenUrl: 'https://api.fitbit.com/oauth2/token',
            apiBaseUrl: 'https://api.fitbit.com',
            scopes: ['activity', 'heartrate', 'sleep', 'weight', 'profile'],
        },
        [WearableProvider.GOOGLE_FIT]: {
            authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
            tokenUrl: 'https://oauth2.googleapis.com/token',
            apiBaseUrl: 'https://www.googleapis.com/fitness/v1',
            scopes: [
                'https://www.googleapis.com/auth/fitness.activity.read',
                'https://www.googleapis.com/auth/fitness.heart_rate.read',
                'https://www.googleapis.com/auth/fitness.sleep.read',
                'https://www.googleapis.com/auth/fitness.body.read',
            ],
        },
        [WearableProvider.GARMIN]: {
            authUrl: 'https://connect.garmin.com/oauthConfirm',
            tokenUrl: 'https://connectapi.garmin.com/oauth-service/oauth/access_token',
            apiBaseUrl: 'https://apis.garmin.com/wellness-api/rest',
            scopes: ['activity', 'sleep', 'heart_rate'],
        },
        [WearableProvider.STRAVA]: {
            authUrl: 'https://www.strava.com/oauth/authorize',
            tokenUrl: 'https://www.strava.com/oauth/token',
            apiBaseUrl: 'https://www.strava.com/api/v3',
            scopes: ['read', 'activity:read', 'read_all'],
        },
        [WearableProvider.APPLE_HEALTH]: {
            authUrl: '', // Apple Health uses HealthKit, not OAuth
            tokenUrl: '',
            apiBaseUrl: '',
            scopes: [],
        },
        [WearableProvider.SAMSUNG_HEALTH]: {
            authUrl: 'https://account.samsung.com/accounts/v1/SUSMI/signIn',
            tokenUrl: 'https://account.samsung.com/accounts/v1/token',
            apiBaseUrl: 'https://api.samsunghealth.com/v3',
            scopes: ['healthinfo'],
        },
        [WearableProvider.WHOOP]: {
            authUrl: 'https://api.prod.whoop.com/oauth/oauth2/auth',
            tokenUrl: 'https://api.prod.whoop.com/oauth/oauth2/token',
            apiBaseUrl: 'https://api.prod.whoop.com/developer/v1',
            scopes: ['read:recovery', 'read:cycles', 'read:sleep', 'read:workout'],
        },
        [WearableProvider.OURA]: {
            authUrl: 'https://cloud.ouraring.com/oauth/authorize',
            tokenUrl: 'https://api.ouraring.com/oauth/token',
            apiBaseUrl: 'https://api.ouraring.com/v2',
            scopes: ['daily', 'heartrate', 'workout', 'sleep'],
        },
        [WearableProvider.POLAR]: {
            authUrl: 'https://flow.polar.com/oauth2/authorization',
            tokenUrl: 'https://polarremote.com/v2/oauth2/token',
            apiBaseUrl: 'https://www.polaraccesslink.com/v3',
            scopes: ['accesslink.read_all'],
        },
    };

    constructor(private readonly prisma: PrismaService) {}

    // ==========================================
    // Device Connection
    // ==========================================

    getAuthUrl(provider: WearableProvider, redirectUri: string, state: string): string {
        const config = this.providerConfigs[provider];

        if (!config.authUrl) {
            throw new BadRequestException(`Provider ${provider} does not support OAuth authentication`);
        }

        const clientId = this.getClientId(provider);
        const params = new URLSearchParams({
            client_id: clientId,
            redirect_uri: redirectUri,
            response_type: 'code',
            scope: config.scopes.join(' '),
            state,
        });

        return `${config.authUrl}?${params.toString()}`;
    }

    async connectDevice(userId: string, dto: ConnectWearableDto) {
        // Check if device already connected
        const existing = await this.prisma.wearableDevice.findFirst({
            where: { userId, provider: dto.provider },
        });

        if (existing) {
            throw new BadRequestException(`Device ${dto.provider} is already connected`);
        }

        // Exchange auth code for tokens if provided
        let accessToken = dto.accessToken;
        let refreshToken = dto.refreshToken;

        if (dto.authCode && !accessToken) {
            const tokens = await this.exchangeCodeForTokens(dto.provider, dto.authCode);
            accessToken = tokens.accessToken;
            refreshToken = tokens.refreshToken;
        }

        const device = await this.prisma.wearableDevice.create({
            data: {
                userId,
                provider: dto.provider,
                deviceName: dto.deviceName,
                accessToken: accessToken || '',
                refreshToken,
                syncEnabled: true,
                syncWorkouts: true,
                syncHeartRate: true,
                syncSleep: true,
                syncSteps: true,
                syncWeight: true,
            },
        });

        // Initial sync
        await this.syncDevice(userId, device.id);

        this.logger.log(`Connected ${dto.provider} device for user ${userId}`);
        return this.sanitizeDevice(device);
    }

    async getConnectedDevices(userId: string) {
        const devices = await this.prisma.wearableDevice.findMany({
            where: { userId },
            include: {
                syncLogs: {
                    orderBy: { createdAt: 'desc' },
                    take: 5,
                },
            },
        });

        return devices.map(d => this.sanitizeDevice(d));
    }

    async getDevice(userId: string, deviceId: string) {
        const device = await this.prisma.wearableDevice.findFirst({
            where: { id: deviceId, userId },
            include: {
                syncLogs: {
                    orderBy: { createdAt: 'desc' },
                    take: 20,
                },
            },
        });

        if (!device) {
            throw new NotFoundException('Device not found');
        }

        return this.sanitizeDevice(device);
    }

    async updateDeviceSettings(userId: string, deviceId: string, dto: UpdateWearableSettingsDto) {
        await this.getDevice(userId, deviceId);

        const device = await this.prisma.wearableDevice.update({
            where: { id: deviceId },
            data: {
                ...(dto.syncEnabled !== undefined && { syncEnabled: dto.syncEnabled }),
                ...(dto.syncInterval !== undefined && { syncInterval: dto.syncInterval }),
                ...(dto.syncWorkouts !== undefined && { syncWorkouts: dto.syncWorkouts }),
                ...(dto.syncHeartRate !== undefined && { syncHeartRate: dto.syncHeartRate }),
                ...(dto.syncSleep !== undefined && { syncSleep: dto.syncSleep }),
                ...(dto.syncSteps !== undefined && { syncSteps: dto.syncSteps }),
                ...(dto.syncWeight !== undefined && { syncWeight: dto.syncWeight }),
            },
        });

        return this.sanitizeDevice(device);
    }

    async disconnectDevice(userId: string, deviceId: string) {
        await this.getDevice(userId, deviceId);

        // Revoke tokens if possible
        const device = await this.prisma.wearableDevice.findUnique({
            where: { id: deviceId },
        });

        if (device?.accessToken) {
            await this.revokeTokens(device.provider as WearableProvider, device.accessToken);
        }

        await this.prisma.wearableDevice.delete({
            where: { id: deviceId },
        });

        return { message: 'Device disconnected successfully' };
    }

    // ==========================================
    // Data Synchronization
    // ==========================================

    async syncDevice(userId: string, deviceId: string): Promise<SyncResult> {
        const device = await this.prisma.wearableDevice.findFirst({
            where: { id: deviceId, userId },
        });

        if (!device) {
            throw new NotFoundException('Device not found');
        }

        if (!device.syncEnabled) {
            throw new BadRequestException('Sync is disabled for this device');
        }

        // Refresh token if needed
        await this.refreshTokenIfNeeded(device);

        const result: SyncResult = {
            provider: device.provider as WearableProvider,
            syncedAt: new Date(),
            metrics: {},
            errors: [],
        };

        try {
            // Sync based on device settings
            if (device.syncSteps) {
                const steps = await this.syncSteps(device);
                result.metrics.steps = steps;
            }

            if (device.syncHeartRate) {
                const heartRate = await this.syncHeartRate(device);
                result.metrics.heartRate = heartRate;
            }

            if (device.syncSleep) {
                const sleep = await this.syncSleep(device);
                result.metrics.sleep = sleep;
            }

            if (device.syncWorkouts) {
                const workouts = await this.syncWorkouts(device);
                result.metrics.workouts = workouts;
            }

            if (device.syncWeight) {
                const weight = await this.syncWeight(device);
                // weight is synced directly to health metrics
            }

            // Log successful sync
            await this.prisma.wearableSyncLog.create({
                data: {
                    deviceId: device.id,
                    syncType: 'INCREMENTAL',
                    startTime: new Date(),
                    endTime: new Date(),
                    status: 'SUCCESS',
                    itemsSynced: Object.values(result.metrics).reduce((sum, v) => sum + (v || 0), 0),
                },
            });

            // Update last sync time
            await this.prisma.wearableDevice.update({
                where: { id: device.id },
                data: { lastSyncAt: new Date() },
            });

        } catch (error) {
            result.errors?.push(error.message);

            await this.prisma.wearableSyncLog.create({
                data: {
                    deviceId: device.id,
                    syncType: 'INCREMENTAL',
                    startTime: new Date(),
                    status: 'FAILED',
                    errorMessage: error.message,
                },
            });

            this.logger.error(`Sync failed for device ${deviceId}: ${error.message}`);
        }

        return result;
    }

    async syncAllDevices(userId: string): Promise<SyncResult[]> {
        const devices = await this.prisma.wearableDevice.findMany({
            where: { userId, syncEnabled: true },
        });

        const results: SyncResult[] = [];

        for (const device of devices) {
            try {
                const result = await this.syncDevice(userId, device.id);
                results.push(result);
            } catch (error) {
                results.push({
                    provider: device.provider as WearableProvider,
                    syncedAt: new Date(),
                    metrics: {},
                    errors: [error.message],
                });
            }
        }

        return results;
    }

    // Scheduled sync for all users
    @Cron(CronExpression.EVERY_30_MINUTES)
    async scheduledSync() {
        const devices = await this.prisma.wearableDevice.findMany({
            where: { syncEnabled: true },
        });

        for (const device of devices) {
            // Check if sync interval has passed
            const lastSync = device.lastSyncAt;
            const intervalMs = (device.syncInterval || 30) * 60 * 1000;

            if (lastSync && Date.now() - lastSync.getTime() < intervalMs) {
                continue;
            }

            try {
                await this.syncDevice(device.userId, device.id);
            } catch (error) {
                this.logger.error(`Scheduled sync failed for device ${device.id}: ${error.message}`);
            }
        }
    }

    // ==========================================
    // Provider-Specific Sync Methods
    // ==========================================

    private async syncSteps(device: any): Promise<number> {
        const provider = device.provider as WearableProvider;
        const today = new Date().toISOString().slice(0, 10);

        switch (provider) {
            case WearableProvider.FITBIT:
                return this.syncFitbitSteps(device, today);
            case WearableProvider.GOOGLE_FIT:
                return this.syncGoogleFitSteps(device, today);
            case WearableProvider.GARMIN:
                return this.syncGarminSteps(device, today);
            case WearableProvider.WHOOP:
            case WearableProvider.OURA:
            case WearableProvider.POLAR:
                return this.syncGenericSteps(device, today);
            default:
                return 0;
        }
    }

    private async syncFitbitSteps(device: any, date: string): Promise<number> {
        const response = await this.makeApiRequest(
            device,
            `/1/user/-/activities/date/${date}.json`
        );

        if (response?.summary?.steps) {
            await this.createHealthMetric(device.userId, {
                type: HealthMetricType.STEPS,
                value: response.summary.steps,
                unit: 'steps',
                source: 'FITBIT',
            });
            return response.summary.steps;
        }
        return 0;
    }

    private async syncGoogleFitSteps(device: any, date: string): Promise<number> {
        const startTime = new Date(date);
        startTime.setHours(0, 0, 0, 0);
        const endTime = new Date(date);
        endTime.setHours(23, 59, 59, 999);

        const response = await this.makeApiRequest(
            device,
            `/users/me/dataset:aggregate`,
            'POST',
            {
                aggregateBy: [{
                    dataTypeName: 'com.google.step_count.delta',
                    dataSourceId: 'derived:com.google.step_count.delta:com.google.android.gms:estimated_steps',
                }],
                bucketByTime: { durationMillis: 86400000 },
                startTimeMillis: startTime.getTime(),
                endTimeMillis: endTime.getTime(),
            }
        );

        if (response?.bucket?.[0]?.dataset?.[0]?.point?.[0]?.value?.[0]?.intVal) {
            const steps = response.bucket[0].dataset[0].point[0].value[0].intVal;
            await this.createHealthMetric(device.userId, {
                type: HealthMetricType.STEPS,
                value: steps,
                unit: 'steps',
                source: 'GOOGLE_FIT',
            });
            return steps;
        }
        return 0;
    }

    private async syncGarminSteps(device: any, date: string): Promise<number> {
        const response = await this.makeApiRequest(
            device,
            `/dailies?uploadStartTimeInSeconds=${Math.floor(new Date(date).getTime() / 1000)}`
        );

        if (response?.[0]?.steps) {
            await this.createHealthMetric(device.userId, {
                type: HealthMetricType.STEPS,
                value: response[0].steps,
                unit: 'steps',
                source: 'GARMIN',
            });
            return response[0].steps;
        }
        return 0;
    }

    private async syncGenericSteps(device: any, date: string): Promise<number> {
        // Generic implementation for other providers
        this.logger.warn(`Steps sync not fully implemented for ${device.provider}`);
        return 0;
    }

    private async syncHeartRate(device: any): Promise<number> {
        const provider = device.provider as WearableProvider;
        const today = new Date().toISOString().slice(0, 10);

        switch (provider) {
            case WearableProvider.FITBIT:
                return this.syncFitbitHeartRate(device, today);
            case WearableProvider.GOOGLE_FIT:
                return this.syncGoogleFitHeartRate(device, today);
            case WearableProvider.OURA:
                return this.syncOuraHeartRate(device, today);
            case WearableProvider.WHOOP:
                return this.syncWhoopHeartRate(device, today);
            default:
                return 0;
        }
    }

    private async syncFitbitHeartRate(device: any, date: string): Promise<number> {
        const response = await this.makeApiRequest(
            device,
            `/1/user/-/activities/heart/date/${date}/1d.json`
        );

        if (response?.['activities-heart']?.[0]?.value?.restingHeartRate) {
            const hr = response['activities-heart'][0].value.restingHeartRate;
            await this.createHealthMetric(device.userId, {
                type: HealthMetricType.HEART_RATE,
                value: hr,
                unit: 'bpm',
                source: 'FITBIT',
            });
            return hr;
        }
        return 0;
    }

    private async syncGoogleFitHeartRate(device: any, date: string): Promise<number> {
        // Similar to steps but for heart rate data type
        this.logger.warn('Google Fit heart rate sync - using placeholder');
        return 0;
    }

    private async syncOuraHeartRate(device: any, date: string): Promise<number> {
        const response = await this.makeApiRequest(
            device,
            `/usercollection/heartrate?start_date=${date}&end_date=${date}`
        );

        if (response?.data?.length > 0) {
            const avgHr = response.data.reduce((sum: number, d: any) => sum + d.bpm, 0) / response.data.length;
            await this.createHealthMetric(device.userId, {
                type: HealthMetricType.HEART_RATE,
                value: Math.round(avgHr),
                unit: 'bpm',
                source: 'OURA',
            });
            return Math.round(avgHr);
        }
        return 0;
    }

    private async syncWhoopHeartRate(device: any, date: string): Promise<number> {
        const response = await this.makeApiRequest(
            device,
            `/recovery?start=${date}&end=${date}`
        );

        if (response?.records?.[0]?.score?.resting_heart_rate) {
            const hr = response.records[0].score.resting_heart_rate;
            await this.createHealthMetric(device.userId, {
                type: HealthMetricType.HEART_RATE,
                value: hr,
                unit: 'bpm',
                source: 'WHOOP',
            });
            return hr;
        }
        return 0;
    }

    private async syncSleep(device: any): Promise<number> {
        const provider = device.provider as WearableProvider;
        const today = new Date().toISOString().slice(0, 10);

        switch (provider) {
            case WearableProvider.FITBIT:
                return this.syncFitbitSleep(device, today);
            case WearableProvider.OURA:
                return this.syncOuraSleep(device, today);
            case WearableProvider.WHOOP:
                return this.syncWhoopSleep(device, today);
            default:
                return 0;
        }
    }

    private async syncFitbitSleep(device: any, date: string): Promise<number> {
        const response = await this.makeApiRequest(
            device,
            `/1.2/user/-/sleep/date/${date}.json`
        );

        if (response?.summary?.totalMinutesAsleep) {
            const hours = response.summary.totalMinutesAsleep / 60;
            await this.createHealthMetric(device.userId, {
                type: HealthMetricType.SLEEP,
                value: Math.round(hours * 10) / 10,
                unit: 'hours',
                source: 'FITBIT',
            });
            return response.summary.totalMinutesAsleep;
        }
        return 0;
    }

    private async syncOuraSleep(device: any, date: string): Promise<number> {
        const response = await this.makeApiRequest(
            device,
            `/usercollection/sleep?start_date=${date}&end_date=${date}`
        );

        if (response?.data?.[0]?.total_sleep_duration) {
            const hours = response.data[0].total_sleep_duration / 3600;
            await this.createHealthMetric(device.userId, {
                type: HealthMetricType.SLEEP,
                value: Math.round(hours * 10) / 10,
                unit: 'hours',
                source: 'OURA',
            });
            return response.data[0].total_sleep_duration / 60;
        }
        return 0;
    }

    private async syncWhoopSleep(device: any, date: string): Promise<number> {
        const response = await this.makeApiRequest(
            device,
            `/sleep?start=${date}&end=${date}`
        );

        if (response?.records?.[0]?.score?.stage_summary?.total_in_bed_time_milli) {
            const hours = response.records[0].score.stage_summary.total_in_bed_time_milli / 3600000;
            await this.createHealthMetric(device.userId, {
                type: HealthMetricType.SLEEP,
                value: Math.round(hours * 10) / 10,
                unit: 'hours',
                source: 'WHOOP',
            });
            return response.records[0].score.stage_summary.total_in_bed_time_milli / 60000;
        }
        return 0;
    }

    private async syncWorkouts(device: any): Promise<number> {
        const provider = device.provider as WearableProvider;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 7);

        switch (provider) {
            case WearableProvider.FITBIT:
                return this.syncFitbitWorkouts(device, startDate);
            case WearableProvider.STRAVA:
                return this.syncStravaWorkouts(device, startDate);
            case WearableProvider.GARMIN:
                return this.syncGarminWorkouts(device, startDate);
            default:
                return 0;
        }
    }

    private async syncFitbitWorkouts(device: any, startDate: Date): Promise<number> {
        const response = await this.makeApiRequest(
            device,
            `/1/user/-/activities/list.json?afterDate=${startDate.toISOString().slice(0, 10)}&sort=asc&limit=20&offset=0`
        );

        if (response?.activities?.length > 0) {
            for (const activity of response.activities) {
                await this.createWorkoutFromWearable(device.userId, {
                    name: activity.activityName,
                    startTime: activity.startTime,
                    duration: activity.duration / 60000, // Convert to minutes
                    calories: activity.calories,
                    distance: activity.distance,
                    avgHeartRate: activity.averageHeartRate,
                    source: 'FITBIT',
                    externalId: activity.logId.toString(),
                });
            }
            return response.activities.length;
        }
        return 0;
    }

    private async syncStravaWorkouts(device: any, startDate: Date): Promise<number> {
        const response = await this.makeApiRequest(
            device,
            `/athlete/activities?after=${Math.floor(startDate.getTime() / 1000)}&per_page=30`
        );

        if (response?.length > 0) {
            for (const activity of response) {
                await this.createWorkoutFromWearable(device.userId, {
                    name: activity.name,
                    startTime: activity.start_date,
                    duration: activity.elapsed_time / 60, // Convert to minutes
                    calories: activity.kilojoules ? Math.round(activity.kilojoules * 0.239) : null,
                    distance: activity.distance / 1000, // Convert to km
                    avgHeartRate: activity.average_heartrate,
                    source: 'STRAVA',
                    externalId: activity.id.toString(),
                });
            }
            return response.length;
        }
        return 0;
    }

    private async syncGarminWorkouts(device: any, startDate: Date): Promise<number> {
        const response = await this.makeApiRequest(
            device,
            `/activities?uploadStartTimeInSeconds=${Math.floor(startDate.getTime() / 1000)}`
        );

        if (response?.length > 0) {
            for (const activity of response) {
                await this.createWorkoutFromWearable(device.userId, {
                    name: activity.activityName || activity.activityType,
                    startTime: new Date(activity.startTimeInSeconds * 1000).toISOString(),
                    duration: activity.durationInSeconds / 60,
                    calories: activity.activeKilocalories,
                    distance: activity.distanceInMeters / 1000,
                    avgHeartRate: activity.averageHeartRateInBeatsPerMinute,
                    source: 'GARMIN',
                    externalId: activity.activityId,
                });
            }
            return response.length;
        }
        return 0;
    }

    private async syncWeight(device: any): Promise<void> {
        const provider = device.provider as WearableProvider;
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);

        let weight: number | null = null;

        switch (provider) {
            case WearableProvider.FITBIT:
                const fitbitResponse = await this.makeApiRequest(
                    device,
                    `/1/user/-/body/log/weight/date/${startDate.toISOString().slice(0, 10)}/${endDate.toISOString().slice(0, 10)}.json`
                );
                if (fitbitResponse?.weight?.length > 0) {
                    const latest = fitbitResponse.weight[fitbitResponse.weight.length - 1];
                    weight = latest.weight;
                }
                break;

            case WearableProvider.GOOGLE_FIT:
                // Google Fit weight sync
                break;

            case WearableProvider.OURA:
                // Oura doesn't typically track weight
                break;
        }

        if (weight) {
            await this.createHealthMetric(device.userId, {
                type: HealthMetricType.WEIGHT,
                value: weight,
                unit: 'kg',
                source: provider,
            });
        }
    }

    // ==========================================
    // Sync Statistics
    // ==========================================

    async getSyncHistory(userId: string, deviceId: string, limit = 50) {
        await this.getDevice(userId, deviceId);

        const logs = await this.prisma.wearableSyncLog.findMany({
            where: { deviceId },
            orderBy: { createdAt: 'desc' },
            take: limit,
        });

        return logs;
    }

    async getSyncStats(userId: string) {
        const devices = await this.prisma.wearableDevice.findMany({
            where: { userId },
            include: {
                syncLogs: {
                    where: {
                        createdAt: {
                            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
                        },
                    },
                },
            },
        });

        return devices.map(device => {
            const successfulSyncs = device.syncLogs.filter(l => l.status === 'SUCCESS').length;
            const failedSyncs = device.syncLogs.filter(l => l.status === 'FAILED').length;
            const totalRecords = device.syncLogs.reduce((sum, l) => sum + (l.itemsSynced || 0), 0);

            return {
                deviceId: device.id,
                provider: device.provider,
                lastSync: device.lastSyncAt,
                stats: {
                    totalSyncs: device.syncLogs.length,
                    successfulSyncs,
                    failedSyncs,
                    successRate: device.syncLogs.length > 0
                        ? Math.round((successfulSyncs / device.syncLogs.length) * 100)
                        : 0,
                    totalRecordsSynced: totalRecords,
                },
            };
        });
    }

    // ==========================================
    // Helpers
    // ==========================================

    private async makeApiRequest(device: any, endpoint: string, method = 'GET', body?: any): Promise<any> {
        const config = this.providerConfigs[device.provider as WearableProvider];
        const url = `${config.apiBaseUrl}${endpoint}`;

        try {
            const response = await fetch(url, {
                method,
                headers: {
                    'Authorization': `Bearer ${device.accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: body ? JSON.stringify(body) : undefined,
            });

            if (!response.ok) {
                if (response.status === 401) {
                    // Token expired, try to refresh
                    await this.refreshTokenIfNeeded(device, true);
                    return this.makeApiRequest(device, endpoint, method, body);
                }
                throw new Error(`API request failed: ${response.status} ${response.statusText}`);
            }

            return response.json();
        } catch (error) {
            this.logger.error(`API request to ${url} failed: ${error.message}`);
            throw error;
        }
    }

    private async exchangeCodeForTokens(provider: WearableProvider, code: string): Promise<{
        accessToken: string;
        refreshToken?: string;
    }> {
        const config = this.providerConfigs[provider];
        const clientId = this.getClientId(provider);
        const clientSecret = this.getClientSecret(provider);

        const response = await fetch(config.tokenUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
            },
            body: new URLSearchParams({
                grant_type: 'authorization_code',
                code,
                redirect_uri: process.env.WEARABLE_REDIRECT_URI || '',
            }),
        });

        if (!response.ok) {
            throw new BadRequestException('Failed to exchange authorization code');
        }

        const data = await response.json();
        return {
            accessToken: data.access_token,
            refreshToken: data.refresh_token,
        };
    }

    private async refreshTokenIfNeeded(device: any, force = false): Promise<void> {
        if (!device.refreshToken) return;

        // Check if token needs refresh (expires in less than 5 minutes)
        const needsRefresh = force || !device.tokenExpiry ||
            new Date(device.tokenExpiry).getTime() < Date.now() + 5 * 60 * 1000;

        if (!needsRefresh) return;

        const config = this.providerConfigs[device.provider as WearableProvider];
        const clientId = this.getClientId(device.provider);
        const clientSecret = this.getClientSecret(device.provider);

        try {
            const response = await fetch(config.tokenUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
                },
                body: new URLSearchParams({
                    grant_type: 'refresh_token',
                    refresh_token: device.refreshToken,
                }),
            });

            if (response.ok) {
                const data = await response.json();
                await this.prisma.wearableDevice.update({
                    where: { id: device.id },
                    data: {
                        accessToken: data.access_token,
                        refreshToken: data.refresh_token || device.refreshToken,
                        tokenExpiry: data.expires_in
                            ? new Date(Date.now() + data.expires_in * 1000)
                            : null,
                    },
                });
                device.accessToken = data.access_token;
            }
        } catch (error) {
            this.logger.error(`Token refresh failed for device ${device.id}: ${error.message}`);
        }
    }

    private async revokeTokens(provider: WearableProvider, accessToken: string): Promise<void> {
        // Provider-specific token revocation
        try {
            switch (provider) {
                case WearableProvider.FITBIT:
                    await fetch('https://api.fitbit.com/oauth2/revoke', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                        body: `token=${accessToken}`,
                    });
                    break;
                // Add other providers as needed
            }
        } catch (error) {
            this.logger.warn(`Token revocation failed for ${provider}: ${error.message}`);
        }
    }

    private async createHealthMetric(userId: string, data: {
        type: HealthMetricType;
        value: number;
        unit: string;
        source: string;
    }): Promise<void> {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Check if metric already exists for today from same source
        const existing = await this.prisma.healthMetric.findFirst({
            where: {
                userId,
                type: data.type,
                source: data.source,
                measuredAt: { gte: today },
            },
        });

        if (existing) {
            // Update existing metric
            await this.prisma.healthMetric.update({
                where: { id: existing.id },
                data: { value: data.value },
            });
        } else {
            // Create new metric
            await this.prisma.healthMetric.create({
                data: {
                    userId,
                    type: data.type,
                    value: data.value,
                    unit: data.unit,
                    source: data.source,
                    measuredAt: new Date(),
                },
            });
        }
    }

    private async createWorkoutFromWearable(userId: string, data: {
        name: string;
        startTime: string;
        duration: number;
        calories?: number | null;
        distance?: number | null;
        avgHeartRate?: number | null;
        source: string;
        externalId: string;
    }): Promise<void> {
        // Check if workout already synced
        const existing = await this.prisma.workout.findFirst({
            where: {
                userId,
                externalId: data.externalId,
            },
        });

        if (existing) return;

        // Find or create generic exercise type
        let exerciseType = await this.prisma.exerciseType.findFirst({
            where: { name: 'Wearable Activity', isSystem: true },
        });

        if (!exerciseType) {
            exerciseType = await this.prisma.exerciseType.create({
                data: {
                    name: 'Wearable Activity',
                    category: 'OTHER',
                    isSystem: true,
                    tracksDuration: true,
                    tracksCalories: true,
                    tracksDistance: true,
                    tracksHeartRate: true,
                },
            });
        }

        await this.prisma.workout.create({
            data: {
                userId,
                exerciseTypeId: exerciseType.id,
                name: data.name,
                startTime: new Date(data.startTime),
                duration: Math.round(data.duration),
                calories: data.calories,
                distance: data.distance,
                avgHeartRate: data.avgHeartRate,
                source: data.source,
                externalId: data.externalId,
            },
        });
    }

    private getClientId(provider: WearableProvider): string {
        const envKey = `${provider}_CLIENT_ID`;
        return process.env[envKey] || '';
    }

    private getClientSecret(provider: WearableProvider): string {
        const envKey = `${provider}_CLIENT_SECRET`;
        return process.env[envKey] || '';
    }

    private sanitizeDevice(device: any): any {
        const { accessToken, refreshToken, ...safe } = device;
        return {
            ...safe,
            isConnected: !!accessToken,
        };
    }
}
