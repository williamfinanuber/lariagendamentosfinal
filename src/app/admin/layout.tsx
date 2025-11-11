
"use client"
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Home, LayoutDashboard, CalendarDays, Package, CalendarCheck, Calendar, Users, DollarSign, Wrench, MoreVertical, Bell, Eye, LogOut, CalendarClock } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useEffect, useState } from 'react';
import LoginPage from './login/page';


export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

     useEffect(() => {
        try {
            const authStatus = sessionStorage.getItem('isAdminAuthenticated') === 'true';
            setIsAuthenticated(authStatus);
        } catch (e) {
            // sessionStorage is not available on the server
        }
        setIsLoading(false);
    }, []);

    const handleLogout = () => {
        sessionStorage.removeItem('isAdminAuthenticated');
        setIsAuthenticated(false);
        router.push('/admin/login');
    };

    const menuItems = [
        { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
        { href: '/admin/agenda', label: 'Agenda', icon: Calendar },
        { href: '/admin/clients', label: 'Clientes', icon: Users },
        { href: '/admin/reminders', label: 'Lembretes', icon: Bell },
        { href: '/admin/procedures', label: 'Procedimentos', icon: Eye },
        { href: '/admin/availability', label: 'Disponibilidade', icon: CalendarDays },
        { href: '/admin/stock', label: 'Estoque', icon: Package },
        { href: '/admin/finance', label: 'Financeiro', icon: DollarSign },
        { href: '/admin/maintenance', label: 'Manutenção', icon: Wrench },
    ];
    
    if (isLoading) {
        return <div className="flex h-screen w-full items-center justify-center">Carregando...</div>;
    }
    
    if (!isAuthenticated && pathname !== '/admin/login') {
         return <LoginPage onAuthSuccess={() => setIsAuthenticated(true)} />;
    }

    if(pathname === '/admin/login' && isAuthenticated){
        router.push('/admin');
        return null;
    }
    
    if (pathname === '/admin/login') {
        return <LoginPage onAuthSuccess={() => setIsAuthenticated(true)} />;
    }
    
    return (
        <div className="flex h-screen w-full bg-background">
            <div className="flex flex-col h-full w-full">
                 <header className="flex h-14 lg:h-[60px] items-center justify-between gap-4 border-b bg-muted/40 px-6 sticky top-0 z-30">
                    <div className="flex-1">
                        <Link href="/admin" className="hover:opacity-80 transition-opacity">
                           <h1 className="font-semibold text-base md:text-lg">Painel do Administrador</h1>
                        </Link>
                    </div>
                    <nav className="flex items-center gap-4">
                        <Button asChild variant="outline" size="sm">
                            <Link href="/">
                                <Home className="h-4 w-4 mr-2" />
                                <span>Voltar ao Site</span>
                            </Link>
                        </Button>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                    <MoreVertical className="h-5 w-5" />
                                    <span className="sr-only">Abrir menu</span>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                {menuItems.map((item) => (
                                    <DropdownMenuItem key={item.href} asChild>
                                        <Link href={item.href}>
                                            <item.icon className="mr-2 h-4 w-4" />
                                            <span>{item.label}</span>
                                        </Link>
                                    </DropdownMenuItem>
                                ))}
                                <DropdownMenuSeparator />
                                 <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:text-red-600">
                                    <LogOut className="mr-2 h-4 w-4" />
                                    <span>Sair</span>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </nav>
                </header>
                <main className="flex-1 overflow-y-auto p-4 md:p-8">
                    {children}
                </main>
            </div>
        </div>
    );
}
