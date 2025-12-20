"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { Toaster } from '@/components/ui/sonner';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { login } = useAuth();
    const router = useRouter();

    // DIAGNOSTIC CODE
    const [debugStatus, setDebugStatus] = useState<string>('Verificando conexão...');
    const [debugColor, setDebugColor] = useState<string>('text-yellow-500');
    const [envCheck, setEnvCheck] = useState<string>('');

    useEffect(() => {
        const checkConnection = async () => {
            const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
            const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

            const envMsg = `URL: ${url ? url.substring(0, 15) + '...' : 'NÃO DEFINIDA'} | Key: ${key ? 'DEFINIDA' : 'NÃO DEFINIDA'}`;
            setEnvCheck(envMsg);

            if (!url || !key) {
                setDebugStatus('ERRO: Variáveis de Ambiente ausentes na Vercel.');
                setDebugColor('text-red-500 font-bold');
                return;
            }

            try {
                const { error } = await supabase.from('profiles').select('*', { count: 'exact', head: true });

                if (error) {
                    setDebugStatus(`ERRO DE CONEXÃO: ${error.message} (${error.code})`);
                    setDebugColor('text-red-500 font-bold');
                } else {
                    setDebugStatus('Conexão com Supabase: OK (Tabelas acessíveis)');
                    setDebugColor('text-green-500 font-bold');
                }
            } catch (err: any) {
                setDebugStatus(`ERRO CRÍTICO: ${err.message || err}`);
                setDebugColor('text-red-500 font-bold');
            }
        };

        checkConnection();
    }, []);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            const success = await login(email, password);
            if (success) {
                router.push('/');
            } else {
                toast.error('E-mail não encontrado ou erro de conexão.');
                // Force re-check
                const { error } = await supabase.from('profiles').select('*').eq('email', email).single();
                if (error) {
                    setDebugStatus(`FALHA AO BUSCAR USER: ${error.message}`);
                    setDebugColor('text-red-500 font-bold');
                }
            }
        } catch (err) {
            toast.error('Erro ao tentar entrar');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-background">
            <Toaster />
            <Card className="w-full max-w-md border-border/50 shadow-lg">
                <CardHeader className="space-y-1 text-center">
                    <CardTitle className="text-2xl font-bold text-primary">
                        Gestor de Chamados
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                        Entre para acessar o sistema
                    </p>
                </CardHeader>
                <CardContent className="space-y-4">

                    {/* DEBUG PANEL */}
                    <div className="p-3 bg-muted/50 rounded-md text-xs font-mono border border-border">
                        <p className="font-bold mb-1">Status do Sistema:</p>
                        <p className="mb-1 text-muted-foreground">{envCheck}</p>
                        <p className={debugColor}>{debugStatus}</p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">E-mail</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="seu@email.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">Senha</Label>
                            <Input
                                id="password"
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>
                        {error && <p className="text-sm text-red-500 text-center">{error}</p>}
                        <Button type="submit" className="w-full" disabled={isLoading}>
                            {isLoading ? (
                                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Entrando...</>
                            ) : (
                                "Entrar"
                            )}
                        </Button>
                    </form>
                    <div className="text-center text-xs text-muted-foreground pt-4">
                        <p>Credenciais de Teste:</p>
                        <p>Admin: admin@sistema.com</p>
                        <p>Usuário: joao@usuario.com</p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
