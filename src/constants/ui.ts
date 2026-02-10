/**
 * UI Strings Constants
 * 
 * Centralized constants for all UI strings (buttons, messages, errors, toasts).
 * Migrated from components to improve maintainability and follow
 * "Zero Magic Strings" rule from .cursorrules
 */

// Button Labels
export const UI_BUTTONS = {
  SAVE: 'Save',
  CANCEL: 'Cancel',
  DELETE: 'Delete',
  EDIT: 'Edit',
  CLOSE: 'Close',
  NEXT: 'Next',
  BACK: 'Back',
  SUBMIT: 'Submit',
  CONTINUE: 'Continue',
  FINISH: 'Finish',
  SKIP: 'Skip',
  RETRY: 'Retry',
  CONFIRM: 'Confirm',
  YES: 'Yes',
  NO: 'No',
  UPLOAD: 'Upload',
  DOWNLOAD: 'Download',
  SHARE: 'Share',
  COPY: 'Copy',
  SCAN: 'Scan',
  CAPTURE: 'Capture',
  START: 'Start',
  STOP: 'Stop',
  RESET: 'Reset',
  CLEAR: 'Clear',
  SEARCH: 'Search',
  FILTER: 'Filter',
  SORT: 'Sort',
  EXPORT: 'Export',
  IMPORT: 'Import',
  REFRESH: 'Refresh',
  LOAD_MORE: 'Load More',
  VIEW_ALL: 'View All',
  SELECT_ALL: 'Select All',
  DESELECT_ALL: 'Deselect All',
} as const;

// Toast Messages - Success
export const UI_TOASTS = {
  SUCCESS: {
    ASSESSMENT_SAVED: 'Assessment Saved',
    ASSESSMENT_UPDATED: 'Assessment Updated',
    PARTIAL_ASSESSMENT_SAVED: 'Partial Assessment Saved',
    PROFILE_UPDATED: 'Profile updated',
    PROFILE_SAVED: 'Client profile has been saved.',
    ASSESSMENT_DELETED: 'Assessment deleted',
    ASSESSMENT_REMOVED: 'The assessment has been removed.',
    IMAGES_UPLOADED: 'Images uploaded successfully',
    IMAGE_CAPTURED: 'Image Captured',
    REPORT_EMAILED: 'Report emailed',
    LINK_COPIED: 'Live Link Copied',
    LINK_COPIED_DESC: 'Anyone with this link can view the interactive report.',
    SHARED_SUCCESSFULLY: 'Shared successfully',
    SHARED_DESC: 'The report link has been shared.',
    SCAN_COMPLETE: 'Scan complete! You can re-scan if needed or continue to the next step.',
    LOADING_IMAGES: 'Loading images...',
  },
  ERROR: {
    GENERIC: 'Error',
    FAILED_TO_SAVE: 'Failed to save assessment',
    FAILED_TO_SAVE_DESC: 'Please refresh and try again. If the problem persists, contact support.',
    UNABLE_TO_SAVE: 'Unable to Save Assessment',
    UNABLE_TO_SAVE_DESC: 'Organization ID is missing. Please refresh the page and try again. If the problem persists, contact support.',
    SYNC_ERROR: 'Sync Error',
    SYNC_ERROR_DESC: 'Unable to sync with dashboard. Please check your connection and try again.',
    CONNECTION_LOST: 'Connection Lost',
    CONNECTION_LOST_DESC: 'Phone disconnected. Scan the QR code to reconnect.',
    SESSION_NOT_READY: 'Session not ready',
    SESSION_NOT_READY_DESC: 'Please wait for the session to initialize before uploading images.',
    UPLOAD_IN_PROGRESS: 'Upload in progress',
    UPLOAD_IN_PROGRESS_DESC: 'Please wait for the current upload to complete.',
    UPLOAD_FAILED: 'Upload failed',
    UPLOAD_FAILED_DESC: 'Could not open file selector. Please try again.',
    NO_ACTIVE_SESSION: 'No active session',
    NO_ACTIVE_SESSION_DESC: 'Please wait for the session to initialize before uploading images.',
    NO_FILES_SELECTED: 'No files selected',
    NO_FILES_SELECTED_DESC: 'Please select one or more image files to upload.',
    FAILED_TO_UPDATE: 'Failed to update profile.',
    FAILED_TO_DELETE: 'Failed to delete assessment.',
    FAILED_TO_LOAD: 'Failed to load client history.',
    FAILED_TO_LOAD_MORE: 'Failed to load more assessments.',
    COPY_FAILED: 'Copy failed',
    EMAIL_NOT_SENT: 'Email not sent',
    EMAIL_NOT_SENT_DESC: 'Check configuration.',
    UNABLE_TO_SHARE: 'Unable to share',
    UNABLE_TO_SHARE_DESC: 'Please try copying the link manually.',
    UNABLE_TO_SHARE_WHATSAPP: 'Unable to share via WhatsApp',
    UNABLE_TO_SHARE_WHATSAPP_DESC: 'Copy the link instead.',
    CLIENT_EMAIL_MISSING: 'Client email missing',
    CLIENT_EMAIL_MISSING_DESC: 'Add an email to the intake before emailing a report.',
    CURRENT_DATA_NOT_LOADED: 'Current data not loaded',
    NO_PHASES_AVAILABLE: 'No Phases Available',
  },
  INFO: {
    SCANNING_DOCUMENT: 'Reading your report...',
    ANALYZING_DOCUMENT: 'Reading the numbers from your report...',
    PROCESSING: 'Processing...',
    LOADING: 'Loading...',
    SAVING: 'Saving...',
    UPLOADING: 'Uploading...',
  },
} as const;

