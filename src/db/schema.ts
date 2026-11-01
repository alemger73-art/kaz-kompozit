/**
 * Схема базы данных KAZ KOMPOZIT (Drizzle ORM, PostgreSQL).
 *
 * Закупочные цены вынесены в отдельную таблицу purchase_prices.
 * Её импортирует только серверный код админки (src/server/admin/*),
 * публичные модули (src/server/public/*) не имеют к ней доступа.
 */
import {
  pgTable, pgEnum, text, integer, boolean, timestamp, numeric, jsonb, serial,
  uniqueIndex, index,
} from 'drizzle-orm/pg-core';
import { createId } from '../lib/id';

const id = () => text('id').primaryKey().$defaultFn(createId);
const createdAt = () => timestamp('created_at', { withTimezone: true }).notNull().defaultNow();
const updatedAt = () =>
  timestamp('updated_at', { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date());
const money = (name: string) => numeric(name, { precision: 14, scale: 2 });

// ───────────── Перечисления ─────────────

export const roleEnum = pgEnum('role', ['ADMIN', 'MANAGER', 'CONTENT']);
export const availabilityEnum = pgEnum('availability', ['IN_STOCK', 'ON_ORDER', 'OUT_OF_STOCK']);
export const priceTierEnum = pgEnum('price_tier', ['RETAIL', 'WHOLESALE']);
export const buyerTypeEnum = pgEnum('buyer_type', ['PRIVATE', 'WHOLESALE']);
export const leadSourceEnum = pgEnum('lead_source', [
  'CALCULATOR', 'CART', 'QUICK_ORDER', 'CALLBACK', 'CONTACT_FORM', 'WHOLESALE_PRICE',
  'WHOLESALE_SPEC', 'WHOLESALE_REGISTER', 'WHOLESALE_REGULAR', 'QUOTE_REQUEST', 'DELIVERY',
  'WHATSAPP', 'MANUAL',
]);
export const dealStatusEnum = pgEnum('deal_status', [
  'NEW', 'CLARIFYING', 'SUPPLIER_PRICE', 'DELIVERY_CALC', 'QUOTE_READY', 'QUOTE_SENT',
  'NEGOTIATION', 'INVOICED', 'PAID', 'SHIPPED', 'COMPLETED', 'LOST',
]);
export const quoteStatusEnum = pgEnum('quote_status', ['DRAFT', 'APPROVED', 'SENT']);
export const agentRunStatusEnum = pgEnum('agent_run_status', [
  'DONE', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'FAILED',
]);

// ───────────── Пользователи и аудит ─────────────

export const users = pgTable('users', {
  id: id(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  passwordHash: text('password_hash').notNull(),
  role: roleEnum('role').notNull().default('MANAGER'),
  active: boolean('active').notNull().default(true),
  createdAt: createdAt(),
});

export const auditLogs = pgTable('audit_logs', {
  id: id(),
  userId: text('user_id').references(() => users.id),
  action: text('action').notNull(),
  entity: text('entity').notNull(),
  entityId: text('entity_id'),
  details: jsonb('details'),
  createdAt: createdAt(),
}, (t) => [index('audit_created_idx').on(t.createdAt)]);

// ───────────── Настройки и SEO ─────────────

export const companySettings = pgTable('company_settings', {
  id: integer('id').primaryKey().default(1),
  companyName: text('company_name').notNull().default('KAZ KOMPOZIT'),
  legalName: text('legal_name'),
  phone: text('phone'),
  whatsapp: text('whatsapp'),
  email: text('email'),
  cityRu: text('city_ru').notNull().default('Караганда'),
  cityKk: text('city_kk').notNull().default('Қарағанды'),
  address: text('address'),
  addressConfirmed: boolean('address_confirmed').notNull().default(false),
  mapEmbedUrl: text('map_embed_url'),
  workHours: text('work_hours'),
  instagram: text('instagram'),
  telegram: text('telegram'),
  logoUrl: text('logo_url'),
  aboutRu: text('about_ru'),
  aboutKk: text('about_kk'),
  quoteTerms: text('quote_terms'),
  quoteValidDays: integer('quote_valid_days').notNull().default(7),
  updatedAt: updatedAt(),
});

export const seoPages = pgTable('seo_pages', {
  id: id(),
  path: text('path').notNull().unique(),
  titleRu: text('title_ru'),
  descRu: text('desc_ru'),
  titleKk: text('title_kk'),
  descKk: text('desc_kk'),
});

// ───────────── Каталог ─────────────

export const categories = pgTable('categories', {
  id: id(),
  slug: text('slug').notNull().unique(),
  nameRu: text('name_ru').notNull(),
  nameKk: text('name_kk').notNull(),
  sort: integer('sort').notNull().default(0),
});

export type ProductSpec = { labelRu: string; labelKk: string; value: string; verified: boolean };

export const products = pgTable('products', {
  id: id(),
  slug: text('slug').notNull().unique(),
  categoryId: text('category_id').notNull().references(() => categories.id),
  nameRu: text('name_ru').notNull(),
  nameKk: text('name_kk').notNull(),
  diameterMm: numeric('diameter_mm', { precision: 6, scale: 2 }),
  descriptionRu: text('description_ru'),
  descriptionKk: text('description_kk'),
  specs: jsonb('specs').$type<ProductSpec[]>().notNull().default([]),
  massPerMeterKg: numeric('mass_per_meter_kg', { precision: 8, scale: 4 }),
  massVerified: boolean('mass_verified').notNull().default(false),
  /** COIL — бухта, BAR — пруток */
  supplyFormats: text('supply_formats').array().notNull().default([]),
  coilLengthM: integer('coil_length_m'),
  barLengthM: numeric('bar_length_m', { precision: 6, scale: 2 }),
  minOrderM: integer('min_order_m'),
  availability: availabilityEnum('availability').notNull().default('ON_ORDER'),
  stockM: integer('stock_m'),
  leadTimeRu: text('lead_time_ru'),
  leadTimeKk: text('lead_time_kk'),
  applicationsRu: text('applications_ru'),
  applicationsKk: text('applications_kk'),
  images: text('images').array().notNull().default([]),
  published: boolean('published').notNull().default(true),
  sort: integer('sort').notNull().default(0),
  seoTitle: text('seo_title'),
  seoDescription: text('seo_description'),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const suppliers = pgTable('suppliers', {
  id: id(),
  name: text('name').notNull(),
  contactName: text('contact_name'),
  phone: text('phone'),
  email: text('email'),
  city: text('city'),
  verified: boolean('verified').notNull().default(false),
  priceListUpdatedAt: timestamp('price_list_updated_at', { withTimezone: true }),
  notes: text('notes'),
  createdAt: createdAt(),
});

/** ВНУТРЕННИЕ закупочные цены. Никогда не попадают в публичные ответы. */
export const purchasePrices = pgTable('purchase_prices', {
  id: id(),
  productId: text('product_id').notNull().unique()
    .references(() => products.id, { onDelete: 'cascade' }),
  supplierId: text('supplier_id').references(() => suppliers.id),
  pricePerMeter: money('price_per_meter').notNull(),
  note: text('note'),
  updatedAt: updatedAt(),
});

export const salePrices = pgTable('sale_prices', {
  id: id(),
  productId: text('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  tier: priceTierEnum('tier').notNull(),
  pricePerMeter: money('price_per_meter'),
  /** Цена утверждена и показывается клиентам */
  approved: boolean('approved').notNull().default(false),
  /** Демонстрационное значение — видно только в тестовом режиме */
  demo: boolean('demo').notNull().default(false),
  updatedAt: updatedAt(),
}, (t) => [uniqueIndex('sale_price_product_tier').on(t.productId, t.tier)]);

export const discountRules = pgTable('discount_rules', {
  id: id(),
  name: text('name').notNull(),
  minMeters: integer('min_meters').notNull(),
  percent: numeric('percent', { precision: 5, scale: 2 }).notNull(),
  wholesaleOnly: boolean('wholesale_only').notNull().default(true),
  active: boolean('active').notNull().default(true),
});

export const promoCodes = pgTable('promo_codes', {
  id: id(),
  code: text('code').notNull().unique(),
  percent: numeric('percent', { precision: 5, scale: 2 }).notNull(),
  active: boolean('active').notNull().default(true),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  maxUses: integer('max_uses'),
  uses: integer('uses').notNull().default(0),
});

// ───────────── Логистика ─────────────

export const deliveryCities = pgTable('delivery_cities', {
  id: id(),
  slug: text('slug').notNull().unique(),
  nameRu: text('name_ru').notNull(),
  nameKk: text('name_kk').notNull(),
  regionRu: text('region_ru'),
  distanceKm: integer('distance_km'),
  /** Тариф доставки за рейс — только если подтверждён */
  tariff: money('tariff'),
  tariffConfirmed: boolean('tariff_confirmed').notNull().default(false),
  leadTimeRu: text('lead_time_ru'),
  /** Координаты на схеме карты Казахстана, 0..100 */
  mapX: integer('map_x'),
  mapY: integer('map_y'),
  sort: integer('sort').notNull().default(0),
  active: boolean('active').notNull().default(true),
});

export const logisticsPartners = pgTable('logistics_partners', {
  id: id(),
  name: text('name').notNull(),
  phone: text('phone'),
  notes: text('notes'),
  verified: boolean('verified').notNull().default(false),
  published: boolean('published').notNull().default(false),
});

// ───────────── Клиенты, заявки, CRM ─────────────

export const customers = pgTable('customers', {
  id: id(),
  name: text('name').notNull(),
  phone: text('phone').notNull(),
  email: text('email'),
  company: text('company'),
  bin: text('bin'),
  city: text('city'),
  type: buyerTypeEnum('type').notNull().default('PRIVATE'),
  notes: text('notes'),
  createdAt: createdAt(),
}, (t) => [index('customer_phone_idx').on(t.phone)]);

export const leads = pgTable('leads', {
  id: id(),
  number: serial('number').notNull().unique(),
  source: leadSourceEnum('source').notNull(),
  customerId: text('customer_id').notNull().references(() => customers.id),
  city: text('city'),
  buyerType: buyerTypeEnum('buyer_type').notNull().default('PRIVATE'),
  message: text('message'),
  /** Снимок расчёта клиента (без закупочных цен) */
  payload: jsonb('payload'),
  attachments: text('attachments').array().notNull().default([]),
  locale: text('locale').notNull().default('ru'),
  createdAt: createdAt(),
});

export const deals = pgTable('deals', {
  id: id(),
  leadId: text('lead_id').unique().references(() => leads.id),
  customerId: text('customer_id').notNull().references(() => customers.id),
  managerId: text('manager_id').references(() => users.id),
  status: dealStatusEnum('status').notNull().default('NEW'),
  city: text('city'),
  deliveryCost: money('delivery_cost'),
  logisticsNote: text('logistics_note'),
  totalSale: money('total_sale'),
  totalPurchase: money('total_purchase'),
  expectedMargin: money('expected_margin'),
  lostReason: text('lost_reason'),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (t) => [index('deal_status_idx').on(t.status)]);

export const dealItems = pgTable('deal_items', {
  id: id(),
  dealId: text('deal_id').notNull().references(() => deals.id, { onDelete: 'cascade' }),
  productId: text('product_id').notNull().references(() => products.id),
  meters: numeric('meters', { precision: 12, scale: 2 }).notNull(),
  salePrice: money('sale_price'),
  purchasePrice: money('purchase_price'),
});

export const dealEvents = pgTable('deal_events', {
  id: id(),
  dealId: text('deal_id').notNull().references(() => deals.id, { onDelete: 'cascade' }),
  userId: text('user_id').references(() => users.id),
  /** NOTE | STATUS | CALL | WHATSAPP | EMAIL | SYSTEM */
  type: text('type').notNull(),
  text: text('text').notNull(),
  createdAt: createdAt(),
});

export type QuoteLine = {
  productId: string;
  name: string;
  meters: string;
  pricePerMeter: string;
  amount: string;
};

export const quotes = pgTable('quotes', {
  id: id(),
  number: serial('number').notNull().unique(),
  dealId: text('deal_id').notNull().references(() => deals.id, { onDelete: 'cascade' }),
  status: quoteStatusEnum('status').notNull().default('DRAFT'),
  /** Снимок позиций КП — только цены продажи */
  lines: jsonb('lines').$type<QuoteLine[]>().notNull(),
  deliveryCost: money('delivery_cost'),
  discount: money('discount'),
  total: money('total').notNull(),
  terms: text('terms'),
  validUntil: timestamp('valid_until', { withTimezone: true }).notNull(),
  createdById: text('created_by_id').references(() => users.id),
  approvedById: text('approved_by_id').references(() => users.id),
  createdAt: createdAt(),
});

// ───────────── Контент ─────────────

export const projects = pgTable('projects', {
  id: id(),
  title: text('title').notNull(),
  city: text('city'),
  workType: text('work_type'),
  volume: text('volume'),
  description: text('description'),
  images: text('images').array().notNull().default([]),
  /** true — иллюстрация для «Примеров применения», а не реальный объект */
  isIllustration: boolean('is_illustration').notNull().default(false),
  published: boolean('published').notNull().default(false),
  createdAt: createdAt(),
});

export const certificates = pgTable('certificates', {
  id: id(),
  title: text('title').notNull(),
  issuer: text('issuer'),
  fileUrl: text('file_url').notNull(),
  productId: text('product_id').references(() => products.id),
  validUntil: timestamp('valid_until', { withTimezone: true }),
  published: boolean('published').notNull().default(false),
});

export const faqItems = pgTable('faq_items', {
  id: id(),
  qRu: text('q_ru').notNull(),
  aRu: text('a_ru').notNull(),
  qKk: text('q_kk').notNull(),
  aKk: text('a_kk').notNull(),
  sort: integer('sort').notNull().default(0),
});

// ───────────── WhatsApp и ИИ-агенты ─────────────

export type WaState = {
  step?: 'diameter' | 'meters' | 'city' | 'name' | 'done';
  productId?: string;
  meters?: string;
  city?: string;
  name?: string;
};

export const waConversations = pgTable('wa_conversations', {
  id: id(),
  phone: text('phone').notNull().unique(),
  state: jsonb('state').$type<WaState>().notNull().default({}),
  handoff: boolean('handoff').notNull().default(false),
  leadId: text('lead_id'),
  updatedAt: updatedAt(),
});

export const waMessages = pgTable('wa_messages', {
  id: id(),
  conversationId: text('conversation_id').notNull()
    .references(() => waConversations.id, { onDelete: 'cascade' }),
  /** IN | OUT */
  direction: text('direction').notNull(),
  text: text('text').notNull(),
  testMode: boolean('test_mode').notNull().default(true),
  createdAt: createdAt(),
});

export const agentRuns = pgTable('agent_runs', {
  id: id(),
  agent: text('agent').notNull(),
  action: text('action').notNull(),
  input: jsonb('input').notNull(),
  output: jsonb('output'),
  status: agentRunStatusEnum('status').notNull().default('DONE'),
  approvedById: text('approved_by_id').references(() => users.id),
  createdAt: createdAt(),
});

export const prospects = pgTable('prospects', {
  id: id(),
  name: text('name').notNull(),
  city: text('city'),
  source: text('source'),
  url: text('url'),
  notes: text('notes'),
  draftMessage: text('draft_message'),
  /** NEW | CONTACTED | REJECTED | CONVERTED */
  status: text('status').notNull().default('NEW'),
  createdAt: createdAt(),
});

export type DealStatus = (typeof dealStatusEnum.enumValues)[number];
export type LeadSource = (typeof leadSourceEnum.enumValues)[number];
export type BuyerType = (typeof buyerTypeEnum.enumValues)[number];
export type Role = (typeof roleEnum.enumValues)[number];
