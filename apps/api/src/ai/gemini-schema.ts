import { z } from 'zod';

/**
 * Gemini's structured-output mode implements a subset of JSON Schema. Feeding
 * it a full Zod conversion reliably produces a provider-side schema error,
 * because Zod emits constraint keywords (`minItems`, `maximum`, `$schema`, …)
 * that Gemini rejects.
 *
 * Validation strength is not lost by stripping them: the same Zod schema is
 * still applied to the model's reply on the way back in. The wire schema only
 * needs to describe the *shape*.
 */

const SUPPORTED_KEYWORDS = new Set([
  'type',
  'properties',
  'required',
  'items',
  'enum',
  'description',
  'additionalProperties',
  'format',
  'nullable',
  'title',
  'anyOf',
]);

export function toGeminiSchema(schema: z.ZodType): Record<string, unknown> {
  const converted = z.toJSONSchema(schema, {
    io: 'input',
    unrepresentable: 'any',
  }) as Record<string, unknown>;

  return sanitize(converted);
}

function sanitize(node: unknown): Record<string, unknown> {
  if (Array.isArray(node)) {
    return { anyOf: node.map((entry) => sanitize(entry)) };
  }
  if (node === null || typeof node !== 'object') {
    return {};
  }

  const source = node as Record<string, unknown>;
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(source)) {
    if (!SUPPORTED_KEYWORDS.has(key)) continue;

    if (key === 'properties' && value && typeof value === 'object') {
      const props: Record<string, unknown> = {};
      for (const [propName, propSchema] of Object.entries(value as Record<string, unknown>)) {
        props[propName] = sanitize(propSchema);
      }
      result.properties = props;
      continue;
    }

    if (key === 'items') {
      result.items = sanitize(value);
      continue;
    }

    if (key === 'anyOf' && Array.isArray(value)) {
      result.anyOf = value.map((entry) => sanitize(entry));
      continue;
    }

    result[key] = value;
  }

  return result;
}