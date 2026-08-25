const API_BASE = 'https://api.yclients.com/api/v1';
const COMPANY_ID = process.env.YCLIENTS_COMPANY_ID ?? '1300176';

type YclientsEnvelope<T> = {
  success?: boolean;
  data?: T;
  meta?: { message?: string } | unknown[];
};

type RawCategory = { id?: number; title?: string };
type RawService = {
  id?: number;
  title?: string;
  booking_title?: string;
  category_id?: number;
  price_min?: number;
  price_max?: number;
  active?: boolean | number;
};
type RawRecordService = {
  id?: number;
  title?: string;
  first_cost?: number;
  cost?: number;
  cost_to_pay?: number;
  cost_per_unit?: number;
  manual_cost?: number;
  discount?: number;
  amount?: number;
};
type RawTransaction = {
  id?: number;
  date?: string;
  last_change_date?: string;
  amount?: number;
  deleted?: boolean;
  record_id?: number;
  visit_id?: number;
  sold_item_id?: number;
  sold_item_type?: string;
  expense?: { id?: number; title?: string; type?: number };
  account?: { id?: number; title?: string; is_cash?: boolean };
};
type RawConsumable = {
  id?: number;
  good_id?: number;
  amount?: number;
  operation_unit_type?: number;
  storage_id?: number;
  service_id?: number;
  deleted?: boolean;
};
type RawGoodsTransaction = {
  id?: number;
  title?: string;
  amount?: number;
  price?: number;
  cost_per_unit?: number;
  cost?: number;
  cost_to_pay?: number;
  manual_cost?: number;
  storage_id?: number;
  good_id?: number;
  discount?: number;
  deleted?: boolean;
};
type RawRecord = {
  id?: number;
  activity_id?: number;
  staff_id?: number;
  datetime?: string;
  date?: string;
  seance_length?: number;
  length?: number;
  technical_break_duration?: number;
  visit_id?: number;
  deleted?: boolean;
  comment?: string;
  attendance?: number;
  visit_attendance?: number;
  prepaid?: boolean;
  prepaid_confirmed?: boolean;
  paid_full?: number | boolean;
  staff?: { id?: number; name?: string };
  client?: { id?: number; name?: string; phone?: string; email?: string } | null;
  services?: RawRecordService[];
  consumables?: RawConsumable[];
  goods_transactions?: RawGoodsTransaction[];
  finance_transactions?: RawTransaction[];
  [key: string]: unknown;
};
type RawGood = {
  good_id?: number;
  title?: string;
  category?: string;
  category_id?: number;
  cost?: number;
  unit_short_title?: string;
  service_unit_short_title?: string;
  unit_equals?: number;
  actual_amounts?: Array<{ storage_id?: number; amount?: number }>;
};
type RawStorage = { id?: number; title?: string; for_service?: boolean | number; for_sale?: boolean | number };
type RawLoyaltyTransaction = {
  amount?: number;
  status_id?: number;
  is_discount?: boolean;
  is_loyalty_withdraw?: boolean;
  program?: { title?: string };
};

export type ExpenseBreakdownRow = { title: string; amount: number };
export type DailyReport = {
  date: string;
  income: number;
  expense: number;
  prepayments: number;
  cashless: number;
  terminal: number;
  surrendered: number;
  transactionCount: number;
  expenses: ExpenseBreakdownRow[];
  checks: Array<{ denomination: number; quantity: number; total: number }>;
  unclassifiedChecks: number;
};
export type BathRecordSummary = {
  id: number;
  date: string;
  start: string;
  end: string;
  state: 'past' | 'current' | 'future';
  durationMinutes: number;
  client: { name: string; phone: string; email: string };
  services: Array<{ id: number; title: string; price: number; discount: number; amount: number; isKitchen: boolean }>;
  total: number;
  comment: string;
  attendance: number;
  prepaid: boolean;
  paidFull: boolean;
};
export type BathSummary = {
  id: 'small' | 'big-1' | 'big-2';
  title: string;
  shortTitle: string;
  revenue: number;
  prepayments: number;
  kitchenRevenue: number;
  kitchenOrders: Array<{ title: string; quantity: number }>;
  kppChecks: number;
  discounts: number;
  records: BathRecordSummary[];
};
export type SalesRow = {
  id: number;
  title: string;
  unitPrice: number;
  quantity: number;
  revenue: number;
  stock: number | null;
  stockUnit: string;
};
export type ConsumableRow = {
  id: number;
  title: string;
  group: string;
  used: number;
  usedUnit: string;
  stock: number | null;
  stockUnit: string;
};
export type ReportRange = { from: string; to: string };
export type AdminDashboard = {
  ok: true;
  date: string;
  range: ReportRange;
  report: DailyReport;
  baths: BathSummary[];
  kitchen: { sold: SalesRow[]; consumables: ConsumableRow[] };
  additionalServices: SalesRow[];
  goods: SalesRow[];
  beer: SalesRow[];
  drinks: SalesRow[];
  copyText: { freeWindows: string; occupiedTimes: string; occupiedBaths: string };
  generatedAt: string;
};

