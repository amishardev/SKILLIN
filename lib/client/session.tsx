'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { User } from 'firebase/auth';
import { completeGoogleRedirect, onAuthChange } from '@/lib/firebase/auth';
import {
  browserTimezone,
  loadPlan,
  loadProfile,
  loadSavedResourceIds,
  saveResourceIds,
  savePlan,
  saveProfile,
  StorageUnavailableError,
} from '@/lib/firebase/firestore';
import { analyze, type Analysis } from '@/lib/analysis';
import type { CareerPlan, LearningStreak, StudentProfile, UserProgress } from '@/types';

/**
 * Session state.
 *
 * Holds the learner's profile, plan and derived analysis. Two backing stores:
 *
 *   - Signed in  → Firestore, via the client SDK for owned data and the API
 *                  for server-managed streak/progress.
 *   - localStorage → a cache of the signed-in session, so a reload paints
 *                    immediately. Firestore remains the source of truth and
 *                  pretends to be a real, persisted streak.
 *
 * The analysis itself runs identically in both modes, it is pure.
 */

const PROFILE_KEY = 'skillin:profile';
const PLAN_KEY = 'skillin:plan';
const SAVED_KEY = 'skillin:saved';

export interface SessionState {
  /**
   * Firebase has said whether anyone is signed in. This is the only thing a
   * route guard may wait on before deciding, and it is deliberately not tied
   * to any Firestore read.
   */
  authReady: boolean;
  /** The signed-in user's stored documents have been read, or have failed. */
  dataReady: boolean;
  /**
   * The documents could not be read for a reason that is not Security Rules.
   * Distinct from having none: a learner whose profile failed to load has not
   * lost it, and must not be sent back through onboarding to make another.
   */
  loadError: boolean;
  /** Read the stored documents again, for the retry button. */
  retryLoad: () => Promise<void>;
  /** authReady and dataReady together, for callers that need both. */
  ready: boolean;
  user: User | null;
  profile: StudentProfile | null;
  plan: CareerPlan | null;
  analysis: Analysis | null;
  progress: UserProgress | null;
  streak: LearningStreak | null;
  savedIds: string[];
  timezone: string;
  /**
   * Set when Firestore rejected a read or write because of Security Rules.
   * Work continues in the browser; the UI tells the learner it is not saved.
   */
  storageBlocked: boolean;

  setProfile: (profile: StudentProfile) => Promise<void>;
  setPlan: (plan: CareerPlan) => Promise<void>;
  toggleSaved: (resourceId: string) => Promise<void>;
  recordActivity: (input: RecordActivityInput) => Promise<RecordActivityResult>;
  refreshStreak: () => Promise<void>;
  clearSession: () => void;
}

export interface RecordActivityInput {
  type:
    | 'lesson_completed'
    | 'module_completed'
    | 'resource_completed'
    | 'project_milestone'
    | 'project_completed'
    | 'learning_session';
  targetId?: string;
  label: string;
  minutes?: number;
}

export interface RecordActivityResult {
  ok: boolean;
  changed: boolean;
  milestoneReached: number | null;
  message: string;
  /** True when the write was rejected because the learner is not signed in. */
  requiresAuth?: boolean;
}

