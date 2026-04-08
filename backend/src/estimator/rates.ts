/**
 * Default market rates for industrial contracting.
 *
 * Sources: RS Means, BLS Occupational Outlook, ENR Construction Cost Index (2024 national averages).
 * Adjust with RateAdjustments for regional, project-specific, or contractual variations.
 */

import type { TradeType, MaterialCategory, RateAdjustments } from './types';

// ─── Base Labor Rates ($/hr, all-in — wage + burden) ─────────────────────────

export const BASE_LABOR_RATES: Record<TradeType, number> = {
  general:          52,   // General laborer / foreman
  electrical:       89,   // Journeyman electrician
  plumbing:         87,   // Journeyman plumber
  hvac:             82,   // HVAC mechanic
  concrete:         68,   // Concrete finisher / form carpenter
  structural_steel: 95,   // Ironworker / structural welder
  carpentry:        72,   // Finish / rough carpenter
  masonry:          75,   // Mason / bricklayer
  painting:         58,   // Industrial painter
  insulation:       62,   // Insulation mechanic
  roofing:          70,   // Commercial roofer
  site_work:        65,   // Equipment operator / laborer
};

// ─── Base Material Unit Costs (mid-point market price, before markup) ─────────

/** Representative unit costs per category (used as reference scalars by the LLM) */
export const BASE_MATERIAL_COSTS: Record<MaterialCategory, { unit: string; costPerUnit: number; markupPercent: number }> = {
  concrete_materials:  { unit: 'CY',   costPerUnit: 165,  markupPercent: 12 },
  steel_structural:    { unit: 'ton',  costPerUnit: 1650, markupPercent: 10 },
  lumber_sheathing:    { unit: 'MBF',  costPerUnit: 850,  markupPercent: 15 },
  electrical_materials:{ unit: 'LS',   costPerUnit: 1,    markupPercent: 20 },  // priced as lump-sum by the LLM
  plumbing_materials:  { unit: 'LS',   costPerUnit: 1,    markupPercent: 18 },
  hvac_materials:      { unit: 'LS',   costPerUnit: 1,    markupPercent: 18 },
  insulation_materials:{ unit: 'SF',   costPerUnit: 1.40, markupPercent: 15 },
  roofing_materials:   { unit: 'SQ',   costPerUnit: 280,  markupPercent: 15 },
  masonry_materials:   { unit: 'MSF',  costPerUnit: 720,  markupPercent: 12 },
  finishes:            { unit: 'SF',   costPerUnit: 3.50, markupPercent: 18 },
  hardware_fasteners:  { unit: 'LS',   costPerUnit: 1,    markupPercent: 25 },
  safety_equipment:    { unit: 'LS',   costPerUnit: 1,    markupPercent: 20 },
};

// ─── Default Adjustments ──────────────────────────────────────────────────────

export const DEFAULT_ADJUSTMENTS: Required<RateAdjustments> = {
  globalLaborMultiplier:     1.0,
  globalMaterialMultiplier:  1.0,
  regionalFactor:            1.0,
  tradeOverrides:            {},
  materialOverrides:         {},
  overheadAndProfitPercent:  15,
  bondInsurancePercent:      2,
};

// ─── Rate Resolution Helpers ──────────────────────────────────────────────────

export function resolveHourlyRate(trade: TradeType, adj: Required<RateAdjustments>): number {
  const base = BASE_LABOR_RATES[trade];
  const override = adj.tradeOverrides[trade];

  let rate = base;
  if (override?.hourlyRate !== undefined) {
    rate = override.hourlyRate;
  } else if (override?.multiplier !== undefined) {
    rate = base * override.multiplier;
  }

  return round2(rate * adj.globalLaborMultiplier * adj.regionalFactor);
}

export function resolveMaterialMarkup(category: MaterialCategory, adj: Required<RateAdjustments>): number {
  const base = BASE_MATERIAL_COSTS[category].markupPercent;
  const override = adj.materialOverrides[category];
  return override?.markupPercent !== undefined ? override.markupPercent : base;
}

export function resolveMaterialMultiplier(category: MaterialCategory, adj: Required<RateAdjustments>): number {
  const override = adj.materialOverrides[category];
  const catMultiplier = override?.multiplier ?? 1.0;
  return catMultiplier * adj.globalMaterialMultiplier * adj.regionalFactor;
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Merge user-supplied adjustments with defaults */
export function mergeAdjustments(user?: RateAdjustments): Required<RateAdjustments> {
  if (!user) return { ...DEFAULT_ADJUSTMENTS };
  return {
    globalLaborMultiplier:    user.globalLaborMultiplier    ?? DEFAULT_ADJUSTMENTS.globalLaborMultiplier,
    globalMaterialMultiplier: user.globalMaterialMultiplier ?? DEFAULT_ADJUSTMENTS.globalMaterialMultiplier,
    regionalFactor:           user.regionalFactor           ?? DEFAULT_ADJUSTMENTS.regionalFactor,
    tradeOverrides:           { ...DEFAULT_ADJUSTMENTS.tradeOverrides,   ...user.tradeOverrides },
    materialOverrides:        { ...DEFAULT_ADJUSTMENTS.materialOverrides, ...user.materialOverrides },
    overheadAndProfitPercent: user.overheadAndProfitPercent ?? DEFAULT_ADJUSTMENTS.overheadAndProfitPercent,
    bondInsurancePercent:     user.bondInsurancePercent     ?? DEFAULT_ADJUSTMENTS.bondInsurancePercent,
  };
}

/** Build a human-readable rate sheet to embed in the LLM prompt */
export function buildRateSheet(adj: Required<RateAdjustments>): string {
  const laborLines = (Object.keys(BASE_LABOR_RATES) as TradeType[]).map(trade => {
    const rate = resolveHourlyRate(trade, adj);
    return `  ${trade.padEnd(20)} $${rate.toFixed(2)}/hr`;
  });

  const materialLines = (Object.keys(BASE_MATERIAL_COSTS) as MaterialCategory[]).map(cat => {
    const { unit, costPerUnit } = BASE_MATERIAL_COSTS[cat];
    const mult = resolveMaterialMultiplier(cat, adj);
    const markup = resolveMaterialMarkup(cat, adj);
    const adjustedCost = round2(costPerUnit * mult);
    return `  ${cat.padEnd(24)} $${adjustedCost}/${unit}  +${markup}% markup`;
  });

  return [
    '=== EFFECTIVE RATE SHEET ===',
    '',
    'LABOR (all-in hourly rates including wages, benefits, payroll taxes):',
    ...laborLines,
    '',
    'MATERIAL BASE UNIT COSTS (before quantity-specific markups):',
    ...materialLines,
    '',
    `OVERHEAD & PROFIT: ${adj.overheadAndProfitPercent}%`,
    `BOND & INSURANCE:  ${adj.bondInsurancePercent}%`,
  ].join('\n');
}
