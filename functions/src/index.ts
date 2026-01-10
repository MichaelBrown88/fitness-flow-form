import * as admin from 'firebase-admin';
import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { onCall } from 'firebase-functions/v2/https';
import { handleAssessmentWrite } from './artifacts';
import { requestShareLinks, sendReportEmail } from './share';
import {
  handleOrganizationChange,
  handleUserProfileChange,
  handleAssessmentChange,
  handleAIUsageChange,
} from './aggregation';

admin.initializeApp();

// Existing functions
export const syncAssessmentArtifacts = onDocumentWritten(
  {
    document: 'coaches/{coachUid}/assessments/{assessmentId}',
  },
  handleAssessmentWrite,
);

export const requestReportShare = onCall({
  enforceAppCheck: false,
}, requestShareLinks);

export const emailReport = onCall({
  enforceAppCheck: false,
}, sendReportEmail);

// Aggregation functions (write-time counters)
export const aggregateOrganizationChanges = onDocumentWritten(
  {
    document: 'organizations/{orgId}',
  },
  async (event) => {
    if (event.data) {
      await handleOrganizationChange(event.data);
    }
  },
);

export const aggregateUserProfileChanges = onDocumentWritten(
  {
    document: 'userProfiles/{userId}',
  },
  async (event) => {
    if (event.data) {
      await handleUserProfileChange(event.data);
    }
  },
);

// Handle assessments from both old and new paths
export const aggregateAssessmentChanges = onDocumentWritten(
  {
    document: 'assessments/{assessmentId}',
  },
  async (event) => {
    if (event.data) {
      await handleAssessmentChange(event.data);
    }
  },
);

// Also handle legacy path
export const aggregateLegacyAssessmentChanges = onDocumentWritten(
  {
    document: 'coaches/{coachUid}/assessments/{assessmentId}',
  },
  async (event) => {
    if (event.data) {
      await handleAssessmentChange(event.data);
    }
  },
);

export const aggregateAIUsageChanges = onDocumentWritten(
  {
    document: 'ai_usage_logs/{logId}',
  },
  async (event) => {
    if (event.data) {
      await handleAIUsageChange(event.data);
    }
  },
);