const SessionContext = createContext<SessionState | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [authReady, setAuthReady] = useState(false);
  const [dataReady, setDataReady] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfileState] = useState<StudentProfile | null>(null);
  const [plan, setPlanState] = useState<CareerPlan | null>(null);
  const [progress, setProgress] = useState<UserProgress | null>(null);
  const [streak, setStreak] = useState<LearningStreak | null>(null);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [storageBlocked, setStorageBlocked] = useState(false);

  const timezone = useMemo(() => browserTimezone(), []);

  /*
   * Browsers that used the removed demo mode still hold its flag and its sample
   * profile. Shed them once on startup so an old tab does not keep a sample
   * person's data around after the feature that put it there is gone.
   */
  useEffect(() => {
    for (const key of ['skillin:demo', PROFILE_KEY, PLAN_KEY, SAVED_KEY]) {
      try {
        if (key === 'skillin:demo' && localStorage.getItem(key) === null) return;
        if (key === 'skillin:demo' || localStorage.getItem('skillin:demo') !== null) {
          localStorage.removeItem(key);
        }
      } catch {
        // A browser that refuses storage has nothing to shed.
      }
    }
  }, []);

  /** Everything that belongs to one account and must not outlive it. */
  const clearAccountState = useCallback(() => {
    setProfileState(null);
    setPlanState(null);
    setSavedIds([]);
    setProgress(null);
    setStreak(null);
    setStorageBlocked(false);
    setLoadError(false);
  }, []);

  /**
   * Read the signed-in learner's documents.
   *
   * Separated from the auth listener so that a slow or stalled Firestore delays
   * only the data, never the answer to "is anyone signed in". Those used to be
   * the same await, which meant a browser where Firestore hangs, and IndexedDB
   * being unavailable is enough to do it, never finished resolving auth and the
   * app sat on its loading screen for good.
   */
  const loadAccount = useCallback(async (uid: string) => {
    setLoadError(false);
    try {
      const [remoteProfile, remotePlan, saved] = await Promise.all([
        loadProfile(uid),
        loadPlan(uid),
        loadSavedResourceIds(uid),
      ]);
      setProfileState(remoteProfile);
      setPlanState(remotePlan);
      setSavedIds(saved);
    } catch (err) {
      if (err instanceof StorageUnavailableError) {
        setStorageBlocked(true);
        // Fall back to whatever this browser already holds so the learner
        // is not staring at an empty app.
        setProfileState(readLocal<StudentProfile>(PROFILE_KEY));
        setPlanState(readLocal<CareerPlan>(PLAN_KEY));
        setSavedIds(readLocal<string[]>(SAVED_KEY) ?? []);
      } else {
        /*
         * Not "this learner has no profile". Recording it as a failure is what
         * stops the route guard reading an unreachable database as a brand new
         * account and marching an existing learner through onboarding again.
         */
        setLoadError(true);
        console.error('[session] failed to load remote state', err);
      }
    } finally {
      setDataReady(true);
    }
  }, []);

  const retryLoad = useCallback(async () => {
    const uid = user?.uid;
    if (!uid) return;
    setDataReady(false);
    await loadAccount(uid);
  }, [user, loadAccount]);

  /*
   * Returning from a redirect sign-in. Once, on mount, never per render: every
   * call consumes the pending result, and calling it repeatedly is how a
   * redirect login ends up silently dropped.
   */
  useEffect(() => {
    void completeGoogleRedirect();
  }, []);

  // ── Hydrate ──
  const previousUid = useRef<string | null>(null);

  useEffect(() => {
    /*
     * Registering the listener can throw outright, when the NEXT_PUBLIC_FIREBASE
     * variables are missing from a deployment. That used to take the whole tree
     * down on first paint, so the site looked dead rather than misconfigured.
     * Resolving as signed out instead puts the visitor on the login screen,
     * where an attempt produces the message naming the missing key.
     */
    let unsubscribe: (() => void) | undefined;
    try {
      unsubscribe = onAuthChange((firebaseUser) => {
        /*
         * Synchronous, and first. The guards act on this, so nothing that can
         * block may come before it.
         */
        setUser(firebaseUser);
        setAuthReady(true);

        const uid = firebaseUser?.uid ?? null;
        const switched = previousUid.current !== uid;
        previousUid.current = uid;

        if (!firebaseUser) {
          // Signed out means no personal state at all. Firestore is the source of
          // truth; localStorage is a cache for a signed-in session, never a second
          // account that lives in one browser.
          clearAccountState();
          setDataReady(true);
          return;
        }

        // A different account must never see the last one's work, not even for
        // the frame between the listener firing and the new read landing.
        if (switched) {
          clearAccountState();
          setDataReady(false);
        }
        void loadAccount(firebaseUser.uid);
      });
    } catch (err) {
      console.error('[session] auth unavailable', err);
      clearAccountState();
      setAuthReady(true);
      setDataReady(true);
    }
    return () => unsubscribe?.();
  }, [clearAccountState, loadAccount]);

  // ── Derived analysis ──
  const analysis = useMemo<Analysis | null>(() => {
    if (!profile || !plan) return null;
    try {
      return analyze({ profile, plan, progress: progress ?? undefined });
    } catch (err) {
      console.error('[session] analysis failed', err);
      return null;
    }
  }, [profile, plan, progress]);

  // ── Streak, once signed in ──
  const refreshStreak = useCallback(async () => {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/streak?tz=${encodeURIComponent(timezone)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      setStreak(data.streak as LearningStreak);
    } catch {
      // A streak that cannot be read is simply not shown.
    }
  }, [user, timezone]);

  useEffect(() => {
    // Wrapped so no state update happens synchronously while the effect runs, // every setState inside refreshStreak is behind an await.
    void (async () => {
      await refreshStreak();
    })();
  }, [refreshStreak]);

  // ── Mutations ──
  const setProfile = useCallback(
    async (next: StudentProfile) => {
      setProfileState(next);
      // Written locally either way: if the remote save is refused, the learner
      // still has their profile when they come back to this browser.
      writeLocal(PROFILE_KEY, next);
      if (!user) return;
      try {
        await saveProfile(user.uid, next);
        setStorageBlocked(false);
      } catch (err) {
        if (err instanceof StorageUnavailableError) setStorageBlocked(true);
        else throw err;
      }
    },
    [user]);

  const setPlan = useCallback(
    async (next: CareerPlan) => {
      setPlanState(next);
      writeLocal(PLAN_KEY, next);
      if (!user) return;
      try {
        await savePlan(user.uid, next);
        setStorageBlocked(false);
      } catch (err) {
        if (err instanceof StorageUnavailableError) setStorageBlocked(true);
        else throw err;
      }
    },
    [user]);

  const toggleSaved = useCallback(
    async (resourceId: string) => {
      const next = savedIds.includes(resourceId)
        ? savedIds.filter((id) => id !== resourceId)
        : [...savedIds, resourceId];
      setSavedIds(next);
      writeLocal(SAVED_KEY, next);
      if (!user) return;
      try {
        await saveResourceIds(user.uid, next);
        setStorageBlocked(false);
      } catch (err) {
        if (err instanceof StorageUnavailableError) setStorageBlocked(true);
        else throw err;
      }
    },
    [savedIds, user]);

  /**
   * Report that a learning action happened.
   *
   * Note this sends no streak value and no timestamp, only what happened. The
   * server decides the rest, from a server clock, against the caller's own uid.
   */
  const recordActivity = useCallback(
    async (input: RecordActivityInput): Promise<RecordActivityResult> => {
      if (!user) {
        return {
          ok: false,
          changed: false,
          milestoneReached: null,
          requiresAuth: true,
          message: 'Sign in to track progress and build a streak.',
        };
      }

      try {
        const token = await user.getIdToken();
        const res = await fetch('/api/streak', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ ...input, timezone }),
        });

        if (!res.ok) {
          return {
            ok: false,
            changed: false,
            milestoneReached: null,
            message: "We couldn't record that just now. Try again in a moment.",
          };
        }

        const data = await res.json();
        setStreak(data.streak as LearningStreak);
        setProgress((current) => bumpProgress(current, input));

        return {
          ok: true,
          changed: Boolean(data.changed),
          milestoneReached: data.milestoneReached ?? null,
          message: data.message ?? '',
        };
      } catch {
        return {
          ok: false,
          changed: false,
          milestoneReached: null,
          message: "We couldn't reach the server. Your progress will be recorded when you retry.",
        };
      }
    },
    [user, timezone]);

  const clearSession = useCallback(() => {
    setProfileState(null);
    setPlanState(null);
    setSavedIds([]);
    setProgress(null);
    setStreak(null);
    for (const key of [PROFILE_KEY, PLAN_KEY, SAVED_KEY]) {
      try {
        window.localStorage.removeItem(key);
      } catch {
        // Storage may be unavailable in private mode; nothing to clean up.
      }
    }
  }, []);

  const value: SessionState = {
    authReady,
    dataReady,
    loadError,
    retryLoad,
    ready: authReady && dataReady,
    user,
    profile,
    plan,
    analysis,
    progress,
    streak,
    savedIds,
    timezone,
    storageBlocked,
    setProfile,
    setPlan,
    toggleSaved,
    recordActivity,
    refreshStreak,
    clearSession,
  };

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionState {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used inside <SessionProvider>');
  return ctx;
}

/**
 * Optimistic local echo of the server's progress update.
 * The authoritative value still comes from the server on the next read.
 */
function bumpProgress(
  current: UserProgress | null,
  input: RecordActivityInput): UserProgress {
  const base: UserProgress = current ?? {
    resourcesStarted: [],
    resourcesCompleted: [],
    projectsStarted: [],
    projectsCompleted: [],
    hoursLearned: 0,
    skillsAcquired: [],
    updatedAt: new Date().toISOString(),
  };

  const withId = (list: string[], id?: string) =>
    id && !list.includes(id) ? [...list, id] : list;

  return {
    ...base,
    resourcesCompleted:
      input.type === 'resource_completed'
        ? withId(base.resourcesCompleted, input.targetId)
        : base.resourcesCompleted,
    projectsCompleted:
      input.type === 'project_completed'
        ? withId(base.projectsCompleted, input.targetId)
        : base.projectsCompleted,
    resourcesStarted: withId(base.resourcesStarted, input.targetId),
    updatedAt: new Date().toISOString(),
  };
}

function readLocal<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeLocal(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Private mode or a full quota, the in-memory session still works.
  }
}