export class YclientsReportsError extends Error {
  status: number;
  code: string;

  constructor(message: string, status = 502, code = 'yclients_error') {
    super(message);
    this.name = 'YclientsReportsError';
    this.status = status;
    this.code = code;
  }
}

const partnerToken = () => process.env.YCLIENTS_PARTNER_TOKEN ?? process.env.YCLIENTS_API_KEY;
const userToken = () => process.env.YCLIENTS_USER_TOKEN;
const messageFromMeta = (meta: YclientsEnvelope<unknown>['meta']) =>
  meta && !Array.isArray(meta) && typeof meta.message === 'string' ? meta.message : '';

async function yclientsRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const partner = partnerToken();
  const user = userToken();
  if (!partner || !user) {
    throw new YclientsReportsError(
      'Для отчётов нужны YCLIENTS_PARTNER_TOKEN и YCLIENTS_USER_TOKEN.',
      503,
      'yclients_not_configured',
    );
  }

  const method = init?.method?.toUpperCase() ?? 'GET';
  const maxAttempts = method === 'GET' ? 3 : 1;
  let response: Response | undefined;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      response = await fetch(`${API_BASE}${path}`, {
        ...init,
        cache: 'no-store',
        headers: {
          Accept: 'application/vnd.yclients.v2+json',
          Authorization: `Bearer ${partner}, User ${user}`,
          ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
          ...init?.headers,
        },
      });
    } catch {
      response = undefined;
    }
    if (response && response.status !== 429 && response.status < 500) break;
    if (attempt < maxAttempts) await new Promise((resolve) => setTimeout(resolve, attempt * 250));
  }

  if (!response) throw new YclientsReportsError('YCLIENTS временно не отвечает.');
  const payload = (await response.json().catch(() => null)) as YclientsEnvelope<T> | T | null;
  if (response.ok && Array.isArray(payload)) return payload as T;
  const envelope = payload as YclientsEnvelope<T> | null;
  if (!response.ok || envelope?.success === false || envelope?.data === undefined) {
    const permissionDenied = response.status === 401 || response.status === 403;
    throw new YclientsReportsError(
      permissionDenied
        ? `YCLIENTS отклонил запрос: ${messageFromMeta(envelope?.meta) || 'у токена недостаточно прав.'}`
        : messageFromMeta(envelope?.meta) || 'YCLIENTS временно не отвечает.',
      response.status || 502,
      permissionDenied ? 'yclients_permissions' : 'yclients_error',
    );
  }
  return envelope.data;
}

async function fetchPages<T>(makePath: (page: number, count: number) => string, count: number) {
  const result: T[] = [];
  for (let page = 1; page <= 100; page += 1) {
    const batch = await yclientsRequest<T[]>(makePath(page, count));
    result.push(...batch);
    if (batch.length < count) break;
  }
  return result;
}

