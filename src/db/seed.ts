/**
 * Начальное наполнение БД. Повторный запуск безопасен: существующие записи не дублируются.
 * Технические характеристики, длины бухт и цены продажи — ДЕМОНСТРАЦИОННЫЕ, помечены
 * как неподтверждённые и должны быть проверены в админке.
 */
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { db, schema } from './client';
import type { ProductSpec } from './schema';

const DIAMETERS = [
  { mm: 6, purchase: '95', demoRetail: '150', demoWholesale: '130', coil: 100, demoMass: '0.05' },
  { mm: 8, purchase: '140', demoRetail: '210', demoWholesale: '185', coil: 100, demoMass: '0.08' },
  { mm: 10, purchase: '165', demoRetail: '250', demoWholesale: '220', coil: 100, demoMass: '0.12' },
  { mm: 12, purchase: '190', demoRetail: '290', demoWholesale: '255', coil: 50, demoMass: '0.20' },
];

const CITIES: Array<[slug: string, ru: string, kk: string, region: string, x: number, y: number]> = [
  ['karaganda', 'Караганда', 'Қарағанды', 'Карагандинская область', 58, 52],
  ['astana', 'Астана', 'Астана', 'город республиканского значения', 55, 36],
  ['almaty', 'Алматы', 'Алматы', 'город республиканского значения', 70, 82],
  ['shymkent', 'Шымкент', 'Шымкент', 'город республиканского значения', 44, 86],
  ['pavlodar', 'Павлодар', 'Павлодар', 'Павлодарская область', 70, 28],
  ['kostanay', 'Костанай', 'Қостанай', 'Костанайская область', 34, 24],
  ['kokshetau', 'Кокшетау', 'Көкшетау', 'Акмолинская область', 50, 24],
  ['aktobe', 'Актобе', 'Ақтөбе', 'Актюбинская область', 20, 40],
  ['ust-kamenogorsk', 'Усть-Каменогорск', 'Өскемен', 'Восточно-Казахстанская область', 86, 46],
  ['other', 'Другой город Казахстана', 'Қазақстанның басқа қаласы', 'по согласованию', 0, 0],
];

function specsFor(mm: number): ProductSpec[] {
  return [
    { labelRu: 'Тип', labelKk: 'Түрі', value: 'Стеклокомпозитная (АСК)', verified: true },
    { labelRu: 'Номинальный диаметр', labelKk: 'Номиналды диаметрі', value: `${mm} мм`, verified: true },
    { labelRu: 'Предел прочности при растяжении', labelKk: 'Созылу беріктігі', value: 'Указывается по паспорту качества партии', verified: false },
    { labelRu: 'Модуль упругости', labelKk: 'Серпімділік модулі', value: 'Указывается по паспорту качества партии', verified: false },
    { labelRu: 'Нормативный документ', labelKk: 'Нормативтік құжат', value: 'Уточняется у поставщика', verified: false },
  ];
}

async function seedSettings() {
  await db.insert(schema.companySettings).values({
    id: 1,
    companyName: 'KAZ KOMPOZIT',
    workHours: 'Пн–Сб, 9:00–18:00',
    aboutRu:
      'KAZ KOMPOZIT поставляет стеклокомпозитную арматуру из Караганды по всему Казахстану. ' +
      'Помогаем подобрать диаметр, рассчитать объём и стоимость, готовим коммерческие предложения ' +
      'и организуем доставку с привлечением транспортных компаний.',
    aboutKk:
      'KAZ KOMPOZIT шыны композитті арматураны Қарағандыдан бүкіл Қазақстанға жеткізеді. ' +
      'Диаметрді таңдауға, көлем мен құнды есептеуге көмектесеміз, коммерциялық ұсыныстар дайындаймыз ' +
      'және көлік компанияларын тарта отырып жеткізуді ұйымдастырамыз.',
    quoteTerms:
      'Цены указаны в тенге. Срок поставки и стоимость доставки подтверждаются менеджером. ' +
      'Для несущих конструкций применение арматуры определяется проектным расчётом.',
  }).onConflictDoNothing();
}

