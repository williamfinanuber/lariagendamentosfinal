
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Gift, MessageSquare, List } from 'lucide-react';
import { format } from 'date-fns';

interface Client {
  name: string;
  contact: string;
  birthDate?: string;
}

interface BirthdayReminderDialogProps {
  clients: Client[];
}

const birthdayMessage = (clientName: string) => {
    return encodeURIComponent(
        `Olá, ${clientName}! Hoje é o seu dia especial e o Studio Larissa Santos gostaria de desejar a você um feliz aniversário! Que seu novo ano seja repleto de alegria, sucesso e momentos tão brilhantes quanto seus cílios! Celebre muito!`
    );
};

export default function BirthdayReminderDialog({ clients }: BirthdayReminderDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [unsentClients, setUnsentClients] = useState<Client[]>([]);
  const router = useRouter();

  const getTodayStorageKey = () => {
    return `birthday_sent_${format(new Date(), 'yyyy-MM-dd')}`;
  };

  useEffect(() => {
    if (clients.length > 0) {
      const todayKey = getTodayStorageKey();
      const sentContacts = JSON.parse(localStorage.getItem(todayKey) || '{}');
      const filteredUnsent = clients.filter(client => !sentContacts[client.contact]);
      
      setUnsentClients(filteredUnsent);

      if (filteredUnsent.length > 0) {
        setIsOpen(true);
      }
    }
  }, [clients]);

  const handleSendSingle = () => {
    if (unsentClients.length === 1) {
      const client = unsentClients[0];
      const todayKey = getTodayStorageKey();
      const sentContacts = JSON.parse(localStorage.getItem(todayKey) || '{}');
      sentContacts[client.contact] = true;
      localStorage.setItem(todayKey, JSON.stringify(sentContacts));
      
      const whatsappUrl = `https://wa.me/${client.contact.replace(/\D/g, '')}?text=${birthdayMessage(client.name)}`;
      window.open(whatsappUrl, '_blank', 'noopener noreferrer');
      setIsOpen(false);
    }
  };

  const handleOpenList = () => {
    setIsOpen(false);
    router.push('/admin/clients?birthdays=today');
  };

  const handleClose = () => {
     const todayKey = getTodayStorageKey();
     // Create a temporary marker to not show the dialog again today
     // even if no message was sent.
     if(!localStorage.getItem(todayKey)) {
        localStorage.setItem(todayKey, JSON.stringify({ dialog_closed: true }));
     }
     setIsOpen(false);
  }

  if (unsentClients.length === 0) {
    return null;
  }

  const isSingleBirthday = unsentClients.length === 1;
  const singleClient = isSingleBirthday ? unsentClients[0] : null;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent onEscapeKeyDown={handleClose} onInteractOutside={handleClose} className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary mb-4">
            <Gift className="h-6 w-6 text-primary-foreground" />
          </div>
          <DialogTitle className="text-center text-xl">Lembrete de Aniversário!</DialogTitle>
          <DialogDescription className="text-center">
            {isSingleBirthday
              ? `Hoje é o aniversário de ${singleClient?.name}! Não se esqueça de enviar os parabéns.`
              : `Você tem ${unsentClients.length} clientes fazendo aniversário hoje.`}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="sm:justify-center pt-4">
          {isSingleBirthday ? (
            <Button onClick={handleSendSingle}>
              <MessageSquare className="mr-2 h-4 w-4" /> Enviar Parabéns
            </Button>
          ) : (
            <Button onClick={handleOpenList}>
              <List className="mr-2 h-4 w-4" /> Ver Lista de Aniversariantes
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
