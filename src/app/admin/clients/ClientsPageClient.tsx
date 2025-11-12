
"use client";

import { useState, useMemo, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { format, parseISO, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Gift, MessageSquare, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';

interface Client {
  name: string;
  contact: string;
  birthDate?: string;
}

interface ClientsPageClientProps {
  clients: Client[];
}

export default function ClientsPageClient({ clients }: ClientsPageClientProps) {
  const [filter, setFilter] = useState<'all' | 'month' | 'today'>('all');
  const [sentMessages, setSentMessages] = useState<Record<string, boolean>>({});
  const router = useRouter();

  const getTodayStorageKey = () => {
    return `birthday_sent_${format(new Date(), 'yyyy-MM-dd')}`;
  };

  useEffect(() => {
    // Load sent messages from localStorage on component mount
    const todayKey = getTodayStorageKey();
    const storedSentMessages = JSON.parse(localStorage.getItem(todayKey) || '{}');
    setSentMessages(storedSentMessages);
    
    // Automatically set filter based on URL query param
    const urlParams = new URLSearchParams(window.location.search);
    if(urlParams.get('birthdays') === 'today'){
        setFilter('today');
    } else if (urlParams.has('birthdays')) {
        setFilter('month');
    }
  }, []);

  const birthdayMessage = (clientName: string) => {
    return encodeURIComponent(
        `Olá, ${clientName}! Hoje é o seu dia especial e o Studio Larissa Santos gostaria de desejar a você um feliz aniversário! Que seu novo ano seja repleto de alegria, sucesso e momentos tão brilhantes quanto seus cílios! Celebre muito!`
    );
  };

  const filteredClients = useMemo(() => {
    const sortedClients = clients.sort((a, b) => {
        if (!a.birthDate || !b.birthDate) return 0;
        try {
            const dayA = parseISO(a.birthDate).getDate();
            const dayB = parseISO(b.birthDate).getDate();
            return dayA - dayB;
        } catch (e) { return 0; }
    });

    if (filter === 'all') {
      return sortedClients;
    }

    if (filter === 'today') {
      return sortedClients.filter(client => {
        if (!client.birthDate) return false;
        try { return isToday(parseISO(client.birthDate)); } catch (e) { return false; }
      });
    }

    if (filter === 'month') {
        const currentMonth = new Date().getMonth();
        return sortedClients.filter(client => {
            if (!client.birthDate) return false;
            try {
                const birthMonth = parseISO(client.birthDate).getMonth();
                return birthMonth === currentMonth;
            } catch(e) { return false; }
        });
    }

    return [];
  }, [clients, filter]);

  const handleFilterToggle = () => {
    const newFilter = filter === 'month' || filter === 'today' ? 'all' : 'month';
    setFilter(newFilter);
    if(newFilter === 'month') {
        router.push('/admin/clients?birthdays=true', { scroll: false });
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

  return (
    <Card>
      <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2 text-xl md:text-2xl">Lista de Clientes</CardTitle>
          <CardDescription className="text-sm">Visualize todos os seus clientes cadastrados.</CardDescription>
        </div>
        <Button onClick={handleFilterToggle} variant={filter !== 'all' ? 'default' : 'outline'} className="mt-4 md:mt-0">
          <Gift className="mr-2" />
          {filter !== 'all' ? 'Mostrar Todos os Clientes' : 'Aniversariantes do Mês'}
        </Button>
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
                if (!client.birthDate) return null; // Should not happen with current filter logic but good practice

                const isSent = sentMessages[client.contact] === true;
                const isBirthdayToday = isToday(parseISO(client.birthDate));

                return (
                  <TableRow key={index} className={cn(showActionColumn && isBirthdayToday && "bg-primary/10")}>
                    <TableCell className="font-medium text-sm md:text-base">{client.name}</TableCell>
                    <TableCell className="text-sm md:text-base">{client.contact}</TableCell>
                    <TableCell className="text-sm md:text-base">
                      {format(parseISO(client.birthDate), "dd 'de' MMMM", { locale: ptBR })}
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
