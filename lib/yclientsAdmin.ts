const API_BASE = 'https://api.yclients.com/api/v1';
const COMPANY_ID = process.env.YCLIENTS_COMPANY_ID ?? '1300176';

type YclientsEnvelope<T> = {
  success?: boolean;
  data?: T;
  meta?: { message?: string } | unknown[];
};

type RawCategory = {
  id?: number;
  title?: string;
};

type RawService = {
  id?: number;
  title?: string;
  booking_title?: string;
  category_id?: number;
  price_min?: number;
  price_max?: number;
  active?: boolean;
  staff?: Array<{ id?: number }>;
};

type RawRecordService = {
  id?: number;
  title?: string;
  first_cost?: number;
  cost?: number;
  manual_cost?: number;
  discount?: number;
  amount?: number;
};

type RawRecord = {
  id?: number;
  staff_id?: number;
  datetime?: string;
  date?: string;
  seance_length?: number;
  length?: number;
  comment?: string;
  attendance?: number;
  visit_attendance?: number;
  prepaid?: boolean;
  prepaid_confirmed?: boolean;
  paid_full?: number | boolean;
  visit_id?: number;
  deleted?: boolean;
  activity_id?: number;
  staff?: { id?: number; name?: string };
  client?: { id?: number; name?: string; phone?: string; email?: string } | null;
  services?: RawRecordService[];
  finance_transactions?: RawTransaction[];
  [key: string]: unknown;
};

type RawTransaction = {
  id?: number;
  date?: string;
  last_change_date?: string;
  amount?: number;
  deleted?: boolean;
  type_id?: number;
  record_id?: number;
  visit_id?: number;
  sold_item_id?: number;
  sold_item_type?: string;
  expense?: { id?: number; title?: string; type?: number };
  account?: { id?: number; title?: string; is_cash?: boolean };
};

type RawLoyaltyTransaction = {
  id?: number;
  amount?: number;
  status_id?: number;
  is_discount?: boolean;
  is_loyalty_withdraw?: boolean;
  program?: { id?: number; title?: string };
};

export type AdminCatalogService = {
  id: number;
  title: string;
  price: number;
};

export type AdminRecord = {
  id: number;
  datetime: string;
  date: string;
  time: string;
  durationMinutes: number;
  staff: string;
  client: {
    name: string;
    phone: string;
    email: string;
  };
  services: Array<AdminCatalogService & { discount: number; amount: number }>;
  total: number;
  comment: string;
  attendance: number;
  prepaid: boolean;
  paidFull: boolean;
};

export type DailyReport = {
  date: string;
  income: number;
  expense: number;
  yclientsExpense: number;
  outsideShiftExpense: number;
  kppCompensation: number;
  prepayments: number;
  cashless: number;
  terminal: number;
  kitchenTerminalAdjustment: number;
  shiftTransfer: number;
  lateKitchenExcluded: number;
  surrenderedAdjustment: number;
  surrendered: number;
  transactionCount: number;
};

export class YclientsAdminError extends Error {
  status: number;
  code: string;

