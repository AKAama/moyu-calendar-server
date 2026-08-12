import type { AppConfig } from './env.js';
import type { ContentField } from './content-safety.js';

interface ReviewResult {
  safe: boolean;
  category: 'normal' | 'sexual' | 'violence' | 'spam' | 'abuse' | 'other';
  reason: string;
  unsafeFields: string[];
}

interface DeepSeekResponse {
  choices?: Array<{
    message?: {
      content?: string | null;
    };
  }>;
}

const REVIEW_TIMEOUT_MS = 3500;

function parseBoolean(value: string | undefined) {
  return value === 'true' || value === '1';
}

export function isContentReviewEnabled(config: AppConfig) {
  return parseBoolean(config.contentReview.enabled) && Boolean(config.contentReview.deepseekApiKey);
}

function buildPrompt(fields: ContentField[]) {
  const payload = Object.fromEntries(fields.map((field) => [field.label, field.value]));
  return `请审核下面用户提交给“午饭盒”的内容是否适合公开展示和入库。它应该是普通饭名和普通用户姓名。

判定为不安全的情况包括：色情、暴力威胁、自伤、赌博、广告引流、辱骂骚扰、违法内容、恶意绕过、明显垃圾内容。
正常菜名、玩笑式但无害的饭名、普通昵称应判定为安全。

请只输出 json，不要输出解释文本。JSON 格式：
{
  "safe": true,
  "category": "normal",
  "reason": "普通午饭名称",
  "unsafeFields": []
}

如果不安全，unsafeFields 只填写实际有问题的字段名，只能从 "item"、"name" 中选择，例如：
{
  "safe": false,
  "category": "spam",
  "reason": "姓名包含广告引流联系方式",
  "unsafeFields": ["name"]
}

待审核内容：
${JSON.stringify(payload)}`;
}

function normalizeReviewResult(value: unknown): ReviewResult {
  const candidate = value as Partial<ReviewResult> | null;
  const category = candidate?.category;
  const allowedCategories = ['normal', 'sexual', 'violence', 'spam', 'abuse', 'other'];

  return {
    safe: candidate?.safe === true,
    category: allowedCategories.includes(category ?? '') ? category as ReviewResult['category'] : 'other',
    reason: typeof candidate?.reason === 'string' ? candidate.reason.slice(0, 120) : 'LLM 内容审核未给出原因',
    unsafeFields: Array.isArray(candidate?.unsafeFields)
      ? candidate.unsafeFields.filter((field) => field === 'item' || field === 'name')
      : [],
  };
}

export async function reviewLunchContentWithLlm(config: AppConfig, fields: ContentField[]) {
  if (!isContentReviewEnabled(config)) {
    return { skipped: true, safe: true, category: 'normal', reason: 'content review disabled', unsafeFields: [] } as const;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REVIEW_TIMEOUT_MS);

  try {
    const response = await fetch(`${config.contentReview.deepseekBaseUrl}/chat/completions`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        authorization: `Bearer ${config.contentReview.deepseekApiKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: config.contentReview.deepseekModel,
        messages: [
          {
            role: 'system',
            content: '你是严格但不过度误伤的中文内容安全审核员。你必须只输出合法 JSON。',
          },
          {
            role: 'user',
            content: buildPrompt(fields),
          },
        ],
        response_format: { type: 'json_object' },
        max_tokens: 180,
        temperature: 0,
        stream: false,
        thinking: { type: 'disabled' },
      }),
    });

    if (!response.ok) {
      return { skipped: false, safe: false, category: 'other', reason: 'LLM 内容审核服务暂时不可用', unsafeFields: [] } as const;
    }

    const data = await response.json() as DeepSeekResponse;
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      return { skipped: false, safe: false, category: 'other', reason: 'LLM 内容审核返回为空', unsafeFields: [] } as const;
    }

    return { skipped: false, ...normalizeReviewResult(JSON.parse(content)) } as const;
  } catch {
    return { skipped: false, safe: false, category: 'other', reason: 'LLM 内容审核请求失败', unsafeFields: [] } as const;
  } finally {
    clearTimeout(timeout);
  }
}
