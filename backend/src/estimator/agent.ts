import Anthropic from '@anthropic-ai/sdk';
import {
  mergeAdjustments,
  buildRateSheet,
  resolveHourlyRate,
  resolveMaterialMultiplier,
  resolveMaterialMarkup,
  round2,
  BASE_MATERIAL_COSTS,
} from './rates';
import type {
  EstimatorInput,
  EstimatorOutput,
  EstimateBreakdown,
  LaborLineItem,
  MaterialLineItem,
  TradeType,
  MaterialCategory,
} from './types';

// ─── Raw LLM response schema ──────────────────────────────────────────────────

interface LLMEstimateData {
  projectName: string;
  scopeSummary: string;
  laborItems: Array<{
    trade: TradeType;
    description: string;
    estimatedHours: number;
  }>;
  materialItems: Array<{
    category: MaterialCategory;
    description: string;
    quantity: number;
    unit: string;
    /** Cost per unit BEFORE markup — agent uses base market price as reference */
    baseCostPerUnit: number;
  }>;
  assumptions: string[];
  exclusions: string[];
  clarifications: string[];
}

// ─── System prompt ────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are an expert industrial contracting estimator with 20+ years of field and bidding experience across heavy industrial, commercial, and civil projects. You analyze IFB, RFP, and RFQ documents to produce accurate, defensible cost estimates.

Your task is to:
1. Identify the full scope of work from the document
2. Break down labor by trade (hours only — rates are applied programmatically)
3. Break down materials by category (quantities and base unit cost only — markups are applied programmatically)
4. Note all assumptions, exclusions, and clarifications needed

IMPORTANT RULES:
- Be conservative and complete: include ALL trades and materials implied by the scope
- Use realistic crew productivity rates (e.g., electricians rough-in 100-200 LF of conduit/day, ironworkers erect 5-8 tons of steel/day)
- For electrical, plumbing, and HVAC materials: estimate as lump-sum with quantity=1 and a dollar amount for baseCostPerUnit
- For concrete: quantity in CY; for steel: quantity in tons; for lumber: quantity in MBF; for roofing: quantity in SQ (100 SF)
- Include safety equipment and hardware/fasteners as line items
- List clarifications for anything ambiguous in the documents

You MUST respond with a single valid JSON object matching this exact structure — no prose outside the JSON:
{
  "projectName": "string",
  "scopeSummary": "2-3 sentence plain-English summary of scope",
  "laborItems": [
    {
      "trade": "<TradeType>",
      "description": "what this crew is doing",
      "estimatedHours": <number>
    }
  ],
  "materialItems": [
    {
      "category": "<MaterialCategory>",
      "description": "what this material is",
      "quantity": <number>,
      "unit": "CY|ton|MBF|SF|SQ|MSF|LS|EA",
      "baseCostPerUnit": <number>
    }
  ],
  "assumptions": ["list of assumptions made"],
  "exclusions": ["list of items explicitly excluded"],
  "clarifications": ["list of questions/items needing clarification before final bid"]
}

Valid TradeTypes: general, electrical, plumbing, hvac, concrete, structural_steel, carpentry, masonry, painting, insulation, roofing, site_work
Valid MaterialCategories: concrete_materials, steel_structural, lumber_sheathing, electrical_materials, plumbing_materials, hvac_materials, insulation_materials, roofing_materials, masonry_materials, finishes, hardware_fasteners, safety_equipment`;

// ─── Main estimator function ──────────────────────────────────────────────────

export async function runEstimator(
  input: EstimatorInput,
  onStream?: (chunk: string) => void,
): Promise<EstimatorOutput> {
  const client = new Anthropic();
  const adj = mergeAdjustments(input.rateAdjustments);
  const rateSheet = buildRateSheet(adj);

  const userMessage = `
Document Type: ${input.documentType}
${input.projectName ? `Project Name (if known): ${input.projectName}` : ''}

--- DOCUMENT START ---
${input.documentText}
--- DOCUMENT END ---

--- RATE SHEET (for your reference only — use the unit costs in your response as raw market costs; markups and multipliers will be applied by the system) ---
${rateSheet}

