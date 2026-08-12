export interface ContentBlocklistRule {
  id: number;
  pattern: string;
  patternType: 'exact' | 'contains' | 'regex';
  category: string;
}

export interface ContentField {
  label: string;
  value: string;
}

const MAX_SYMBOL_RATIO = 0.45;
const MIN_SYMBOL_RATIO_LENGTH = 8;

function normalizeForCheck(text: string) {
  return text
    .normalize('NFKC')
    .replace(/\s+/g, '')
    .toLowerCase();
}

function hasTooManySymbols(text: string) {
  const chars = Array.from(text);
  if (chars.length < MIN_SYMBOL_RATIO_LENGTH) return false;

  const symbolCount = chars.filter((char) => !/[\p{Script=Han}a-zA-Z0-9\s]/u.test(char)).length;
  return symbolCount / chars.length > MAX_SYMBOL_RATIO;
}

function matchesRule(value: string, rule: ContentBlocklistRule) {
  const normalizedValue = normalizeForCheck(value);
  const normalizedPattern = normalizeForCheck(rule.pattern);

  if (rule.patternType === 'exact') return normalizedValue === normalizedPattern;
  if (rule.patternType === 'contains') return normalizedValue.includes(normalizedPattern);

  try {
    return new RegExp(rule.pattern, 'iu').test(normalizedValue);
  } catch {
    return false;
  }
}

export function validateLunchContent(fields: ContentField[], rules: ContentBlocklistRule[]) {
  for (const field of fields) {
    const matchedRule = rules.find((rule) => matchesRule(field.value, rule));

    if (matchedRule) {
      return {
        ok: false,
        field: field.label,
        reason: 'blocked_pattern',
        category: matchedRule.category,
        ruleId: matchedRule.id,
      } as const;
    }

    if (hasTooManySymbols(field.value)) {
      return {
        ok: false,
        field: field.label,
        reason: 'too_many_symbols',
        category: 'spam',
      } as const;
    }
  }

  return { ok: true } as const;
}