const numberValue = (value: unknown) => {
  const result = Number(value ?? 0);
  return Number.isFinite(result) ? result : 0;
};
const normalizedTitle = (value?: string) => value?.trim().toLocaleLowerCase('ru-RU') ?? '';
const isKppChecksTitle = (value?: string) => {
  const title = normalizedTitle(value);
  return title.includes('кпп') && /чек/.test(title);
};
const recordDateTime = (record: RawRecord) => record.datetime || record.date || '';
const recordLocalDate = (record: RawRecord) => recordDateTime(record).match(/^(\d{4}-\d{2}-\d{2})/)?.[1] ?? '';
const recordStart = (record: RawRecord) => recordDateTime(record).match(/[T\s](\d{2}:\d{2})/)?.[1] ?? '00:00';
const minutesFromClock = (value: string) => {
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
};
const clockFromMinutes = (value: number) => {
  const normalized = ((Math.round(value) % 1440) + 1440) % 1440;
  return `${Math.floor(normalized / 60)}`.padStart(2, '0') + ':' + `${normalized % 60}`.padStart(2, '0');
};
const recordDurationMinutes = (record: RawRecord) => {
  const total = numberValue(record.seance_length ?? record.length);
  const cleaning = numberValue(record.technical_break_duration);
  return Math.max(0, Math.round((total - Math.min(total, cleaning)) / 60));
};
const serviceQuantity = (service: RawRecordService) => Math.max(0, numberValue(service.amount) || 1);
const serviceRevenue = (service: RawRecordService) => numberValue(service.cost ?? service.cost_to_pay);
const serviceUnitPrice = (service: RawRecordService) =>
  numberValue(service.cost_per_unit ?? service.first_cost ?? service.manual_cost) ||
  serviceRevenue(service) / Math.max(1, serviceQuantity(service));

export const bathDefinitions: Array<{
  id: BathSummary['id'];
  title: string;
  shortTitle: string;
  staffId: number;
}> = [
  { id: 'small', title: 'Малая баня', shortTitle: 'МБ', staffId: Number(process.env.YCLIENTS_SMALL_BATH_STAFF_ID ?? 3872281) },
  { id: 'big-1', title: 'Большая баня 1', shortTitle: 'ББ1', staffId: Number(process.env.YCLIENTS_BIG_BATH_1_STAFF_ID ?? 3873893) },
  { id: 'big-2', title: 'Большая баня 2', shortTitle: 'ББ2', staffId: Number(process.env.YCLIENTS_BIG_BATH_2_STAFF_ID ?? 3873916) },
];

type Catalog = {
  services: RawService[];
  serviceCategoryTitles: Map<number, string>;
  serviceCategoryByService: Map<number, string>;
  goods: RawGood[];
  goodsById: Map<number, RawGood>;
  storages: RawStorage[];
};

async function getCatalog(): Promise<Catalog> {
  const [services, categories, goods, storages] = await Promise.all([
    yclientsRequest<RawService[]>(`/services/${COMPANY_ID}?count=300`),
    yclientsRequest<RawCategory[]>(`/service_categories/${COMPANY_ID}`),
    fetchPages<RawGood>((page, count) => `/goods/${COMPANY_ID}?page=${page}&count=${count}`, 25),
    yclientsRequest<RawStorage[]>(`/storages/${COMPANY_ID}`),
  ]);
  const serviceCategoryTitles = new Map(categories.map((item) => [numberValue(item.id), item.title ?? 'Без группы']));
  const serviceCategoryByService = new Map(
    services.map((service) => [numberValue(service.id), serviceCategoryTitles.get(numberValue(service.category_id)) ?? 'Без группы']),
  );
  return {
    services,
    serviceCategoryTitles,
    serviceCategoryByService,
    goods,
    goodsById: new Map(goods.map((good) => [numberValue(good.good_id), good])),
    storages,
  };
}

const goodDetailsCache = new Map<number, Promise<RawGood | null>>();

const getGoodDetails = (goodId: number) => {
  const cached = goodDetailsCache.get(goodId);
  if (cached) return cached;

  const request = yclientsRequest<RawGood>(`/goods/${COMPANY_ID}/${goodId}`).catch(() => null);
  goodDetailsCache.set(goodId, request);
  return request;
};

