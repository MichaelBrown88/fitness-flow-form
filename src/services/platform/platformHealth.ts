/**
 * Platform Health Service
 *
 * Reads AI model config and dependency version data from platform/health/*.
 * Documents are written by Cloud Functions only (checkPlatformHealth, seedAIConfig).
 */

import { doc, getDoc } from 'firebase/firestore';
import { getDb } from '@/services/firebase';

export type AIModelStatus = 'active' | 'deprecated' | 'sunset';

export interface AIConfigHealth {
  modelId: string;
  provider: string;
  status: AIModelStatus;
  deprecationMessage: string | null;
  newerModelId: string | null;
  sdkVersion: string;
  lastUpdated: Date | null;
}

export interface PackageStatus {
  current: string;
  latest: string;
  needsUpdate: boolean;
}

export interface DependenciesHealth {
  checkedAt: Date | null;
  packages: Record<string, PackageStatus>;
}

export interface PlatformHealth {
  aiConfig: AIConfigHealth | null;
  dependencies: DependenciesHealth | null;
}

export async function getPlatformHealth(): Promise<PlatformHealth> {
  const db = getDb();

  const [aiConfigSnap, depsSnap] = await Promise.all([
    getDoc(doc(db, 'platform/aiConfig')),
    getDoc(doc(db, 'platform/dependencies')),
  ]);

  const aiConfig: AIConfigHealth | null = aiConfigSnap.exists()
    ? {
        modelId: aiConfigSnap.data().modelId ?? '',
        provider: aiConfigSnap.data().provider ?? '',
        status: aiConfigSnap.data().status ?? 'active',
        deprecationMessage: aiConfigSnap.data().deprecationMessage ?? null,
        newerModelId: aiConfigSnap.data().newerModelId ?? null,
        sdkVersion: aiConfigSnap.data().sdkVersion ?? '',
        lastUpdated: aiConfigSnap.data().lastUpdated?.toDate() ?? null,
      }
    : null;

  const dependencies: DependenciesHealth | null = depsSnap.exists()
    ? {
        checkedAt: depsSnap.data().checkedAt?.toDate() ?? null,
        packages: (depsSnap.data().packages ?? {}) as Record<string, PackageStatus>,
      }
    : null;

  return { aiConfig, dependencies };
}
