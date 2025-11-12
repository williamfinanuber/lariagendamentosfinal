
"use client";

import { useState, useMemo, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Gift, MessageSquare, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSearchParams, useRouter } from 'next/navigation';

interface Client {
  name: string;
  contact: string;
  birthDate?: string;
}

interface ClientsPageClientProps {
  clients: Client[];
}

export default function ClientsPageClient({ clients }: ClientsPageClientProps) {
  const [showBirthdaysOnly, setShowBirthdaysOnly] = useState(false);
  const [sentMessages, setSentMessages] = useState<Record<string, boolean>>({});
  const [currentMonth, setCurrentMonth] = useState<number | null>(null);
  const router = useRouter();

  const getTodayStorageKey = () => {
    return `birthday_sent_${format(new Date(), 'yyyy-MM-dd')}`;
  };

  useEffect(() => {
    setCurrentMonth(new Date().getMonth());
    // Load sent messages from localStorage on component mount
    const todayKey = getTodayStorageKey();
    const storedSentMessages = JSON.parse(localStorage.getItem(todayKey) || '{}');
    setSentMessages(storedSentMessages);
    
    // Automatically enable filter if coming from dashboard
    const urlParams = new URLSearchParams(window.location.search);
    if(urlParams.has('birthdays')){
        setShowBirthdaysOnly(true);
    }
  }, []);

  const birthdayMessage = (clientName: string) => {
    return encodeURIComponent(
        `Olá, ${clientName}! Hoje é o seu dia especial e o Studio Larissa Santos gostaria de desejar a você um feliz aniversário! Que seu novo ano seja repleto de alegria, sucesso e momentos tão brilhantes quanto seus cílios! Celebre muito!`
    );
  };

  const filteredClients = useMemo(() => {
    const baseClients = clients.sort((a, b) => {
      if (!a.birthDate || !b.birthDate) return 0;
      const dayA = parseISO(a.birthDate).getDate();
      const dayB = parseISO(b.birthDate).getDate();
      return dayA - dayB;
    });

    if (!showBirthdaysOnly) {
      return baseClients;
    }

    if (currentMonth === null) {
      return [];
    }

    return baseClients.filter(client => {
      if (!client.birthDate) return false;
      const birthMonth = parseISO(client.birthDate).getMonth();
      return birthMonth === currentMonth;
    });
  }, [clients, showBirthdaysOnly, currentMonth]);

  const toggleFilter = () => {
    const isFiltering = !showBirthdaysOnly;
    setShowBirthdaysOnly(isFiltering);
    if(isFiltering) {
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

  return (
    <Card>
      <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2 text-xl md:text-2xl">Lista de Clientes</CardTitle>
          <CardDescription className="text-sm">Visualize todos os seus clientes cadastrados.</CardDescription>
        </div>
        <Button onClick={toggleFilter} variant={showBirthdaysOnly ? 'default' : 'outline'} className="mt-4 md:mt-0">
          <Gift className="mr-2" />
          {showBirthdaysOnly ? 'Mostrar Todos os Clientes' : 'Aniversariantes do Mês'}
        </Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Contato</TableHead>
              <TableHead>Data de Nascimento</TableHead>
              {showBirthdaysOnly && <TableHead className="text-right">Ação</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredClients.length > 0 ? (
              filteredClients.map((client, index) => {
                const isSent = sentMessages[client.contact] === true;
                const isTodayBirthday = client.birthDate && parseISO(client.birthDate).getMonth() === new Date().getMonth() && parseISO(client.birthDate).getDate() === new Date().getDate();

                return (
                  <TableRow key={index} className={cn(showBirthdaysOnly && isTodayBirthday && "bg-primary/10")}>
                    <TableCell className="font-medium text-sm md:text-base">{client.name}</TableCell>
                    <TableCell className="text-sm md:text-base">{client.contact}</TableCell>
                    <TableCell className="text-sm md:text-base">
                      {client.birthDate ? format(parseISO(client.birthDate), "dd 'de' MMMM", { locale: ptBR }) : 'Não informado'}
                    </TableCell>
                    {showBirthdaysOnly && (
                      <TableCell className="text-right">
                         {isTodayBirthday && (
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
                                {isSent ? 'Mensagem Enviada' : 'Enviar Parabéns'}
                            </Button>
                         )}
                      </TableCell>
                    )}
                  </TableRow>
                )
              })
            ) : (
              <TableRow>
                <TableCell colSpan={showBirthdaysOnly ? 4 : 3} className="h-24 text-center text-sm md:text-base">
                  {showBirthdaysOnly ? 'Nenhum aniversariante este mês.' : 'Nenhum cliente encontrado.'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
