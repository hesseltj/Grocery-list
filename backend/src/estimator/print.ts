/**
 * Console output formatting for the estimator.
 */

import type { EstimatorOutput } from './types';

const BOLD  = '\x1b[1m';
const CYAN  = '\x1b[36m';
const GREEN = '\x1b[32m';
const YELLOW= '\x1b[33m';
const RESET = '\x1b[0m';
const DIM   = '\x1b[2m';

function hr(char = '─', width = 72): string {
  return char.repeat(width);
}

function usd(n: number): string {
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function printEstimate(output: EstimatorOutput): void {
  const { breakdown: b, proposal: p } = output;

  console.log('\n' + BOLD + CYAN + hr('═') + RESET);
  console.log(BOLD + CYAN + `  INDUSTRIAL CONTRACTING ESTIMATE — ${b.documentType}` + RESET);
  console.log(BOLD + CYAN + hr('═') + RESET);
  console.log(`  Project: ${BOLD}${b.projectName}${RESET}`);
  console.log(`  Scope:   ${b.scopeSummary}`);
  console.log(CYAN + hr() + RESET);

  // ── Labor ──────────────────────────────────────────────────────────────────
  console.log('\n' + BOLD + YELLOW + '  LABOR BREAKDOWN' + RESET);
  console.log(YELLOW + hr('-') + RESET);
  console.log(
    DIM +
    '  Trade                Description                           Hours    Rate/hr    Total' +
    RESET,
  );
  console.log(DIM + hr('-') + RESET);

  for (const item of b.laborItems) {
    const trade = item.trade.padEnd(20);
    const desc  = item.description.slice(0, 37).padEnd(38);
    const hours = String(item.estimatedHours).padStart(6);
    const rate  = usd(item.adjustedHourlyRate).padStart(9);
    const total = usd(item.totalCost).padStart(11);
    console.log(`  ${trade} ${desc} ${hours}  ${rate}  ${total}`);
  }

  console.log(YELLOW + hr('-') + RESET);
  console.log(`  ${'Labor Subtotal'.padEnd(70)} ${BOLD}${usd(b.laborSubtotal).padStart(12)}${RESET}`);

  // ── Materials ──────────────────────────────────────────────────────────────
  console.log('\n' + BOLD + GREEN + '  MATERIAL BREAKDOWN' + RESET);
  console.log(GREEN + hr('-') + RESET);
  console.log(
    DIM +
    '  Category               Description                         Qty    Unit    Unit$    Total' +
    RESET,
  );
  console.log(DIM + hr('-') + RESET);

  for (const item of b.materialItems) {
    const cat   = item.category.slice(0, 22).padEnd(23);
    const desc  = item.description.slice(0, 35).padEnd(36);
    const qty   = String(item.quantity).padStart(6);
    const unit  = item.unit.padEnd(4);
    const uc    = usd(item.unitCost).padStart(9);
    const total = usd(item.totalCost).padStart(11);
    console.log(`  ${cat} ${desc} ${qty}  ${unit}  ${uc}  ${total}`);
  }

  console.log(GREEN + hr('-') + RESET);
  console.log(`  ${'Material Subtotal'.padEnd(70)} ${BOLD}${usd(b.materialSubtotal).padStart(12)}${RESET}`);

  // ── Totals ─────────────────────────────────────────────────────────────────
  console.log('\n' + BOLD + CYAN + hr('─') + RESET);
  console.log(`  ${'Subtotal (Labor + Material)'.padEnd(60)} ${usd(b.subtotal).padStart(12)}`);
  console.log(`  ${'Overhead & Profit (' + b.overheadAndProfitPercent + '%)'.padEnd(60)} ${usd(b.overheadAndProfit).padStart(12)}`);
  console.log(`  ${'Bond & Insurance (' + b.bondAndProfitPercent + '%)'.padEnd(60)} ${usd(b.bondAndInsurance).padStart(12)}`);
  console.log(BOLD + CYAN + hr('═') + RESET);
  console.log(BOLD + `  ${'TOTAL BID'.padEnd(60)} ${usd(b.totalBid).padStart(12)}` + RESET);
  console.log(BOLD + CYAN + hr('═') + RESET);

  // ── Notes ──────────────────────────────────────────────────────────────────
  if (b.assumptions.length > 0) {
    console.log('\n' + BOLD + '  ASSUMPTIONS' + RESET);
    b.assumptions.forEach(a => console.log(`  • ${a}`));
  }

  if (b.exclusions.length > 0) {
    console.log('\n' + BOLD + '  EXCLUSIONS' + RESET);
    b.exclusions.forEach(e => console.log(`  • ${e}`));
  }

  if (b.clarifications.length > 0) {
    console.log('\n' + BOLD + YELLOW + '  CLARIFICATIONS NEEDED' + RESET);
    b.clarifications.forEach(c => console.log(`  ? ${c}`));
  }

  // ── Proposal ───────────────────────────────────────────────────────────────
  console.log('\n' + BOLD + CYAN + hr('═') + RESET);
  console.log(BOLD + CYAN + '  BID PROPOSAL' + RESET);
  console.log(BOLD + CYAN + hr('═') + RESET);
  console.log('\n' + p.proposalText + '\n');
  console.log(DIM + `  Generated: ${p.generatedAt}` + RESET);
  console.log('\n' + CYAN + hr('═') + RESET + '\n');
}
