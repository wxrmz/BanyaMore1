import type { AdminDashboard, BathSummary } from './yclientsReports';

export type RestrictedAdminDashboard = Omit<
  AdminDashboard,
  'report' | 'kitchen' | 'additionalServices' | 'goods' | 'beer' | 'drinks' | 'baths'
> & {
  baths: Array<Pick<BathSummary, 'id' | 'title' | 'shortTitle' | 'records'>>;
};

export function stripClosedAdminReport(dashboard: AdminDashboard): RestrictedAdminDashboard {
  const {
    report: _report,
    kitchen: _kitchen,
    additionalServices: _additionalServices,
    goods: _goods,
    beer: _beer,
    drinks: _drinks,
    ...operationalDashboard
  } = dashboard;

  return {
    ...operationalDashboard,
    baths: dashboard.baths.map(({ id, title, shortTitle, records }) => ({
      id,
      title,
      shortTitle,
      records,
    })),
  };
}
