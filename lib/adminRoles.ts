export type AdminRole = 'admin' | 'owner' | 'director' | 'copy';

export type AdminAccess = {
  fullReports: boolean;
  periodReports: boolean;
  /** Учётная запись видит только тексты занятости бань для копирования. */
  copyTextsOnly: boolean;
};

const ACCESS_BY_ROLE: Record<AdminRole, AdminAccess> = {
  admin: {
    fullReports: false,
    periodReports: false,
    copyTextsOnly: false,
  },
  owner: {
    fullReports: true,
    periodReports: true,
    copyTextsOnly: false,
  },
  director: {
    fullReports: true,
    periodReports: true,
    copyTextsOnly: false,
  },
  copy: {
    fullReports: false,
    periodReports: false,
    copyTextsOnly: true,
  },
};

export const getAdminAccess = (role: AdminRole): AdminAccess => ACCESS_BY_ROLE[role];

export const getAdminRoleLabel = (role: AdminRole) => ({
  admin: 'Администратор',
  owner: 'Владелец',
  director: 'Директор',
  copy: 'Тексты занятости',
})[role];
