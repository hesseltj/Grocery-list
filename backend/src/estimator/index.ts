/**
 * Industrial Contracting Estimator — CLI entry point
 *
 * Usage:
 *   npx ts-node src/estimator/index.ts [options]
 *
 * Options (all optional):
 *   --file <path>           Path to a text/PDF-export file containing the IFB/RFP/RFQ
 *   --type <IFB|RFP|RFQ>   Document type (default: auto-detected or IFB)
 *   --project <name>        Override project name
 *   --json                  Output raw JSON instead of formatted report
 *   --output <path>         Save output JSON to file
 *
 * Rate adjustments (pass any combination):
 *   --labor-mult <n>         Global labor multiplier (e.g. 1.1 for +10%)
 *   --material-mult <n>      Global material multiplier
 *   --regional <n>           Regional cost factor
 *   --oh-profit <n>          Overhead & profit % (e.g. 18)
 *   --bond <n>               Bond & insurance % (e.g. 2.5)
 *
 * Per-trade labor rate override:
 *   --trade-rate <trade>=<$/hr>     e.g. --trade-rate electrical=95
 *   --trade-mult <trade>=<n>        e.g. --trade-mult hvac=1.15
 *
 * If no --file is given, the agent reads from stdin.
 *
 * Examples:
 *   echo "..." | npx ts-node src/estimator/index.ts --type RFP
 *   npx ts-node src/estimator/index.ts --file rfq.txt --regional 1.2 --oh-profit 18
 *   npx ts-node src/estimator/index.ts --file bid.txt --trade-rate electrical=99 --json
 */

import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { runEstimator } from './agent';
import { printEstimate } from './print';
import type { DocumentType, RateAdjustments, TradeType } from './types';

// ─── CLI argument parsing ─────────────────────────────────────────────────────

interface CliOptions {
  file?: string;
  type: DocumentType;
  project?: string;
  json: boolean;
  output?: string;
  adj: RateAdjustments;
}

function parseArgs(argv: string[]): CliOptions {
  const args = argv.slice(2);
  const opts: CliOptions = { type: 'IFB', json: false, adj: {} };

  const tradeOverrides: RateAdjustments['tradeOverrides'] = {};
  const materialOverrides: RateAdjustments['materialOverrides'] = {};

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--file':         opts.file    = args[++i]; break;
      case '--type':         opts.type    = (args[++i] as DocumentType); break;
      case '--project':      opts.project = args[++i]; break;
      case '--json':         opts.json    = true; break;
      case '--output':       opts.output  = args[++i]; break;
      case '--labor-mult':   opts.adj.globalLaborMultiplier    = parseFloat(args[++i]); break;
      case '--material-mult':opts.adj.globalMaterialMultiplier = parseFloat(args[++i]); break;
      case '--regional':     opts.adj.regionalFactor           = parseFloat(args[++i]); break;
      case '--oh-profit':    opts.adj.overheadAndProfitPercent = parseFloat(args[++i]); break;
      case '--bond':         opts.adj.bondInsurancePercent     = parseFloat(args[++i]); break;

      case '--trade-rate': {
        const [trade, rate] = args[++i].split('=');
        tradeOverrides[trade as TradeType] = {
          ...tradeOverrides[trade as TradeType],
          hourlyRate: parseFloat(rate),
        };
        break;
      }
      case '--trade-mult': {
        const [trade, mult] = args[++i].split('=');
        tradeOverrides[trade as TradeType] = {
          ...tradeOverrides[trade as TradeType],
          multiplier: parseFloat(mult),
        };
        break;
      }

      default:
        if (!args[i].startsWith('--')) {
          // Positional: treat as file path
          if (!opts.file) opts.file = args[i];
        }
    }
  }

  if (Object.keys(tradeOverrides).length > 0) opts.adj.tradeOverrides = tradeOverrides;
  if (Object.keys(materialOverrides).length > 0) opts.adj.materialOverrides = materialOverrides;

  return opts;
}

// ─── Stdin reader ─────────────────────────────────────────────────────────────

async function readStdin(): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin });
  const lines: string[] = [];
  for await (const line of rl) lines.push(line);
  return lines.join('\n');
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const opts = parseArgs(process.argv);

  // Read document
  let documentText: string;
  if (opts.file) {
    const filePath = path.resolve(opts.file);
    if (!fs.existsSync(filePath)) {
      console.error(`Error: file not found: ${filePath}`);
      process.exit(1);
    }
    documentText = fs.readFileSync(filePath, 'utf-8');
  } else {
    if (process.stdin.isTTY) {
      console.log('Paste the IFB/RFP/RFQ document text, then press Ctrl+D:\n');
    }
    documentText = await readStdin();
  }

  if (!documentText.trim()) {
    console.error('Error: no document text provided.');
    process.exit(1);
  }

  // Auto-detect document type from content if not specified
  const upperText = documentText.toUpperCase();
  if (!process.argv.includes('--type')) {
    if (upperText.includes('INVITATION FOR BID') || upperText.includes('IFB')) {
      opts.type = 'IFB';
    } else if (upperText.includes('REQUEST FOR PROPOSAL') || upperText.includes('RFP')) {
      opts.type = 'RFP';
    } else if (upperText.includes('REQUEST FOR QUOTATION') || upperText.includes('RFQ')) {
      opts.type = 'RFQ';
    }
  }

  console.error(`\nAnalyzing ${opts.type} document...`);
  if (!opts.json) {
    console.error('(streaming estimate analysis — this may take a minute)\n');
  }

  let dotTimer: ReturnType<typeof setInterval> | undefined;
  if (!opts.json && process.stderr.isTTY) {
    dotTimer = setInterval(() => process.stderr.write('.'), 2000);
  }

  try {
    const result = await runEstimator(
      {
        documentType: opts.type,
        documentText,
        projectName: opts.project,
        rateAdjustments: opts.adj,
      },
      // Stream progress indicator to stderr
      opts.json ? undefined : () => {},
    );

    if (dotTimer) {
      clearInterval(dotTimer);
      process.stderr.write('\n');
    }

    if (opts.json) {
      const jsonOutput = JSON.stringify(result, null, 2);
      if (opts.output) {
        fs.writeFileSync(path.resolve(opts.output), jsonOutput, 'utf-8');
        console.log(`Estimate saved to ${opts.output}`);
      } else {
        console.log(jsonOutput);
      }
    } else {
      printEstimate(result);

      if (opts.output) {
        fs.writeFileSync(path.resolve(opts.output), JSON.stringify(result, null, 2), 'utf-8');
        console.error(`\nJSON estimate saved to ${opts.output}`);
      }
    }
  } catch (err) {
    if (dotTimer) clearInterval(dotTimer);
    console.error('\nError:', (err as Error).message);
    process.exit(1);
  }
}

main();
