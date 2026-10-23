export interface ReadingInput {
  systolic: string;
  diastolic: string;
  pulse: string;
  measuredAt: Date;
}

export type ValidationKey =
  | 'required' | 'integer' | 'positive'
  | 'systolicRange' | 'diastolicRange' | 'pulseRange'
  | 'ordering' | 'future';

export interface ValidationResult {
  errors: ValidationKey[];
  systolic?: number;
  diastolic?: number;
  pulseBpm: number | null;
  needsOrderingConfirmation: boolean;
  needsHighReadingSafetyAcknowledgement: boolean;
}

function parseInteger(raw: string): number | null {
  const value = raw.trim();
  if (!value || !/^\d+$/.test(value)) return null;
  const number = Number(value);
  return Number.isSafeInteger(number) ? number : null;
}

/**
 * Broad data-entry guardrails only; these are not diagnostic or treatment thresholds.
 * Clinical/product review is required before release.
 */
export function validateReading(input: ReadingInput, now = new Date()): ValidationResult {
  const errors: ValidationKey[] = [];
  const systolic = parseInteger(input.systolic);
  const diastolic = parseInteger(input.diastolic);
  const pulseText = input.pulse.trim();
  const pulse = pulseText ? parseInteger(pulseText) : null;

  if (!input.systolic.trim() || !input.diastolic.trim()) errors.push('required');
  if ((input.systolic.trim() && systolic === null) ||
      (input.diastolic.trim() && diastolic === null) ||
      (pulseText && pulse === null)) errors.push('integer');

  if (systolic !== null && systolic <= 0) errors.push('positive');
  if (diastolic !== null && diastolic <= 0) errors.push('positive');

  if (systolic !== null && (systolic < 30 || systolic > 300)) errors.push('systolicRange');
  if (diastolic !== null && (diastolic < 20 || diastolic > 200)) errors.push('diastolicRange');
  if (pulseText && pulse !== null && (pulse < 20 || pulse > 250)) errors.push('pulseRange');

  if (Number.isNaN(input.measuredAt.getTime())) errors.push('future');
  else if (input.measuredAt.getTime() > now.getTime() + 60_000) errors.push('future');

  return {
    errors: [...new Set(errors)],
    systolic: systolic ?? undefined,
    diastolic: diastolic ?? undefined,
    pulseBpm: pulse,
    needsOrderingConfirmation: systolic !== null && diastolic !== null && systolic <= diastolic,
    needsHighReadingSafetyAcknowledgement:
      systolic !== null && diastolic !== null && (systolic > 180 || diastolic > 120),
  };
}
