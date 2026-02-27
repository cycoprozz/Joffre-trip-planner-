/**
 * DriverPay Log - Pay Engine
 * 
 * Deterministic pay calculation with transparent breakdown.
 * Same inputs = same output, always.
 */

// ============================================
// TYPES
// ============================================

export type TripType = 'POINT_TO_POINT' | 'DIRECTED_HOURLY' | 'OUT_OF_TOWN_DAILY';
export type ServiceArea = 'ATLANTA_IN_PERIMETER' | 'OUTSIDE_PERIMETER';
export type RoundingRule = 'EXACT' | 'NEAREST_15_MIN' | 'UP_TO_15_MIN';
export type TripStatus = 'SCHEDULED' | 'COMPLETED' | 'CANCELED' | 'NO_SHOW';

export interface Settings {
  p2pAtlantaRate: number;
  p2pOutsideRate: number;
  hourlyRate: number;
  outOfTownDailyRate: number;
  roundingDefault: RoundingRule;
  privacyMode: boolean;
}

export interface TripInput {
  tripType: TripType;
  serviceArea?: ServiceArea;
  startTime?: Date;
  endTime?: Date;
  breakMinutes?: number;
  roundingRule?: RoundingRule;
  outOfTownLocation?: string;
  dayCount?: number;
  adjustmentsAmount?: number;
  status: TripStatus;
}

export interface PayBreakdown {
  rule_used: string;
  calculation: string;
  input_values: Record<string, unknown>;
  steps: PayCalculationStep[];
}

export interface PayCalculationStep {
  step: string;
  value: number | string;
  description: string;
}

export interface PayResult {
  baseRate: number;
  computedPay: number;
  adjustmentsAmount: number;
  finalPay: number;
  payBreakdown: PayBreakdown;
  isInProgress: boolean;
  errors: string[];
}

// ============================================
// DEFAULT SETTINGS
// ============================================

export const DEFAULT_SETTINGS: Settings = {
  p2pAtlantaRate: 25,
  p2pOutsideRate: 38,
  hourlyRate: 20,
  outOfTownDailyRate: 300,
  roundingDefault: 'NEAREST_15_MIN',
  privacyMode: false,
};

// ============================================
// ROUNDING FUNCTIONS
// ============================================

/**
 * Round minutes according to the specified rule
 */
export function roundMinutes(minutes: number, rule: RoundingRule): number {
  switch (rule) {
    case 'EXACT':
      return minutes;
    case 'NEAREST_15_MIN':
      return Math.round(minutes / 15) * 15;
    case 'UP_TO_15_MIN':
      return Math.ceil(minutes / 15) * 15;
    default:
      return Math.round(minutes / 15) * 15;
  }
}

/**
 * Convert minutes to decimal hours
 */
export function minutesToHours(minutes: number): number {
  return Math.round((minutes / 60) * 10000) / 10000;
}

// ============================================
// PAY ENGINE - MAIN FUNCTION
// ============================================

/**
 * Compute pay for a trip - deterministic calculation
 */
