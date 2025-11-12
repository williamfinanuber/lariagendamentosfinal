
"use client";

import { useState, useMemo, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { format, parseISO, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Gift, MessageSquare, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRouter, useSearchParams } from 'next/navigation';

interface Client {
  name: string;
  contact: string;
  birthDate?: string;
}

interface ClientsPageClientProps {
  clients: Client[];
}

export default function ClientsPageClient({ clients }: ClientsPageClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [filter, setFilter] = useState<'all' | 'month' | 'today'>('all');
  const [sentMessages, setSentMessages] = useState<Record<string, boolean>>({});
  
  const getTodayStorageKey = () => {
    return `birthday_sent_${format(new Date(), 'yyyy-MM-dd')}`;
  };

  useEffect(() => {
    const todayKey = getTodayStorageKey();
    const storedSentMessages = JSON.parse(localStorage.getItem(todayKey) || '{}');
    setSentMessages(storedSentMessages);
    
    const birthdayFilter = searchParams.get('birthdays');
    if (birthdayFilter === 'today') {
      setFilter('today');
    } else if (birthdayFilter) {
      setFilter('month');
    } else {
      setFilter('all');
    }
  }, [searchParams]);

  const birthdayMessage = (clientName: string) => {
    return encodeURIComponent(
        `Olá, ${clientName}! Hoje é o seu dia especial e o Studio Larissa Santos gostaria de desejar a você um feliz aniversário! Que seu novo ano seja repleto de alegria, sucesso e momentos tão brilhantes quanto seus cílios! Celebre muito!`
    );
  };

  const filteredClients = useMemo(() => {
    const sortedByDay = (a: Client, b: Client) => {
      if (!a.birthDate || !b.birthDate) return 0;
      try {
        const dayA = parseISO(a.birthDate).getDate();
        const dayB = parseISO(b.birthDate).getDate();
        return dayA - dayB;
      } catch (e) { return 0; }
    };

    if (filter === 'all') {
      return clients.sort((a,b) => a.name.localeCompare(b.name));
    }

    if (filter === 'today') {
      return clients.filter(client => {
        if (!client.birthDate) return false;
        try { 
            // Use parseISO to handle timezone correctly by treating it as local time
            return isToday(parseISO(client.birthDate + 'T00:00:00'));
        } catch (e) { return false; }
      }).sort((a,b) => a.name.localeCompare(b.name));
    }

    if (filter === 'month') {
        const currentMonth = new Date().getMonth();
        return clients.filter(client => {
            if (!client.birthDate) return false;
            try {
                // Use parseISO to handle timezone correctly
                const birthMonth = parseISO(client.birthDate + 'T00:00:00').getMonth();
                return birthMonth === currentMonth;
            } catch(e) { return false; }
        }).sort(sortedByDay);
    }

    return [];
  }, [clients, filter]);

  const handleFilterToggle = (newFilter: 'all' | 'month' | 'today') => {
    setFilter(newFilter);
    if(newFilter === 'month') {
        router.push('/admin/clients?birthdays=true', { scroll: false });
    } else if (newFilter === 'today') {
        router.push('/admin/clients?birthdays=today', { scroll: false });
    } else {
        router.push('/admin/clients', { scroll: false });
    }
  }

  const handleSendMessage = (client: Client) => {
    const todayKey = getTodayStorageKey();
    const updatedSentMessages = { ...sentMessages, [client.contact]: true };
    setSentMessages(updatedSentMessages);
    localStorage.setItem(todayKey, JSON.stringify(updatedSentMessages));
    
    const whatsappUrl = `https://wa.me/${client.contact.replace(/\D/g, '')}?text=${birthdayMessage(client.name)}`;
    window.open(whatsappUrl, '_blank', 'noopener noreferrer');
  }

  const showActionColumn = filter === 'month' || filter === 'today';

  const getPageTitle = () => {
    if (filter === 'today') return 'Aniversariantes de Hoje';
    if (filter === 'month') return 'Aniversariantes do Mês';
    return 'Lista de Clientes';
  }

  return (
    <Card>
      <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2 text-xl md:text-2xl">{getPageTitle()}</CardTitle>
          <CardDescription className="text-sm">
            {filter === 'today' ? 'Envie uma mensagem de parabéns para seus clientes.' : 'Visualize todos os seus clientes cadastrados.'}
          </CardDescription>
        </div>
         <div className="flex gap-2 mt-4 md:mt-0">
          {filter === 'today' || filter === 'month' ? (
             <Button onClick={() => handleFilterToggle('all')} variant="outline">
               <Gift className="mr-2" />
               Mostrar Todos
             </Button>
          ) : (
             <Button onClick={() => handleFilterToggle('month')} variant="outline">
              <Gift className="mr-2" />
              Aniversariantes do Mês
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Contato</TableHead>
              <TableHead>Data de Nascimento</TableHead>
              {showActionColumn && <TableHead className="text-right">Ação</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredClients.length > 0 ? (
              filteredClients.map((client, index) => {
                if (!client.birthDate) return null;

                const isSent = sentMessages[client.contact] === true;
                const isBirthdayToday = isToday(parseISO(client.birthDate + 'T00:00:00'));

                return (
                  <TableRow key={index} className={cn(showActionColumn && isBirthdayToday && "bg-primary/10")}>
                    <TableCell className="font-medium text-sm md:text-base">{client.name}</TableCell>
                    <TableCell className="text-sm md:text-base">{client.contact}</TableCell>
                    <TableCell className="text-sm md:text-base">
                      {format(parseISO(client.birthDate + 'T00:00:00'), "dd 'de' MMMM", { locale: ptBR })}
                    </TableCell>
                    {showActionColumn && (
                      <TableCell className="text-right">
                         {isBirthdayToday && (
                            <Button 
                                size="sm" 
                                className={cn(
                                    "text-xs md:text-sm",
                                    isSent 
                                        ? "bg-gray-600 hover:bg-gray-700 cursor-not-allowed" 
                                        : "bg-green-500 hover:bg-green-600"
                                )}
                                onClick={() => handleSendMessage(client)}
                                disabled={isSent}
                            >
                                {isSent ? <Check className="mr-2" /> : <MessageSquare className="mr-2" />}
                                {isSent ? 'Enviado' : 'Enviar Parabéns'}
                            </Button>
                         )}
                      </TableCell>
                    )}
                  </TableRow>
                )
              })
            ) : (
              <TableRow>
                <TableCell colSpan={showActionColumn ? 4 : 3} className="h-24 text-center text-sm md:text-base">
                  {filter === 'all' ? 'Nenhum cliente encontrado.' : 
                   filter === 'month' ? 'Nenhum aniversariante este mês.' :
                   'Nenhum aniversariante hoje.'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
