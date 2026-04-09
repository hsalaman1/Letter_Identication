import { useCallback, useEffect, useState } from 'react';
import type { Session, TrialResponse } from '@/types';
import { SetupScreen } from '@/components/SetupScreen';
import { TrialScreen } from '@/components/TrialScreen';
import { ResultsScreen } from '@/components/ResultsScreen';
import { SessionHistory } from '@/components/SessionHistory';
import {
  clearActive,
  loadActive,
  pushToHistory,
} from '@/hooks/useSession';

type Screen = 'setup' | 'trial' | 'results' | 'history';

const ACTIVE_KEY = 'letter-id:active';

export function App() {
  const [screen, setScreen] = useState<Screen>('setup');
  const [session, setSession] = useState<Session | null>(null);
  const [trialIndex, setTrialIndex] = useState(0);
  const [resumable, setResumable] = useState<Session | null>(null);

  // On mount, check for an in-progress session.
  useEffect(() => {
    const active = loadActive();
    if (active && !active.completedAt) {
      setResumable(active);
    }
  }, []);

  // Persist active session on every change while in trial screen.
  useEffect(() => {
    if (!session) return;
    if (session.completedAt) return;
    localStorage.setItem(ACTIVE_KEY, JSON.stringify(session));
  }, [session]);

  const handleStart = useCallback((s: Session) => {
    setSession(s);
    setTrialIndex(0);
    setResumable(null);
    setScreen('trial');
  }, []);

  const handleResume = useCallback(() => {
    if (!resumable) return;
    setSession(resumable);
    // Jump to the first unanswered trial, if any.
    const firstUnanswered = resumable.trials.findIndex(t => resumable.responses[t.id] === undefined);
    setTrialIndex(firstUnanswered >= 0 ? firstUnanswered : 0);
    setResumable(null);
    setScreen('trial');
  }, [resumable]);

  const handleDiscardActive = useCallback(() => {
    clearActive();
    setResumable(null);
  }, []);

  const handleRecord = useCallback((trialId: string, response: TrialResponse) => {
    setSession(prev => {
      if (!prev) return prev;
      return { ...prev, responses: { ...prev.responses, [trialId]: response } };
    });
  }, []);

  const handleNote = useCallback((trialId: string, note: string) => {
    setSession(prev => {
      if (!prev) return prev;
      return { ...prev, notes: { ...prev.notes, [trialId]: note } };
    });
  }, []);

  const handlePrev = useCallback(() => {
    setTrialIndex(i => Math.max(0, i - 1));
  }, []);

  const handleNext = useCallback(() => {
    setSession(prev => {
      if (!prev) return prev;
      setTrialIndex(i => Math.min(i + 1, prev.trials.length - 1));
      return prev;
    });
  }, []);

  const handleEnd = useCallback(() => {
    setSession(prev => {
      if (!prev) return prev;
      const allAnswered = prev.trials.every(t => prev.responses[t.id] !== undefined);
      const completed: Session = {
        ...prev,
        completedAt: new Date().toISOString(),
        endedEarly: !allAnswered,
      };
      pushToHistory(completed);
      clearActive();
      return completed;
    });
    setScreen('results');
  }, []);

  const handleStartNew = useCallback(() => {
    setSession(null);
    setTrialIndex(0);
    setScreen('setup');
  }, []);

  const handleViewHistorySession = useCallback((s: Session) => {
    setSession(s);
    setScreen('results');
  }, []);

  if (screen === 'setup') {
    return (
      <SetupScreen
        onStart={handleStart}
        onViewHistory={() => setScreen('history')}
        resumable={resumable}
        onResume={handleResume}
        onDiscardActive={handleDiscardActive}
      />
    );
  }

  if (screen === 'trial' && session) {
    return (
      <TrialScreen
        session={session}
        index={trialIndex}
        onRecord={handleRecord}
        onNote={handleNote}
        onPrev={handlePrev}
        onNext={handleNext}
        onEndEarly={handleEnd}
      />
    );
  }

  if (screen === 'results' && session) {
    return (
      <ResultsScreen
        session={session}
        onStartNew={handleStartNew}
        onViewHistory={() => setScreen('history')}
      />
    );
  }

  if (screen === 'history') {
    return (
      <SessionHistory
        onBack={() => setScreen(session ? 'results' : 'setup')}
        onView={handleViewHistorySession}
      />
    );
  }

  return null;
}
