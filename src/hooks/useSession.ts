import { useCallback, useEffect, useRef, useState } from 'react';
import type { Session, TrialResponse } from '@/types';

export const ACTIVE_KEY = 'letter-id:active';
const HISTORY_KEY = 'letter-id:history';

export function loadActive(): Session | null {
  try {
    const raw = localStorage.getItem(ACTIVE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Session;
  } catch {
    return null;
  }
}

export function clearActive(): void {
  localStorage.removeItem(ACTIVE_KEY);
}

export function loadHistory(): Session[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as Session[];
  } catch {
    return [];
  }
}

export function saveHistory(sessions: Session[]): void {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(sessions));
}

export function pushToHistory(session: Session): void {
  const current = loadHistory();
  const next = [session, ...current.filter(s => s.id !== session.id)];
  saveHistory(next);
}

export function useActiveSession(initial: Session) {
  const [session, setSession] = useState<Session>(initial);
  const [index, setIndex] = useState(0);
  const sessionRef = useRef(session);
  sessionRef.current = session;

  // Persist on change.
  useEffect(() => {
    localStorage.setItem(ACTIVE_KEY, JSON.stringify(session));
  }, [session]);

  const recordResponse = useCallback((trialId: string, response: TrialResponse) => {
    setSession(prev => ({
      ...prev,
      responses: { ...prev.responses, [trialId]: response },
    }));
  }, []);

  const setNote = useCallback((trialId: string, note: string) => {
    setSession(prev => ({
      ...prev,
      notes: { ...prev.notes, [trialId]: note },
    }));
  }, []);

  const next = useCallback(() => {
    setIndex(i => Math.min(i + 1, sessionRef.current.trials.length - 1));
  }, []);

  const prev = useCallback(() => {
    setIndex(i => Math.max(i - 1, 0));
  }, []);

  const goTo = useCallback((i: number) => {
    setIndex(() => Math.max(0, Math.min(i, sessionRef.current.trials.length - 1)));
  }, []);

  const complete = useCallback((endedEarly: boolean): Session => {
    const completed: Session = {
      ...sessionRef.current,
      completedAt: new Date().toISOString(),
      endedEarly,
    };
    setSession(completed);
    return completed;
  }, []);

  return {
    session,
    index,
    recordResponse,
    setNote,
    next,
    prev,
    goTo,
    complete,
  };
}
