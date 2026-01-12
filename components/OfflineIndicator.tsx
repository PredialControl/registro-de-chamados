"use client";

import { useEffect, useState } from 'react';
import { WifiOff, Wifi } from 'lucide-react';
import { dataService } from '@/lib/data';

export function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    const updatePendingCount = () => {
      const queue = dataService.getSyncQueue();
      setPendingCount(queue.length);
    };

    // Verificar estado inicial
    setIsOnline(navigator.onLine);
    updatePendingCount();

    const handleOnline = () => {
      setIsOnline(true);
      setShowReconnected(true);

      // Esconder mensagem de reconexão após 3 segundos
      setTimeout(() => {
        setShowReconnected(false);
      }, 3000);

      // Atualizar contagem após sincronização
      setTimeout(updatePendingCount, 1000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowReconnected(false);
      updatePendingCount();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Atualizar contagem periodicamente
    const interval = setInterval(updatePendingCount, 2000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  // Não mostrar nada se estiver online e não tiver mensagem de reconexão
  if (isOnline && !showReconnected) {
    return null;
  }

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-50 px-4 py-3 text-center text-sm font-medium transition-all duration-300 ${
        isOnline
          ? 'bg-green-600 text-white'
          : 'bg-yellow-600 text-white'
      }`}
    >
      <div className="flex items-center justify-center gap-2">
        {isOnline ? (
          <>
            <Wifi className="w-4 h-4" />
            <span>Conexão restabelecida!</span>
          </>
        ) : (
          <>
            <WifiOff className="w-4 h-4" />
            <span>
              Modo offline - Chamados serão salvos localmente
              {pendingCount > 0 && ` (${pendingCount} aguardando sincronização)`}
            </span>
          </>
        )}
      </div>
    </div>
  );
}
