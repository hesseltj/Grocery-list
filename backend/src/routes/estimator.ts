import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { runEstimator } from '../estimator/agent';
import type { RateAdjustments, TradeType, MaterialCategory } from '../estimator/types';

export const estimatorRouter = Router();

// ─── Request schema ───────────────────────────────────────────────────────────

const TradeOverrideSchema = z.object({
  hourlyRate: z.number().positive().optional(),
  multiplier: z.number().positive().optional(),
});

const MaterialOverrideSchema = z.object({
  multiplier: z.number().positive().optional(),
  markupPercent: z.number().min(0).max(100).optional(),
});

const EstimateRequestSchema = z.object({
  documentType: z.enum(['IFB', 'RFP', 'RFQ']),
  documentText: z.string().min(50, 'Document text is too short'),
  projectName: z.string().optional(),
  rateAdjustments: z.object({
    globalLaborMultiplier:    z.number().positive().optional(),
    globalMaterialMultiplier: z.number().positive().optional(),
    regionalFactor:           z.number().positive().optional(),
    overheadAndProfitPercent: z.number().min(0).max(100).optional(),
    bondInsurancePercent:     z.number().min(0).max(20).optional(),
    tradeOverrides:    z.record(TradeOverrideSchema).optional(),
    materialOverrides: z.record(MaterialOverrideSchema).optional(),
  }).optional(),
});

// ─── POST /v1/estimate  (SSE streaming) ───────────────────────────────────────
//
// Returns a text/event-stream with three event types:
//   event: progress   data: {"text": "<LLM token>"}
//   event: result     data: { breakdown: {...}, proposal: {...} }
//   event: error      data: {"message": "<reason>"}
//
estimatorRouter.post('/', async (req: Request, res: Response): Promise<void> => {
  const parsed = EstimateRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // disable nginx buffering
  res.flushHeaders();

  const send = (event: string, data: unknown) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    (res as any).flush?.(); // compression middleware may buffer — force flush
  };

  try {
    const result = await runEstimator(
      {
        documentType: parsed.data.documentType,
        documentText: parsed.data.documentText,
        projectName:  parsed.data.projectName,
        rateAdjustments: parsed.data.rateAdjustments as RateAdjustments | undefined,
      },
      (chunk) => send('progress', { text: chunk }),
    );

    send('result', result);
  } catch (err) {
    send('error', { message: (err as Error).message });
  }

  res.end();
});