async function enrichCatalogWithReferencedGoods(catalog: Catalog, records: RawRecord[]) {
  const referencedIds = new Set<number>();
  records.forEach((record) => {
    (record.consumables ?? []).forEach((item) => {
      const goodId = numberValue(item.good_id);
      if (goodId && !catalog.goodsById.has(goodId)) referencedIds.add(goodId);
    });
    (record.goods_transactions ?? []).forEach((item) => {
      const goodId = numberValue(item.good_id);
      if (goodId && !catalog.goodsById.has(goodId)) referencedIds.add(goodId);
    });
  });

  if (!referencedIds.size) return;
  const fetched = await runPool(
    Array.from(referencedIds, (goodId) => () => getGoodDetails(goodId)),
    6,
  );
  fetched.forEach((good) => {
    const goodId = numberValue(good?.good_id);
    if (!good || !goodId) return;
    catalog.goods.push(good);
    catalog.goodsById.set(goodId, good);
  });
}

async function getRecords(from: string, to: string) {
  const records = await fetchPages<RawRecord>((page, count) => {
    const query = new URLSearchParams({
      page: String(page),
      count: String(count),
      start_date: from,
      end_date: to,
      include_consumables: '1',
      include_finance_transactions: '1',
    });
    return `/records/${COMPANY_ID}?${query}`;
  }, 200);
  return records
    .filter((record) => !record.deleted && recordLocalDate(record) >= from && recordLocalDate(record) <= to)
    .sort((left, right) => recordDateTime(left).localeCompare(recordDateTime(right)));
}

async function getTransactions(from: string, to: string) {
  const compactFrom = from.replaceAll('-', '');
  const compactTo = to.replaceAll('-', '');
  return fetchPages<RawTransaction>((page, count) => {
    const query = new URLSearchParams({
      page: String(page),
      count: String(count),
      start_date: compactFrom,
      end_date: compactTo,
      deleted: '0',
    });
    return `/transactions/${COMPANY_ID}?${query}`;
  }, 200);
}

const kppAmountFromTitle = (title: string) =>
  /КПП/i.test(title) ? numberValue(title.match(/(?:^|\D)(200|400|600|800)(?:\D|$)/)?.[1]) : 0;
const kppFallbackFromRecord = (record: RawRecord) => {
  const amounts: number[] = [];
  const visit = (value: unknown) => {
    if (typeof value === 'string') {
      const amount = kppAmountFromTitle(value);
      if (amount) amounts.push(amount);
    } else if (Array.isArray(value)) value.forEach(visit);
    else if (value && typeof value === 'object') Object.values(value).forEach(visit);
  };
  visit(record);
  return amounts.length ? Math.max(...amounts) : 0;
};

async function runPool<T>(tasks: Array<() => Promise<T>>, limit: number) {
  const results = new Array<T>(tasks.length);
  const workers = Array.from({ length: Math.min(limit, tasks.length) }, async (_, worker) => {
    for (let index = worker; index < tasks.length; index += limit) results[index] = await tasks[index]();
  });
  await Promise.all(workers);
  return results;
}

async function getKppByRecord(records: RawRecord[]) {
  const pairs = await runPool(
    records.map((record) => async (): Promise<[number, number]> => {
      const fallback = kppFallbackFromRecord(record);
      const visitId = numberValue(record.visit_id);
      if (!visitId) return [numberValue(record.id), fallback];
      try {
        const transactions = await yclientsRequest<RawLoyaltyTransaction[]>(`/visit/loyalty/transactions/${visitId}`);
        const amount = transactions.reduce((sum, transaction) => {
          if (
            transaction.is_discount === false ||
            transaction.is_loyalty_withdraw ||
            numberValue(transaction.status_id || 1) !== 1
          ) return sum;
          const actual = Math.abs(numberValue(transaction.amount));
          const fromTitle = kppAmountFromTitle(transaction.program?.title ?? '');
          return sum + (actual || fromTitle);
        }, 0);
        return [numberValue(record.id), Math.round(amount || fallback)];
      } catch {
        return [numberValue(record.id), fallback];
      }
    }),
    4,
  );
  return new Map(pairs);
}