async function seedCatalog() {
  const [category] = await db.insert(schema.categories)
    .values({ slug: 'steklokompozitnaya-armatura', nameRu: 'Стеклокомпозитная арматура', nameKk: 'Шыны композитті арматура', sort: 1 })
    .onConflictDoNothing().returning();
  await db.insert(schema.categories)
    .values({ slug: 'soputstvuyushchie-tovary', nameRu: 'Сопутствующие товары', nameKk: 'Ілеспе тауарлар', sort: 2 })
    .onConflictDoNothing();

  const categoryId = category?.id
    ?? (await db.query.categories.findFirst({ where: eq(schema.categories.slug, 'steklokompozitnaya-armatura') }))!.id;

  const [supplier] = await db.insert(schema.suppliers)
    .values({ name: 'Основной поставщик (переименуйте)', verified: false, notes: 'Создан автоматически при установке' })
    .returning();

  for (const [index, d] of DIAMETERS.entries()) {
    const slug = `armatura-${d.mm}-mm`;
    const exists = await db.query.products.findFirst({ where: eq(schema.products.slug, slug) });
    if (exists) continue;

    const [product] = await db.insert(schema.products).values({
      slug,
      categoryId,
      nameRu: `Стеклокомпозитная арматура ${d.mm} мм`,
      nameKk: `Шыны композитті арматура ${d.mm} мм`,
      diameterMm: String(d.mm),
      descriptionRu:
        `Стеклокомпозитная арматура диаметром ${d.mm} мм. Не подвержена коррозии, легче стальной, ` +
        'удобна в транспортировке. Подбор диаметра для несущих конструкций выполняется по проекту.',
      descriptionKk:
        `Диаметрі ${d.mm} мм шыны композитті арматура. Коррозияға ұшырамайды, болаттан жеңіл, ` +
        'тасымалдауға ыңғайлы. Көтергіш конструкциялар үшін диаметр жоба бойынша таңдалады.',
      specs: specsFor(d.mm),
      massPerMeterKg: d.demoMass,
      massVerified: false,
      supplyFormats: ['COIL', 'BAR'],
      coilLengthM: d.coil,
      barLengthM: '6',
      minOrderM: d.coil,
      availability: 'ON_ORDER',
      leadTimeRu: 'Уточняется менеджером',
      leadTimeKk: 'Менеджер нақтылайды',
      applicationsRu: 'Отмостки, дорожки, благоустройство, конструкции с требованиями к коррозионной стойкости',
      applicationsKk: 'Соқпақтар, жолдар, абаттандыру, коррозияға төзімділік талап етілетін конструкциялар',
      sort: index,
      seoTitle: `Стеклокомпозитная арматура ${d.mm} мм — купить в Караганде, доставка по Казахстану`,
      seoDescription: `Композитная арматура ${d.mm} мм оптом и в розницу. Расчёт стоимости, коммерческое предложение, доставка по Казахстану.`,
    }).returning();

    await db.insert(schema.purchasePrices).values({
      productId: product.id, supplierId: supplier.id, pricePerMeter: d.purchase,
      note: 'Ориентировочная цена поставщика',
    });
    await db.insert(schema.salePrices).values([
      { productId: product.id, tier: 'RETAIL', pricePerMeter: d.demoRetail, approved: false, demo: true },
      { productId: product.id, tier: 'WHOLESALE', pricePerMeter: d.demoWholesale, approved: false, demo: true },
    ]);
  }
}

