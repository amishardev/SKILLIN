import 'server-only';

import { GoogleGenerativeAI } from '@google/generative-ai';
import { serverEnv, hasGemini } from '@/lib/env';

/**
 * Thin Gemini wrapper.
 *
 * Every call site must tolerate `null`, the product is fully functional
 * without an API key, and an AI failure degrades to the deterministic path
 * rather than surfacing an error or, worse, fabricated data.
 */

let client: GoogleGenerativeAI | null = null;

function getClient(): GoogleGenerativeAI | null {
  if (!hasGemini()) return null;
  client ??= new GoogleGenerativeAI(serverEnv.geminiApiKey);
  return client;
}

export function geminiAvailable(): boolean {
  return hasGemini();
}

const DEFAULT_TIMEOUT_MS = 25000;

/**
 * Generate text. Returns null on any failure, missing key, timeout, quota,
 * safety block or network error.
 */
export async function generate(
  prompt: string,
  options: { json?: boolean; timeoutMs?: number; temperature?: number } = {}): Promise<string | null> {
  const genAI = getClient();
  if (!genAI) return null;

  const { json = false, timeoutMs = DEFAULT_TIMEOUT_MS, temperature = 0.2 } = options;

  const model = genAI.getGenerativeModel({
    model: serverEnv.geminiModel,
    generationConfig: {
      temperature, ...(json ? { responseMimeType: 'application/json' } : {}),
    },
  });

  const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), timeoutMs));

  try {
    const result = await Promise.race([model.generateContent(prompt), timeout]);
    if (!result) return null;
    const text = result.response.text().trim();
    return text.length > 0 ? text : null;
  } catch (err) {
    console.error('[gemini] generation failed:', err instanceof Error ? err.message : err);
    return null;
  }
}

/**
 * Generate and parse JSON.
 *
 * Models occasionally wrap JSON in a markdown fence even when asked not to, so
 * the fence is stripped before parsing. Returns null rather than throwing:
 * callers fall back to deterministic output.
 */
export async function generateJson<T>(
  prompt: string,
  validate: (value: unknown) => T | null,
  options: { timeoutMs?: number; temperature?: number } = {}): Promise<T | null> {
  const raw = await generate(prompt, { ...options, json: true });
  if (!raw) return null;

  const cleaned = raw
    .replace(/^\s*```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/, '')
    .trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    console.error('[gemini] response was not valid JSON');
    return null;
  }

  try {
    return validate(parsed);
  } catch (err) {
    console.error('[gemini] response failed schema validation:', err);
    return null;
  }
}
