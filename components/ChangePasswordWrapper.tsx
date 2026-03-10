"use client";

import { useAuth } from '@/components/providers/AuthProvider';
import ChangePasswordModal from '@/components/ChangePasswordModal';

export default function ChangePasswordWrapper() {
    const { user } = useAuth();

    // Mostrar modal apenas se o usuário estiver logado e precisar trocar a senha
    const shouldShowModal = user && user.mustChangePassword === true;

    return <ChangePasswordModal isOpen={!!shouldShowModal} />;
}