const prepaymentAccounts = new Set(
  ['Предоплата перевод на карту', 'Предоплата наличными', 'Предоплата наличные'].map(normalizedTitle),
);
const cashlessAccounts = new Set(['Безналичная оплата', 'Безналичная оплата терминал'].map(normalizedTitle));
const terminalAccount = normalizedTitle('Безналичная оплата терминал');

export function calculateDailyReport({
  date,
  transactions,
  kppCompensation,
  kppCheckAmounts = [],
}: {
  date: string;
  transactions: RawTransaction[];
  kppCompensation: number;
  kppCheckAmounts?: number[];
}): DailyReport {
  let income = 0;
  let expense = 0;
  let prepayments = 0;
  let cashless = 0;
  let terminal = 0;
  const breakdown = new Map<string, number>();
  const active = transactions.filter((transaction) => !transaction.deleted);

  active.forEach((transaction) => {
    const amount = numberValue(transaction.amount);
    const isExpense = amount < 0 || numberValue(transaction.expense?.type) === 2;
    const absolute = Math.abs(amount);
    const account = normalizedTitle(transaction.account?.title);
    if (isExpense) {
      expense += absolute;
      const rawTitle = transaction.expense?.title?.trim() || 'Без статьи';
      const title = isKppChecksTitle(rawTitle) ? 'Чеки КПП' : rawTitle;
      breakdown.set(title, (breakdown.get(title) ?? 0) + absolute);
      return;
    }
    const incoming = Math.max(0, amount);
    income += incoming;
    if (prepaymentAccounts.has(account)) prepayments += incoming;
    if (cashlessAccounts.has(account)) cashless += incoming;
    if (account === terminalAccount) terminal += incoming;
  });

  if (kppCompensation > 0) {
    income += kppCompensation;
    expense += kppCompensation;
    const existingKey = Array.from(breakdown.keys()).find(isKppChecksTitle);
    const existingAmount = existingKey ? breakdown.get(existingKey) ?? 0 : 0;
    if (existingKey && existingKey !== 'Чеки КПП') breakdown.delete(existingKey);
    breakdown.set('Чеки КПП', existingAmount + kppCompensation);
  }

  const expenses = Array.from(breakdown, ([title, amount]) => ({ title, amount })).sort((left, right) => {
    if (isKppChecksTitle(left.title)) return -1;
    if (isKppChecksTitle(right.title)) return 1;
    return left.title.localeCompare(right.title, 'ru');
  });
  const checkCounts = new Map<number, number>();
  const sourceCheckAmounts = kppCheckAmounts.length
    ? kppCheckAmounts
    : kppCompensation > 0
      ? [kppCompensation]
      : [];
  sourceCheckAmounts.forEach((amount) => {
    const denomination = Math.round(Math.abs(amount));
    if (denomination > 0) checkCounts.set(denomination, (checkCounts.get(denomination) ?? 0) + 1);
  });
  const checks = Array.from(checkCounts, ([denomination, quantity]) => ({
    denomination,
    quantity,
    total: denomination * quantity,
  })).sort((left, right) => left.denomination - right.denomination);
  const classifiedChecks = checks.reduce((sum, row) => sum + row.total, 0);
  const checksExpenseTotal = expenses
    .filter((row) => isKppChecksTitle(row.title))
    .reduce((sum, row) => sum + row.amount, 0);
  return {
    date,
    income,
    expense,
    prepayments,
    cashless,
    terminal,
    surrendered: income - expense - prepayments - cashless,
    transactionCount: active.length,
    expenses,
    checks,
    unclassifiedChecks: Math.max(0, checksExpenseTotal - classifiedChecks),
  };
}

const recordEnd = (record: RawRecord) => clockFromMinutes(minutesFromClock(recordStart(record)) + recordDurationMinutes(record));
const recordState = (record: RawRecord, date: string): BathRecordSummary['state'] => {
  const now = Date.now();
  const start = Date.parse(recordDateTime(record));
  const end = start + recordDurationMinutes(record) * 60_000;
  if (!Number.isFinite(start)) return date < new Date().toISOString().slice(0, 10) ? 'past' : 'future';
  if (now < start) return 'future';
  if (now < end) return 'current';
  return 'past';
};

