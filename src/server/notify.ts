/**
 * Уведомления о новых заявках. Канал — Telegram-бот (если заданы TELEGRAM_BOT_TOKEN и TELEGRAM_CHAT_ID).
 * Без настроек уведомление пишется в лог сервера, а в админке видна отметка «новая».
 */
import 'server-only';

export const telegramConfigured = Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID);

export async function notifyManagers(text: string): Promise<void> {
  if (!telegramConfigured) {
    console.info(`[уведомление] ${text}`);
    return;
  }
  try {
    const response = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: process.env.TELEGRAM_CHAT_ID, text, disable_web_page_preview: true }),
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) console.error('Telegram ответил ошибкой', response.status);
  } catch (error) {
    console.error('Не удалось отправить уведомление в Telegram', error);
  }
}
