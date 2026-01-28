// Health & Wellness Enums
export enum MedicationFrequency {
  ONCE_DAILY = 'ONCE_DAILY',
  TWICE_DAILY = 'TWICE_DAILY',
  THREE_TIMES_DAILY = 'THREE_TIMES_DAILY',
  FOUR_TIMES_DAILY = 'FOUR_TIMES_DAILY',
  EVERY_X_HOURS = 'EVERY_X_HOURS',
  AS_NEEDED = 'AS_NEEDED',
  SPECIFIC_TIMES = 'SPECIFIC_TIMES',
  DAYS_OF_WEEK = 'DAYS_OF_WEEK',
}

export enum MedicationUnit {
  MG = 'mg',
  G = 'g',
  ML = 'mL',
  TABLET = 'tablet',
  CAPSULE = 'capsule',
  DROP = 'drop',
  SPRAY = 'spray',
  PATCH = 'patch',
  OTHER = 'other',
}

export enum ExerciseIntensity {
  LOW = 'LOW',
  MODERATE = 'MODERATE',
  HIGH = 'HIGH',
  VERY_HIGH = 'VERY_HIGH',
}

export enum HealthGoalType {
  WEIGHT_LOSS = 'WEIGHT_LOSS',
  WEIGHT_GAIN = 'WEIGHT_GAIN',
  MUSCLE_GAIN = 'MUSCLE_GAIN',
  ENDURANCE = 'ENDURANCE',
  FLEXIBILITY = 'FLEXIBILITY',
  GENERAL_FITNESS = 'GENERAL_FITNESS',
  STRESS_REDUCTION = 'STRESS_REDUCTION',
  BETTER_SLEEP = 'BETTER_SLEEP',
  OTHER = 'OTHER',
}

export enum WearableProvider {
  FITBIT = 'FITBIT',
  GOOGLE_FIT = 'GOOGLE_FIT',
  APPLE_HEALTH = 'APPLE_HEALTH',
  GARMIN = 'GARMIN',
  STRAVA = 'STRAVA',
  WHOOP = 'WHOOP',
  OURA = 'OURA',
  SAMSUNG_HEALTH = 'SAMSUNG_HEALTH',
}