function buildBaths(
  records: RawRecord[],
  date: string,
  catalog: Catalog,
  kppByRecord: Map<number, number>,
): BathSummary[] {
  return bathDefinitions.map((bath) => {
    const bathRecords = records.filter((record) => numberValue(record.staff_id) === bath.staffId);
    let revenue = 0;
    let prepayments = 0;
    let kitchenRevenue = 0;
    let discounts = 0;
    const kitchenOrders = new Map<string, number>();

    bathRecords.forEach((record) => {
      (record.services ?? []).forEach((service) => {
        const category = catalog.serviceCategoryByService.get(numberValue(service.id)) ?? '';
        if (/баня|продлен/i.test(category) || /аренда|продлен/i.test(service.title ?? '')) revenue += serviceRevenue(service);
        if (/кухня/i.test(category)) {
          kitchenRevenue += serviceRevenue(service);
          const title = service.title?.trim() || 'Блюдо';
          kitchenOrders.set(title, (kitchenOrders.get(title) ?? 0) + serviceQuantity(service));
        }
        discounts += Math.max(0, serviceUnitPrice(service) * serviceQuantity(service) - serviceRevenue(service));
      });
      (record.finance_transactions ?? []).forEach((transaction) => {
        if (!transaction.deleted && prepaymentAccounts.has(normalizedTitle(transaction.account?.title))) {
          prepayments += Math.max(0, numberValue(transaction.amount));
        }
      });
    });
    const kppChecks = bathRecords.reduce((sum, record) => sum + (kppByRecord.get(numberValue(record.id)) ?? 0), 0);
    return {
      id: bath.id,
      title: bath.title,
      shortTitle: bath.shortTitle,
      revenue,
      prepayments,
      kitchenRevenue,
      kitchenOrders: Array.from(kitchenOrders, ([title, quantity]) => ({ title, quantity })).sort((a, b) => a.title.localeCompare(b.title, 'ru')),
      kppChecks,
      discounts: discounts + kppChecks,
      records: bathRecords.map((record) => {
        const services = (record.services ?? []).map((service) => ({
          id: numberValue(service.id),
          title: service.title?.trim() || 'Услуга',
          price: serviceUnitPrice(service),
          discount: numberValue(service.discount),
          amount: Math.max(1, serviceQuantity(service)),
          isKitchen: /кухня/i.test(catalog.serviceCategoryByService.get(numberValue(service.id)) ?? ''),
        }));
        return {
          id: numberValue(record.id),
          date: recordLocalDate(record),
          start: recordStart(record),
          end: recordEnd(record),
          state: recordState(record, date),
          durationMinutes: recordDurationMinutes(record),
          client: {
            name: record.client?.name?.trim() || 'Без имени',
            phone: record.client?.phone?.trim() || '',
            email: record.client?.email?.trim() || '',
          },
          services,
          total: services.reduce((sum, service) => sum + service.price * service.amount, 0),
          comment: record.comment?.trim() || '',
          attendance: numberValue(record.attendance ?? record.visit_attendance),
          prepaid: Boolean(record.prepaid || record.prepaid_confirmed),
          paidFull: Boolean(record.paid_full),
        };
      }),
    };
  });
}

const goodStock = (good: RawGood | undefined, storageIds?: Set<number>, inServiceUnits = false) => {
  if (!good) return null;
  const amounts = good.actual_amounts ?? [];
  const filtered = storageIds?.size ? amounts.filter((item) => storageIds.has(numberValue(item.storage_id))) : amounts;
  if (!filtered.length) return null;
  const stock = filtered.reduce((sum, item) => sum + numberValue(item.amount), 0);
  return stock * (inServiceUnits ? Math.max(1, numberValue(good.unit_equals) || 1) : 1);
};

