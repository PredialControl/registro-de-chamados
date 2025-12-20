"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';
import {
    PlusCircle,
    ClipboardList,
    User as UserIcon,
    Settings,
    LogOut,
    Sun,
    Moon
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';

export default function BottomNav() {
    const { user, isAuthenticated, logout } = useAuth();
    const pathname = usePathname();

    if (!isAuthenticated) return null;

    const isActive = (path: string) => pathname === path;

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border pb-safe transition-colors duration-300">
            <div className="w-full px-4 mx-auto flex justify-around items-center h-16">
                <Link
                    href="/"
                    className={cn(
                        "flex flex-col items-center justify-center w-full h-full space-y-1",
                        isActive('/') ? "text-blue-600" : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
                    )}
                >
                    <PlusCircle className="w-6 h-6" />
                    <span className="text-xs font-medium">Abrir</span>
                </Link>

                <Link
                    href="/chamados"
                    className={cn(
                        "flex flex-col items-center justify-center w-full h-full space-y-1",
                        isActive('/chamados') ? "text-blue-600" : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
                    )}
                >
                    <ClipboardList className="w-6 h-6" />
                    <span className="text-xs font-medium">Chamados</span>
                </Link>

                {user?.role === 'admin' && (
                    <Link
                        href="/admin"
                        className={cn(
                            "flex flex-col items-center justify-center w-full h-full space-y-1",
                            isActive('/admin') ? "text-blue-600" : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
                        )}
                    >
                        <Settings className="w-6 h-6" />
                        <span className="text-xs font-medium">Admin</span>
                    </Link>
                )}

                <button
                    onClick={logout}
                    className="flex flex-col items-center justify-center w-full h-full space-y-1 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
                >
                    <LogOut className="w-6 h-6" />
                    <span className="text-xs font-medium">Sair</span>
                </button>
            </div>
        </nav>
    );
}
