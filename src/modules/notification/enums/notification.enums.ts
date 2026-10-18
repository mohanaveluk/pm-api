// Where a notification came from — what the in-app feed groups by.
export enum NotificationCategory {
  EMAIL    = 'EMAIL',     // an email the user was sent (email_history)
  WORKFLOW = 'WORKFLOW',  // a step on a document's workflow (workflow_events)
  VENDOR   = 'VENDOR',    // a vendor master change
  SYSTEM   = 'SYSTEM',
}

// The record a notification points at. Together with sourceId it is unique
// per user, so a notification is never created twice for the same thing.
export enum NotificationSourceType {
  EMAIL_HISTORY  = 'EMAIL_HISTORY',
  // The in-app item that accompanies every email (sourceId = email_history.id):
  // it still reaches the user when the email could not be delivered.
  EMAIL_WORKFLOW = 'EMAIL_WORKFLOW',
  WORKFLOW_EVENT = 'WORKFLOW_EVENT',
  VENDOR         = 'VENDOR',
}

export enum NotificationSeverity {
  INFO    = 'info',
  SUCCESS = 'success',
  WARNING = 'warning',
  ERROR   = 'error',
}