async function seedReferenceData() {
  if ((await db.select().from(schema.deliveryCities).limit(1)).length === 0) {
    await db.insert(schema.deliveryCities).values(CITIES.map(([slug, nameRu, nameKk, regionRu, mapX, mapY], sort) => ({
      slug, nameRu, nameKk, regionRu, mapX: mapX || null, mapY: mapY || null, sort,
      leadTimeRu: 'Сроки и стоимость рассчитывает менеджер',
    })));
  }

  if ((await db.select().from(schema.discountRules).limit(1)).length === 0) {
    await db.insert(schema.discountRules).values([
      { name: 'Демо: опт от 2 000 м', minMeters: 2000, percent: '3', wholesaleOnly: true },
      { name: 'Демо: опт от 10 000 м', minMeters: 10000, percent: '5', wholesaleOnly: true },
    ]);
  }

  if ((await db.select().from(schema.faqItems).limit(1)).length === 0) {
    await db.insert(schema.faqItems).values([
      {
        qRu: 'Можно ли заменить стальную арматуру композитной того же диаметра?',
        aRu: 'Не всегда. Композит и сталь отличаются по модулю упругости и поведению под нагрузкой. Для несущих конструкций замена допускается только по проектному расчёту.',
        qKk: 'Болат арматураны сол диаметрлі композиттімен ауыстыруға бола ма?',
        aKk: 'Әрқашан емес. Композит пен болаттың серпімділік модулі әртүрлі. Көтергіш конструкциялар үшін ауыстыру тек жобалық есеп бойынша рұқсат етіледі.',
        sort: 1,
      },
      {
        qRu: 'Как рассчитывается доставка?',
        aRu: 'Доставку организуем с привлечением транспортных компаний по согласованию. Стоимость зависит от города и объёма и рассчитывается менеджером.',
        qKk: 'Жеткізу қалай есептеледі?',
        aKk: 'Жеткізуді келісім бойынша көлік компанияларын тарта отырып ұйымдастырамыз. Құны қала мен көлемге байланысты, оны менеджер есептейді.',
        sort: 2,
      },
      {
        qRu: 'Есть ли минимальный заказ?',
        aRu: 'Минимальный объём указан в карточке каждого товара. Для небольших объёмов уточните условия у менеджера.',
        qKk: 'Ең аз тапсырыс бар ма?',
        aKk: 'Ең аз көлем әр тауардың карточкасында көрсетілген. Шағын көлемдер бойынша шарттарды менеджерден нақтылаңыз.',
        sort: 3,
      },
      {
        qRu: 'Предоставляете ли документы качества?',
        aRu: 'Документы качества предоставляются на партию по запросу. Загруженные сертификаты доступны в карточке товара.',
        qKk: 'Сапа құжаттарын бересіздер ме?',
        aKk: 'Сапа құжаттары сұрау бойынша партияға беріледі. Жүктелген сертификаттар тауар карточкасында қолжетімді.',
        sort: 4,
      },
      {
        qRu: 'Работаете ли вы с юридическими лицами?',
        aRu: 'Да. Для компаний и дилеров готовим персональные коммерческие предложения и условия регулярных поставок.',
        qKk: 'Заңды тұлғалармен жұмыс істейсіздер ме?',
        aKk: 'Иә. Компаниялар мен дилерлерге жеке коммерциялық ұсыныстар мен тұрақты жеткізу шарттарын дайындаймыз.',
        sort: 5,
      },
    ]);
  }

  if ((await db.select().from(schema.projects).limit(1)).length === 0) {
    await db.insert(schema.projects).values([
      { title: 'Армирование отмостки', workType: 'Отмостка', description: 'Иллюстрация типового применения. Не является реализованным объектом.', isIllustration: true, published: true },
      { title: 'Садовые дорожки и площадки', workType: 'Благоустройство', description: 'Иллюстрация типового применения. Не является реализованным объектом.', isIllustration: true, published: true },
      { title: 'Конструкции в агрессивной среде', workType: 'Коррозионная стойкость', description: 'Иллюстрация типового применения. Не является реализованным объектом.', isIllustration: true, published: true },
    ]);
  }
}

async function seedAdmin() {
  const email = (process.env.ADMIN_EMAIL ?? 'admin@kazkompozit.kz').toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!password || password.length < 8) {
    console.warn('ADMIN_PASSWORD не задан или короче 8 символов — администратор не создан.');
    return;
  }
  await db.insert(schema.users).values({
    email, name: 'Администратор', role: 'ADMIN', passwordHash: await bcrypt.hash(password, 12),
  }).onConflictDoNothing();
}

async function main() {
  await seedSettings();
  const catalogExists = (await db.select().from(schema.products).limit(1)).length > 0;
  if (!catalogExists) await seedCatalog();
  await seedReferenceData();
  await seedAdmin();
  console.log('Начальные данные загружены');
  process.exit(0);
}

main().catch((error) => {
  console.error('Ошибка заполнения БД:', error);
  process.exit(1);
});
