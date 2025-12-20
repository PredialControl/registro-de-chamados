"use client";

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Download, X, Smartphone } from 'lucide-react';
import { toast } from 'sonner';

export default function PWAInstallPrompt() {
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const handler = (e: any) => {
            // Prevent Chrome 67 and earlier from automatically showing the prompt
            e.preventDefault();
            // Stash the event so it can be triggered later.
            setDeferredPrompt(e);
            // Show the install button if on mobile or if desired
            const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
            if (isMobile) {
                setIsVisible(true);
            }
        };

        window.addEventListener('beforeinstallprompt', handler);

        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    const handleInstallClick = async () => {
        if (!deferredPrompt) return;

        // Show the install prompt
        deferredPrompt.prompt();
        // Wait for the user to respond to the prompt
        const { outcome } = await deferredPrompt.userChoice;

        if (outcome === 'accepted') {
            toast.success('App instalado com sucesso!');
        }

        setDeferredPrompt(null);
        setIsVisible(false);
    };

    if (!isVisible) return null;

    return (
        <div className="fixed bottom-20 left-4 right-4 z-50 animate-in slide-in-from-bottom-10 fade-in duration-500">
            <Card className="bg-primary text-primary-foreground border-none shadow-2xl overflow-hidden">
                <div className="absolute top-0 right-0 p-1">
                    <Button variant="ghost" size="icon-sm" onClick={() => setIsVisible(false)} className="text-primary-foreground/50 hover:text-primary-foreground">
                        <X className="w-4 h-4" />
                    </Button>
                </div>
                <CardContent className="p-4 flex items-center gap-4">
                    <div className="bg-white/20 p-3 rounded-2xl">
                        <Smartphone className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                        <h3 className="font-bold text-sm leading-tight">Instale o nosso App!</h3>
                        <p className="text-[10px] text-primary-foreground/80">Acesse mais rápido e funcione offline.</p>
                    </div>
                    <Button
                        size="sm"
                        onClick={handleInstallClick}
                        className="bg-white text-primary hover:bg-white/90 font-bold px-4 rounded-full text-xs shadow-lg"
                    >
                        BAIXAR <Download className="w-3 h-3 ml-2" />
                    </Button>
                </CardContent>
            </Card>
            {/* Glossy Overlay effect */}
            <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent pointer-events-none" />
        </div>
    );
}