  constructor(message: string, status = 502, code = 'yclients_error') {
    super(message);
    this.name = 'YclientsAdminError';
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
    throw new YclientsAdminError(
      'Для административных операций нужны YCLIENTS_PARTNER_TOKEN и YCLIENTS_USER_TOKEN.',
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

    const shouldRetry =
      attempt < maxAttempts && (!response || response.status === 429 || response.status >= 500);

    if (!shouldRetry) break;
    await new Promise((resolve) => setTimeout(resolve, attempt * 250));
  }

  if (!response) {
    throw new YclientsAdminError('YCLIENTS временно не отвечает.', 502, 'yclients_error');
  }

  const payload = (await response.json().catch(() => null)) as YclientsEnvelope<T> | T | null;

  if (response.ok && Array.isArray(payload)) {
    return payload as T;
  }

  const envelope = payload as YclientsEnvelope<T> | null;
  const message = messageFromMeta(envelope?.meta);

  if (!response.ok || envelope?.success === false || envelope?.data === undefined) {
    const permissionDenied = response.status === 401 || response.status === 403;
    throw new YclientsAdminError(
      permissionDenied
        ? `YCLIENTS отклонил операцию: ${message || 'у токена недостаточно прав.'}`
        : message || 'YCLIENTS временно не отвечает.',
      response.status || 502,
      permissionDenied ? 'yclients_permissions' : 'yclients_error',
    );
  }

  return envelope.data;
}

const bathDefinitions: Array<{ id: 'small' | 'big-1' | 'big-2'; title: string; staffId: number }> = [
  {
    id: 'small',
    title: 'Малая баня',
    staffId: Number(process.env.YCLIENTS_SMALL_BATH_STAFF_ID ?? 3872281),
  },
  {
    id: 'big-1',
    title: 'Большая баня 1',
    staffId: Number(process.env.YCLIENTS_BIG_BATH_1_STAFF_ID ?? 3873893),
  },
  {
    id: 'big-2',
    title: 'Большая баня 2',
    staffId: Number(process.env.YCLIENTS_BIG_BATH_2_STAFF_ID ?? 3873916),
  },
];

const serviceTitle = (service: RawService) => service.booking_title || service.title || 'Услуга';

const servicePrice = (service: RawService | RawRecordService) => {
  if ('price_min' in service) {
    return Number(service.price_min ?? service.price_max ?? 0);
  }

  const recordService = service as RawRecordService;
  return Number(recordService.cost ?? recordService.manual_cost ?? recordService.first_cost ?? 0);
};

export async function getAdminCatalog() {
  const [services, categories] = await Promise.all([
    yclientsRequest<RawService[]>(`/services/${COMPANY_ID}?count=300`),
    yclientsRequest<RawCategory[]>(`/service_categories/${COMPANY_ID}`),
  ]);
  const categoryTitles = new Map(categories.map((category) => [Number(category.id), category.title ?? '']));
  const activeServices = services.filter((service) => service.active !== false && Number.isFinite(Number(service.id)));

  const kitchen = activeServices
    .filter((service) => /кухня/i.test(categoryTitles.get(Number(service.category_id)) ?? ''))
    .map((service) => ({
      id: Number(service.id),
      title: serviceTitle(service),
      price: servicePrice(service),
    }))
    .sort((left, right) => left.title.localeCompare(right.title, 'ru'));

  return { kitchen };
}

const recordDateTime = (record: RawRecord) => record.datetime || record.date || '';

const dateAndTimeFromDateTime = (value: string) => {
  const match = value.match(/^(\d{4}-\d{2}-\d{2})[T\s](\d{2}:\d{2})/);
  return { date: match?.[1] ?? '', time: match?.[2] ?? '' };
};

const recordBelongsToDate = (record: RawRecord, date: string) =>
  !record.deleted && dateAndTimeFromDateTime(recordDateTime(record)).date === date;

const normalizeRecord = (record: RawRecord): AdminRecord => {
  const datetime = recordDateTime(record);
  const { date, time } = dateAndTimeFromDateTime(datetime);
  const services = (record.services ?? []).map((service) => ({
    id: Number(service.id),
    title: service.title || 'Услуга',
    price: servicePrice(service),
    discount: Number(service.discount ?? 0),
    amount: Number(service.amount ?? 1),
  }));

  return {
    id: Number(record.id),
    datetime,
    date,
    time,
    durationMinutes: Math.round(Number(record.seance_length ?? record.length ?? 0) / 60),
    staff: record.staff?.name || bathDefinitions.find((bath) => bath.staffId === Number(record.staff_id))?.title || 'Баня',
    client: {
      name: record.client?.name || 'Без имени',
      phone: record.client?.phone || '',
      email: record.client?.email || '',
    },
    services,
    total: services.reduce((sum, service) => sum + service.price * service.amount, 0),
    comment: record.comment || '',
    attendance: Number(record.attendance ?? record.visit_attendance ?? 0),
    prepaid: Boolean(record.prepaid || record.prepaid_confirmed),
    paidFull: Boolean(record.paid_full),
  };
};

export async function getRecordsForDate(date: string) {
  const query = new URLSearchParams({
    page: '1',
    count: '200',
    start_date: date,
    end_date: date,
    include_finance_transactions: '1',
  });
  const records = await yclientsRequest<RawRecord[]>(`/records/${COMPANY_ID}?${query}`);

  return records
    .filter((record) => recordBelongsToDate(record, date))
    .sort((left, right) => recordDateTime(left).localeCompare(recordDateTime(right)))
    .map(normalizeRecord);
}

async function getRawRecordsForDate(date: string) {
  const query = new URLSearchParams({
    page: '1',
    count: '200',
    start_date: date,
    end_date: date,
    include_finance_transactions: '1',
  });
  const records = await yclientsRequest<RawRecord[]>(`/records/${COMPANY_ID}?${query}`);
  return records.filter((record) => recordBelongsToDate(record, date));
}

const normalizedTitle = (value?: string) => value?.trim().toLocaleLowerCase('ru-RU') ?? '';
const roundCashExpense = (value: number, fractionalTransactionCount: number) =>
  // A single fractional purchase is written in the shift report in cash tens.
  // A batch of fractional purchase lines is first reconciled as one document
  // and therefore rounded only after the document total is summed.
  fractionalTransactionCount > 1 ? Math.round(value) : Math.round(value / 10) * 10;
const prepaymentAccountTitles = new Set(
  ['Предоплата перевод на карту', 'Предоплата наличные', 'Предоплата наличными'].map(normalizedTitle),
);
const cashlessAccountTitles = new Set(
  ['Безналичная оплата терминал', 'Безналичная оплата'].map(normalizedTitle),
);
const shiftCashAccountTitles = new Set(
  ['Наличные', 'ОБЩАЯ КАССА НАЛ.'].map(normalizedTitle),
);
const genericCashlessAccountTitle = normalizedTitle('Безналичная оплата');
const terminalAccountTitle = normalizedTitle('Безналичная оплата терминал');
const vladivostokDate = (value: Date) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Vladivostok',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(value);

const kppAmountFromTitle = (title: string) => {
  if (!/КПП/i.test(title)) return 0;

  // YCLIENTS promotion names can put the amount on either side of КПП, for
  // example: «КПП 400» or «ВОЗВРАТ400 ЗА КПП - Фиксированная скидка».
  return Number(title.match(/(?:^|\D)(200|400|600|800)(?:\D|$)/)?.[1] ?? 0);
};

const kppAmountFromRecord = (record: RawRecord) => {
  const amounts: number[] = [];

  const visit = (value: unknown) => {
    if (typeof value === 'string') {
      const amount = kppAmountFromTitle(value);
      if (amount > 0) amounts.push(amount);
      return;
    }

    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }

    if (value && typeof value === 'object') {
      Object.values(value).forEach(visit);
    }
  };

