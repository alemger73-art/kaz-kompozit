/**
 * Независимый адаптер языковой модели. Провайдер выбирается переменными окружения:
 *   LLM_PROVIDER=anthropic | openai-compatible, LLM_API_KEY, LLM_MODEL, LLM_BASE_URL (для совместимых API).
 * Без ключа агенты работают на шаблонах. Денежные расчёты модель НЕ выполняет никогда.
 */
import 'server-only';

export type ChatMessage = { role: 'user' | 'assistant'; content: string };

export interface LlmProvider {
  readonly name: string;
  complete(system: string, messages: ChatMessage[], maxTokens?: number): Promise<string>;
}

class AnthropicProvider implements LlmProvider {
  readonly name = 'Anthropic';
  constructor(private apiKey: string, private model: string) {}

  async complete(system: string, messages: ChatMessage[], maxTokens = 800): Promise<string> {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': this.apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model: this.model, max_tokens: maxTokens, system, messages }),
      signal: AbortSignal.timeout(60_000),
    });
    if (!response.ok) throw new Error(`LLM ответил ${response.status}`);
    const data = (await response.json()) as { content: Array<{ type: string; text?: string }> };
    return data.content.filter((c) => c.type === 'text').map((c) => c.text).join('\n').trim();
  }
}

class OpenAiCompatibleProvider implements LlmProvider {
  readonly name = 'OpenAI-совместимый API';
  constructor(private apiKey: string, private model: string, private baseUrl: string) {}

  async complete(system: string, messages: ChatMessage[], maxTokens = 800): Promise<string> {
    const response = await fetch(`${this.baseUrl.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.apiKey}`, 'content-type': 'application/json' },
      body: JSON.stringify({ model: this.model, max_tokens: maxTokens, messages: [{ role: 'system', content: system }, ...messages] }),
      signal: AbortSignal.timeout(60_000),
    });
    if (!response.ok) throw new Error(`LLM ответил ${response.status}`);
    const data = (await response.json()) as { choices: Array<{ message: { content: string } }> };
    return data.choices[0]?.message.content.trim() ?? '';
  }
}

export function getLlm(): LlmProvider | null {
  const key = process.env.LLM_API_KEY;
  const model = process.env.LLM_MODEL;
  if (!key || !model) return null;
  if (process.env.LLM_PROVIDER === 'openai-compatible' && process.env.LLM_BASE_URL) {
    return new OpenAiCompatibleProvider(key, model, process.env.LLM_BASE_URL);
  }
  return new AnthropicProvider(key, model);
}

export const llmStatus = () => {
  const llm = getLlm();
  return llm ? { connected: true as const, name: llm.name, model: process.env.LLM_MODEL } : { connected: false as const };
};
