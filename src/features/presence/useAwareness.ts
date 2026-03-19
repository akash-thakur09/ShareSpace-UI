import { useEffect, useRef, useState } from 'react';
import { WebsocketProvider } from 'y-websocket';

export interface AwarenessUser {
  clientId: number;
  name: string;
  email: string;
  color: string;
  isSelf: boolean;
}

interface AwarenessState {
  user?: { name: string; email: string; color: string };
}

/**
 * Reads Yjs awareness and returns a stable, deduplicated list of active users.
 * Updates are debounced (50 ms) to avoid thrashing on rapid awareness changes.
 */
export function useAwareness(
  provider: WebsocketProvider | null,
  localUser: { name: string; email: string; color: string } | null,
): AwarenessUser[] {
  const [users, setUsers] = useState<AwarenessUser[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Set local awareness state whenever localUser or provider changes
  useEffect(() => {
    if (!provider || !localUser) return;
    provider.awareness.setLocalStateField('user', localUser);
  }, [provider, localUser]);

  useEffect(() => {
    if (!provider) {
      setUsers([]);
      return;
    }

    const awareness = provider.awareness;
    const selfClientId = awareness.clientID;

    function snapshot() {
      const next: AwarenessUser[] = [];
      awareness.getStates().forEach((state: AwarenessState, clientId: number) => {
        const u = state.user;
        if (!u?.name || !u?.email) return;
        next.push({
          clientId,
          name: u.name,
          email: u.email,
          color: u.color || '#6366f1',
          isSelf: clientId === selfClientId,
        });
      });
      // Self first, then alphabetical
      next.sort((a, b) => {
        if (a.isSelf) return -1;
        if (b.isSelf) return 1;
        return a.name.localeCompare(b.name);
      });
      setUsers(next);
    }

    function scheduleSnapshot() {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(snapshot, 50);
    }

    snapshot(); // immediate on mount
    awareness.on('change', scheduleSnapshot);

    return () => {
      awareness.off('change', scheduleSnapshot);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [provider]);

  return users;
}
