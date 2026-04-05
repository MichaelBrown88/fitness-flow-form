/** Coach workspace assistant — user-visible copy (i18n-ready). */

export const COACH_ASSISTANT_COPY = {
  MODE_DATA_LABEL: 'Data',
  MODE_ASSIST_LABEL: 'Assist',
  MODE_DATA_DESC: 'Answers use only your live app data and templates.',
  MODE_ASSIST_DESC:
    'Adds a short AI-written summary. It can still mis-speak — trust the cards and numbers below.',
  MODE_TOOLTIP:
    'Data mode never calls the language model. Assist mode may rephrase facts only; verify with structured results.',
  PROVENANCE_DATA_ONLY: 'App data',
  PROVENANCE_LLM: 'Summary may include AI wording',
  PLACEHOLDER: 'Ask anything, or type / for commands',
  SLASH_HINT: 'Type / for commands (e.g. /today, /help)',
  NEW_CHAT: 'New chat',
  SIDEBAR_SEARCH: 'Search',
  SIDEBAR_CHATS: 'Chats',
  /** Sidebar block title — contains Reports, Roadmaps, Achievements collapsibles. */
  SIDEBAR_ARTIFACTS_SECTION: 'Artifacts',
  /** Accessible name for the artifacts region (e.g. screen readers). */
  SIDEBAR_ARTIFACTS_REGION_LABEL: 'Artifacts — public report, roadmap, and achievements links',
  /** Sidebar → full-page Artifacts grid */
  SIDEBAR_ARTIFACTS_VIEW_ALL: 'View all',
  /** Shown in sidebar on /dashboard/artifacts so lists are not duplicated for assistive tech. */
  SIDEBAR_ARTIFACTS_STUB_ON_GRID_PAGE:
    'Use the grid in the main area to open, preview, or copy links. Your chats stay above.',
  ARTIFACTS_PAGE_TITLE: 'Artifacts',
  ARTIFACTS_PAGE_SUB:
    'Public links you can share with clients or post on social — open a card to preview or copy.',
  ARTIFACTS_FILTER_ALL: 'All',
  ARTIFACTS_FILTER_REPORTS: 'Reports',
  ARTIFACTS_FILTER_ROADMAPS: 'Roadmaps',
  ARTIFACTS_FILTER_ACHIEVEMENTS: 'Achievements',
  ARTIFACTS_GRID_EMPTY_FILTERED: 'Nothing in this view.',
  ARTIFACTS_GRID_EMPTY_ALL:
    'No public links yet. Share a report from an assessment or publish a client roadmap to see cards here.',
  ARTIFACTS_GRID_LOADING: 'Loading…',
  SIDEBAR_CATEGORY_REPORTS: 'Reports',
  SIDEBAR_CATEGORY_ROADMAPS: 'Roadmaps',
  SIDEBAR_CATEGORY_ACHIEVEMENTS: 'Achievements',
  SIDEBAR_CATEGORY_REPORTS_HINT: 'Assessment report — link preview works in social apps.',
  SIDEBAR_CATEGORY_ROADMAPS_HINT: 'Published roadmap viewer for the same share token.',
  SIDEBAR_CATEGORY_ACHIEVEMENTS_HINT: 'Trophy wall clients can open from the link.',
  EMPTY_SHAREABLE_REPORTS:
    'No shared reports yet. Share from an assessment to add a link here.',
  EMPTY_SHAREABLE_ROADMAPS:
    'No published roadmaps yet. Set a share link on a client roadmap to list it here.',
  EMPTY_SHAREABLE_ACHIEVEMENTS:
    'Share a client report first — achievements use the same public link.',
  ROADMAP_PREVIEW_TITLE: (clientName: string) => `Shared roadmap — ${clientName}`,
  ROADMAP_PREVIEW_SUB:
    'Public roadmap page — copy the link or caption for Instagram, Facebook, or your client.',
  ACHIEVEMENTS_PREVIEW_TITLE: (clientName: string) => `Shared achievements — ${clientName}`,
  ACHIEVEMENTS_PREVIEW_SUB:
    'Public achievements view — great for social proof posts and quick client shout-outs.',
  ROADMAP_SOCIAL_CAPTION: (clientName: string, url: string) =>
    `Training roadmap — ${clientName}\n${url}`,
  ACHIEVEMENTS_SOCIAL_CAPTION: (clientName: string, url: string) =>
    `Achievements unlocked — ${clientName}\n${url}`,
  EMAIL_ROADMAP_SUBJECT: (clientName: string) => `Your roadmap — ${clientName}`,
  EMAIL_ACHIEVEMENTS_SUBJECT: (clientName: string) => `Your achievements — ${clientName}`,
  SIDEBAR_RECENTS: 'Recents',
  EMPTY_TITLE: 'What would you like to do?',
  EMPTY_SUB: 'Use quick actions or type a question. Data mode is on by default.',
  CHIP_TODAY: 'Today',
  CHIP_FIND_CLIENT: 'Find client',
  CHIP_NEW_ASSESSMENT: 'New Assessment',
  CHIP_CALENDAR: 'Calendar',
  CHIP_SHARE: 'Public links',
  QUICK_ACTIONS_MENU_ARIA: 'Quick actions',
  HELP_TEXT: `Try:
• /today — tasks and priorities
• /help — this list
• /clients — open client directory
• /work — tasks and calendar
• /share — Open the Artifacts page (grid of public links)
• Say a client name to open their profile`,
  TODAY_EMPTY: 'No overdue or upcoming tasks from your queue right now.',
  TODAY_INTRO: 'Here is what is on your plate:',
  CLIENT_AMBIGUOUS: 'Several clients match. Pick one:',
  CLIENT_NONE: 'No client matched that name. Try Search or open Clients.',
  CLIENT_OPEN: 'Open profile',
  DEFAULT_REPLY:
    'I did not understand that. Try /help, pick a quick action, or use the search icon for clients.',
  LOADING: 'Thinking…',
  ARTIFACTS_EMPTY: 'No shared report links yet. Share a report from an assessment to see it here.',
  ARTIFACTS_LOAD_ERROR: 'Could not load public links.',
  COPY_LINK: 'Copy link',
  OPEN_LINK: 'Open',
  THREAD_UNTITLED: 'New conversation',
  MOBILE_SIDEBAR: 'Open sidebar',
  SIDEBAR_COLLAPSE_ARIA: 'Collapse workspace sidebar',
  SIDEBAR_EXPAND_ARIA: 'Expand workspace sidebar',
  SKIP_MAIN: 'Skip to main content',
  DELETE_THREAD: 'Delete chat',
  DELETE_THREAD_CONFIRM_TITLE: 'Delete this chat?',
  DELETE_THREAD_CONFIRM_DESC: 'This removes the conversation from this device. This cannot be undone.',
  DELETE_THREAD_CONFIRM_ACTION: 'Delete',
  DELETE_THREAD_CANCEL: 'Cancel',
  AI_CREDITS_LOW_TITLE: 'AI credits running low',
  AI_CREDITS_REMAINING: (remaining: number, limit: number) =>
    `${remaining} of ${limit} AI credits left this billing period.`,
  AI_CREDITS_REMAINING_CTA: 'Billing & top-ups',
  ARTIFACT_PREVIEW_TITLE: (clientName: string) => `Shared report — ${clientName}`,
  ARTIFACT_PREVIEW_SUB:
    'Preview the public link. When you post the URL on Facebook or in messages, platforms show a title, description, and image preview (below). Use the social caption for Instagram or Facebook posts.',
  ARTIFACT_OPEN_NEW_TAB: 'Open in new tab',
  ARTIFACT_COPY_LINK: 'Copy link',
  ARTIFACT_COPY_SOCIAL_CAPTION: 'Copy social caption',
  ARTIFACT_OPEN_FACEBOOK: 'Facebook share',
  ARTIFACT_LINK_PREVIEW_LABEL: 'Link preview (Facebook, Messages, etc.)',
  ARTIFACT_LINK_PREVIEW_IMAGE_NOTE: 'Default 1200×630 preview image',
  ARTIFACT_SHARE_MORE: 'Share…',
  ARTIFACT_REVOKED: 'This link has been revoked.',
  ARTIFACT_LOADING_PREVIEW: 'Loading preview…',
  SHARE_DIALOG_SOCIAL_HINT:
    'For Instagram: paste the caption, then add your link in the caption or use a link sticker in Stories. Facebook: use “Facebook share” or paste the link in a post.',
} as const;

export const COACH_ASSISTANT_SLASH = {
  TODAY: '/today',
  HELP: '/help',
  CLIENTS: '/clients',
  WORK: '/work',
  SHARE: '/share',
} as const;
