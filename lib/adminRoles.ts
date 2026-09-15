export type AdminRole = 'admin' | 'owner' | 'director';

export type AdminAccess = {
  fullReports: boolean;
  periodReports: boolean;
};

const ACCESS_BY_ROLE: Record<AdminRole, AdminAccess> = {
  admin: {
    fullReports: false,
    periodReports: false,
  },
  owner: {
    fullReports: true,
    periodReports: true,
  },
  director: {
    fullReports: true,
    periodReports: true,
  },
};

export const getAdminAccess = (role: AdminRole): AdminAccess => ACCESS_BY_ROLE[role];

export const getAdminRoleLabel = (role: AdminRole) => ({
  admin: 'Администратор',
  owner: 'Владелец',
  director: 'Директор',
})[role];
