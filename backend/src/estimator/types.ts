// ─── Document Types ──────────────────────────────────────────────────────────

export type DocumentType = 'IFB' | 'RFP' | 'RFQ';

export interface EstimatorInput {
  documentType: DocumentType;
  documentText: string;
  projectName?: string;
  rateAdjustments?: RateAdjustments;
}

// ─── Rate Configuration ───────────────────────────────────────────────────────

export interface TradeRateOverride {
  hourlyRate?: number;       // Override the base hourly rate
  multiplier?: number;       // Scale the base rate (e.g. 1.15 = +15%)
}

export interface MaterialCategoryOverride {
  multiplier?: number;       // Scale all prices in this category
  markupPercent?: number;    // Override the markup % applied on top of cost
}

export type TradeType =
  | 'general'
  | 'electrical'
  | 'plumbing'
  | 'hvac'
  | 'concrete'
  | 'structural_steel'
  | 'carpentry'
  | 'masonry'
  | 'painting'
  | 'insulation'
  | 'roofing'
  | 'site_work';

export type MaterialCategory =
  | 'concrete_materials'
  | 'steel_structural'
  | 'lumber_sheathing'
  | 'electrical_materials'
  | 'plumbing_materials'
  | 'hvac_materials'
  | 'insulation_materials'
  | 'roofing_materials'
  | 'masonry_materials'
  | 'finishes'
  | 'hardware_fasteners'
  | 'safety_equipment';

export interface RateAdjustments {
  /** Global labor multiplier applied to all trades (e.g. 1.1 = +10%) */
  globalLaborMultiplier?: number;
  /** Global material multiplier applied to all categories */
  globalMaterialMultiplier?: number;
  /** Regional cost-of-living / prevailing wage adjustment (e.g. 1.2 for high-cost metros) */
  regionalFactor?: number;
  /** Per-trade overrides */
  tradeOverrides?: Partial<Record<TradeType, TradeRateOverride>>;
  /** Per-category material overrides */
  materialOverrides?: Partial<Record<MaterialCategory, MaterialCategoryOverride>>;
  /** Overhead & profit margin to apply to the total (default 15%) */
  overheadAndProfitPercent?: number;
  /** Bond / insurance rate as a percent of total (default 2%) */
  bondInsurancePercent?: number;
}

// ─── Estimate Line Items ──────────────────────────────────────────────────────

export interface LaborLineItem {
  trade: TradeType;
  description: string;
  estimatedHours: number;
  baseHourlyRate: number;      // Market rate before adjustments
  adjustedHourlyRate: number;  // After all multipliers
  totalCost: number;
}

export interface MaterialLineItem {
  category: MaterialCategory;
  description: string;
  quantity: number;
  unit: string;
  unitCost: number;            // After adjustments + markup
  totalCost: number;
}

// ─── Estimate Output ──────────────────────────────────────────────────────────

export interface EstimateBreakdown {
  projectName: string;
  documentType: DocumentType;
  scopeSummary: string;

  laborItems: LaborLineItem[];
  laborSubtotal: number;

  materialItems: MaterialLineItem[];
  materialSubtotal: number;

  subtotal: number;
  overheadAndProfit: number;
  overheadAndProfitPercent: number;
  bondAndInsurance: number;
  bondAndProfitPercent: number;
  totalBid: number;

  assumptions: string[];
  exclusions: string[];
  clarifications: string[];
}

export interface BidProposal {
  proposalText: string;
  generatedAt: string;
}

export interface EstimatorOutput {
  breakdown: EstimateBreakdown;
  proposal: BidProposal;
}