  visit(record);
  return amounts.length ? Math.max(...amounts) : 0;
};

const kppCompensationFromRecords = (records: RawRecord[]) =>
  records.reduce((sum, record) => sum + kppAmountFromRecord(record), 0);

async function runPool<T>(tasks: Array<() => Promise<T>>, limit: number) {
  const results = new Array<T>(tasks.length);
  const workers = Array.from({ length: Math.min(limit, tasks.length) }, async (_, workerIndex) => {
    for (let index = workerIndex; index < tasks.length; index += limit) {
      results[index] = await tasks[index]();
    }
  });
  await Promise.all(workers);
  return results;
}

async function getKppCompensation(records: RawRecord[]) {
  const visitIds = Array.from(
    new Set(records.map((record) => Number(record.visit_id)).filter((visitId) => Number.isFinite(visitId) && visitId > 0)),
  );

  if (!visitIds.length) {
    return kppCompensationFromRecords(records);
  }

  const loyaltyByVisit = await runPool(
    visitIds.map((visitId) => () => yclientsRequest<RawLoyaltyTransaction[]>(`/visit/loyalty/transactions/${visitId}`)),
    4,
  );
  let compensation = 0;

  loyaltyByVisit.flat().forEach((transaction) => {
    const title = transaction.program?.title ?? '';
    // One promotion can be split across several services. The transaction
    // amount is the applied part; the amount in the title is only a fallback.
    const actualAmount = Math.abs(Number(transaction.amount ?? 0));
    const amount = actualAmount || kppAmountFromTitle(title);

    if (
      amount > 0 &&
      transaction.is_discount !== false &&
      !transaction.is_loyalty_withdraw &&
      Number(transaction.status_id ?? 1) === 1
    ) {
      compensation += amount;
    }
  });

  return Math.round(compensation || kppCompensationFromRecords(records));
}

