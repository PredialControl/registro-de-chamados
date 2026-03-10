"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Loader2, Eye, EyeOff, CheckCircle2, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { dataService } from '@/lib/data';
import { useAuth } from '@/components/providers/AuthProvider';

interface ChangePasswordModalProps {
    isOpen: boolean;
}

export default function ChangePasswordModal({ isOpen }: ChangePasswordModalProps) {
    const { user, refreshUser } = useAuth();
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Validações de senha
    const hasMinLength = newPassword.length >= 6;
    const passwordsMatch = newPassword === confirmPassword && newPassword.length > 0;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validações
        if (!hasMinLength) {
            toast.error('A senha deve ter no mínimo 6 caracteres.');
            return;
        }

        if (!passwordsMatch) {
            toast.error('As senhas não coincidem.');
            return;
        }

        if (!user) {
            toast.error('Usuário não encontrado.');
            return;
        }

        setIsSubmitting(true);
        const loadingToast = toast.loading('Alterando senha...');

        try {
            // Atualizar senha no Supabase Auth
            await dataService.updatePassword(newPassword);

            // Atualizar flag must_change_password no perfil
            await dataService.updateUser(user.id, { mustChangePassword: false });

            toast.success('Senha alterada com sucesso!', { id: loadingToast });

            // Atualizar dados do usuário
            await refreshUser();

            // Limpar campos
            setNewPassword('');
            setConfirmPassword('');
        } catch (error: any) {
            console.error('Erro ao alterar senha:', error);
            toast.error(error?.message || 'Erro ao alterar senha. Tente novamente.', { id: loadingToast });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={() => {}}>
            <DialogContent className="sm:max-w-md" hideCloseButton>
                <DialogHeader>
                    <DialogTitle className="text-2xl font-bold text-center">
                        Troca de Senha Obrigatória
                    </DialogTitle>
                    <DialogDescription className="text-center">
                        Por segurança, você precisa alterar sua senha antes de continuar.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                    {/* Nova Senha */}
                    <div className="space-y-2">
                        <Label htmlFor="newPassword">Nova Senha</Label>
                        <div className="relative">
                            <Input
                                id="newPassword"
                                type={showNewPassword ? "text" : "password"}
                                placeholder="Digite a nova senha"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className="pr-10"
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowNewPassword(!showNewPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            >
                                {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>

                    {/* Confirmar Senha */}
                    <div className="space-y-2">
                        <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
                        <div className="relative">
                            <Input
                                id="confirmPassword"
                                type={showConfirmPassword ? "text" : "password"}
                                placeholder="Confirme a nova senha"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="pr-10"
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            >
                                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>

                    {/* Validações visuais */}
                    <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                            {hasMinLength ? (
                                <CheckCircle2 className="w-4 h-4 text-green-500" />
                            ) : (
                                <XCircle className="w-4 h-4 text-red-500" />
                            )}
                            <span className={hasMinLength ? "text-green-600" : "text-muted-foreground"}>
                                Mínimo de 6 caracteres
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            {passwordsMatch ? (
                                <CheckCircle2 className="w-4 h-4 text-green-500" />
                            ) : (
                                <XCircle className="w-4 h-4 text-red-500" />
                            )}
                            <span className={passwordsMatch ? "text-green-600" : "text-muted-foreground"}>
                                Senhas coincidem
                            </span>
                        </div>
                    </div>

                    <Button
                        type="submit"
                        className="w-full"
                        disabled={isSubmitting || !hasMinLength || !passwordsMatch}
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Alterando...
                            </>
                        ) : (
                            "Alterar Senha"
                        )}
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    );
}
