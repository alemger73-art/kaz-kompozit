/** Режим окружения: test — показываются помеченные демо-цены, production — только утверждённые. */
export const appMode: 'test' | 'production' =
  process.env.APP_MODE === 'production' ? 'production' : 'test';

export const isTestMode = appMode === 'test';

export const siteUrl = (process.env.SITE_URL ?? 'http://localhost:3000').replace(/\/$/, '');
