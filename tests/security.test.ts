import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseProspectLines } from '@/agents/prospects';

const root = path.resolve(__dirname, '..', 'src');

function filesIn(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    return statSync(full).isDirectory() ? filesIn(full) : /\.tsx?$/.test(name) ? [full] : [];
  });
}

describe('закупочные цены не попадают в публичную часть', () => {
  const publicFiles = [
    ...filesIn(path.join(root, 'server', 'public')),
    ...filesIn(path.join(root, 'app', '[locale]')),
    ...filesIn(path.join(root, 'components', 'site')),
    path.join(root, 'app', 'api', 'promo', 'route.ts'),
    path.join(root, 'app', 'sitemap.ts'),
  ];

  it.each(publicFiles.map((f) => [path.relative(root, f), f]))('%s не обращается к закупочным ценам', (_name, file) => {
    const source = readFileSync(file, 'utf8');
    expect(source).not.toMatch(/purchasePrices|purchase-prices|purchasePrice\b|getPurchasePriceMap/);
  });

  it('клиентские компоненты не импортируют серверные модули', () => {
    for (const file of filesIn(path.join(root, 'components', 'site'))) {
      const source = readFileSync(file, 'utf8');
      if (source.startsWith("'use client'")) expect(source).not.toMatch(/@\/server\/|@\/db\/client/);
    }
  });
});

describe('агент по поиску клиентов', () => {
  it('разбирает строки и ограничивает объём (без массовых операций)', () => {
    const many = Array.from({ length: 80 }, (_, i) => `Компания ${i}; Астана; ; заметка`).join('\n');
    const parsed = parseProspectLines(many);
    expect(parsed).toHaveLength(50);
    expect(parsed[0]).toEqual({ name: 'Компания 0', city: 'Астана', url: null, notes: 'заметка' });
  });
});