Analyze this ${input.documentType} and return the JSON estimate.`.trim();

  // Stream the response so long documents don't time out
  const stream = client.messages.stream({
    model: 'claude-opus-4-6',
    max_tokens: 64000,
    thinking: { type: 'adaptive' },
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userMessage }],
  });

  let rawText = '';
  for await (const event of stream) {
    if (
      event.type === 'content_block_delta' &&
      event.delta.type === 'text_delta'
    ) {
      rawText += event.delta.text;
      onStream?.(event.delta.text);
    }
  }

  const finalMessage = await stream.finalMessage();
  if (finalMessage.stop_reason !== 'end_turn') {
    throw new Error(`Unexpected stop reason: ${finalMessage.stop_reason}`);
  }

  // Parse the JSON from the LLM response
  const llmData = parseJSON(rawText);

  // Apply rates and build the structured breakdown
  const breakdown = applyRates(llmData, input, adj);

  // Generate the bid proposal
  const proposal = await generateProposal(client, breakdown, input.documentType);

  return { breakdown, proposal };
}

// ─── Apply rates to LLM data ──────────────────────────────────────────────────

function applyRates(
  data: LLMEstimateData,
  input: EstimatorInput,
  adj: ReturnType<typeof mergeAdjustments>,
): EstimateBreakdown {
  const laborItems: LaborLineItem[] = data.laborItems.map(item => {
    const baseRate = resolveHourlyRate(item.trade, adj);
    const totalCost = round2(item.estimatedHours * baseRate);
    return {
      trade: item.trade,
      description: item.description,
      estimatedHours: item.estimatedHours,
      baseHourlyRate: baseRate,
      adjustedHourlyRate: baseRate,
      totalCost,
    };
  });

  const materialItems: MaterialLineItem[] = data.materialItems.map(item => {
    const mult = resolveMaterialMultiplier(item.category, adj);
    const markupPct = resolveMaterialMarkup(item.category, adj);
    const adjustedBase = round2(item.baseCostPerUnit * mult);
    const unitCost = round2(adjustedBase * (1 + markupPct / 100));
    const totalCost = round2(unitCost * item.quantity);
    return {
      category: item.category,
      description: item.description,
      quantity: item.quantity,
      unit: item.unit,
      unitCost,
      totalCost,
    };
  });

  const laborSubtotal = round2(laborItems.reduce((s, i) => s + i.totalCost, 0));
  const materialSubtotal = round2(materialItems.reduce((s, i) => s + i.totalCost, 0));
  const subtotal = round2(laborSubtotal + materialSubtotal);

  const overheadAndProfit = round2(subtotal * (adj.overheadAndProfitPercent / 100));
  const bondAndInsurance = round2((subtotal + overheadAndProfit) * (adj.bondInsurancePercent / 100));
  const totalBid = round2(subtotal + overheadAndProfit + bondAndInsurance);

  return {
    projectName: input.projectName ?? data.projectName,
    documentType: input.documentType,
    scopeSummary: data.scopeSummary,
    laborItems,
    laborSubtotal,
    materialItems,
    materialSubtotal,
    subtotal,
    overheadAndProfit,
    overheadAndProfitPercent: adj.overheadAndProfitPercent,
    bondAndInsurance,
    bondAndProfitPercent: adj.bondInsurancePercent,
    totalBid,
    assumptions: data.assumptions,
    exclusions: data.exclusions,
    clarifications: data.clarifications,
  };
}

// ─── Bid proposal generator ───────────────────────────────────────────────────

async function generateProposal(
  client: Anthropic,
  breakdown: EstimateBreakdown,
  docType: string,
): Promise<{ proposalText: string; generatedAt: string }> {
  const laborTable = breakdown.laborItems
    .map(i => `  ${i.trade} — ${i.description}: ${i.estimatedHours}h @ $${i.adjustedHourlyRate}/hr = $${i.totalCost.toLocaleString()}`)
    .join('\n');

  const materialTable = breakdown.materialItems
    .map(i => `  ${i.category} — ${i.description}: ${i.quantity} ${i.unit} @ $${i.unitCost}/unit = $${i.totalCost.toLocaleString()}`)
    .join('\n');

  const prompt = `Generate a professional bid proposal letter for a ${docType} response. Use the following estimate data:

PROJECT: ${breakdown.projectName}
SCOPE: ${breakdown.scopeSummary}

LABOR BREAKDOWN:
${laborTable}
Labor Subtotal: $${breakdown.laborSubtotal.toLocaleString()}

MATERIAL BREAKDOWN:
${materialTable}
Material Subtotal: $${breakdown.materialSubtotal.toLocaleString()}

FINANCIALS:
Subtotal:           $${breakdown.subtotal.toLocaleString()}
Overhead & Profit (${breakdown.overheadAndProfitPercent}%): $${breakdown.overheadAndProfit.toLocaleString()}
Bond & Insurance (${breakdown.bondAndProfitPercent}%):    $${breakdown.bondAndInsurance.toLocaleString()}
TOTAL BID:          $${breakdown.totalBid.toLocaleString()}

ASSUMPTIONS:
${breakdown.assumptions.map(a => `- ${a}`).join('\n')}

EXCLUSIONS:
${breakdown.exclusions.map(e => `- ${e}`).join('\n')}

CLARIFICATIONS REQUESTED:
${breakdown.clarifications.map(c => `- ${c}`).join('\n')}

Write a formal, complete bid proposal letter ready to submit. Include all standard industrial contracting proposal sections: company introduction, understanding of scope, pricing summary table, terms (payment schedule, schedule of values, validity period of 30 days), assumptions, exclusions, and closing. Use professional language appropriate for ${docType} submissions.`;

  const stream = client.messages.stream({
    model: 'claude-opus-4-6',
    max_tokens: 8000,
    thinking: { type: 'adaptive' },
    messages: [{ role: 'user', content: prompt }],
  });

  let proposalText = '';
  for await (const event of stream) {
    if (
      event.type === 'content_block_delta' &&
      event.delta.type === 'text_delta'
    ) {
      proposalText += event.delta.text;
    }
  }

  return {
    proposalText: proposalText.trim(),
    generatedAt: new Date().toISOString(),
  };
}

// ─── JSON extraction helper ───────────────────────────────────────────────────

function parseJSON(text: string): LLMEstimateData {
  // Strip any markdown code fences
  const clean = text
    .replace(/^```(?:json)?\s*/m, '')
    .replace(/\s*```\s*$/m, '')
    .trim();

  // Find the outermost JSON object
  const start = clean.indexOf('{');
  const end = clean.lastIndexOf('}');
  if (start === -1 || end === -1) {
    throw new Error('Could not find JSON object in LLM response');
  }

  try {
    return JSON.parse(clean.slice(start, end + 1)) as LLMEstimateData;
  } catch (err) {
    throw new Error(`Failed to parse LLM JSON response: ${(err as Error).message}`);
  }
}
