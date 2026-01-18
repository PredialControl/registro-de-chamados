"use client";

import { Bell, BellOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNotifications } from '@/hooks/useNotifications';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function NotificationButton() {
  const { permission, isLoading, requestPermission, unsubscribe, isSupported } = useNotifications();

  if (!isSupported) {
    return null; // Don't show button if notifications aren't supported
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" className="relative">
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : permission.granted ? (
            <Bell className="h-4 w-4" />
          ) : (
            <BellOff className="h-4 w-4" />
          )}
          {permission.granted && (
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-background" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Notificações Push</DropdownMenuLabel>
        <DropdownMenuSeparator />

        {permission.granted ? (
          <>
            <div className="px-2 py-1.5 text-sm text-muted-foreground">
              Você receberá notificações sobre:
            </div>
            <div className="px-2 py-1 text-xs text-muted-foreground">
              • Mudanças de status<br/>
              • Novos comentários<br/>
              • Novos chamados
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={unsubscribe} className="text-destructive">
              <BellOff className="mr-2 h-4 w-4" />
              Desativar notificações
            </DropdownMenuItem>
          </>
        ) : permission.denied ? (
          <div className="px-2 py-2 text-sm text-muted-foreground">
            Notificações bloqueadas. Ative nas configurações do navegador.
          </div>
        ) : (
          <>
            <div className="px-2 py-1.5 text-sm text-muted-foreground">
              Receba alertas em tempo real sobre mudanças nos chamados.
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={requestPermission}>
              <Bell className="mr-2 h-4 w-4" />
              Ativar notificações
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
