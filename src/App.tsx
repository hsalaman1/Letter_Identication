import { useCallback, useEffect, useState } from 'react';
import type { Session, TrialResponse } from '@/types';
import { HomeScreen } from '@/components/HomeScreen';
import { SetupScreen } from '@/components/SetupScreen';
import { FluencySetupScreen } from '@/components/FluencySetupScreen';
import { TrialScreen } from '@/components/TrialScreen';
import { FluencyTrialScreen } from '@/components/FluencyTrialScreen';
import { ResultsScreen } from '@/components/ResultsScreen';
import { SessionHistory } from '@/components/SessionHistory';
import {
  ACTIVE_KEY,
  clearActive,
  loadActive,
  pushToHistory,
} from '@/hooks/useSession';

type Screen = 'home' | 'setup' | 'fluency-setup' | 'trial' | 'fluency-trial' | 'results' | 'history';

export function App() {
  const [screen, setScreen] = useState<Screen>('home');
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

  // --- Start handlers ---

  const handleStartBaseline = useCallback((s: Session) => {
    setSession(s);
    setTrialIndex(0);
    setResumable(null);
    setScreen('trial');
  }, []);

  const handleStartFluency = useCallback((s: Session) => {
    setSession(s);
    setTrialIndex(0);
    setResumable(null);
    setScreen('fluency-trial');
  }, []);

  const handleResume = useCallback(() => {
    if (!resumable) return;
    setSession(resumable);
    const firstUnanswered = resumable.trials.findIndex(t => resumable.responses[t.id] === undefined);
    setTrialIndex(firstUnanswered >= 0 ? firstUnanswered : 0);
    const mode = resumable.mode ?? 'baseline';
    setResumable(null);
    setScreen(mode === 'fluency' ? 'fluency-trial' : 'trial');
  }, [resumable]);

  const handleDiscardActive = useCallback(() => {
    clearActive();
    setResumable(null);
  }, []);

  // --- Baseline trial handlers ---

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

  // --- Fluency trial handler (record + auto-advance) ---

  const handleRecordAndAdvance = useCallback((trialId: string, response: TrialResponse) => {
    if (!session) return;
    const updated = { ...session, responses: { ...session.responses, [trialId]: response } };
    const currentIdx = updated.trials.findIndex(t => t.id === trialId);
    if (currentIdx >= 0 && currentIdx < updated.trials.length - 1) {
      setTrialIndex(currentIdx + 1);
      setSession(updated);
    } else {
      const completed: Session = {
        ...updated,
        completedAt: new Date().toISOString(),
        endedEarly: false,
      };
      setSession(completed);
      pushToHistory(completed);
      clearActive();
      setScreen('results');
    }
  }, [session]);

  // --- End / complete ---

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
    setScreen('home');
  }, []);

  const handleViewHistorySession = useCallback((s: Session) => {
    setSession(s);
    setScreen('results');
  }, []);

  // --- Rendering ---

  if (screen === 'home') {
    return (
      <HomeScreen
        onBaseline={() => setScreen('setup')}
        onFluency={() => setScreen('fluency-setup')}
        onViewHistory={() => setScreen('history')}
        resumable={resumable}
        onResume={handleResume}
        onDiscardActive={handleDiscardActive}
      />
    );
  }

  if (screen === 'setup') {
    return (
      <SetupScreen
        onStart={handleStartBaseline}
        onViewHistory={() => setScreen('history')}
      />
    );
  }

  if (screen === 'fluency-setup') {
    return (
      <FluencySetupScreen
        onStart={handleStartFluency}
        onBack={() => setScreen('home')}
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

  if (screen === 'fluency-trial' && session) {
    return (
      <FluencyTrialScreen
        session={session}
        index={trialIndex}
        onRecordAndAdvance={handleRecordAndAdvance}
        onPrev={handlePrev}
        onFinish={handleEnd}
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
        onBack={() => setScreen(session ? 'results' : 'home')}
        onView={handleViewHistorySession}
      />
    );
  }

  return null;
}
