const patentCountries = new Set(['AZ', 'TJ', 'UZ', 'MD', 'UA']);
export const countries = { AZ: 'Азербайджан', TJ: 'Таджикистан', UZ: 'Узбекистан', MD: 'Молдова', UA: 'Украина', OTHER: 'Другая страна' };

function parseDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error('Укажите дату въезда.');
  const date = new Date(`${value}T00:00:00Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) throw new Error('Дата въезда некорректна.');
  return date;
}

export function determineRoute(input, today = new Date().toISOString().slice(0, 10)) {
  if (!input || !Object.hasOwn(countries, input.citizenship)) throw new Error('Выберите гражданство.');
  for (const key of ['highlyQualified', 'familyOfHighlyQualified', 'resettlementParticipant']) {
    if (typeof input[key] !== 'boolean') throw new Error('Ответьте на все вопросы о статусах.');
  }
  const entry = parseDate(input.entryDate);
  const now = parseDate(today);
  if (entry > now) throw new Error('Дата въезда не может быть в будущем.');
  let code, title, action, period, deadline;
  // Приоритет 4.2 — решение проекта для пересекающихся условий таблицы.
  if (input.highlyQualified || input.familyOfHighlyQualified) {
    code = '4.2';
    title = 'Трудовой договор или договор гражданско-правового характера';
    action = 'Вам необходимо трудоустроиться.';
    period = 'В течение 2 месяцев со дня въезда в Российскую Федерацию.';
    // Два календарных месяца; если дня нет в целевом месяце, берём последний.
    const first = new Date(Date.UTC(entry.getUTCFullYear(), entry.getUTCMonth() + 2, 1));
    const lastDay = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
    deadline = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth(), Math.min(entry.getUTCDate(), lastDay)));
  } else if (patentCountries.has(input.citizenship) && !input.resettlementParticipant) {
    code = '4.1';
    title = 'Маршрут трудоустройства с оформлением патента';
    action = 'Перейти к подготовке документов и подаче заявления на патент. Эти действия выполняются за пределами нашего сервиса.';
    period = 'Подать заявление на патент в течение 30 дней со дня въезда.';
    deadline = new Date(entry);
    deadline.setUTCDate(deadline.getUTCDate() + 30);
  } else {
    return { code: null, title: 'Случай не охвачен разделом 4', action: 'По условиям пунктов 4.1–4.2 маршрут определить нельзя. Другие разделы дорожной карты сервис не обрабатывает.', period: null, deadline: null, overdue: false };
  }
  return { code, title, action, period, deadline: deadline.toISOString().slice(0, 10), overdue: deadline < now };
}
