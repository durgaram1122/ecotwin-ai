import { z } from 'zod';
import type {
  AnalysisIssue,
  Facility,
  FacilitySnapshot,
  Severity
} from './types';

const VALID_CATEGORIES = [
  'occupancy',
  'energy',
  'water',
  'waste',
  'resource_utilization',
  'no_confirmed_issue'
] as const;

const categorySchema = z.preprocess((val) => {
  if (typeof val === 'string') {
    const c = val.toLowerCase().trim().replace(/[\s-]+/g, '_');
    if (VALID_CATEGORIES.includes(c as (typeof VALID_CATEGORIES)[number])) return c;
    if (c.includes('energy') || c.includes('electric') || c.includes('power') || c.includes('light')) return 'energy';
    if (c.includes('water') || c.includes('leak') || c.includes('plumb')) return 'water';
    if (c.includes('waste') || c.includes('trash') || c.includes('garbage')) return 'waste';
    if (c.includes('occupan') || c.includes('people') || c.includes('crowd')) return 'occupancy';
    if (c.includes('resource') || c.includes('utiliz')) return 'resource_utilization';
    if (c.includes('none') || c.includes('no_issue') || c.includes('clear')) return 'no_confirmed_issue';
  }
  return 'resource_utilization';
}, z.enum([
  'occupancy',
  'energy',
  'water',
  'waste',
  'resource_utilization',
  'no_confirmed_issue'
]));

const severitySchema = z.preprocess((val) => {
  if (typeof val === 'string') {
    const s = val.toLowerCase().trim();
    if (s === 'low' || s === 'medium' || s === 'high' || s === 'critical') return s;
    if (s === 'warn' || s === 'warning' || s === 'moderate') return 'medium';
    if (s === 'severe' || s === 'danger') return 'critical';
    if (s === 'info' || s === 'minor') return 'low';
  }
  return 'low';
}, z.enum(['low', 'medium', 'high', 'critical']));

const confidenceSchema = z.preprocess((val) => {
  if (val === null || val === undefined) return null;
  const num = typeof val === 'string' ? parseFloat(val) : Number(val);
  if (isNaN(num)) return null;
  if (num > 1 && num <= 100) return num / 100;
  return Math.max(0, Math.min(1, num));
}, z.number().min(0).max(1).nullable());

const issueSchema = z.object({
  category: categorySchema,
  title: z.string().min(1).max(160),
  evidence: z.string().min(1).max(900),
  severity: severitySchema,
  confidence: confidenceSchema,
  recommendedAction: z.string().min(1).max(500)
});

const analysisSchema = z.object({
  summary: z.string().min(1).max(1200),
  limitations: z.preprocess(
    (val) => (Array.isArray(val) ? val.map(String) : []),
    z.array(z.string().min(1).max(300)).max(8)
  ),
  issues: z.preprocess(
    (val) => (Array.isArray(val) ? val : []),
    z.array(issueSchema).max(8)
  ),
  overallRecommendation: z.string().min(1).max(800)
});

export type ValidatedAnalysis = z.infer<typeof analysisSchema>;

const defaultVisionModel = 'gemini-3.1-flash-lite';
const MAX_ATTEMPTS = 4;
const REQUEST_TIMEOUT_MS = 45_000;

type GeminiResponse = {
  error?: {
    code?: number;
    status?: string;
    message?: string;
  };
  candidates?: Array<{
    finishReason?: string;
    content?: {
      parts?: Array<{ text?: string; thought?: boolean }>;
    };
  }>;
};

function configuredModelName() {
  return (
    process.env.GEMINI_MODEL?.trim() || defaultVisionModel
  ).replace(/^models\//, '');
}

function configuredModel() {
  const key = process.env.GEMINI_API_KEY;
  const model = configuredModelName();

  if (!key) {
    throw new Error('AI_NOT_CONFIGURED');
  }

  return { key, model };
}

export function getGeminiConfigStatus() {
  return {
    configured: Boolean(process.env.GEMINI_API_KEY),
    model: configuredModelName()
  };
}

function stripTrailingCommas(str: string): string {
  return str.replace(/,\s*([\]}])/g, '$1');
}

