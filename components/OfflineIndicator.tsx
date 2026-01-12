"use client";

import { useEffect, useState } from 'react';
import { WifiOff, Wifi, RefreshCw } from 'lucide-react';
import { dataService } from '@/lib/data';
import { toast } from 'sonner';

export function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [showReconnected, setShowReconnected] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

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

  const handleManualSync = async () => {
    if (isSyncing || pendingCount === 0) return;

    setIsSyncing(true);
    const toastId = toast.loading(`Sincronizando ${pendingCount} chamado(s)...`);

    try {
      const result = await dataService.syncPendingTickets();

      if (result.synced > 0) {
        toast.success(
          `${result.synced} chamado(s) sincronizado(s) com sucesso!`,
          { id: toastId, duration: 4000 }
        );
        setPendingCount(result.failed);
      } else if (result.failed > 0) {
        toast.error(
          `Erro ao sincronizar. ${result.failed} chamado(s) ainda pendente(s).`,
          { id: toastId, duration: 5000 }
        );
      }
    } catch (error) {
      toast.error('Erro ao sincronizar chamados', { id: toastId });
    } finally {
      setIsSyncing(false);
    }
  };

  // Mostrar se offline OU se tem chamados pendentes (mesmo online)
  if (!isOnline || pendingCount > 0 || showReconnected) {
    // Continue with render
  } else {
    return null;
  }

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-50 px-4 py-3 text-center text-sm font-medium transition-all duration-300 ${
        isOnline
          ? pendingCount > 0
            ? 'bg-blue-600 text-white'
            : 'bg-green-600 text-white'
          : 'bg-yellow-600 text-white'
      }`}
    >
      <div className="flex items-center justify-center gap-2">
        {isOnline ? (
          <>
            {pendingCount > 0 ? (
              <>
                <Wifi className="w-4 h-4" />
                <span>{pendingCount} chamado(s) aguardando sincronização</span>
                <button
                  onClick={handleManualSync}
                  disabled={isSyncing}
                  className="ml-2 px-3 py-1 bg-white/20 hover:bg-white/30 rounded-md flex items-center gap-1 transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span className="text-xs">Sincronizar Agora</span>
                </button>
              </>
            ) : (
              <>
                <Wifi className="w-4 h-4" />
                <span>Conexão restabelecida!</span>
              </>
            )}
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