export const crossMidnightExtensionTransactions = (records: RawRecord[], reportDate: string) => {
  const extensionIdsByRecord = new Map<number, Set<number>>();
  // The cash shift closes at 02:00 Vladivostok time on the following day.
  const followingShiftCutoff = followingShiftCutoffTime(reportDate);

  records.forEach((record) => {
    const startsAt = new Date(recordDateTime(record));
    const durationSeconds = Number(record.seance_length ?? record.length ?? 0);
    const endsAt = startsAt.getTime() + durationSeconds * 1000;
    const extensionServices = (record.services ?? []).filter((service) => /продлен/i.test(service.title ?? ''));
    const extensionDurationSeconds = extensionServices.reduce((sum, service) => {
      const title = service.title ?? '';
      const hours = Number(title.match(/(\d+(?:[.,]\d+)?)\s*ч/i)?.[1]?.replace(',', '.') ?? 0);
      const minutes = Number(title.match(/(\d+)\s*м/i)?.[1] ?? 0);
      const quantity = Math.max(1, Number(service.amount ?? 1));
      return sum + (hours * 60 + minutes) * 60 * quantity;
    }, 0);
    const extensionStartsAt = endsAt - extensionDurationSeconds * 1000;

    if (
      !Number.isFinite(startsAt.getTime()) ||
      durationSeconds <= 0 ||
      vladivostokDate(startsAt) !== reportDate ||
      extensionDurationSeconds <= 0 ||
      extensionStartsAt <= followingShiftCutoff
    ) {
      return;
    }

    const extensionIds = new Set(
      extensionServices
        .map((service) => Number(service.id))
        .filter((id) => Number.isFinite(id) && id > 0),
    );

    if (extensionIds.size) {
      extensionIdsByRecord.set(Number(record.id), extensionIds);
    }
  });

  return extensionIdsByRecord;
};

const wasReclassifiedAfterTransaction = (transaction: RawTransaction) => {
  const transactionTime = Date.parse(transaction.date ?? '');
  const changeTime = Date.parse(transaction.last_change_date ?? '');
  return Number.isFinite(transactionTime) && Number.isFinite(changeTime) && changeTime > transactionTime;
};

const followingShiftCutoffTime = (reportDate: string) =>
  Date.parse(`${reportDate}T02:00:00+10:00`) + 24 * 60 * 60 * 1000;

const kitchenTerminalAdjustmentStartDate = () =>
  // Standalone kitchen payments were included in the handwritten terminal
  // subtotal before this migration date. Keep the boundary configurable so
  // historical reports do not change when the new classification is applied.
  process.env.YCLIENTS_KITCHEN_TERMINAL_ADJUSTMENT_FROM ?? '2026-08-23';

const historicalTerminalExclusionIds = () =>
  new Set(
    (process.env.YCLIENTS_TERMINAL_EXCLUSION_TRANSACTION_IDS ?? '1635573912')
      .split(',')
      .map((value) => Number(value.trim()))
      .filter((value) => Number.isFinite(value) && value > 0),
  );

const historicalSurrenderedAdjustment = (date: string) => {
  const configured = process.env.YCLIENTS_SURRENDERED_ADJUSTMENTS ?? '2026-08-03:-20';

  return configured.split(',').reduce((adjustment, entry) => {
    const [entryDate, rawAmount] = entry.split(':');
    return entryDate?.trim() === date ? Number(rawAmount?.trim() ?? 0) || 0 : adjustment;
  }, 0);
};

type DailyReportCalculation = Omit<DailyReport, 'date'>;

