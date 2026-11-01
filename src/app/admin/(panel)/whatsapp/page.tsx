import { asc, desc, inArray } from 'drizzle-orm';
import { SubmitButton } from '@/components/admin/submit-button';
import { Badge, Field, NotConnected, PageHeader, Panel } from '@/components/admin/ui';
import { db } from '@/db/client';
import { waConversations, waMessages } from '@/db/schema';
import { formatDate } from '@/lib/crm';
import { siteUrl } from '@/lib/config';
import { whatsappConfigured, whatsappEnv } from '@/integrations/whatsapp/config';
import { replyAsManager, simulateIncoming, toggleHandoff } from '@/server/admin/actions/whatsapp';
import { requireUser } from '@/server/auth/session';

export default async function WhatsappPage() {
  await requireUser('integrations');
  const conversations = await db.select().from(waConversations).orderBy(desc(waConversations.updatedAt)).limit(30);
  const messages = conversations.length
    ? await db.select().from(waMessages).where(inArray(waMessages.conversationId, conversations.map((c) => c.id))).orderBy(asc(waMessages.createdAt))
    : [];

  return (
    <>
      <PageHeader title="WhatsApp" description="Официальная WhatsApp Business Platform (Cloud API). Неофициальная автоматизация личного WhatsApp не используется." />
      <div className="space-y-6">
        {whatsappConfigured ? (
          <Panel title="Подключение"><Badge tone="green">Ключи заданы</Badge> <span className="ml-2 text-sm">Вебхук: {siteUrl}/api/whatsapp/webhook {whatsappEnv.appSecret ? '' : '— задайте WHATSAPP_APP_SECRET, иначе входящие отклоняются'}</span></Panel>
        ) : (
          <NotConnected title="WhatsApp Business Platform">
            Работает тестовый режим: бот отвечает в консоли ниже, сообщения клиентам не отправляются.
            Для подключения задайте переменные WHATSAPP_TOKEN, WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_VERIFY_TOKEN и WHATSAPP_APP_SECRET,
            а в кабинете Meta укажите вебхук <b>{siteUrl}/api/whatsapp/webhook</b>.
          </NotConnected>
        )}

        <Panel title="Тестовая консоль бота">
          <form action={simulateIncoming} className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <Field label="Телефон клиента" name="phone" defaultValue="+77000000000" />
            <Field className="flex-1" label="Сообщение клиента" name="text" required placeholder="Здравствуйте / 8 / 500 / Астана / Иван" />
            <SubmitButton>Отправить как клиент</SubmitButton>
          </form>
          <p className="mt-2 text-xs text-graphite-500">Бот уточняет диаметр, метраж, город и имя, затем создаёт заявку в CRM. Слово «менеджер» переключает диалог на человека.</p>
        </Panel>

        {conversations.map((c) => (
          <Panel key={c.id} title={c.phone} actions={
            <div className="flex items-center gap-2">
              {c.handoff ? <Badge tone="orange">Ведёт менеджер</Badge> : <Badge tone="blue">Ведёт бот</Badge>}
              <form action={toggleHandoff}><input type="hidden" name="conversationId" value={c.id} /><SubmitButton variant="outline">{c.handoff ? 'Вернуть боту' : 'Забрать себе'}</SubmitButton></form>
            </div>
          }>
            <div className="max-h-80 space-y-2 overflow-y-auto">
              {messages.filter((m) => m.conversationId === c.id).map((m) => (
                <div key={m.id} className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${m.direction === 'IN' ? 'bg-graphite-100' : 'ml-auto bg-emerald-50'}`}>
                  {m.text}
                  <div className="mt-0.5 text-[10px] text-graphite-400">{formatDate(m.createdAt)}{m.testMode ? ' · тест' : ''}</div>
                </div>
              ))}
            </div>
            <form action={replyAsManager} className="mt-3 flex gap-2">
              <input type="hidden" name="conversationId" value={c.id} />
              <input name="text" required placeholder="Ответ менеджера" className="field flex-1" />
              <SubmitButton variant="dark">Ответить</SubmitButton>
            </form>
          </Panel>
        ))}
      </div>
    </>
  );
}
