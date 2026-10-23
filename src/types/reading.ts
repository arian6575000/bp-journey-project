export type Arm = 'left' | 'right' | 'unknown';
export type Position = 'sitting' | 'lying' | 'standing' | 'unknown';
export type MeasurementContext = 'morning' | 'evening' | 'resting' | 'other';

export interface BloodPressureReading {
  id: string;
  profileId: string;
  systolic: number;
  diastolic: number;
  pulseBpm: number | null;
  measuredAtUtc: string;
  timezoneOffsetMinutes: number;
  arm: Arm;
  position: Position;
  context: MeasurementContext;
  notes: string | null;
  source: 'manual';
  createdAtUtc: string;
  updatedAtUtc: string;
}
