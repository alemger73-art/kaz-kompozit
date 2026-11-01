import { eq } from 'drizzle-orm';
import { SubmitButton } from '@/components/admin/submit-button';
import { Checkbox, Field, Flash, NotConnected, PageHeader, Panel, TextArea } from '@/components/admin/ui';
import { db } from '@/db/client';
import { companySettings } from '@/db/schema';
import { appMode } from '@/lib/config';
import { saveSettings } from '@/server/admin/actions/system';
import { requireUser } from '@/server/auth/session';
import { telegramConfigured } from '@/server/notify';
import { storageMode } from '@/server/storage';

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  await requireUser('settings');
  const flash = await searchParams;
  const [s] = await db.select().from(companySettings).where(eq(companySettings.id, 1));

  return (
    <>
      <PageHeader title="Настройки компании" description="Название, контакты и тексты сайта. Всё, что здесь пусто, на сайте помечается «Будет указано»." />
      <Flash {...flash} />
      <form action={saveSettings} className="space-y-6">
        <Panel title="Компания и контакты">
          <div className="grid gap-3 md:grid-cols-3">
            <Field label="Название (на сайте)" name="companyName" required defaultValue={s?.companyName ?? 'KAZ KOMPOZIT'} />
            <Field label="Юридическое название (для КП)" name="legalName" defaultValue={s?.legalName ?? ''} />
            <Field label="Режим работы" name="workHours" defaultValue={s?.workHours ?? ''} />
            <Field label="Телефон" name="phone" defaultValue={s?.phone ?? ''} placeholder="+7 7__ ___ __ __" />
            <Field label="WhatsApp" name="whatsapp" defaultValue={s?.whatsapp ?? ''} placeholder="+7 7__ ___ __ __" />
            <Field label="E-mail" name="email" type="email" defaultValue={s?.email ?? ''} />
            <Field label="Город (рус.)" name="cityRu" required defaultValue={s?.cityRu ?? 'Караганда'} />
            <Field label="Город (каз.)" name="cityKk" required defaultValue={s?.cityKk ?? 'Қарағанды'} />
            <Field label="Instagram" name="instagram" defaultValue={s?.instagram ?? ''} />
            <Field className="md:col-span-2" label="Адрес" name="address" defaultValue={s?.address ?? ''} />
            <div className="md:pt-6"><Checkbox label="Адрес подтверждён" name="addressConfirmed" defaultChecked={s?.addressConfirmed} hint="Без отметки адрес и карта не показываются" /></div>
            <Field className="md:col-span-3" label="Ссылка на карту для встраивания (Яндекс, 2ГИС, Google)" name="mapEmbedUrl" defaultValue={s?.mapEmbedUrl ?? ''} />
          </div>
        </Panel>
        <Panel title="Тексты">
          <div className="grid gap-3 md:grid-cols-2">
            <TextArea label="О компании (рус.)" name="aboutRu" rows={5} defaultValue={s?.aboutRu ?? ''} hint="Без выдуманной истории и достижений" />
            <TextArea label="О компании (каз.)" name="aboutKk" rows={5} defaultValue={s?.aboutKk ?? ''} />
            <TextArea label="Условия в КП по умолчанию" name="quoteTerms" rows={3} defaultValue={s?.quoteTerms ?? ''} />
            <Field label="Срок действия КП, дней" name="quoteValidDays" type="number" min={1} defaultValue={s?.quoteValidDays ?? 7} />
          </div>
        </Panel>
        <SubmitButton>Сохранить настройки</SubmitButton>
      </form>
      <Panel title="Состояние окружения" className="mt-6">
        <ul className="space-y-2 text-sm">
          <li>Режим: <b>{appMode === 'production' ? 'боевой (только утверждённые цены)' : 'тестовый (демо-цены с пометкой)'}</b></li>
          <li>Хранилище файлов: <b>{storageMode === 's3' ? 'S3-совместимое' : 'локальная папка (на Railway подключите том или S3)'}</b></li>
        </ul>
        {!telegramConfigured && (
          <div className="mt-4">
            <NotConnected title="Уведомления о заявках в Telegram">Задайте переменные TELEGRAM_BOT_TOKEN и TELEGRAM_CHAT_ID. Пока уведомления видны только в админке.</NotConnected>
          </div>
        )}
      </Panel>
    </>
  );
}