export const calculateDailyReport = ({
  date,
  transactions,
  kppCompensation,
  kitchenServiceIds = [],
  extensionTransactions = new Map<number, Set<number>>(),
  kitchenOnlyRecordIds = new Set<number>(),
  kitchenAdjustmentFrom = kitchenTerminalAdjustmentStartDate(),
  terminalExclusionTransactionIds = historicalTerminalExclusionIds(),
  surrenderedAdjustment = historicalSurrenderedAdjustment(date),
}: {
  date: string;
  transactions: RawTransaction[];
  kppCompensation: number;
  kitchenServiceIds?: number[];
  extensionTransactions?: Map<number, Set<number>>;
  kitchenOnlyRecordIds?: Set<number>;
  kitchenAdjustmentFrom?: string;
  terminalExclusionTransactionIds?: Set<number>;
  surrenderedAdjustment?: number;
}): DailyReportCalculation => {
  const activeTransactions = transactions.filter((transaction) => !transaction.deleted);
  const kitchenIds = new Set(kitchenServiceIds.map(Number));
  const terminalRecordIds = new Set(
    activeTransactions
      .filter((transaction) => normalizedTitle(transaction.account?.title) === terminalAccountTitle)
      .map((transaction) => Number(transaction.record_id))
      .filter((recordId) => recordId > 0),
  );
  const shiftCutoff = followingShiftCutoffTime(date);

  let transactionIncome = 0;
  let rawYclientsExpense = 0;
  let fractionalExpenseCount = 0;
  let outsideShiftExpense = 0;
  let prepayments = 0;
  let cashless = 0;
  let terminalBeforeAdjustment = 0;
  let kitchenTerminalAdjustment = 0;
  let shiftTransfer = 0;
  let lateKitchenExcluded = 0;

  activeTransactions.forEach((transaction) => {
    const amount = Number(transaction.amount ?? 0);
    if (!Number.isFinite(amount)) return;

    const positiveAmount = Math.max(0, amount);
    const accountTitle = normalizedTitle(transaction.account?.title);
    const extensionIds = extensionTransactions.get(Number(transaction.record_id));
    const belongsToFollowingShift =
      transaction.sold_item_type === 'service' &&
      extensionIds?.has(Number(transaction.sold_item_id)) &&
      cashlessAccountTitles.has(accountTitle);
    const isLateStandaloneKitchen =
      positiveAmount > 0 &&
      Number(transaction.visit_id ?? 0) <= 0 &&
      transaction.sold_item_type === 'service' &&
      kitchenIds.has(Number(transaction.sold_item_id)) &&
      (transaction.last_change_date ?? '').slice(0, 10) > date;

    if (isLateStandaloneKitchen) {
      lateKitchenExcluded += positiveAmount;
      return;
    }

    // YCLIENTS keeps the full sale in income. For the handwritten shift
    // report, a paid extension after 02:00 is moved from cashless/terminal to
    // the P/O line without changing the total income.
    transactionIncome += positiveAmount;

    const isGoodsOnTerminalVisit =
      accountTitle === genericCashlessAccountTitle &&
      transaction.sold_item_type === 'goods_transaction' &&
      Number(transaction.visit_id ?? 0) > 0 &&
      terminalRecordIds.has(Number(transaction.record_id)) &&
      kitchenOnlyRecordIds.has(Number(transaction.record_id)) &&
      (!Number.isFinite(Date.parse(transaction.last_change_date ?? '')) ||
        Date.parse(transaction.last_change_date ?? '') <= shiftCutoff);

    const isExcludedHistoricalTerminalTransaction =
      terminalExclusionTransactionIds.has(Number(transaction.id));

    if (
      (accountTitle === terminalAccountTitle && !isExcludedHistoricalTerminalTransaction) ||
      isGoodsOnTerminalVisit
    ) {
      terminalBeforeAdjustment += positiveAmount;
    }

    if (belongsToFollowingShift) {
      shiftTransfer += positiveAmount;
      prepayments += positiveAmount;
      return;
    }

    const isExpense = amount < 0 || Number(transaction.expense?.type) === 2;
    if (isExpense) {
      const expenseAmount = amount < 0 ? Math.abs(amount) : amount;
      const expenseType = Number(transaction.expense?.type);
      const isShiftCashExpense =
        expenseType !== 4 &&
        (shiftCashAccountTitles.has(accountTitle) || transaction.account?.is_cash === true);

      if (isShiftCashExpense) {
        rawYclientsExpense += expenseAmount;
        if (!Number.isInteger(expenseAmount)) fractionalExpenseCount += 1;
      } else {
        outsideShiftExpense += expenseAmount;
      }
    }

    if (prepaymentAccountTitles.has(accountTitle)) {
      prepayments += positiveAmount;
    }

    if (cashlessAccountTitles.has(accountTitle)) {
      cashless += positiveAmount;
    }

    if (accountTitle === terminalAccountTitle) {
      const isKitchenReclassification =
        date >= kitchenAdjustmentFrom &&
        Number(transaction.visit_id ?? 0) <= 0 &&
        transaction.sold_item_type === 'service' &&
        kitchenIds.has(Number(transaction.sold_item_id)) &&
        wasReclassifiedAfterTransaction(transaction);

      if (isKitchenReclassification) {
        kitchenTerminalAdjustment += positiveAmount;
      }
    }
  });

  const yclientsExpense = roundCashExpense(rawYclientsExpense, fractionalExpenseCount);
  const income = transactionIncome + kppCompensation;
  const expense = yclientsExpense + kppCompensation;
  const terminal = Math.max(0, terminalBeforeAdjustment - kitchenTerminalAdjustment - shiftTransfer);

  return {
    income,
    expense,
    yclientsExpense,
    outsideShiftExpense,
    kppCompensation,
    prepayments,
    cashless,
    terminal,
    kitchenTerminalAdjustment,
    shiftTransfer,
    lateKitchenExcluded,
    surrenderedAdjustment,
    surrendered: income - expense - prepayments - cashless + surrenderedAdjustment,
    transactionCount: activeTransactions.length,
  };
};

