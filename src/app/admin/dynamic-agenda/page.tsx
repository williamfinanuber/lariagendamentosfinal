"use client";

import { getBookings } from '@/lib/firebase';
import type { Booking } from '@/lib/types';
import DynamicAgendaView from './DynamicAgendaView';
import { useEffect, useState, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function DynamicAgendaPage() {
  const [initialBookings, setInitialBookings] = useState<Booking[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchInitialBookings = useCallback(async () => {
    setIsLoading(true);
    try {
        const bookings = await getBookings();
        setInitialBookings(bookings);
    } catch (error) {
        console.error("Error fetching initial bookings", error);
        setInitialBookings([]);
    } finally {
        setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInitialBookings();
  }, [fetchInitialBookings]);

  if(isLoading && !initialBookings) { // Show loading only on initial load
    return <div className="flex h-64 w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>
  }

  if(!initialBookings) {
    return <div>Não foi possível carregar os agendamentos.</div>
  }

  return (
    <div className="space-y-6">
        <Card>
            <CardHeader>
                <CardTitle>Agenda Dinâmica</CardTitle>
                <CardDescription>
                    Clique em um agendamento para marcá-lo como atendido ou para cancelá-lo.
                </CardDescription>
            </CardHeader>
        </Card>
       <DynamicAgendaView initialBookings={initialBookings} onBookingUpdate={fetchInitialBookings} />
    </div>
  );
}