export function computePay(trip: TripInput, settings: Settings): PayResult {
  const errors: string[] = [];
  let isInProgress = false;
  const roundingRule = trip.roundingRule || settings.roundingDefault;
  let baseRate = 0;
  let computedPay = 0;
  const steps: PayCalculationStep[] = [];
  const adjustmentsAmount = trip.adjustmentsAmount || 0;

  // RULE 1: POINT-TO-POINT ATLANTA IN PERIMETER
  if (trip.tripType === 'POINT_TO_POINT' && trip.serviceArea === 'ATLANTA_IN_PERIMETER') {
    baseRate = settings.p2pAtlantaRate;
    computedPay = baseRate;
    steps.push({ step: 'base_rate', value: baseRate, description: `Atlanta in-perimeter rate: $${baseRate}` });
    steps.push({ step: 'final_calculation', value: computedPay, description: 'Flat rate applied' });
  }
  // RULE 2: POINT-TO-POINT OUTSIDE PERIMETER
  else if (trip.tripType === 'POINT_TO_POINT' && trip.serviceArea === 'OUTSIDE_PERIMETER') {
    baseRate = settings.p2pOutsideRate;
    computedPay = baseRate;
    steps.push({ step: 'base_rate', value: baseRate, description: `Outside Atlanta perimeter rate: $${baseRate}` });
    steps.push({ step: 'final_calculation', value: computedPay, description: 'Flat rate applied' });
  }
  // RULE 3: DIRECTED/HOURLY
  else if (trip.tripType === 'DIRECTED_HOURLY') {
    if (!trip.endTime) {
      isInProgress = true;
      if (trip.startTime) {
        const now = new Date();
        const currentMinutes = (now.getTime() - trip.startTime.getTime()) / (1000 * 60);
        const breakMinutes = trip.breakMinutes || 0;
        const netMinutes = Math.max(0, currentMinutes - breakMinutes);
        const roundedMinutes = roundMinutes(netMinutes, roundingRule);
        const hours = minutesToHours(roundedMinutes);
        computedPay = Math.round(settings.hourlyRate * hours * 100) / 100;
        steps.push({ step: 'start_time', value: trip.startTime.toISOString(), description: `Started at ${trip.startTime.toLocaleTimeString()}` });
        steps.push({ step: 'current_duration', value: Math.round(netMinutes), description: `${Math.round(netMinutes)} minutes (minus ${breakMinutes} min break)` });
        steps.push({ step: 'rounding', value: roundedMinutes, description: `Rounded to ${roundedMinutes} minutes (${roundingRule})` });
        steps.push({ step: 'hours', value: hours, description: `${hours} hours` });
        steps.push({ step: 'estimated_pay', value: computedPay, description: `$${computedPay} = ${settings.hourlyRate} × ${hours} hours` });
      }
      steps.push({ step: 'status', value: 'in_progress', description: 'Trip in progress - pay is estimated' });
    } else {
      const breakMinutes = trip.breakMinutes || 0;
      const totalMinutes = (trip.endTime.getTime() - trip.startTime!.getTime()) / (1000 * 60);
      if (totalMinutes < 0) {
        errors.push('End time cannot be before start time');
        return { baseRate: 0, computedPay: 0, adjustmentsAmount, finalPay: 0, payBreakdown: { rule_used: 'ERROR', calculation: 'Failed', input_values: {}, steps }, isInProgress: false, errors };
      }
      const computedMinutes = Math.round(totalMinutes - breakMinutes);
      if (computedMinutes < 0) {
        errors.push('Break minutes cannot exceed total duration');
        return { baseRate: settings.hourlyRate, computedPay: 0, adjustmentsAmount, finalPay: 0, payBreakdown: { rule_used: 'ERROR', calculation: 'Failed', input_values: {}, steps }, isInProgress: false, errors };
      }
      const roundedMinutes = roundMinutes(computedMinutes, roundingRule);
      const hours = minutesToHours(roundedMinutes);
      baseRate = settings.hourlyRate;
      computedPay = Math.round(baseRate * hours * 100) / 100;
      steps.push({ step: 'hourly_rate', value: baseRate, description: `Hourly rate: $${baseRate}/hour` });
      steps.push({ step: 'start_time', value: trip.startTime?.toISOString() || '', description: `Started at ${trip.startTime?.toLocaleTimeString()}` });
      steps.push({ step: 'end_time', value: trip.endTime?.toISOString() || '', description: `Ended at ${trip.endTime?.toLocaleTimeString()}` });
      steps.push({ step: 'total_duration', value: Math.round(totalMinutes), description: `${Math.round(totalMinutes)} minutes total` });
      steps.push({ step: 'break_minutes', value: breakMinutes, description: `${breakMinutes} minutes break` });
      steps.push({ step: 'computed_minutes', value: computedMinutes, description: `${computedMinutes} minutes after break` });
      steps.push({ step: 'rounding_rule', value: roundingRule, description: `Applied: ${roundingRule}` });
      steps.push({ step: 'rounded_minutes', value: roundedMinutes, description: `Rounded to ${roundedMinutes} minutes` });
      steps.push({ step: 'hours', value: hours, description: `${hours} hours` });
      steps.push({ step: 'final_calculation', value: computedPay, description: `$${computedPay} = $${baseRate} × ${hours} hours` });
    }
  }
  // RULE 4: OUT-OF-TOWN DAILY
  else if (trip.tripType === 'OUT_OF_TOWN_DAILY') {
    const dayCount = trip.dayCount || 1;
    if (dayCount < 1) {
      errors.push('Day count must be at least 1');
      return { baseRate: 0, computedPay: 0, adjustmentsAmount, finalPay: 0, payBreakdown: { rule_used: 'ERROR', calculation: 'Failed', input_values: {}, steps }, isInProgress: false, errors };
    }
    baseRate = settings.outOfTownDailyRate;
    computedPay = baseRate * dayCount;
    steps.push({ step: 'daily_rate', value: baseRate, description: `Out-of-town daily rate: $${baseRate}/day` });
    steps.push({ step: 'day_count', value: dayCount, description: `${dayCount} day(s)` });
    steps.push({ step: 'location', value: trip.outOfTownLocation || 'Not specified', description: `Location: ${trip.outOfTownLocation || 'Not specified'}` });
    steps.push({ step: 'final_calculation', value: computedPay, description: `$${computedPay} = $${baseRate} × ${dayCount} days` });
  } else {
    errors.push(`Unknown trip type: ${trip.tripType}`);
    return { baseRate: 0, computedPay: 0, adjustmentsAmount, finalPay: 0, payBreakdown: { rule_used: 'ERROR', calculation: 'Unknown trip type', input_values: { tripType: trip.tripType }, steps }, isInProgress: false, errors };
  }

  // FINAL CALCULATION
  if (trip.status !== 'COMPLETED') {
    computedPay = 0;
  }
  const finalPay = computedPay + adjustmentsAmount;

  let ruleUsed = '';
  switch (trip.tripType) {
    case 'POINT_TO_POINT':
      ruleUsed = trip.serviceArea === 'ATLANTA_IN_PERIMETER' ? 'P2P Atlanta In-Perimeter' : 'P2P Outside Atlanta';
      break;
    case 'DIRECTED_HOURLY':
      ruleUsed = `Hourly (${roundingRule})`;
      break;
    case 'OUT_OF_TOWN_DAILY':
      ruleUsed = 'Out-of-Town Daily';
      break;
  }

  return {
    baseRate,
    computedPay,
    adjustmentsAmount,
    finalPay,
    payBreakdown: { rule_used: ruleUsed, calculation: `$${computedPay}`, input_values: { tripType: trip.tripType, serviceArea: trip.serviceArea || null, hourlyRate: trip.tripType === 'DIRECTED_HOURLY' ? baseRate : null, dayCount: trip.tripType === 'OUT_OF_TOWN_DAILY' ? trip.dayCount : null, adjustments: adjustmentsAmount }, steps },
    isInProgress,
    errors,
  };
}

// ============================================
// VALIDATION
// ============================================

export function validateTrip(trip: TripInput): string[] {
  const errors: string[] = [];
  if (trip.tripType === 'POINT_TO_POINT' && !trip.serviceArea) {
    errors.push('Service area is required for Point-to-Point trips');
  }
  if (trip.tripType === 'DIRECTED_HOURLY') {
    if (!trip.startTime) errors.push('Start time is required for Hourly trips');
    if (trip.endTime && trip.startTime && trip.endTime < trip.startTime) {
      errors.push('End time cannot be before start time');
    }
    if (trip.breakMinutes && trip.breakMinutes < 0) {
      errors.push('Break minutes cannot be negative');
    }
  }
  if (trip.tripType === 'OUT_OF_TOWN_DAILY') {
    if (!trip.dayCount || trip.dayCount < 1) {
      errors.push('Day count must be at least 1 for out-of-town trips');
    }
  }
  return errors;
}

export default computePay;
