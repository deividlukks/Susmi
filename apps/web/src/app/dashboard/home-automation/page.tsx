'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
    Home, Lightbulb, Thermometer, Lock, Camera, Speaker,
    Tv, Fan, Power, Plus, X, Settings, Play, Pause,
    Sun, Moon, Coffee, Bed, ChevronRight, Zap, Activity
} from 'lucide-react';
import styles from './page.module.css';
import { apiClient } from '@/lib/api-client';

interface Device {
    id: string;
    name: string;
    type: 'light' | 'thermostat' | 'lock' | 'camera' | 'speaker' | 'tv' | 'fan' | 'switch' | 'sensor';
    room: string;
    isOnline: boolean;
    state: Record<string, any>;
    lastUpdated?: string;
}

interface Scene {
    id: string;
    name: string;
    icon: string;
    devices: { deviceId: string; state: Record<string, any> }[];
    isActive: boolean;
}

interface Room {
    id: string;
    name: string;
    icon: string;
    deviceCount: number;
}

interface Routine {
    id: string;
    name: string;
    trigger: { type: 'time' | 'device' | 'location'; value: string };
    actions: { deviceId: string; action: string; value: any }[];
    isEnabled: boolean;
}

type Tab = 'overview' | 'devices' | 'scenes' | 'routines';