function buildSalesReports(records: RawRecord[], catalog: Catalog) {
  type MutableSales = SalesRow & { storageIds: Set<number> };
  const kitchen = new Map<number, MutableSales>();
  const additionalServices = new Map<number, MutableSales>();
  const goods = new Map<number, MutableSales>();
  const beer = new Map<number, MutableSales>();
  const drinks = new Map<number, MutableSales>();
  const consumables = new Map<number, ConsumableRow & { storageIds: Set<number> }>();
  const goodsByService = new Map<number, Set<number>>();

  const addService = (map: Map<number, MutableSales>, service: RawRecordService) => {
    const id = numberValue(service.id);
    const current = map.get(id) ?? {
      id,
      title: service.title?.trim() || 'Услуга',
      unitPrice: serviceUnitPrice(service),
      quantity: 0,
      revenue: 0,
      stock: null,
      stockUnit: '',
      storageIds: new Set<number>(),
    };
    current.quantity += serviceQuantity(service);
    current.revenue += serviceRevenue(service);
    if (!current.unitPrice) current.unitPrice = serviceUnitPrice(service);
    map.set(id, current);
  };

  records.forEach((record) => {
    (record.services ?? []).forEach((service) => {
      const category = catalog.serviceCategoryByService.get(numberValue(service.id)) ?? '';
      if (/кухня/i.test(category)) addService(kitchen, service);
      if (
        /доп\.?\s*услуг/i.test(category) ||
        /веник|мангал|реш[её]тк|шезлонг|шизлонг|тапоч|полотен|халат|шапк|простын/i.test(service.title ?? '')
      ) addService(additionalServices, service);
    });

    (record.consumables ?? []).filter((item) => !item.deleted).forEach((item) => {
      const serviceId = numberValue(item.service_id);
      const serviceCategory = catalog.serviceCategoryByService.get(serviceId) ?? '';
      const goodId = numberValue(item.good_id);
      const good = catalog.goodsById.get(goodId);
      if (serviceId && goodId) {
        const linked = goodsByService.get(serviceId) ?? new Set<number>();
        linked.add(goodId);
        goodsByService.set(serviceId, linked);
      }
      if (!/кухня/i.test(serviceCategory) || !goodId) return;
      const multiplier = Math.max(1, numberValue(good?.unit_equals) || 1);
      const current = consumables.get(goodId) ?? {
        id: goodId,
        title: good?.title?.trim() || `Расходник ${goodId}`,
        group: good?.category?.trim() || 'Без подгруппы',
        used: 0,
        usedUnit: good?.service_unit_short_title || good?.unit_short_title || 'ед.',
        stock: null,
        stockUnit: good?.service_unit_short_title || good?.unit_short_title || 'ед.',
        storageIds: new Set<number>(),
      };
      current.used += Math.abs(numberValue(item.amount)) * multiplier;
      if (numberValue(item.storage_id)) current.storageIds.add(numberValue(item.storage_id));
      consumables.set(goodId, current);
    });

    (record.goods_transactions ?? []).filter((item) => !item.deleted).forEach((item) => {
      const id = numberValue(item.good_id);
      if (!id) return;
      const good = catalog.goodsById.get(id);
      const category = good?.category?.trim() || 'Без категории';
      const target = /пиво/i.test(category) ? beer : /напит/i.test(category) ? drinks : goods;
      const quantity = Math.abs(numberValue(item.amount));
      const revenue = numberValue(item.cost_to_pay ?? item.cost ?? item.manual_cost) || quantity * numberValue(item.price ?? item.cost_per_unit);
      const current = target.get(id) ?? {
        id,
        title: good?.title?.trim() || item.title?.trim() || `Товар ${id}`,
        unitPrice: numberValue(item.price ?? item.cost_per_unit) || revenue / Math.max(1, quantity),
        quantity: 0,
        revenue: 0,
        stock: null,
        stockUnit: good?.unit_short_title || 'шт.',
        storageIds: new Set<number>(),
      };
      current.quantity += quantity;
      current.revenue += revenue;
      if (numberValue(item.storage_id)) current.storageIds.add(numberValue(item.storage_id));
      target.set(id, current);
    });
  });

  additionalServices.forEach((row, serviceId) => {
    const linked = goodsByService.get(serviceId);
    if (linked?.size === 1) {
      const good = catalog.goodsById.get(Array.from(linked)[0]);
      row.stock = goodStock(good, undefined, false);
      row.stockUnit = good?.unit_short_title || 'шт.';
    }
  });
  consumables.forEach((row) => {
    row.stock = goodStock(catalog.goodsById.get(row.id), row.storageIds, true);
  });
  [goods, beer, drinks].forEach((map) => map.forEach((row) => {
    row.stock = goodStock(catalog.goodsById.get(row.id), row.storageIds, false);
  }));

  const finishSales = (map: Map<number, MutableSales>) => Array.from(map.values())
    .map(({ storageIds: _storageIds, ...row }) => row)
    .sort((left, right) => left.title.localeCompare(right.title, 'ru'));
  const finishConsumables = Array.from(consumables.values())
    .map(({ storageIds: _storageIds, ...row }) => row)
    .sort((left, right) => left.group.localeCompare(right.group, 'ru') || left.title.localeCompare(right.title, 'ru'));
  return {
    kitchen: { sold: finishSales(kitchen), consumables: finishConsumables },
    additionalServices: finishSales(additionalServices),
    goods: finishSales(goods),
    beer: finishSales(beer),
    drinks: finishSales(drinks),
  };
}

