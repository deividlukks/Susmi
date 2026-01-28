// Home Automation Enums - Sincronizado com backend
export enum DeviceType {
  LIGHT = 'LIGHT',
  SWITCH = 'SWITCH',
  THERMOSTAT = 'THERMOSTAT',
  LOCK = 'LOCK',
  CAMERA = 'CAMERA',
  SENSOR = 'SENSOR',
  SPEAKER = 'SPEAKER',
  TV = 'TV',
  FAN = 'FAN',
  BLINDS = 'BLINDS',
  OUTLET = 'OUTLET',
  OTHER = 'OTHER',
}

export enum RoomType {
  LIVING_ROOM = 'LIVING_ROOM',
  BEDROOM = 'BEDROOM',
  KITCHEN = 'KITCHEN',
  BATHROOM = 'BATHROOM',
  OFFICE = 'OFFICE',
  GARAGE = 'GARAGE',
  OUTDOOR = 'OUTDOOR',
  OTHER = 'OTHER',
}

export enum DeviceProtocol {
  WIFI = 'WIFI',
  ZIGBEE = 'ZIGBEE',
  ZWAVE = 'ZWAVE',
  BLUETOOTH = 'BLUETOOTH',
  MQTT = 'MQTT',
  HTTP = 'HTTP',
}

export enum DeviceStatus {
  ONLINE = 'ONLINE',
  OFFLINE = 'OFFLINE',
  ERROR = 'ERROR',
}

export enum IntegrationProvider {
  TUYA = 'tuya',
  PHILIPS_HUE = 'philips_hue',
  TASMOTA = 'tasmota',
  ESPHOME = 'esphome',
  HOMEASSISTANT = 'homeassistant',
  MQTT = 'mqtt',
  CUSTOM = 'custom',
}

export enum HomeAutomationTriggerType {
  TIME = 'TIME',
  SUNRISE = 'SUNRISE',
  SUNSET = 'SUNSET',
  DEVICE_STATE = 'DEVICE_STATE',
  SENSOR = 'SENSOR',
  VOICE = 'VOICE',
  LOCATION = 'LOCATION',
  MANUAL = 'MANUAL',
}

export enum HomeAutomationActionType {
  DEVICE_CONTROL = 'DEVICE_CONTROL',
  SCENE = 'SCENE',
  DELAY = 'DELAY',
  NOTIFICATION = 'NOTIFICATION',
  WEBHOOK = 'WEBHOOK',
  VOICE_ANNOUNCE = 'VOICE_ANNOUNCE',
}

export enum VoiceProvider {
  ALEXA = 'ALEXA',
  GOOGLE_HOME = 'GOOGLE_HOME',
  SIRI = 'SIRI',
}