// Error Messages
export const UI_ERRORS = {
  GENERIC: 'An error occurred',
  NETWORK: 'Network error. Please check your connection.',
  PERMISSION_DENIED: 'Permission denied',
  NOT_FOUND: 'Resource not found',
  VALIDATION_FAILED: 'Validation failed',
  UNAUTHORIZED: 'Unauthorized access',
  FORBIDDEN: 'Access forbidden',
  SERVER_ERROR: 'Server error. Please try again later.',
  TIMEOUT: 'Request timed out. Please try again.',
  UNKNOWN: 'An unknown error occurred',
} as const;

// Success Messages
export const UI_MESSAGES = {
  SUCCESS: {
    SAVED: 'Saved successfully',
    UPDATED: 'Updated successfully',
    DELETED: 'Deleted successfully',
    CREATED: 'Created successfully',
    UPLOADED: 'Uploaded successfully',
    COPIED: 'Copied to clipboard',
    SHARED: 'Shared successfully',
  },
  INFO: {
    LOADING: 'Loading...',
    PROCESSING: 'Processing...',
    SAVING: 'Saving...',
    UPLOADING: 'Uploading...',
    PLEASE_WAIT: 'Please wait...',
  },
} as const;

// Dialog Titles and Messages
export const UI_DIALOGS = {
  CONFIRM_DELETE: {
    TITLE: 'Confirm Delete',
    MESSAGE: 'Are you sure you want to delete this item? This action cannot be undone.',
    CONFIRM: 'Delete',
    CANCEL: 'Cancel',
  },
  CONFIRM_LOGOUT: {
    TITLE: 'Confirm Logout',
    MESSAGE: 'Are you sure you want to log out?',
    CONFIRM: 'Logout',
    CANCEL: 'Cancel',
  },
  UNSAVED_CHANGES: {
    TITLE: 'Unsaved Changes',
    MESSAGE: 'You have unsaved changes. Are you sure you want to leave?',
    CONFIRM: 'Leave',
    CANCEL: 'Stay',
  },
} as const;

// Form Labels
export const UI_FORMS = {
  REQUIRED_FIELD: 'This field is required',
  INVALID_EMAIL: 'Please enter a valid email address',
  INVALID_PHONE: 'Please enter a valid phone number',
  INVALID_DATE: 'Please enter a valid date',
  INVALID_NUMBER: 'Please enter a valid number',
  MIN_LENGTH: 'Minimum length not met',
  MAX_LENGTH: 'Maximum length exceeded',
  PASSWORD_MISMATCH: 'Passwords do not match',
  WEAK_PASSWORD: 'Password is too weak',
} as const;

// Status Messages
export const UI_STATUS = {
  ONLINE: 'Online',
  OFFLINE: 'Offline',
  CONNECTING: 'Connecting...',
  DISCONNECTED: 'Disconnected',
  SYNCING: 'Syncing...',
  SYNCED: 'Synced',
  PENDING: 'Pending',
  PROCESSING: 'Processing...',
  COMPLETE: 'Complete',
  FAILED: 'Failed',
} as const;

// Dashboard Tab Labels
export const UI_TABS = {
  CLIENTS: 'Clients',
  SCHEDULE: 'Schedule',
} as const;

// Schedule Tab Labels
export const UI_SCHEDULE = {
  OVERDUE: 'Overdue',
  COMING_UP: 'Coming Up',
  ON_TRACK: 'On Track',
  DUE_TODAY: 'Due Today',
  THIS_WEEK: 'This Week',
  REASSESS: 'Reassess',
  FULL_ASSESSMENT: 'Full Assessment',
} as const;

// Draft Recovery
export const UI_DRAFT = {
  TITLE: 'Resume where you left off?',
  RESUME: 'Resume',
  START_FRESH: 'Start Fresh',
  DRAFT_SAVED: 'Draft saved',
  SAVING: 'Saving...',
} as const;
