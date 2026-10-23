/**
 * Stable identifiers read from the live YCLIENTS company directory on
 * 2026-09-15. Environment mappings are still supported and override these
 * defaults, so future directory changes do not require a code rewrite.
 */
export const BANYA_MORE_YCLIENTS_COMPANY_ID = '1300176';

type RevenueRowKey =
  | 'revenue.big_bath'
  | 'revenue.small_bath'
  | 'revenue.big_bath_2'
  | 'revenue.parmaster'
  | 'revenue.extension'
  | 'revenue.extra_place'
  | 'revenue.kitchen'
  | 'revenue.drinks'
  | 'revenue.beer'
  | 'revenue.snacks'
  | 'revenue.additional_service'
  | 'revenue.certificates'
  | 'revenue.brooms';

const entriesFor = (
  kind: 'service' | 'good',
  ids: readonly number[],
  rowKey: RevenueRowKey,
): Array<readonly [string, RevenueRowKey]> => ids.map((id) => [`${kind}:${id}`, rowKey] as const);

export const BANYA_MORE_FINANCE_SOLD_ITEM_ENTRIES: ReadonlyArray<readonly [string, RevenueRowKey]> = [
  ...entriesFor('service', [
    20671200, 20671203, 20671206, 20671209, 20671212, 20671215, 20671218,
    20671221, 20671224, 20671227, 20671230, 20671233, 20671236, 20671239,
    20671242, 20671248, 20671251, 20671260, 20671266,
  ], 'revenue.big_bath'),
  ...entriesFor('service', [
    20671296, 20671299, 20671302, 20671305, 20671308, 20671314, 20671317,
    20671323, 20671326, 20671332, 20671335, 20671341, 20671344, 20671347,
    20671350, 20671353, 20671356, 20671362, 20671365,
  ], 'revenue.big_bath_2'),
  ...entriesFor('service', [
    20671386, 20671389, 20671395, 20671398, 20671401, 20671404, 20671407,
    20671410, 20671413, 20671416, 20671419, 20671422, 20671428, 20671431,
    20671434, 20671440, 20671443, 20671449, 20671455,
  ], 'revenue.small_bath'),
  ...entriesFor('service', [20699142, 20699187, 20699280, 20699334], 'revenue.additional_service'),
  ...entriesFor('service', [20897517, 20898666, 20898714], 'revenue.extension'),
  ...entriesFor('service', [23195883, 23195964, 23196018, 23392542, 23392587], 'revenue.parmaster'),
  ...entriesFor('service', [
    20413518, 20413521, 20413524, 20413527, 20413530, 20413533, 20413536,
    20413539, 20413542, 20413545, 20413548, 20413551, 20413554, 20413557,
    20413560, 20413563, 20413566, 20413569, 20413572, 20413575, 20413578,
    20413581, 20413584, 20413587, 20413590, 20413593, 20413596, 20413599,
    20413602, 20413605, 20413608, 20413932, 20658612, 20658621, 20658627,
    20658633, 20658663,
  ], 'revenue.kitchen'),
  ...entriesFor('service', [
    20413611, 20726898, 20726901, 31129182, 31129200, 31129209, 31129227,
    31129254, 31129275, 31129287, 31129314, 31129326, 31129338, 31129344,
    31129356, 31129365, 31129374, 31129383, 31129398, 31129419,
  ], 'revenue.drinks'),
  ...entriesFor('service', [20699076], 'revenue.brooms'),

  ...entriesFor('good', [
    48024282, 37717547, 37717553, 51533124, 37717532, 37717541, 37717538,
    37717535, 37717556, 50620884, 37717559, 51533052, 37717550, 48024240,
    48023754, 37717544,
  ], 'revenue.beer'),
  ...entriesFor('good', [
    37717568, 37717577, 37717574, 37717571, 37717583, 37717586, 37717589,
    37717592, 37717562, 37717565, 37717580, 37717736, 37717739,
  ], 'revenue.drinks'),
  ...entriesFor('good', [
    44251935, 39366603, 52060797, 39190359, 44251917, 52060779, 44251947,
    44252031, 44251968, 44252019,
  ], 'revenue.snacks'),
  ...entriesFor('good', [
    46157825, 46157828, 46157824, 46157827, 46157829, 46157826, 46157830,
    53879163, 53879157, 53879136, 53879112, 53878794, 53878872, 53878770,
    53878950, 53878857, 53878914, 53878833, 53878821, 53878932, 53878884,
    53879082, 53878989, 37717604, 37717607, 50666166, 50666301, 42717693,
    42717684, 38777241, 37717595,
  ], 'revenue.additional_service'),
  ...entriesFor('good', [37717598], 'revenue.brooms'),
  ...entriesFor('good', [43877763, 43877757, 39332076, 39332814], 'revenue.certificates'),
  ...entriesFor('good', [38777217], 'revenue.extra_place'),
  ...entriesFor('good', [37717706, 37717724, 37717730, 37717709], 'revenue.kitchen'),
];

export const BANYA_MORE_INTERNAL_TRANSFER_EXPENSE_IDS = [10] as const;
