// Lifecycle of a project. Changed only through PATCH /projects/:id/status so
// every transition is validated and carries its reason.
export enum ProjectStatus {
  PLANNED   = 'PLANNED',
  ACTIVE    = 'ACTIVE',
  ON_HOLD   = 'ON_HOLD',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

// Where a project may go from each status. COMPLETED can be reopened and
// CANCELLED reinstated as planned, so a mistaken change is recoverable without
// reaching into the database.
export const PROJECT_STATUS_TRANSITIONS: Readonly<Record<ProjectStatus, readonly ProjectStatus[]>> = {
  [ProjectStatus.PLANNED]:   [ProjectStatus.ACTIVE, ProjectStatus.CANCELLED],
  [ProjectStatus.ACTIVE]:    [ProjectStatus.ON_HOLD, ProjectStatus.COMPLETED, ProjectStatus.CANCELLED],
  [ProjectStatus.ON_HOLD]:   [ProjectStatus.ACTIVE, ProjectStatus.CANCELLED],
  [ProjectStatus.COMPLETED]: [ProjectStatus.ACTIVE],
  [ProjectStatus.CANCELLED]: [ProjectStatus.PLANNED],
};

// "Open" projects: the ones other masters (WBS, requisitions, …) may still
// attach work to. Completed and cancelled projects are closed.
export const OPEN_PROJECT_STATUSES: readonly ProjectStatus[] = [
  ProjectStatus.PLANNED, ProjectStatus.ACTIVE, ProjectStatus.ON_HOLD,
];

// A project can only be deleted before any work has started on it.
export const DELETABLE_PROJECT_STATUSES: readonly ProjectStatus[] = [
  ProjectStatus.PLANNED, ProjectStatus.CANCELLED,
];