export default function HomeAutomationPage() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<Tab>('overview');
    const [loading, setLoading] = useState(true);
    const [devices, setDevices] = useState<Device[]>([]);
    const [scenes, setScenes] = useState<Scene[]>([]);
    const [rooms, setRooms] = useState<Room[]>([]);
    const [routines, setRoutines] = useState<Routine[]>([]);
    const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
    const [showDeviceModal, setShowDeviceModal] = useState(false);
    const [showSceneModal, setShowSceneModal] = useState(false);
    const [editingDevice, setEditingDevice] = useState<Device | null>(null);

    /**
     * Home Automation Page - Refatorado com DRY
     *
     * ELIMINA DUPLICAÇÃO: Usa apiClient em vez de getHeaders duplicado
     */
    const fetchData = useCallback(async () => {
        try {
            const [devicesData, scenesData, roomsData, routinesData] = await Promise.all([
                apiClient.get<any>('/home/devices'),
                apiClient.get<any>('/home/scenes'),
                apiClient.get<any>('/home/rooms'),
                apiClient.get<any>('/home/routines'),
            ]);

            setDevices(Array.isArray(devicesData) ? devicesData : devicesData.data || []);
            setScenes(Array.isArray(scenesData) ? scenesData : scenesData.data || []);
            setRooms(Array.isArray(roomsData) ? roomsData : roomsData.data || []);
            setRoutines(Array.isArray(routinesData) ? routinesData : routinesData.data || []);
        } catch (error) {
            console.error('Erro ao carregar dados:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleToggleDevice = async (deviceId: string, currentState: boolean) => {
        try {
            await apiClient.post(`/home/devices/${deviceId}/toggle`, { state: !currentState });
            fetchData();
        } catch (error) {
            console.error('Erro ao alternar dispositivo:', error);
        }
    };

    const handleUpdateDevice = async (deviceId: string, state: Record<string, any>) => {
        try {
            await apiClient.put(`/home/devices/${deviceId}/state`, state);
            fetchData();
        } catch (error) {
            console.error('Erro ao atualizar dispositivo:', error);
        }
    };

    const handleActivateScene = async (sceneId: string) => {
        try {
            await apiClient.post(`/home/scenes/${sceneId}/activate`, {});
            fetchData();
        } catch (error) {
            console.error('Erro ao ativar cena:', error);
        }
    };

    const handleToggleRoutine = async (routineId: string, isEnabled: boolean) => {
        try {
            await apiClient.patch(`/home/routines/${routineId}`, { isEnabled: !isEnabled });
            fetchData();
        } catch (error) {
            console.error('Erro ao alternar rotina:', error);
        }
    };

    const handleAddDevice = async (data: any) => {
        try {
            await apiClient.post('/home/devices', data);
            fetchData();
            setShowDeviceModal(false);
        } catch (error) {
            console.error('Erro ao adicionar dispositivo:', error);
        }
    };

    const getDeviceIcon = (type: Device['type']) => {
        switch (type) {
            case 'light': return Lightbulb;
            case 'thermostat': return Thermometer;
            case 'lock': return Lock;
            case 'camera': return Camera;
            case 'speaker': return Speaker;
            case 'tv': return Tv;
            case 'fan': return Fan;
            case 'switch': return Power;
            case 'sensor': return Activity;
            default: return Power;
        }
    };

    const getSceneIcon = (icon: string) => {
        switch (icon) {
            case 'sun': return Sun;
            case 'moon': return Moon;
            case 'coffee': return Coffee;
            case 'bed': return Bed;
            case 'home': return Home;
            default: return Zap;
        }
    };

    const filteredDevices = selectedRoom
        ? devices.filter(d => d.room === selectedRoom)
        : devices;

    const stats = {
        totalDevices: devices.length,
        onlineDevices: devices.filter(d => d.isOnline).length,
        activeScenes: scenes.filter(s => s.isActive).length,
        activeRoutines: routines.filter(r => r.isEnabled).length,
    };

    const tabs = [
        { id: 'overview' as Tab, label: 'Visão Geral', icon: Home },
        { id: 'devices' as Tab, label: 'Dispositivos', icon: Power },
        { id: 'scenes' as Tab, label: 'Cenas', icon: Zap },
        { id: 'routines' as Tab, label: 'Rotinas', icon: Activity },
    ];

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div>
                    <h1>Casa Inteligente</h1>
                    <p>Controle seus dispositivos e automações</p>
                </div>
                <button
                    className={styles.addButton}
                    onClick={() => setShowDeviceModal(true)}
                >
                    <Plus size={20} />
                    Adicionar Dispositivo
                </button>
            </header>

            <div className={styles.statsGrid}>
                <div className={styles.statCard}>
                    <div className={`${styles.statIcon} ${styles.blue}`}>
                        <Power size={24} />
                    </div>
                    <div className={styles.statInfo}>
                        <span className={styles.statValue}>{stats.totalDevices}</span>
                        <span className={styles.statLabel}>Dispositivos</span>
                    </div>
                </div>
                <div className={styles.statCard}>
                    <div className={`${styles.statIcon} ${styles.green}`}>
                        <Activity size={24} />
                    </div>
                    <div className={styles.statInfo}>
                        <span className={styles.statValue}>{stats.onlineDevices}</span>
                        <span className={styles.statLabel}>Online</span>
                    </div>
                </div>
                <div className={styles.statCard}>
                    <div className={`${styles.statIcon} ${styles.purple}`}>
                        <Zap size={24} />
                    </div>
                    <div className={styles.statInfo}>
                        <span className={styles.statValue}>{stats.activeScenes}</span>
                        <span className={styles.statLabel}>Cenas Ativas</span>
                    </div>
                </div>
                <div className={styles.statCard}>
                    <div className={`${styles.statIcon} ${styles.orange}`}>
                        <Settings size={24} />
                    </div>
                    <div className={styles.statInfo}>
                        <span className={styles.statValue}>{stats.activeRoutines}</span>
                        <span className={styles.statLabel}>Rotinas Ativas</span>
                    </div>
                </div>
            </div>

            <div className={styles.tabs}>
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        className={`${styles.tab} ${activeTab === tab.id ? styles.active : ''}`}
                        onClick={() => setActiveTab(tab.id)}
                    >
                        <tab.icon size={18} />
                        {tab.label}
                    </button>
                ))}
            </div>

            <div className={styles.tabContent}>
                {activeTab === 'overview' && (
                    <div className={styles.overviewGrid}>
                        <div className={styles.section}>
                            <div className={styles.sectionHeader}>
                                <h2>Cômodos</h2>
                            </div>
                            <div className={styles.roomsGrid}>
                                {rooms.length === 0 ? (
                                    <div className={styles.emptyText}>Nenhum cômodo configurado</div>
                                ) : (
                                    rooms.map(room => (
                                        <div
                                            key={room.id}
                                            className={`${styles.roomCard} ${selectedRoom === room.id ? styles.selected : ''}`}
                                            onClick={() => setSelectedRoom(selectedRoom === room.id ? null : room.id)}
                                        >
                                            <Home size={24} />
                                            <span className={styles.roomName}>{room.name}</span>
                                            <span className={styles.roomDevices}>{room.deviceCount} dispositivos</span>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        <div className={styles.section}>
                            <div className={styles.sectionHeader}>
                                <h2>Cenas Rápidas</h2>
                            </div>
                            <div className={styles.scenesQuickGrid}>
                                {scenes.slice(0, 4).map(scene => {
                                    const Icon = getSceneIcon(scene.icon);
                                    return (
                                        <button
                                            key={scene.id}
                                            className={`${styles.sceneQuickCard} ${scene.isActive ? styles.active : ''}`}
                                            onClick={() => handleActivateScene(scene.id)}
                                        >
                                            <Icon size={24} />
                                            <span>{scene.name}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div className={styles.section}>
                            <div className={styles.sectionHeader}>
                                <h2>Dispositivos Favoritos</h2>
                            </div>
                            <div className={styles.devicesList}>
                                {filteredDevices.slice(0, 5).map(device => {
                                    const Icon = getDeviceIcon(device.type);
                                    const isOn = device.state?.isOn || device.state?.power;
                                    return (
                                        <div key={device.id} className={styles.deviceItem}>
                                            <div className={`${styles.deviceIcon} ${isOn ? styles.on : ''}`}>
                                                <Icon size={20} />
                                            </div>
                                            <div className={styles.deviceInfo}>
                                                <span className={styles.deviceName}>{device.name}</span>
                                                <span className={styles.deviceRoom}>{device.room}</span>
                                            </div>
                                            <button
                                                className={`${styles.toggleBtn} ${isOn ? styles.on : ''}`}
                                                onClick={() => handleToggleDevice(device.id, isOn)}
                                            >
                                                <Power size={18} />
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'devices' && (
                    <div className={styles.devicesLayout}>
                        <div className={styles.roomFilter}>
                            <button
                                className={`${styles.roomFilterBtn} ${!selectedRoom ? styles.active : ''}`}
                                onClick={() => setSelectedRoom(null)}
                            >
                                Todos
                            </button>
                            {rooms.map(room => (
                                <button
                                    key={room.id}
                                    className={`${styles.roomFilterBtn} ${selectedRoom === room.id ? styles.active : ''}`}
                                    onClick={() => setSelectedRoom(room.id)}
                                >
                                    {room.name}
                                </button>
                            ))}
                        </div>

                        <div className={styles.devicesGrid}>
                            {filteredDevices.map(device => {
                                const Icon = getDeviceIcon(device.type);
                                const isOn = device.state?.isOn || device.state?.power;
                                return (
                                    <div
                                        key={device.id}
                                        className={`${styles.deviceCard} ${isOn ? styles.on : ''} ${!device.isOnline ? styles.offline : ''}`}
                                    >
                                        <div className={styles.deviceCardHeader}>
                                            <div className={styles.deviceCardIcon}>
                                                <Icon size={24} />
                                            </div>
                                            <button
                                                className={`${styles.powerBtn} ${isOn ? styles.on : ''}`}
                                                onClick={() => handleToggleDevice(device.id, isOn)}
                                                disabled={!device.isOnline}
                                            >
                                                <Power size={18} />
                                            </button>
                                        </div>
                                        <h3>{device.name}</h3>
                                        <span className={styles.deviceCardRoom}>{device.room}</span>
                                        {device.type === 'thermostat' && device.state?.temperature && (
                                            <div className={styles.deviceStatus}>
                                                <Thermometer size={16} />
                                                {device.state.temperature}°C
                                            </div>
                                        )}
                                        {device.type === 'light' && device.state?.brightness && (
                                            <div className={styles.brightnessControl}>
                                                <input
                                                    type="range"
                                                    min="0"
                                                    max="100"
                                                    value={device.state.brightness}
                                                    onChange={e => handleUpdateDevice(device.id, {
                                                        ...device.state,
                                                        brightness: parseInt(e.target.value)
                                                    })}
                                                />
                                                <span>{device.state.brightness}%</span>
                                            </div>
                                        )}
                                        {!device.isOnline && (
                                            <span className={styles.offlineTag}>Offline</span>
                                        )}
                                    </div>
                                );
                            })}
                            <button className={styles.addDeviceCard} onClick={() => setShowDeviceModal(true)}>
                                <Plus size={32} />
                                <span>Adicionar Dispositivo</span>
                            </button>
                        </div>
                    </div>
                )}

                {activeTab === 'scenes' && (
                    <div className={styles.scenesGrid}>
                        {scenes.map(scene => {
                            const Icon = getSceneIcon(scene.icon);
                            return (
                                <div
                                    key={scene.id}
                                    className={`${styles.sceneCard} ${scene.isActive ? styles.active : ''}`}
                                >
                                    <div className={styles.sceneCardHeader}>
                                        <div className={styles.sceneIcon}>
                                            <Icon size={28} />
                                        </div>
                                        <button
                                            className={styles.activateBtn}
                                            onClick={() => handleActivateScene(scene.id)}
                                        >
                                            {scene.isActive ? <Pause size={18} /> : <Play size={18} />}
                                        </button>
                                    </div>
                                    <h3>{scene.name}</h3>
                                    <span className={styles.sceneDevices}>
                                        {scene.devices.length} dispositivos
                                    </span>
                                </div>
                            );
                        })}
                        <button className={styles.addSceneCard} onClick={() => setShowSceneModal(true)}>
                            <Plus size={32} />
                            <span>Criar Cena</span>
                        </button>
                    </div>
                )}

                {activeTab === 'routines' && (
                    <div className={styles.routinesList}>
                        {routines.length === 0 ? (
                            <div className={styles.emptyState}>
                                <Activity size={48} />
                                <p>Nenhuma rotina configurada</p>
                                <button className={styles.addButton}>
                                    <Plus size={20} />
                                    Criar Rotina
                                </button>
                            </div>
                        ) : (
                            routines.map(routine => (
                                <div key={routine.id} className={styles.routineCard}>
                                    <div className={styles.routineInfo}>
                                        <div className={styles.routineIcon}>
                                            <Activity size={24} />
                                        </div>
                                        <div>
                                            <h3>{routine.name}</h3>
                                            <span className={styles.routineTrigger}>
                                                {routine.trigger.type === 'time' ? `Às ${routine.trigger.value}` :
                                                 routine.trigger.type === 'device' ? 'Quando dispositivo ativar' :
                                                 'Por localização'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className={styles.routineActions}>
                                        <span className={styles.actionCount}>
                                            {routine.actions.length} ações
                                        </span>
                                        <label className={styles.toggleSwitch}>
                                            <input
                                                type="checkbox"
                                                checked={routine.isEnabled}
                                                onChange={() => handleToggleRoutine(routine.id, routine.isEnabled)}
                                            />
                                            <span className={styles.slider}></span>
                                        </label>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>

            {showDeviceModal && (
                <AddDeviceModal
                    rooms={rooms}
                    onClose={() => setShowDeviceModal(false)}
                    onSave={handleAddDevice}
                />
            )}
        </div>
    );
}

function AddDeviceModal({ rooms, onClose, onSave }: {
    rooms: Room[];
    onClose: () => void;
    onSave: (data: Partial<Device>) => void;
}) {
    const [name, setName] = useState('');
    const [type, setType] = useState<Device['type']>('light');
    const [room, setRoom] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({ name, type, room, state: {}, isOnline: true });
    };

    return (
        <div className={styles.modalOverlay} onClick={onClose}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
                <div className={styles.modalHeader}>
                    <h2>Adicionar Dispositivo</h2>
                    <button onClick={onClose}><X size={20} /></button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className={styles.modalBody}>
                        <div className={styles.formGroup}>
                            <label>Nome do Dispositivo</label>
                            <input
                                type="text"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                placeholder="Ex: Luz da Sala"
                                required
                            />
                        </div>
                        <div className={styles.formGroup}>
                            <label>Tipo</label>
                            <select value={type} onChange={e => setType(e.target.value as Device['type'])}>
                                <option value="light">Luz</option>
                                <option value="thermostat">Termostato</option>
                                <option value="lock">Fechadura</option>
                                <option value="camera">Câmera</option>
                                <option value="speaker">Alto-falante</option>
                                <option value="tv">TV</option>
                                <option value="fan">Ventilador</option>
                                <option value="switch">Interruptor</option>
                                <option value="sensor">Sensor</option>
                            </select>
                        </div>
                        <div className={styles.formGroup}>
                            <label>Cômodo</label>
                            <select value={room} onChange={e => setRoom(e.target.value)} required>
                                <option value="">Selecione um cômodo</option>
                                {rooms.map(r => (
                                    <option key={r.id} value={r.name}>{r.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div className={styles.modalFooter}>
                        <button type="button" onClick={onClose} className={styles.btnSecondary}>
                            Cancelar
                        </button>
                        <button type="submit" className={styles.btnPrimary}>
                            <Plus size={18} />
                            Adicionar
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
