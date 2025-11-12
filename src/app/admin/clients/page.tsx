
"use client";

import { getBookings } from '@/lib/firebase';
import type { Booking } from '@/lib/types';
import ClientsPageClient from './ClientsPageClient';
import { useEffect, useState, Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import { useSearchParams } from 'next/navigation';

interface Client {
  name: string;
  contact: string;
  birthDate?: string;
}

function getUniqueClients(bookings: Booking[]): Client[] {
  const clientsMap = new Map<string, Client>();
  bookings.forEach(booking => {
    const key = booking.clientContact || booking.clientName;
    if (!key) return; 

    // Prioritize entries with birthdate
    if (!clientsMap.has(key) || (booking.clientBirthDate && !clientsMap.get(key)?.birthDate)) {
      clientsMap.set(key, {
        name: booking.clientName,
        contact: booking.clientContact,
        birthDate: booking.clientBirthDate,
      });
    }
  });
  return Array.from(clientsMap.values());
}

function ClientsPageContent() {
  const [clients, setClients] = useState<Client[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchClientsData = async () => {
        try {
            const allBookings = await getBookings();
            const uniqueClients = getUniqueClients(allBookings);
            setClients(uniqueClients);
        } catch (error) {
            console.error("Error fetching clients data", error);
        } finally {
            setIsLoading(false);
        }
    }
    fetchClientsData();
  }, []);

  if(isLoading) {
    return <div className="flex h-64 w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>
  }

  if(!clients) {
    return <div>Não foi possível carregar os clientes.</div>
  }
  
  return <ClientsPageClient clients={clients} />;
}


export default function ClientsPage() {
    return (
        <Suspense fallback={<div className="flex h-64 w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
            <ClientsPageContent />
        </Suspense>
    )
}
