/**
 * Официальная WhatsApp Business Platform (Cloud API).
 * Пока не заданы WHATSAPP_TOKEN и WHATSAPP_PHONE_NUMBER_ID — работает тестовый режим:
 * сообщения сохраняются в БД, но никуда не отправляются.
 */
export const whatsappEnv = {
  token: process.env.WHATSAPP_TOKEN,
  phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
  verifyToken: process.env.WHATSAPP_VERIFY_TOKEN,
  appSecret: process.env.WHATSAPP_APP_SECRET,
  apiVersion: process.env.WHATSAPP_API_VERSION ?? 'v21.0',
};

export const whatsappConfigured = Boolean(whatsappEnv.token && whatsappEnv.phoneNumberId);
