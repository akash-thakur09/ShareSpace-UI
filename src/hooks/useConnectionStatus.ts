import { useEffect, useState } from 'react';
import { WebsocketProvider } from 'y-websocket';

export type ConnectionStatus = 'connecting' | 'connected' | 'syncing' | 'offline';

export function useConnectionStatus(provider: WebsocketProvider | null): ConnectionStatus {
  const [status, setStatus] = useState<ConnectionStatus>('connecting');

  useEffect(() => {
    if (!provider) {
      setStatus('connecting');
      return;
    }

    function onStatus({ status: s }: { status: 'connecting' | 'connected' | 'disconnected' }) {
      if (s === 'connected') setStatus('syncing');
      else if (s === 'disconnected') setStatus('offline');
      else setStatus('connecting');
    }

    function onSync(synced: boolean) {
      if (synced) setStatus('connected');
    }

    // Reflect current state immediately
    if (!provider.wsconnected) {
      setStatus(navigator.onLine ? 'connecting' : 'offline');
    }

    provider.on('status', onStatus);
    provider.on('sync', onSync);

    const handleOffline = () => setStatus('offline');
    const handleOnline  = () => {
      if (provider.wsconnected) setStatus('syncing');
    };

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online',  handleOnline);

    return () => {
      provider.off('status', onStatus);
      provider.off('sync', onSync);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online',  handleOnline);
    };
  }, [provider]);

  return status;
}
