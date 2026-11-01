import type { DealStatus, LeadSource } from '@/db/schema';

export const DEAL_STATUSES: DealStatus[] = [
  'NEW', 'CLARIFYING', 'SUPPLIER_PRICE', 'DELIVERY_CALC', 'QUOTE_READY', 'QUOTE_SENT',
  'NEGOTIATION', 'INVOICED', 'PAID', 'SHIPPED', 'COMPLETED', 'LOST',
];

export const DEAL_STATUS_LABELS: Record<DealStatus, string> = {
  NEW: 'Новая заявка',
  CLARIFYING: 'Уточнение потребности',
  SUPPLIER_PRICE: 'Запрос цены поставщику',
  DELIVERY_CALC: 'Расчёт доставки',
  QUOTE_READY: 'КП подготовлено',
  QUOTE_SENT: 'КП отправлено',
  NEGOTIATION: 'Переговоры',
  INVOICED: 'Счёт выставлен',
  PAID: 'Оплачено',
  SHIPPED: 'Отгружено',
  COMPLETED: 'Завершено',
  LOST: 'Отказ',
};

export const DEAL_STATUS_TONE: Record<DealStatus, 'gray' | 'green' | 'orange' | 'red' | 'yellow' | 'blue'> = {
  NEW: 'orange', CLARIFYING: 'blue', SUPPLIER_PRICE: 'blue', DELIVERY_CALC: 'blue', QUOTE_READY: 'yellow',
  QUOTE_SENT: 'yellow', NEGOTIATION: 'yellow', INVOICED: 'green', PAID: 'green', SHIPPED: 'green',
  COMPLETED: 'gray', LOST: 'red',
};

export const OPEN_STATUSES = DEAL_STATUSES.filter((s) => s !== 'COMPLETED' && s !== 'LOST');

export const SOURCE_LABELS: Record<LeadSource, string> = {
  CALCULATOR: 'Калькулятор', CART: 'Корзина', QUICK_ORDER: 'Быстрый заказ', CALLBACK: 'Обратный звонок',
  CONTACT_FORM: 'Форма контактов', WHOLESALE_PRICE: 'Запрос оптового прайса', WHOLESALE_SPEC: 'Спецификация',
  WHOLESALE_REGISTER: 'Регистрация компании', WHOLESALE_REGULAR: 'Регулярные поставки', QUOTE_REQUEST: 'Запрос КП',
  DELIVERY: 'Расчёт доставки', WHATSAPP: 'WhatsApp', MANUAL: 'Вручную',
};

export function formatDate(value: Date | string | null | undefined, withTime = true): string {
  if (!value) return '—';
  return new Intl.DateTimeFormat('ru-RU', {
    timeZone: 'Asia/Almaty', day: '2-digit', month: '2-digit', year: 'numeric',
    ...(withTime && { hour: '2-digit', minute: '2-digit' }),
  }).format(new Date(value));
}