export async function getDailyReport(date: string, kitchenServiceIds: number[] = []): Promise<DailyReport> {
  const compactDate = date.replaceAll('-', '');
  const query = new URLSearchParams({
    page: '1',
    count: '200',
    start_date: compactDate,
    end_date: compactDate,
    deleted: '0',
  });
  const [transactions, records] = await Promise.all([
    yclientsRequest<RawTransaction[]>(`/transactions/${COMPANY_ID}?${query}`),
    getRawRecordsForDate(date),
  ]);
  const kppCompensation = await getKppCompensation(records);
  const calculation = calculateDailyReport({
    date,
    transactions,
    kppCompensation,
    kitchenServiceIds,
    extensionTransactions: crossMidnightExtensionTransactions(records, date),
    kitchenOnlyRecordIds: new Set(
      records
        .filter(
          (record) =>
            (record.services ?? []).length > 0 &&
            (record.services ?? []).every((service) => !/^аренда/i.test(service.title?.trim() ?? '')),
        )
        .map((record) => Number(record.id)),
    ),
  });

  return {
    date,
    ...calculation,
  };
}

const updateService = (service: RawRecordService) => ({
  id: Number(service.id),
  first_cost: Number(service.first_cost ?? service.manual_cost ?? service.cost ?? 0),
  discount: Number(service.discount ?? 0),
  cost: Number(service.cost ?? service.manual_cost ?? service.first_cost ?? 0),
});

export async function addKitchenServices(recordId: number, serviceIds: number[]) {
  if (!Number.isFinite(recordId) || serviceIds.length === 0) {
    throw new YclientsAdminError('Выберите запись и блюдо.', 400, 'validation');
  }

  const [record, catalog] = await Promise.all([
    yclientsRequest<RawRecord>(`/record/${COMPANY_ID}/${recordId}?include_finance_transactions=1`),
    getAdminCatalog(),
  ]);
  const allowedKitchen = new Map(catalog.kitchen.map((service) => [service.id, service]));
  const selectedKitchen = Array.from(new Set(serviceIds)).map((id) => allowedKitchen.get(Number(id))).filter(Boolean);

  if (selectedKitchen.length !== new Set(serviceIds).size) {
    throw new YclientsAdminError('Одна из выбранных услуг не относится к кухне.', 400, 'validation');
  }

  const existingIds = new Set((record.services ?? []).map((service) => Number(service.id)));
  const services = [
    ...(record.services ?? []).map(updateService),
    ...selectedKitchen
      .filter((service) => service && !existingIds.has(service.id))
      .map((service) => ({
        id: service!.id,
        first_cost: service!.price,
        discount: 0,
        cost: service!.price,
      })),
  ];

  const updated = await yclientsRequest<RawRecord>(`/record/${COMPANY_ID}/${recordId}`, {
    method: 'PUT',
    body: JSON.stringify({
      activity_id: Number(record.activity_id ?? 0),
      staff_id: Number(record.staff_id ?? record.staff?.id),
      services,
      client: {
        name: record.client?.name || '',
        phone: record.client?.phone || '',
        email: record.client?.email || '',
      },
      save_if_busy: true,
      datetime: recordDateTime(record),
      seance_length: Number(record.seance_length ?? record.length ?? 3600),
      send_sms: false,
      comment: record.comment || '',
      attendance: Number(record.attendance ?? record.visit_attendance ?? 0),
    }),
  });

  return normalizeRecord(updated);
}
