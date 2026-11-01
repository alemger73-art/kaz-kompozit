/** Подстановка значений в шаблон «Заявка №{n}» (без серверных зависимостей). */
export function interpolate(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? ''));
}
