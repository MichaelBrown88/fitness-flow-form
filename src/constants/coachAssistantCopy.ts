/** Coach workspace assistant — user-visible copy (i18n-ready). */

export const COACH_ASSISTANT_COPY = {
  MODE_DATA_LABEL: 'Client AI',
  MODE_ASSIST_LABEL: 'General AI',
  MODE_DATA_DESC:
    'Grounded in your real assessment data — scores, schedules, weaknesses, and history. Everything you see is from your actual client records.',
  MODE_ASSIST_DESC:
    'General fitness, programming, and exercise science knowledge. Not connected to your client data — use Client AI for roster questions.',
  MODE_TOOLTIP:
    'Client AI: reads your live roster, assessments, overdue pillars, and weakness patterns. Answers are grounded in your real records — nothing invented.\n\nGeneral AI: exercise science, programming, and coaching knowledge. Useful for building plans and thinking through training concepts — but not connected to your client data. Take answers with a pinch of salt.',
  MODE_ASSIST_WARNING: 'General AI mode',
  MODE_ASSIST_WARNING_SUB: 'Not connected to client data. Answers may not be accurate.',
  PROVENANCE_DATA_ONLY: '',
  PROVENANCE_LLM: 'AI-assisted',
  PLACEHOLDER: 'Ask about your clients, scores, or schedule...',
  SLASH_HINT: '',
  NEW_CHAT: 'New chat',
  SIDEBAR_SEARCH: 'Search',
  SIDEBAR_CHATS: 'Chats',
  /** Sidebar block title — contains Reports, ARC™, Milestones collapsibles. */
  SIDEBAR_ARTIFACTS_SECTION: 'Artifacts',
  /** Accessible name for the artifacts region (e.g. screen readers). */
  SIDEBAR_ARTIFACTS_REGION_LABEL: 'Artifacts — public report, client ARC™, and milestone links',
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
  ARTIFACTS_FILTER_ROADMAPS: 'ARC™',
  ARTIFACTS_FILTER_ACHIEVEMENTS: 'Milestones',
  ARTIFACTS_GRID_EMPTY_FILTERED: 'Nothing in this view.',
  ARTIFACTS_GRID_EMPTY_ALL:
    'No public links yet. Share a report from an assessment or publish a client ARC™ to see cards here.',
  ARTIFACTS_GRID_LOADING: 'Loading…',
  SIDEBAR_CATEGORY_REPORTS: 'Reports',
  SIDEBAR_CATEGORY_ROADMAPS: 'ARC™',
  SIDEBAR_CATEGORY_ACHIEVEMENTS: 'Milestones',
  SIDEBAR_CATEGORY_REPORTS_HINT: 'Assessment report — link preview works in social apps.',
  SIDEBAR_CATEGORY_ROADMAPS_HINT: 'Published ARC™ viewer for the same share token.',
  SIDEBAR_CATEGORY_ACHIEVEMENTS_HINT: 'Milestone wall clients can open from the link.',
  EMPTY_SHAREABLE_REPORTS:
    'No shared reports yet. Share from an assessment to add a link here.',
  EMPTY_SHAREABLE_ROADMAPS:
    'No published ARC™ links yet. Set a share link on a client ARC™ to list it here.',
  EMPTY_SHAREABLE_ACHIEVEMENTS:
    'Share a client report first — milestones use the same public link.',
  ROADMAP_PREVIEW_TITLE: (clientName: string) => `Shared ARC™ — ${clientName}`,
  ROADMAP_PREVIEW_SUB:
    'Public ARC™ page — copy the link or caption for Instagram, Facebook, or your client.',
  ACHIEVEMENTS_PREVIEW_TITLE: (clientName: string) => `Shared milestones — ${clientName}`,
  ACHIEVEMENTS_PREVIEW_SUB:
    'Public milestones view — great for social proof posts and quick client shout-outs.',
  ROADMAP_SOCIAL_CAPTION: (clientName: string, url: string) =>
    `Training ARC™ — ${clientName}\n${url}`,
  ACHIEVEMENTS_SOCIAL_CAPTION: (clientName: string, url: string) =>
    `ARC™ milestones unlocked — ${clientName}\n${url}`,
  EMAIL_ROADMAP_SUBJECT: (clientName: string) => `Your ARC™ — ${clientName}`,
  EMAIL_ACHIEVEMENTS_SUBJECT: (clientName: string) => `Your milestones — ${clientName}`,
  SIDEBAR_RECENTS: 'Recents',
  EMPTY_TITLE: 'What would you like to do?',
  EMPTY_SUB: 'Use Data AI for overdue clients, roster questions, and patterns in your assessments. Use Fitness AI for programming and general coaching topics.',
  CHIP_TODAY: 'Today',
  CHIP_WHOS_DUE: "Who's due?",
  CHIP_CLIENT_PROGRESS: 'Client progress',
  CHIP_NEW_ASSESSMENT: 'New assessment',
  CHIP_ROSTER_HEALTH: 'Roster health',
  CHIP_SHARE: 'Public links',
  QUICK_ACTIONS_MENU_ARIA: 'Quick actions',
  HELP_TEXT: `Try:
• /today — your daily brief: overdue clients, tasks, and priorities
• /due — who needs reassessing and when
• /progress — score trends and most improved clients
• /health — roster-wide patterns, weak pillars, and who needs focus
• /share — public links (reports, ARC™, milestones) summarised in chat
• /help — this list
• @ClientName — mention a client to ask about them directly`,
  TODAY_EMPTY: 'No overdue or upcoming tasks from your queue right now.',
  TODAY_INTRO: 'Here is what is on your plate:',
  CLIENT_AMBIGUOUS: 'Several clients match. Pick one:',
  CLIENT_NONE: 'No client matched that name. Try Search or open Clients.',
  CLIENT_OPEN: 'Open profile',
  DEFAULT_REPLY:
    'I did not understand that. Try /help, pick a quick action, or use the search icon for clients.',
  /** Shown when the model request fails so we do not silently show DEFAULT_REPLY. */
  AI_UNAVAILABLE:
    'The assistant could not reach the AI service right now. Check your connection and try again. You can still use /commands or type a client name for quick links.',
  /** Warm copy when the model service errors — shown as a normal assistant bubble. */
  ASSISTANT_SOFT_FAILURE:
    "I'm having trouble reaching the assistant right now — your connection or our AI service may be busy. I'm still here; try sending that again in a moment. Meanwhile you can use the Clients tab or /commands when they work.",
  LOADING: 'Thinking…',
  THINKING_FETCHING: 'Checking your client data…',
  THINKING_GENERATING: 'Putting your answer together…',
  STREAM_INCOMPLETE_NOTE:
    'This response may be incomplete — try sending your question again.',
  STREAM_PREVIEW_ARIA: 'Assistant is composing a reply',
  STREAM_COMPOSING_LINE: 'Composing reply…',
  /** Assistant bubble typewriter: ms per character (~55 chars/sec, slightly faster than typical reading). */
  ASSISTANT_TYPEWRITER_MS_PER_CHAR: 17,
  AI_ASSISTANT_UPGRADE_CTA: 'Upgrade plan',
  AI_ASSISTANT_QUOTA_RESET_HINT: () => {
    const d = new Date();
    const next = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    return next.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
  },
  AI_ASSISTANT_QUOTA_REQUESTS_EXCEEDED: (resetLabel: string) =>
    `You've reached your AI assistant request limit for this month. Upgrade your plan to continue using the assistant, or your allowance resets on ${resetLabel}.`,
  AI_ASSISTANT_QUOTA_TOKENS_EXCEEDED: (resetLabel: string) =>
    `You've reached your AI assistant token budget for this month. Upgrade your plan to continue, or your allowance resets on ${resetLabel}.`,
  AI_USAGE_REQUESTS_LABEL: (used: number, cap: number) =>
    `AI requests: ${used} / ${cap} this month`,
  AI_USAGE_TOKENS_SUBLABEL: (used: number, cap: number) =>
    `Tokens: ${used.toLocaleString()} / ${cap.toLocaleString()}`,
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
  DUE: '/due',
  PROGRESS: '/progress',
  HEALTH: '/health',
  CLIENTS: '/clients',
  WORK: '/work',
  SHARE: '/share',
} as const;
