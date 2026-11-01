CREATE TYPE "public"."agent_run_status" AS ENUM('DONE', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'FAILED');--> statement-breakpoint
CREATE TYPE "public"."availability" AS ENUM('IN_STOCK', 'ON_ORDER', 'OUT_OF_STOCK');--> statement-breakpoint
CREATE TYPE "public"."buyer_type" AS ENUM('PRIVATE', 'WHOLESALE');--> statement-breakpoint
CREATE TYPE "public"."deal_status" AS ENUM('NEW', 'CLARIFYING', 'SUPPLIER_PRICE', 'DELIVERY_CALC', 'QUOTE_READY', 'QUOTE_SENT', 'NEGOTIATION', 'INVOICED', 'PAID', 'SHIPPED', 'COMPLETED', 'LOST');--> statement-breakpoint
CREATE TYPE "public"."lead_source" AS ENUM('CALCULATOR', 'CART', 'QUICK_ORDER', 'CALLBACK', 'CONTACT_FORM', 'WHOLESALE_PRICE', 'WHOLESALE_SPEC', 'WHOLESALE_REGISTER', 'WHOLESALE_REGULAR', 'QUOTE_REQUEST', 'DELIVERY', 'WHATSAPP', 'MANUAL');--> statement-breakpoint
CREATE TYPE "public"."price_tier" AS ENUM('RETAIL', 'WHOLESALE');--> statement-breakpoint
CREATE TYPE "public"."quote_status" AS ENUM('DRAFT', 'APPROVED', 'SENT');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('ADMIN', 'MANAGER', 'CONTENT');--> statement-breakpoint
CREATE TABLE "agent_runs" (
	"id" text PRIMARY KEY NOT NULL,
	"agent" text NOT NULL,
	"action" text NOT NULL,
	"input" jsonb NOT NULL,
	"output" jsonb,
	"status" "agent_run_status" DEFAULT 'DONE' NOT NULL,
	"approved_by_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text,
	"action" text NOT NULL,
	"entity" text NOT NULL,
	"entity_id" text,
	"details" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name_ru" text NOT NULL,
	"name_kk" text NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "certificates" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"issuer" text,
	"file_url" text NOT NULL,
	"product_id" text,
	"valid_until" timestamp with time zone,
	"published" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "company_settings" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"company_name" text DEFAULT 'KAZ KOMPOZIT' NOT NULL,
	"legal_name" text,
	"phone" text,
	"whatsapp" text,
	"email" text,
	"city_ru" text DEFAULT 'Караганда' NOT NULL,
	"city_kk" text DEFAULT 'Қарағанды' NOT NULL,
	"address" text,
	"address_confirmed" boolean DEFAULT false NOT NULL,
	"map_embed_url" text,
	"work_hours" text,
	"instagram" text,
	"telegram" text,
	"logo_url" text,
	"about_ru" text,
	"about_kk" text,
	"quote_terms" text,
	"quote_valid_days" integer DEFAULT 7 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"phone" text NOT NULL,
	"email" text,
	"company" text,
	"bin" text,
	"city" text,
	"type" "buyer_type" DEFAULT 'PRIVATE' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "deal_events" (
	"id" text PRIMARY KEY NOT NULL,
	"deal_id" text NOT NULL,
	"user_id" text,
	"type" text NOT NULL,
	"text" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "deal_items" (
	"id" text PRIMARY KEY NOT NULL,
	"deal_id" text NOT NULL,
	"product_id" text NOT NULL,
	"meters" numeric(12, 2) NOT NULL,
	"sale_price" numeric(14, 2),
	"purchase_price" numeric(14, 2)
);
--> statement-breakpoint
CREATE TABLE "deals" (
	"id" text PRIMARY KEY NOT NULL,
	"lead_id" text,
	"customer_id" text NOT NULL,
	"manager_id" text,
	"status" "deal_status" DEFAULT 'NEW' NOT NULL,
	"city" text,
	"delivery_cost" numeric(14, 2),
	"logistics_note" text,
	"total_sale" numeric(14, 2),
	"total_purchase" numeric(14, 2),
	"expected_margin" numeric(14, 2),
	"lost_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "deals_lead_id_unique" UNIQUE("lead_id")
);
--> statement-breakpoint
CREATE TABLE "delivery_cities" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name_ru" text NOT NULL,
	"name_kk" text NOT NULL,
	"region_ru" text,
	"distance_km" integer,
	"tariff" numeric(14, 2),
	"tariff_confirmed" boolean DEFAULT false NOT NULL,
	"lead_time_ru" text,
	"map_x" integer,
	"map_y" integer,
	"sort" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "delivery_cities_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "discount_rules" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"min_meters" integer NOT NULL,
	"percent" numeric(5, 2) NOT NULL,
	"wholesale_only" boolean DEFAULT true NOT NULL,
	"active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "faq_items" (
	"id" text PRIMARY KEY NOT NULL,
	"q_ru" text NOT NULL,
	"a_ru" text NOT NULL,
	"q_kk" text NOT NULL,
	"a_kk" text NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leads" (
	"id" text PRIMARY KEY NOT NULL,
	"number" serial NOT NULL,
	"source" "lead_source" NOT NULL,
	"customer_id" text NOT NULL,
	"city" text,
	"buyer_type" "buyer_type" DEFAULT 'PRIVATE' NOT NULL,
	"message" text,
	"payload" jsonb,
	"attachments" text[] DEFAULT '{}' NOT NULL,
	"locale" text DEFAULT 'ru' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "leads_number_unique" UNIQUE("number")
);
--> statement-breakpoint
CREATE TABLE "logistics_partners" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"phone" text,
	"notes" text,
	"verified" boolean DEFAULT false NOT NULL,
	"published" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"category_id" text NOT NULL,
	"name_ru" text NOT NULL,
	"name_kk" text NOT NULL,
	"diameter_mm" numeric(6, 2),
	"description_ru" text,
	"description_kk" text,
	"specs" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"mass_per_meter_kg" numeric(8, 4),
	"mass_verified" boolean DEFAULT false NOT NULL,
	"supply_formats" text[] DEFAULT '{}' NOT NULL,
	"coil_length_m" integer,
	"bar_length_m" numeric(6, 2),
	"min_order_m" integer,
	"availability" "availability" DEFAULT 'ON_ORDER' NOT NULL,
	"stock_m" integer,
	"lead_time_ru" text,
	"lead_time_kk" text,
	"applications_ru" text,
	"applications_kk" text,
	"images" text[] DEFAULT '{}' NOT NULL,
	"published" boolean DEFAULT true NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	"seo_title" text,
	"seo_description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "products_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"city" text,
	"work_type" text,
	"volume" text,
	"description" text,
	"images" text[] DEFAULT '{}' NOT NULL,
	"is_illustration" boolean DEFAULT false NOT NULL,
	"published" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "promo_codes" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"percent" numeric(5, 2) NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"expires_at" timestamp with time zone,
	"max_uses" integer,
	"uses" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "promo_codes_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "prospects" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"city" text,
	"source" text,
	"url" text,
	"notes" text,
	"draft_message" text,
	"status" text DEFAULT 'NEW' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "purchase_prices" (
	"id" text PRIMARY KEY NOT NULL,
	"product_id" text NOT NULL,
	"supplier_id" text,
	"price_per_meter" numeric(14, 2) NOT NULL,
	"note" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "purchase_prices_product_id_unique" UNIQUE("product_id")
);
--> statement-breakpoint
CREATE TABLE "quotes" (
	"id" text PRIMARY KEY NOT NULL,
	"number" serial NOT NULL,
	"deal_id" text NOT NULL,
	"status" "quote_status" DEFAULT 'DRAFT' NOT NULL,
	"lines" jsonb NOT NULL,
	"delivery_cost" numeric(14, 2),
	"discount" numeric(14, 2),
	"total" numeric(14, 2) NOT NULL,
	"terms" text,
	"valid_until" timestamp with time zone NOT NULL,
	"created_by_id" text,
	"approved_by_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "quotes_number_unique" UNIQUE("number")
);
--> statement-breakpoint
CREATE TABLE "sale_prices" (
	"id" text PRIMARY KEY NOT NULL,
	"product_id" text NOT NULL,
	"tier" "price_tier" NOT NULL,
	"price_per_meter" numeric(14, 2),
	"approved" boolean DEFAULT false NOT NULL,
	"demo" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "seo_pages" (
	"id" text PRIMARY KEY NOT NULL,
	"path" text NOT NULL,
	"title_ru" text,
	"desc_ru" text,
	"title_kk" text,
	"desc_kk" text,
	CONSTRAINT "seo_pages_path_unique" UNIQUE("path")
);
--> statement-breakpoint
CREATE TABLE "suppliers" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"contact_name" text,
	"phone" text,
	"email" text,
	"city" text,
	"verified" boolean DEFAULT false NOT NULL,
	"price_list_updated_at" timestamp with time zone,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"password_hash" text NOT NULL,
	"role" "role" DEFAULT 'MANAGER' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "wa_conversations" (
	"id" text PRIMARY KEY NOT NULL,
	"phone" text NOT NULL,
	"state" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"handoff" boolean DEFAULT false NOT NULL,
	"lead_id" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "wa_conversations_phone_unique" UNIQUE("phone")
);
--> statement-breakpoint
CREATE TABLE "wa_messages" (
	"id" text PRIMARY KEY NOT NULL,
	"conversation_id" text NOT NULL,
	"direction" text NOT NULL,
	"text" text NOT NULL,
	"test_mode" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "agent_runs" ADD CONSTRAINT "agent_runs_approved_by_id_users_id_fk" FOREIGN KEY ("approved_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deal_events" ADD CONSTRAINT "deal_events_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deal_events" ADD CONSTRAINT "deal_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deal_items" ADD CONSTRAINT "deal_items_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deal_items" ADD CONSTRAINT "deal_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deals" ADD CONSTRAINT "deals_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deals" ADD CONSTRAINT "deals_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deals" ADD CONSTRAINT "deals_manager_id_users_id_fk" FOREIGN KEY ("manager_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_prices" ADD CONSTRAINT "purchase_prices_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_prices" ADD CONSTRAINT "purchase_prices_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_approved_by_id_users_id_fk" FOREIGN KEY ("approved_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sale_prices" ADD CONSTRAINT "sale_prices_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wa_messages" ADD CONSTRAINT "wa_messages_conversation_id_wa_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."wa_conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_created_idx" ON "audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "customer_phone_idx" ON "customers" USING btree ("phone");--> statement-breakpoint
CREATE INDEX "deal_status_idx" ON "deals" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "sale_price_product_tier" ON "sale_prices" USING btree ("product_id","tier");