export function buildCopyText(records: RawRecord[]) {
  const bathRecords = records.filter((record) => bathDefinitions.some((bath) => bath.staffId === numberValue(record.staff_id)));
  const interval = (record: RawRecord) => ({
    record,
    start: minutesFromClock(recordStart(record)),
    end: minutesFromClock(recordStart(record)) + recordDurationMinutes(record),
  });
  const sorted = bathRecords.map(interval).sort((left, right) => left.start - right.start || left.end - right.end);
  const occupiedTimes = sorted.map(({ start, end }) => `${clockFromMinutes(start)} - ${clockFromMinutes(end)}`).join('\n');
  const occupiedBaths = sorted.map(({ record, start, end }) => {
    const bath = bathDefinitions.find((item) => item.staffId === numberValue(record.staff_id));
    return `${bath?.shortTitle ?? 'Баня'} с ${clockFromMinutes(start)} до ${clockFromMinutes(end)}`;
  }).join('\n');
  const freeWindows = bathDefinitions.map((bath) => {
    const intervals = sorted.filter(({ record }) => numberValue(record.staff_id) === bath.staffId);
    if (!intervals.length) return `${bath.title}\nс 00:00`;
    const lines: string[] = [];
    let cursor = intervals[0].end;
    for (let index = 1; index < intervals.length; index += 1) {
      const current = intervals[index];
      if (current.start > cursor) lines.push(`с ${clockFromMinutes(cursor)} до ${clockFromMinutes(current.start)}`);
      cursor = Math.max(cursor, current.end);
    }
    lines.push(`с ${clockFromMinutes(cursor)}`);
    return `${bath.title}\n${lines.join('\n')}`;
  }).join('\n\n');
  return { freeWindows, occupiedTimes, occupiedBaths };
}

export async function getAdminDashboard(date: string, from: string, to: string): Promise<AdminDashboard> {
  const [catalog, rangeRecords, transactions] = await Promise.all([
    getCatalog(),
    getRecords(from, to),
    getTransactions(from, to),
  ]);
  const dayRecords = date >= from && date <= to
    ? rangeRecords.filter((record) => recordLocalDate(record) === date)
    : await getRecords(date, date);
  await enrichCatalogWithReferencedGoods(catalog, [...rangeRecords, ...dayRecords]);
  const kppByRecord = await getKppByRecord(rangeRecords);
  const kppCheckAmounts = Array.from(kppByRecord.values()).filter((amount) => amount > 0);
  const kppCompensation = kppCheckAmounts.reduce((sum, amount) => sum + amount, 0);
  const report = calculateDailyReport({ date, transactions, kppCompensation, kppCheckAmounts });
  const sales = buildSalesReports(rangeRecords, catalog);
  return {
    ok: true,
    date,
    range: { from, to },
    report,
    baths: buildBaths(rangeRecords, date, catalog, kppByRecord),
    ...sales,
    copyText: buildCopyText(dayRecords),
    generatedAt: new Date().toISOString(),
  };
}
