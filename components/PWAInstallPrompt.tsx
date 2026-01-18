"use client";

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Download, X, Smartphone, Share, PlusSquare } from 'lucide-react';
import { toast } from 'sonner';

export default function PWAInstallPrompt() {
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [isVisible, setIsVisible] = useState(false);
    const [isIOS, setIsIOS] = useState(false);
    const [showIOSInstructions, setShowIOSInstructions] = useState(false);

    useEffect(() => {
        // Detect iOS (iPhone, iPad, iPod)
        const userAgent = window.navigator.userAgent.toLowerCase();
        const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
        setIsIOS(isIosDevice);

        const handler = (e: any) => {
            e.preventDefault();
            setDeferredPrompt(e);
            setIsVisible(true);
        };

        window.addEventListener('beforeinstallprompt', handler);

        // Check if already in standalone mode to avoid spamming
        // "standalone" for iOS, "display-mode: standalone" for Android
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;

        // Always show prompt for iOS if not installed (since no event fires)
        if (isIosDevice && !isStandalone) {
            setIsVisible(true);
        }

        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    const handleInstallClick = async () => {
        if (isIOS) {
            setShowIOSInstructions(true);
            return;
        }

        if (!deferredPrompt) return;

        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;

        if (outcome === 'accepted') {
            toast.success('App instalado com sucesso!');
        }

        setDeferredPrompt(null);
        setIsVisible(false);
    };

    if (!isVisible) return null;

    return (
        <>
            {/* INSTALL BUTTON FLOATING CARD */}
            <div className="fixed bottom-24 left-2 right-2 z-50 animate-in slide-in-from-bottom-10 fade-in duration-500">
                <Card className="bg-gradient-to-r from-blue-600 to-blue-700 text-white border-none shadow-2xl overflow-hidden relative">
                    {/* NOVO Badge */}
                    <div className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-12 h-12 flex items-center justify-center text-xs font-bold shadow-lg animate-bounce z-10">
                        NOVO!
                    </div>

                    {/* Pulsing Background Effect */}
                    <div className="absolute inset-0 bg-blue-500 animate-pulse opacity-20 rounded-lg" />

                    <div className="absolute top-0 right-0 p-1">
                        <Button variant="ghost" size="icon" onClick={() => setIsVisible(false)} className="h-6 w-6 text-white/50 hover:text-white">
                            <X className="w-4 h-4" />
                        </Button>
                    </div>
                    <CardContent className="p-6 flex items-center gap-5 relative z-10">
                        <div className="bg-white/30 p-4 rounded-2xl">
                            <Smartphone className="w-8 h-8" />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-bold text-lg leading-tight">Instale nosso App!</h3>
                            <p className="text-sm text-white/90">
                                {isIOS ? "Acesso rápido no seu iPhone" : "Use offline e acesse rápido"}
                            </p>
                        </div>
                        <Button
                            size="lg"
                            onClick={handleInstallClick}
                            className="bg-white text-blue-600 hover:bg-white/90 font-bold px-6 rounded-full text-sm shadow-lg"
                        >
                            {isIOS ? "INSTALAR" : "BAIXAR"} <Download className="w-4 h-4 ml-2" />
                        </Button>
                    </CardContent>
                </Card>
                {/* Glossy Overlay */}
                <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent pointer-events-none" />
            </div>

            {/* CUSTOM IOS INSTRUCTIONS MODAL */}
            {showIOSInstructions && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <Card className="w-full max-w-sm shadow-xl animate-in zoom-in-95 duration-300">
                        <div className="p-6 space-y-4">
                            <div className="space-y-2 text-center">
                                <h3 className="text-lg font-bold">Instalar no iPhone</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    Adicione à sua tela de início para usar como um app nativo.
                                </p>
                            </div>

                            <div className="flex flex-col gap-4 py-2">
                                <div className="flex items-center gap-3 bg-muted p-2 rounded-lg">
                                    <div className="bg-white p-2 rounded-md shadow-sm">
                                        <Share className="w-5 h-5 text-blue-500" />
                                    </div>
                                    <div className="text-sm">
                                        1. Toque em <span className="font-bold">Compartilhar</span> na barra do navegador.
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 bg-muted p-2 rounded-lg">
                                    <div className="bg-white p-2 rounded-md shadow-sm">
                                        <PlusSquare className="w-5 h-5 text-gray-700" />
                                    </div>
                                    <div className="text-sm">
                                        2. Selecione <span className="font-bold">Adicionar à Tela de Início</span>.
                                    </div>
                                </div>
                            </div>

                            <Button className="w-full mt-2" onClick={() => setShowIOSInstructions(false)}>
                                Entendi, vou fazer!
                            </Button>
                        </div>
                    </Card>
                </div>
            )}
        </>
    );
}
