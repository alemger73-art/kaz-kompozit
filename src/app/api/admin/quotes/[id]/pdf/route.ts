import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { db } from '@/db/client';
import { companySettings, customers, deals, quotes } from '@/db/schema';
import { audit } from '@/server/audit';
import { can, getCurrentUser } from '@/server/auth/session';
import { renderQuotePdf } from '@/server/pdf/quote-pdf';

export const runtime = 'nodejs';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || !can(user, 'crm')) return new NextResponse(null, { status: 401 });

  const { id } = await params;
  const quote = await db.query.quotes.findFirst({ where: eq(quotes.id, id) });
  if (!quote) return new NextResponse(null, { status: 404 });
  const deal = await db.query.deals.findFirst({ where: eq(deals.id, quote.dealId) });
  const customer = deal && await db.query.customers.findFirst({ where: eq(customers.id, deal.customerId) });
  const [settings] = await db.select().from(companySettings).where(eq(companySettings.id, 1));
  if (!customer) return new NextResponse(null, { status: 404 });

  const pdf = await renderQuotePdf({
    number: quote.number, status: quote.status, createdAt: quote.createdAt, validUntil: quote.validUntil,
    lines: quote.lines, discount: quote.discount, deliveryCost: quote.deliveryCost, total: quote.total, terms: quote.terms,
    company: {
      name: settings?.companyName ?? 'KAZ KOMPOZIT', legalName: settings?.legalName ?? null, phone: settings?.phone ?? null,
      whatsapp: settings?.whatsapp ?? null, email: settings?.email ?? null, city: settings?.cityRu ?? 'Караганда',
      address: settings?.addressConfirmed ? settings.address : null,
    },
    client: { name: customer.name, company: customer.company, bin: customer.bin, phone: customer.phone, city: customer.city },
  });
  await audit(user.id, 'download_pdf', 'quote', id);

  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="KP-${quote.number}.pdf"`,
      'Cache-Control': 'private, no-store',
    },
  });
}
