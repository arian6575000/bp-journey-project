import { getDatabase } from './db';
import type { BloodPressureReading } from '../types/reading';

export async function insertReading(reading: BloodPressureReading): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT INTO readings (
      id, profile_id, systolic, diastolic, pulse_bpm, measured_at_utc,
      timezone_offset_minutes, arm, position, context, notes, source,
      created_at_utc, updated_at_utc
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    reading.id,
    reading.profileId,
    reading.systolic,
    reading.diastolic,
    reading.pulseBpm,
    reading.measuredAtUtc,
    reading.timezoneOffsetMinutes,
    reading.arm,
    reading.position,
    reading.context,
    reading.notes,
    reading.source,
    reading.createdAtUtc,
    reading.updatedAtUtc
  );
}

export async function getRecentReadings(limit = 20): Promise<BloodPressureReading[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<any>(
    `SELECT * FROM readings
     WHERE deleted_at_utc IS NULL
     ORDER BY measured_at_utc DESC
     LIMIT ?`,
    Math.max(1, Math.min(200, Math.floor(limit)))
  );

  return rows.map((row) => ({
    id: row.id,
    profileId: row.profile_id,
    systolic: row.systolic,
    diastolic: row.diastolic,
    pulseBpm: row.pulse_bpm,
    measuredAtUtc: row.measured_at_utc,
    timezoneOffsetMinutes: row.timezone_offset_minutes,
    arm: row.arm,
    position: row.position,
    context: row.context,
    notes: row.notes,
    source: row.source,
    createdAtUtc: row.created_at_utc,
    updatedAtUtc: row.updated_at_utc,
  }));
}