function parseJson(text: string) {
  const cleaned = text
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    try {
      return JSON.parse(stripTrailingCommas(cleaned));
    } catch {
      const start = cleaned.indexOf('{');
      const end = cleaned.lastIndexOf('}');

      if (start >= 0 && end > start) {
        const slice = cleaned.slice(start, end + 1);
        try {
          return JSON.parse(slice);
        } catch {
          try {
            return JSON.parse(stripTrailingCommas(slice));
          } catch {
            throw new Error('AI_INVALID_JSON');
          }
        }
      }

      throw new Error('AI_INVALID_JSON');
    }
  }
}

function wait(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}

function isRetryableStatus(status: number) {
  return status === 429 || (status >= 500 && status <= 599);
}

async function callGemini(
  contents: unknown[],
  json = true
): Promise<string> {
  const { key, model } = configuredModel();

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      REQUEST_TIMEOUT_MS
    );

    let response: Response;

    try {
      response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`,
        {
          method: 'POST',
          headers: {
            'content-type': 'application/json'
          },
          signal: controller.signal,
          body: JSON.stringify({
            contents,
            generationConfig: json
              ? {
                  temperature: 0.15,
                  responseMimeType: 'application/json'
                }
              : {
                  temperature: 0.35
                }
          })
        }
      );
    } catch (error) {
      clearTimeout(timeout);

      const timedOut =
        error instanceof Error && error.name === 'AbortError';

      console.error('[Gemini] request failed', {
        model,
        attempt,
        timedOut,
        errorName:
          error instanceof Error ? error.name : 'unknown'
      });

      if (attempt < MAX_ATTEMPTS) {
        const backoffMs = Math.min(
          1000 * 2 ** (attempt - 1) + Math.floor(Math.random() * 500),
          8000
        );
        await wait(backoffMs);
        continue;
      }

      throw new Error(
        timedOut ? 'AI_TIMEOUT' : 'AI_NETWORK_ERROR'
      );
    } finally {
      clearTimeout(timeout);
    }

    let payload: GeminiResponse;

    try {
      payload = (await response.json()) as GeminiResponse;
    } catch {
      console.error('[Gemini] upstream response was not valid JSON', {
        model,
        httpStatus: response.status,
        attempt
      });

      if (
        isRetryableStatus(response.status) &&
        attempt < MAX_ATTEMPTS
      ) {
        const backoffMs = Math.min(
          1000 * 2 ** (attempt - 1) + Math.floor(Math.random() * 500),
          8000
        );
        await wait(backoffMs);
        continue;
      }

      throw new Error(
        response.status >= 500
          ? 'AI_PROVIDER_UNAVAILABLE'
          : 'AI_PROVIDER_ERROR'
      );
    }

    const effectiveStatus = payload.error?.code || response.status;

    if (!response.ok || payload.error) {
      console.error('[Gemini] upstream error', {
        model,
        httpStatus: response.status,
        effectiveStatus,
        providerCode: payload.error?.code,
        providerStatus: payload.error?.status,
        providerMessage: payload.error?.message,
        attempt
      });

      if (
        isRetryableStatus(effectiveStatus) &&
        attempt < MAX_ATTEMPTS
      ) {
        const backoffMs = Math.min(
          1000 * 2 ** (attempt - 1) + Math.floor(Math.random() * 500),
          8000
        );
        await wait(backoffMs);
        continue;
      }

      if (effectiveStatus === 401 || effectiveStatus === 403) {
        throw new Error('AI_INVALID_KEY');
      }

      if (effectiveStatus === 404) {
        throw new Error('AI_MODEL_UNAVAILABLE');
      }

      if (effectiveStatus === 429) {
        throw new Error('AI_QUOTA_EXCEEDED');
      }

      if (effectiveStatus === 400) {
        throw new Error('AI_REQUEST_INVALID');
      }

      if (effectiveStatus >= 500 && effectiveStatus <= 599) {
        throw new Error('AI_PROVIDER_UNAVAILABLE');
      }

      throw new Error('AI_PROVIDER_ERROR');
    }

    const candidate = payload.candidates?.[0];
    const nonThoughtText = candidate?.content?.parts
      ?.filter((part) => !part.thought)
      ?.map((part) => part.text || '')
      ?.join('')
      ?.trim();

    const allPartsText = candidate?.content?.parts
      ?.map((part) => part.text || '')
      ?.join('')
      ?.trim();

    const text = nonThoughtText || allPartsText;

    if (!text) {
      throw new Error('AI_EMPTY_RESPONSE');
    }

    return text;
  }

  throw new Error('AI_PROVIDER_UNAVAILABLE');
}

export async function analyzeCampusImage(input: {
  facility: Facility;
  imageDataUrl: string;
}): Promise<ValidatedAnalysis & { model: string }> {
  const { model } = configuredModel();

  const [header, data] = input.imageDataUrl.split(',', 2);

  if (!header || !data) {
    throw new Error('AI_INVALID_IMAGE');
  }

  const mimeType =
    header.match(/data:(.*?);base64/)?.[1] || 'image/jpeg';

  if (!mimeType.startsWith('image/')) {
    throw new Error('AI_INVALID_IMAGE');
  }

  const prompt = `You are a careful visual sustainability auditor. Analyze only visible evidence in this still image from the facility "${input.facility.name}" (${input.facility.type}, room ${input.facility.room}). Return exactly one JSON object with these keys and types: summary (string), limitations (array of strings), issues (array), and overallRecommendation (string). Each issues item must use exactly these keys: category (one of occupancy, energy, water, waste, resource_utilization, no_confirmed_issue), title (string), evidence (string), severity (one of low, medium, high, critical), confidence (number from 0 to 1 or null), and recommendedAction (string). Do not use alternate keys such as type or explanation. Do not claim hidden leaks, actual electricity/water consumption, how long a room was empty, or operating states that cannot be seen. Occupancy is an estimate from this still image. If evidence is insufficient, return one no_confirmed_issue item with title, evidence, confidence null, recommendedAction, and severity low. JSON only; no markdown fences.`;

  const text = await callGemini([
    {
      role: 'user',
      parts: [
        { text: prompt },
        {
          inline_data: {
            mime_type: mimeType,
            data
          }
        }
      ]
    }
  ]);

  let result: ValidatedAnalysis;

  try {
    result = analysisSchema.parse(parseJson(text));
  } catch (error) {
    console.error('[Gemini] response schema validation failed', {
      model,
      issuePaths:
        error instanceof z.ZodError
          ? error.issues
              .slice(0, 8)
              .map((issue) => issue.path.join('.'))
          : []
    });

    throw new Error(
      error instanceof z.ZodError
        ? 'AI_INVALID_RESPONSE'
        : 'AI_INVALID_JSON'
    );
  }

  return { ...result, model };
}

export async function generateAdvisorText(input: {
  question: string;
  facility?: FacilitySnapshot;
  context: string;
}) {
  const prompt = `You are EcoTwin AI's sustainability advisor. Use the provided application context, stay honest about simulated readings and visible evidence, and answer the operator's request with concise, actionable markdown. If evidence is insufficient, say what needs verification.

REQUEST: ${input.question}

FACILITY: ${input.facility?.name ?? 'Campus-wide'}

CONTEXT:
${input.context}`;

  return callGemini(
    [
      {
        role: 'user',
        parts: [{ text: prompt }]
      }
    ],
    false
  );
}

export function validateIssues(issues: AnalysisIssue[]) {
  return issues
    .filter((issue) => issue.title && issue.evidence)
    .slice(0, 8);
}

export function topSeverity(issues: AnalysisIssue[]): Severity {
  const rank: Record<Severity, number> = {
    low: 1,
    medium: 2,
    high: 3,
    critical: 4
  };

  return issues.reduce<Severity>(
    (best, issue) =>
      rank[issue.severity] > rank[best]
        ? issue.severity
        : best,
    'low'
  );
}