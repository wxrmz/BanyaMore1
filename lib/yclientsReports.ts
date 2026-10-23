import {
  BANYA_MORE_FINANCE_SOLD_ITEM_ENTRIES,
  BANYA_MORE_INTERNAL_TRANSFER_EXPENSE_IDS,
  BANYA_MORE_YCLIENTS_COMPANY_ID,
} from './yclientsFinanceConfig.ts';
import {
  cachedYclientsValue,
  fetchYclientsWithRetry,
  yclientsCacheTtlMs,
} from './yclientsTransport.ts';

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
  comment?: string;
  description?: string;
  document_id?: number;
  expense?: { id?: number; title?: string; type?: number; comment?: string };
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
  category_title?: string;
  category_parent_title?: string;
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

export type ExpenseBreakdownRow = { id: string; title: string; amount: number; comments: string[]; transactionIds: number[] };
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
  bathTitle: string;
  services: Array<{ id: number; title: string; price: number; discount: number; amount: number; total: number; isKitchen: boolean }>;
  goods: Array<{ id: number; title: string; price: number; discount: number; amount: number; total: number }>;
  payments: Array<{
    id: number;
    date: string;
    amount: number;
    account: string;
    method: 'cash' | 'cashless';
    kind: 'prepayment' | 'payment' | 'refund';
  }>;
  originalTotal: number;
  discountTotal: number;
  total: number;
  prepaymentAmount: number;
  paidAmount: number;
  balance: number;
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
export type StandaloneKitchenOrder = {
  id: string;
  recordId: number;
  date: string;
  start: string;
  client: { name: string; phone: string };
  items: Array<{ id: number; title: string; quantity: number; unitPrice: number; total: number }>;
  total: number;
  comment: string;
};
export type StockRow = {
  id: string;
  goodId: number;
  storageId: number;
  storage: string;
  group: string;
  subgroup: string;
  title: string;
  unit: string;
  stock: number;
};
export type DataIssue = {
  id: string;
  source: string;
  period: string;
  reason: 'unmapped' | 'unavailable' | 'permissions' | 'partial' | 'invalid';
  message: string;
};
export type DataHealth = {
  state: 'complete' | 'partial';
  sources: Array<{ source: string; state: 'complete' | 'partial'; updatedAt: string }>;
  issues: DataIssue[];
};
export const sourceUpdatedAt = (state: 'complete' | 'partial', generatedAt: string) => state === 'complete' ? generatedAt : '';
export type ReportRange = { from: string; to: string };
export type AdminDashboard = {
  ok: true;
  date: string;
  range: ReportRange;
  report?: DailyReport;
  recordsAvailable: boolean;
  baths: BathSummary[];
  kitchen?: { sold: SalesRow[]; consumables: ConsumableRow[]; standaloneOrders: StandaloneKitchenOrder[] };
  additionalServices?: SalesRow[];
  goods?: SalesRow[];
  beer?: SalesRow[];
  drinks?: SalesRow[];
  stocks: StockRow[];
  dataHealth: DataHealth;
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
  const load = async () => {
    let response: Response;
    try {
      response = await fetchYclientsWithRetry(`${API_BASE}${path}`, {
        ...init,
        cache: 'no-store',
        headers: {
          Accept: 'application/vnd.yclients.v2+json',
          Authorization: `Bearer ${partner}, User ${user}`,
          ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
          ...init?.headers,
        },
      }, method === 'GET' ? 5 : 1);
    } catch {
      throw new YclientsReportsError('YCLIENTS временно не отвечает.');
    }
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
  };

  return method === 'GET'
    ? cachedYclientsValue(`user:${path}`, yclientsCacheTtlMs(path), load)
    : load();
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
const definedNumber = (...values: unknown[]) => {
  for (const value of values) {
    if (value === undefined || value === null) continue;
    const result = Number(value);
    if (Number.isFinite(result)) return result;
  }
  return null;
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
const recordFullDurationMinutes = (record: RawRecord) =>
  Math.max(0, Math.round(numberValue(record.seance_length ?? record.length) / 60));
const serviceQuantity = (service: RawRecordService) => Math.max(0, numberValue(service.amount) || 1);
const serviceRevenue = (service: RawRecordService) => numberValue(service.cost ?? service.cost_to_pay);
const serviceUnitPrice = (service: RawRecordService) =>
  numberValue(service.cost_per_unit ?? service.first_cost ?? service.manual_cost) ||
  serviceRevenue(service) / Math.max(1, serviceQuantity(service));
const goodsTransactionQuantity = (item: RawGoodsTransaction) => Math.abs(numberValue(item.amount));
const goodsTransactionUnitPrice = (item: RawGoodsTransaction) => definedNumber(item.price, item.cost_per_unit) ?? 0;
const goodsTransactionRevenue = (item: RawGoodsTransaction) => {
  const recorded = definedNumber(item.cost_to_pay, item.cost, item.manual_cost);
  return recorded ?? goodsTransactionQuantity(item) * goodsTransactionUnitPrice(item);
};

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

const financeSoldItemRows = new Map(BANYA_MORE_FINANCE_SOLD_ITEM_ENTRIES);
const bathRevenueRowById: Record<BathSummary['id'], string> = {
  small: 'revenue.small_bath',
  'big-1': 'revenue.big_bath',
  'big-2': 'revenue.big_bath_2',
};

const financeRevenueRowForRecordTransaction = (
  transaction: RawTransaction,
  record: RawRecord,
) => {
  const soldItemId = numberValue(transaction.sold_item_id);
  const soldItemType = (transaction.sold_item_type ?? '').trim().toLocaleLowerCase('en-US');
  if (soldItemType === 'service' && soldItemId) {
    return financeSoldItemRows.get(`service:${soldItemId}`) ?? null;
  }
  if (soldItemType === 'good' && soldItemId) {
    return financeSoldItemRows.get(`good:${soldItemId}`) ?? null;
  }
  if (soldItemType === 'goods_transaction' && soldItemId) {
    const goodId = numberValue(record.goods_transactions?.find((item) => numberValue(item.id) === soldItemId)?.good_id);
    return goodId ? financeSoldItemRows.get(`good:${goodId}`) ?? null : null;
  }
  if (numberValue(transaction.expense?.id) === 8) {
    const rows = new Set((record.services ?? []).flatMap((service) => {
      const row = financeSoldItemRows.get(`service:${numberValue(service.id)}`);
      return row ? [row] : [];
    }));
    return rows.size === 1 ? rows.values().next().value ?? null : null;
  }
  return null;
};

type Catalog = {
  services: RawService[];
  serviceCategoryTitles: Map<number, string>;
  serviceCategoryByService: Map<number, string>;
  goods: RawGood[];
  goodsById: Map<number, RawGood>;
  storages: RawStorage[];
  issues: DataIssue[];
};

async function getCatalog(): Promise<Catalog> {
  const settled = await Promise.allSettled([
    yclientsRequest<RawService[]>(`/services/${COMPANY_ID}?count=300`),
    yclientsRequest<RawCategory[]>(`/service_categories/${COMPANY_ID}`),
    fetchPages<RawGood>((page, count) => `/goods/${COMPANY_ID}?page=${page}&count=${count}`, 25),
    yclientsRequest<RawStorage[]>(`/storages/${COMPANY_ID}`),
  ]);
  const [servicesResult, categoriesResult, goodsResult, storagesResult] = settled;
  const services = servicesResult.status === 'fulfilled' ? servicesResult.value as RawService[] : [];
  const categories = categoriesResult.status === 'fulfilled' ? categoriesResult.value as RawCategory[] : [];
  const goods = goodsResult.status === 'fulfilled' ? goodsResult.value as RawGood[] : [];
  const storages = storagesResult.status === 'fulfilled' ? storagesResult.value as RawStorage[] : [];
  const names = ['Услуги YCLIENTS', 'Категории услуг YCLIENTS', 'Товары YCLIENTS', 'Склады YCLIENTS'];
  const issues = settled.flatMap((result, index) => result.status === 'rejected' ? [{
    id: `catalog:${index}`,
    source: names[index],
    period: 'Текущие справочники',
    reason: result.reason instanceof YclientsReportsError && result.reason.code === 'yclients_permissions' ? 'permissions' as const : 'unavailable' as const,
    message: result.reason instanceof Error ? result.reason.message : 'Источник временно недоступен.',
  }] : []);
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
    issues,
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
  const missingCount = Array.from(referencedIds).filter((goodId) => !catalog.goodsById.has(goodId)).length;
  if (missingCount) {
    catalog.issues.push({
      id: 'catalog:referenced-goods',
      source: 'Карточки товаров YCLIENTS',
      period: 'Текущие справочники',
      reason: 'partial',
      message: `Не удалось загрузить ${missingCount} ${missingCount === 1 ? 'карточку товара' : 'карточек товаров'}; для них остаток может быть недоступен.`,
    });
  }
}

const addIsoDays = (value: string, days: number) => {
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return date.toISOString().slice(0, 10);
};

const reportRangeChunks = (from: string, to: string, chunkDays = 180) => {
  const chunks: Array<{ from: string; to: string }> = [];
  let cursor = from;
  while (cursor <= to) {
    const chunkTo = [addIsoDays(cursor, chunkDays - 1), to].sort()[0];
    chunks.push({ from: cursor, to: chunkTo });
    cursor = addIsoDays(chunkTo, 1);
  }
  return chunks;
};

async function getRecords(from: string, to: string) {
  const records: RawRecord[] = [];
  for (const chunk of reportRangeChunks(from, to)) {
    records.push(...await fetchPages<RawRecord>((page, count) => {
      const query = new URLSearchParams({
        page: String(page),
        count: String(count),
        start_date: chunk.from,
        end_date: chunk.to,
        include_consumables: '1',
        include_finance_transactions: '1',
      });
      return `/records/${COMPANY_ID}?${query}`;
    }, 200));
  }
  return records
    .filter((record) => !record.deleted && recordLocalDate(record) >= from && recordLocalDate(record) <= to)
    .sort((left, right) => recordDateTime(left).localeCompare(recordDateTime(right)));
}

async function getTransactions(from: string, to: string) {
  const transactions: RawTransaction[] = [];
  for (const chunk of reportRangeChunks(from, to)) {
    transactions.push(...await fetchPages<RawTransaction>((page, count) => {
      const query = new URLSearchParams({
        page: String(page),
        count: String(count),
        start_date: chunk.from.replaceAll('-', ''),
        end_date: chunk.to.replaceAll('-', ''),
        deleted: '0',
      });
      return `/transactions/${COMPANY_ID}?${query}`;
    }, 200));
  }
  return transactions;
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

async function getKppByRecord(records: RawRecord[], period: ReportRange) {
  const pairs = await runPool(
    records.map((record) => async () => {
      const fallback = kppFallbackFromRecord(record);
      const visitId = numberValue(record.visit_id);
      if (!visitId) return { recordId: numberValue(record.id), amount: fallback, failed: false };
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
        return { recordId: numberValue(record.id), amount: Math.round(amount || fallback), failed: false };
      } catch {
        return { recordId: numberValue(record.id), amount: fallback, failed: true };
      }
    }),
    4,
  );
  const failed = pairs.filter((pair) => pair.failed);
  return {
    values: new Map(pairs.map((pair) => [pair.recordId, pair.amount])),
    issues: failed.length ? [{
      id: 'loyalty:kpp',
      source: 'Акции и скидки КПП YCLIENTS',
      period: `${period.from} — ${period.to}`,
      reason: 'partial' as const,
      message: `Не удалось проверить программы лояльности у ${failed.length} ${failed.length === 1 ? 'записи' : 'записей'}; использован резервный поиск по данным записи.`,
    }] : [],
  };
}

const prepaymentAccounts = new Set(
  ['Предоплата перевод на карту', 'Предоплата наличными', 'Предоплата наличные'].map(normalizedTitle),
);
const cashlessAccounts = new Set(['Безналичная оплата', 'Безналичная оплата терминал'].map(normalizedTitle));
const terminalAccount = normalizedTitle('Безналичная оплата терминал');
const cashlessAccount = (transaction: RawTransaction) =>
  cashlessAccounts.has(normalizedTitle(transaction.account?.title)) || transaction.account?.is_cash === false;
const internalTransferExpenseIds = new Set(
  [
    ...(COMPANY_ID === BANYA_MORE_YCLIENTS_COMPANY_ID ? BANYA_MORE_INTERNAL_TRANSFER_EXPENSE_IDS : []),
    ...(process.env.YCLIENTS_INTERNAL_TRANSFER_EXPENSE_IDS ?? '').split(',').map(Number),
  ].filter((value) => Number.isFinite(value) && value > 0),
);
const isInternalTransfer = (transaction: RawTransaction) => {
  const text = normalizedTitle(`${transaction.expense?.title ?? ''} ${transaction.comment ?? ''} ${transaction.description ?? ''}`);
  return internalTransferExpenseIds.has(numberValue(transaction.expense?.id)) || /перемещ|между касс|внутренн.*перевод/.test(text);
};
const transactionComment = (transaction: RawTransaction) =>
  transaction.comment?.trim() || transaction.description?.trim() || transaction.expense?.comment?.trim() || '';

export function calculateDailyReport({
  date,
  transactions,
  kppCompensation,
  kppCheckAmounts = [],
  kppByRecord,
}: {
  date: string;
  transactions: RawTransaction[];
  kppCompensation: number;
  kppCheckAmounts?: number[];
  kppByRecord?: Map<number, number>;
}): DailyReport {
  let income = 0;
  let expense = 0;
  let prepayments = 0;
  let cashless = 0;
  let terminal = 0;
  const breakdown = new Map<string, { title: string; amount: number; comments: Set<string>; transactionIds: Set<number> }>();
  const unique = new Map<string, RawTransaction>();
  transactions.filter((transaction) => !transaction.deleted && !isInternalTransfer(transaction)).forEach((transaction, index) => {
    const id = numberValue(transaction.id);
    const key = id ? `id:${id}` : `fallback:${transaction.date}:${transaction.amount}:${transaction.account?.id}:${transaction.expense?.id}:${index}`;
    unique.set(key, transaction);
  });
  const active = Array.from(unique.values());
  const linkedKppRecordIds = new Set(
    active
      .filter((transaction) => isKppChecksTitle(transaction.expense?.title))
      .map((transaction) => numberValue(transaction.record_id))
      .filter(Boolean),
  );
  const unmatchedKppExpenseAmounts = active
    .filter((transaction) => isKppChecksTitle(transaction.expense?.title) && !numberValue(transaction.record_id))
    .map((transaction) => Math.abs(numberValue(transaction.amount)));
  const effectiveKppAmounts = kppByRecord
    ? Array.from(kppByRecord, ([recordId, amount]) => ({ recordId, amount }))
      .filter(({ recordId, amount }) => {
        if (linkedKppRecordIds.has(recordId)) return false;
        const matchingIndex = unmatchedKppExpenseAmounts.findIndex((candidate) => Math.abs(candidate - amount) < 0.01);
        if (matchingIndex >= 0) {
          unmatchedKppExpenseAmounts.splice(matchingIndex, 1);
          return false;
        }
        return amount > 0;
      })
      .map(({ amount }) => amount)
    : kppCheckAmounts;
  const effectiveKppCompensation = kppByRecord
    ? effectiveKppAmounts.reduce((sum, amount) => sum + amount, 0)
    : kppCompensation;

  // Cheques are redeemed revenue: they increase the day's receipts, while the
  // matching "Чеки КПП" row remains an expense when calculating cash to hand in.
  // Use the full amount found in records here; only the expense side is deduped
  // against finance transactions below.
  income += kppCompensation;

  active.forEach((transaction) => {
    const amount = numberValue(transaction.amount);
    const isExpense = amount < 0 || numberValue(transaction.expense?.type) === 2;
    const absolute = Math.abs(amount);
    const account = normalizedTitle(transaction.account?.title);
    if (isExpense) {
      expense += absolute;
      const rawTitle = transaction.expense?.title?.trim() || 'Без статьи';
      const title = isKppChecksTitle(rawTitle) ? 'Чеки КПП' : rawTitle;
      const articleId = numberValue(transaction.expense?.id);
      // КПП is a single business row by specification. Other rows use the
      // immutable YCLIENTS article ID, so equal or renamed titles cannot merge.
      const key = isKppChecksTitle(rawTitle) ? 'expense:kpp' : articleId ? `expense:${articleId}` : 'expense:unknown';
      const current = breakdown.get(key) ?? { title, amount: 0, comments: new Set<string>(), transactionIds: new Set<number>() };
      current.amount += absolute;
      const comment = transactionComment(transaction);
      if (comment) current.comments.add(comment);
      if (numberValue(transaction.id)) current.transactionIds.add(numberValue(transaction.id));
      breakdown.set(key, current);
      return;
    }
    const incoming = Math.max(0, amount);
    income += incoming;
    if (prepaymentAccounts.has(account)) prepayments += incoming;
    if (cashlessAccounts.has(account)) cashless += incoming;
    if (account === terminalAccount) terminal += incoming;
  });

  if (effectiveKppCompensation > 0) {
    const existingKey = 'expense:kpp';
    const existing = breakdown.get(existingKey);
    const existingAmount = existing?.amount ?? 0;
    const targetAmount = existingAmount + effectiveKppCompensation;
    expense += targetAmount - existingAmount;
    breakdown.set(existingKey, {
      title: 'Чеки КПП',
      amount: targetAmount,
      comments: existing?.comments ?? new Set<string>(),
      transactionIds: existing?.transactionIds ?? new Set<number>(),
    });
  }

  const expenses = Array.from(breakdown, ([id, row]) => ({
    id,
    title: row.title,
    amount: row.amount,
    comments: Array.from(row.comments),
    transactionIds: Array.from(row.transactionIds),
  })).sort((left, right) => {
    if (isKppChecksTitle(left.title)) return -1;
    if (isKppChecksTitle(right.title)) return 1;
    return left.title.localeCompare(right.title, 'ru');
  });
  const checkCounts = new Map<number, number>();
  const sourceCheckAmounts = effectiveKppAmounts.length
    ? effectiveKppAmounts
    : effectiveKppCompensation > 0
      ? [effectiveKppCompensation]
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

export function buildBaths(
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
        if (/кухня/i.test(category)) {
          const title = service.title?.trim() || 'Блюдо';
          kitchenOrders.set(title, (kitchenOrders.get(title) ?? 0) + serviceQuantity(service));
        }
        discounts += Math.max(0, serviceUnitPrice(service) * serviceQuantity(service) - serviceRevenue(service));
      });
      (record.goods_transactions ?? []).filter((item) => !item.deleted).forEach((item) => {
        const original = goodsTransactionUnitPrice(item) * goodsTransactionQuantity(item);
        discounts += Math.max(numberValue(item.discount), original - goodsTransactionRevenue(item), 0);
      });
      (record.finance_transactions ?? []).forEach((transaction) => {
        if (transaction.deleted || isInternalTransfer(transaction)) return;
        const accountTitle = normalizedTitle(transaction.account?.title);
        if (/сертификат/.test(accountTitle)) return;
        const amount = numberValue(transaction.amount);
        const rowKey = financeRevenueRowForRecordTransaction(transaction, record);
        if (rowKey === bathRevenueRowById[bath.id]) revenue += amount;
        if (rowKey === 'revenue.kitchen') kitchenRevenue += amount;
        if (prepaymentAccounts.has(accountTitle)) prepayments += Math.max(0, amount);
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
      discounts,
      records: bathRecords.map((record) => {
        const services = (record.services ?? []).map((service) => ({
          id: numberValue(service.id),
          title: service.title?.trim() || 'Услуга',
          price: serviceUnitPrice(service),
          discount: numberValue(service.discount),
          amount: Math.max(1, serviceQuantity(service)),
          total: serviceRevenue(service),
          isKitchen: /кухня/i.test(catalog.serviceCategoryByService.get(numberValue(service.id)) ?? ''),
        }));
        const goods = (record.goods_transactions ?? []).filter((item) => !item.deleted).map((item) => {
          const id = numberValue(item.good_id);
          const amount = goodsTransactionQuantity(item);
          const total = goodsTransactionRevenue(item);
          const price = goodsTransactionUnitPrice(item) || total / Math.max(1, amount);
          const originalTotal = amount * price;
          return {
            id,
            title: catalog.goodsById.get(id)?.title?.trim() || item.title?.trim() || `Товар ${id}`,
            price,
            discount: Math.max(numberValue(item.discount), originalTotal - total),
            amount,
            total,
          };
        });
        const payments = (record.finance_transactions ?? [])
          .filter((transaction) => !transaction.deleted && !isInternalTransfer(transaction))
          .map((transaction) => {
            const amount = numberValue(transaction.amount);
            return {
              id: numberValue(transaction.id),
              date: transaction.date ?? '',
              amount,
              account: transaction.account?.title?.trim() || 'Касса не указана',
              method: cashlessAccount(transaction) ? 'cashless' as const : 'cash' as const,
              kind: amount < 0
                ? 'refund' as const
                : prepaymentAccounts.has(normalizedTitle(transaction.account?.title))
                  ? 'prepayment' as const
                  : 'payment' as const,
            };
          });
        const originalTotal = services.reduce((sum, service) => sum + service.price * service.amount, 0)
          + goods.reduce((sum, item) => sum + item.price * item.amount, 0);
        const total = services.reduce((sum, service) => sum + service.total, 0)
          + goods.reduce((sum, item) => sum + item.total, 0);
        const prepaymentAmount = payments
          .filter((payment) => payment.kind === 'prepayment')
          .reduce((sum, payment) => sum + Math.max(0, payment.amount), 0);
        const paidAmount = payments.reduce((sum, payment) => sum + payment.amount, 0);
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
          goods,
          payments,
          bathTitle: bath.title,
          originalTotal,
          discountTotal: Math.max(0, originalTotal - total),
          total,
          prepaymentAmount,
          paidAmount,
          balance: Math.max(0, total - paidAmount),
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

const splitGoodCategory = (good: RawGood) => {
  const raw = (good.category_parent_title || good.category_title || good.category || 'Без группы').trim();
  const parts = raw.split(/\s*[>\/→]\s*/).filter(Boolean);
  return {
    group: parts[0] || 'Без группы',
    subgroup: parts.slice(1).join(' / ') || parts[0] || 'Без подгруппы',
  };
};

function buildStockReport(catalog: Catalog): StockRow[] {
  const storageTitles = new Map(catalog.storages.map((storage) => [numberValue(storage.id), storage.title?.trim() || 'Склад']));
  const rows: StockRow[] = [];
  catalog.goods.forEach((good) => {
    const goodId = numberValue(good.good_id);
    const category = splitGoodCategory(good);
    (good.actual_amounts ?? []).forEach((amount) => {
      const storageId = numberValue(amount.storage_id);
      rows.push({
        id: `${storageId}:${goodId}`,
        goodId,
        storageId,
        storage: storageTitles.get(storageId) || `Склад ${storageId}`,
        ...category,
        title: good.title?.trim() || `Товар ${goodId}`,
        unit: good.unit_short_title || 'шт.',
        stock: numberValue(amount.amount),
      });
    });
  });
  return rows.sort((left, right) =>
    left.storage.localeCompare(right.storage, 'ru')
    || left.group.localeCompare(right.group, 'ru')
    || left.subgroup.localeCompare(right.subgroup, 'ru')
    || left.title.localeCompare(right.title, 'ru'));
}

export function buildSalesReports(records: RawRecord[], catalog: Catalog) {
  type MutableSales = SalesRow & { storageIds: Set<number> };
  const kitchen = new Map<number, MutableSales>();
  const additionalServices = new Map<number, MutableSales>();
  const goods = new Map<number, MutableSales>();
  const beer = new Map<number, MutableSales>();
  const drinks = new Map<number, MutableSales>();
  const consumables = new Map<number, ConsumableRow & { storageIds: Set<number> }>();
  const goodsByService = new Map<number, Set<number>>();
  const kitchenOrderOccurrences = new Map<string, string>();
  const kitchenOccurrencesWithConsumables = new Set<string>();
  const standaloneOrders: StandaloneKitchenOrder[] = [];

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

  records.forEach((record, recordIndex) => {
    const recordKey = numberValue(record.id) || recordIndex + 1;
    const recordKitchenItems: StandaloneKitchenOrder['items'] = [];
    (record.services ?? []).forEach((service) => {
      const serviceId = numberValue(service.id);
      const category = catalog.serviceCategoryByService.get(numberValue(service.id)) ?? '';
      const serviceText = `${category} ${service.title ?? ''}`;
      const isKitchen = /кухня/i.test(category);
      const isBath = /баня|аренд|продл[её]н/i.test(serviceText);
      if (isKitchen) {
        addService(kitchen, service);
        kitchenOrderOccurrences.set(`${recordKey}:${serviceId}`, service.title?.trim() || `Услуга ${serviceId}`);
        recordKitchenItems.push({
          id: serviceId,
          title: service.title?.trim() || `Блюдо ${serviceId}`,
          quantity: serviceQuantity(service),
          unitPrice: serviceUnitPrice(service),
          total: serviceRevenue(service),
        });
      }
      else if (!isBath) addService(additionalServices, service);
    });

    if (
      recordKitchenItems.length
      && !bathDefinitions.some((bath) => bath.staffId === numberValue(record.staff_id))
    ) {
      standaloneOrders.push({
        id: `${recordKey}:${recordLocalDate(record)}:${recordStart(record)}`,
        recordId: numberValue(record.id),
        date: recordLocalDate(record),
        start: recordStart(record),
        client: {
          name: record.client?.name?.trim() || 'Без имени',
          phone: record.client?.phone?.trim() || '',
        },
        items: recordKitchenItems,
        total: recordKitchenItems.reduce((sum, item) => sum + item.total, 0),
        comment: record.comment?.trim() || '',
      });
    }

    const activeServiceIds = new Set((record.services ?? []).map((service) => numberValue(service.id)));
    (record.consumables ?? []).filter((item) => !item.deleted || activeServiceIds.has(numberValue(item.service_id))).forEach((item) => {
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
      kitchenOccurrencesWithConsumables.add(`${recordKey}:${serviceId}`);
      const multiplier = Math.max(1, numberValue(good?.unit_equals) || 1);
      const current = consumables.get(goodId) ?? {
        id: goodId,
        title: good?.title?.trim() || `Расходник ${goodId}`,
        group: good ? splitGoodCategory(good).subgroup : 'Без подгруппы',
        used: 0,
        usedUnit: good?.service_unit_short_title || good?.unit_short_title || 'ед.',
        stock: null,
        stockUnit: good?.service_unit_short_title || good?.unit_short_title || 'ед.',
        storageIds: new Set<number>(),
      };
      const used = Math.abs(numberValue(item.amount)) * multiplier;
      if (used <= 0) return;
      current.used += used;
      if (numberValue(item.storage_id)) current.storageIds.add(numberValue(item.storage_id));
      consumables.set(goodId, current);
    });

    (record.goods_transactions ?? []).filter((item) => !item.deleted).forEach((item) => {
      const id = numberValue(item.good_id);
      if (!id) return;
      const good = catalog.goodsById.get(id);
      const category = [good?.category_parent_title, good?.category_title, good?.category]
        .map((value) => value?.trim())
        .filter(Boolean)
        .join(' / ') || 'Без категории';
      const target = /пиво/i.test(category) ? beer : /напит/i.test(category) ? drinks : goods;
      const quantity = goodsTransactionQuantity(item);
      if (!quantity) return;
      const revenue = goodsTransactionRevenue(item);
      const current = target.get(id) ?? {
        id,
        title: good?.title?.trim() || item.title?.trim() || `Товар ${id}`,
        unitPrice: goodsTransactionUnitPrice(item) || revenue / Math.max(1, quantity),
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
    .map(({ storageIds: _storageIds, ...row }) => ({
      ...row,
      unitPrice: row.quantity ? row.revenue / row.quantity : row.unitPrice,
    }))
    .sort((left, right) => left.title.localeCompare(right.title, 'ru'));
  const finishConsumables = Array.from(consumables.values())
    .map(({ storageIds: _storageIds, ...row }) => row)
    .sort((left, right) => left.group.localeCompare(right.group, 'ru') || left.title.localeCompare(right.title, 'ru'));
  const missingKitchenOccurrences = Array.from(kitchenOrderOccurrences)
    .filter(([key]) => !kitchenOccurrencesWithConsumables.has(key));
  const missingKitchenTitles = Array.from(new Set(missingKitchenOccurrences.map(([, title]) => title)));
  return {
    kitchen: {
      sold: finishSales(kitchen),
      consumables: finishConsumables,
      standaloneOrders: standaloneOrders.sort((left, right) =>
        left.date.localeCompare(right.date) || left.start.localeCompare(right.start)),
    },
    additionalServices: finishSales(additionalServices),
    goods: finishSales(goods),
    beer: finishSales(beer),
    drinks: finishSales(drinks),
    dataIssues: missingKitchenOccurrences.length ? [{
      id: 'records:kitchen-consumables',
      source: 'Расходники кухни YCLIENTS',
      period: 'Выбранный диапазон',
      reason: 'unmapped' as const,
      message: `У ${missingKitchenOccurrences.length} ${missingKitchenOccurrences.length === 1 ? 'заказа' : 'заказов'} нет состава расходников в ответе YCLIENTS: ${missingKitchenTitles.slice(0, 4).join(', ')}${missingKitchenTitles.length > 4 ? '…' : ''}.`,
    }] : [],
  };
}

/** attendance = -1 в YCLIENTS означает «не пришёл»: время считается свободным. */
const isNoShowRecord = (record: RawRecord) => {
  const attendance = record.attendance ?? record.visit_attendance;
  return numberValue(attendance) === -1;
};

export function buildCopyText(records: RawRecord[], previousDayRecords: RawRecord[] = []) {
  const bathRecords = records.filter((record) =>
    bathDefinitions.some((bath) => bath.staffId === numberValue(record.staff_id)) && !isNoShowRecord(record));
  const interval = (record: RawRecord) => ({
    record,
    start: minutesFromClock(recordStart(record)),
    end: minutesFromClock(recordStart(record)) + recordDurationMinutes(record),
  });
  const sorted = bathRecords.map(interval).sort((left, right) => left.start - right.start || left.end - right.end);
  const occupiedTimes = sorted.length
    ? sorted.map(({ start, end }) => `${clockFromMinutes(start)} - ${clockFromMinutes(end)}`).join('\n')
    : 'Записей нет';
  const occupiedBaths = bathDefinitions.map((bath) => {
    const intervals = sorted.filter(({ record }) => numberValue(record.staff_id) === bath.staffId);
    const lines = intervals.length
      ? intervals.map(({ start, end }) => `с ${clockFromMinutes(start)} до ${clockFromMinutes(end)}`)
      : ['Записей нет'];
    return `${bath.title}\n${lines.join('\n')}`;
  }).join('\n\n');
  const freeWindows = bathDefinitions.map((bath) => {
    const intervals = sorted.filter(({ record }) => numberValue(record.staff_id) === bath.staffId)
      .map(({ record, start }) => ({ start, end: start + recordFullDurationMinutes(record) }));
    const carryoverEnd = previousDayRecords
      .filter((record) => numberValue(record.staff_id) === bath.staffId && !isNoShowRecord(record))
      .reduce((latest, record) => Math.max(latest,
        minutesFromClock(recordStart(record)) + recordFullDurationMinutes(record) - 1_440), 0);
    if (carryoverEnd >= 1_440) return `${bath.title}\nСвободных окон нет`;
    if (!intervals.length) return `${bath.title}\nс ${clockFromMinutes(carryoverEnd)}`;
    const lines: string[] = [];
    let cursor = carryoverEnd;
    for (const current of intervals) {
      // Баню освобождают за 30 минут до следующей записи, окна короче получаса не показываем.
      const windowEnd = current.start - 30;
      if (windowEnd > cursor) lines.push(`с ${clockFromMinutes(cursor)} до ${clockFromMinutes(windowEnd)}`);
      cursor = Math.max(cursor, current.end);
    }
    if (cursor < 1_440) lines.push(`с ${clockFromMinutes(cursor)}`);
    return `${bath.title}\n${lines.length ? lines.join('\n') : 'Свободных окон нет'}`;
  }).join('\n\n');
  return { freeWindows, occupiedTimes, occupiedBaths };
}

export async function getAdminDashboard(
  date: string,
  from: string,
  to: string,
  options: { includeReports?: boolean } = {},
): Promise<AdminDashboard> {
  const includeReports = options.includeReports !== false;
  const generatedAt = new Date().toISOString();
  const [catalog, recordsResult, transactionsResult] = await Promise.all([
    getCatalog(),
    getRecords(addIsoDays(from, -1), to).then(
      (value) => ({ ok: true as const, value }),
      (error: unknown) => ({ ok: false as const, error }),
    ),
    includeReports
      ? getTransactions(from, to).then(
        (value) => ({ ok: true as const, value }),
        (error: unknown) => ({ ok: false as const, error }),
      )
      : Promise.resolve({ ok: true as const, value: [] as RawTransaction[] }),
  ]);
  const allRecords = recordsResult.ok ? recordsResult.value : [];
  const rangeRecords = allRecords.filter((record) => recordLocalDate(record) >= from);
  const transactions = transactionsResult.ok ? transactionsResult.value : [];
  const dayRecords = rangeRecords.filter((record) => recordLocalDate(record) === date);
  const previousDayRecords = allRecords.filter((record) => recordLocalDate(record) === addIsoDays(date, -1));
  await enrichCatalogWithReferencedGoods(catalog, [...rangeRecords, ...dayRecords]);
  const kppRecords = includeReports
    ? rangeRecords.filter((record) => bathDefinitions.some((bath) => bath.staffId === numberValue(record.staff_id)))
    : [];
  const kppLookup = includeReports
    ? await getKppByRecord(kppRecords, { from, to })
    : { values: new Map<number, number>(), issues: [] as DataIssue[] };
  const kppByRecord = kppLookup.values;
  const kppCheckAmounts = Array.from(kppByRecord.values()).filter((amount) => amount > 0);
  const kppCompensation = kppCheckAmounts.reduce((sum, amount) => sum + amount, 0);
  const report = includeReports && transactionsResult.ok
    ? calculateDailyReport({ date, transactions, kppCompensation, kppCheckAmounts, kppByRecord })
    : undefined;
  const salesResult = includeReports && recordsResult.ok ? buildSalesReports(rangeRecords, catalog) : null;
  const { dataIssues: salesIssues, ...sales } = salesResult ?? {
    dataIssues: [] as DataIssue[],
    kitchen: undefined,
    additionalServices: undefined,
    goods: undefined,
    beer: undefined,
    drinks: undefined,
  };
  const loadIssues: DataIssue[] = [
    ...(!recordsResult.ok ? [{
      id: 'records:load',
      source: 'Записи YCLIENTS',
      period: `${from} — ${to}`,
      reason: recordsResult.error instanceof YclientsReportsError && recordsResult.error.code === 'yclients_permissions' ? 'permissions' as const : 'unavailable' as const,
      message: recordsResult.error instanceof Error ? recordsResult.error.message : 'Записи не загружены.',
    }] : []),
    ...(includeReports && !transactionsResult.ok ? [{
      id: 'transactions:load',
      source: 'Финансовые операции YCLIENTS',
      period: `${from} — ${to}`,
      reason: transactionsResult.error instanceof YclientsReportsError && transactionsResult.error.code === 'yclients_permissions' ? 'permissions' as const : 'unavailable' as const,
      message: transactionsResult.error instanceof Error ? transactionsResult.error.message : 'Финансовые операции не загружены.',
    }] : []),
  ];
  const issues = [...catalog.issues, ...loadIssues, ...kppLookup.issues, ...salesIssues];
  return {
    ok: true,
    date,
    range: { from, to },
    ...(report ? { report } : {}),
    recordsAvailable: recordsResult.ok,
    baths: buildBaths(rangeRecords, date, catalog, kppByRecord),
    ...sales,
    stocks: buildStockReport(catalog),
    dataHealth: {
      state: issues.length ? 'partial' : 'complete',
      sources: [
        { source: 'Записи YCLIENTS', state: recordsResult.ok ? 'complete' as const : 'partial' as const, updatedAt: sourceUpdatedAt(recordsResult.ok ? 'complete' : 'partial', generatedAt) },
        { source: 'Склады YCLIENTS', state: catalog.issues.length ? 'partial' : 'complete', updatedAt: sourceUpdatedAt(catalog.issues.length ? 'partial' : 'complete', generatedAt) },
        ...(includeReports ? [
          { source: 'Финансовые операции YCLIENTS', state: transactionsResult.ok ? 'complete' as const : 'partial' as const, updatedAt: transactionsResult.ok ? generatedAt : '' },
          { source: 'Акции и скидки КПП YCLIENTS', state: !recordsResult.ok || kppLookup.issues.length ? 'partial' as const : 'complete' as const, updatedAt: recordsResult.ok && !kppLookup.issues.length ? generatedAt : '' },
          { source: 'Расходники кухни YCLIENTS', state: !recordsResult.ok || salesIssues.length ? 'partial' as const : 'complete' as const, updatedAt: recordsResult.ok && !salesIssues.length ? generatedAt : '' },
        ] : []),
      ],
      issues,
    },
    copyText: buildCopyText(dayRecords, previousDayRecords),
    generatedAt,
  };
}
