
"use client";

import { getBookings, getProcedures, getAvailability } from '@/lib/firebase';
import AgendaView from './AgendaView';
import type { Booking, Procedure, Availability } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Suspense, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

function AgendaData() {
  const [data, setData] = useState<{bookings: Booking[], procedures: Procedure[], availability: Availability} | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [allBookings, procedures, availability] = await Promise.all([
          getBookings(),
          getProcedures(),
          getAvailability()
        ]);
        const filteredBookings = allBookings.filter((booking: Booking) => booking.status === 'pending' || booking.status === 'confirmed' || booking.status === 'completed');
        setData({ bookings: filteredBookings, procedures, availability });
      } catch (error) {
        console.error("Failed to fetch agenda data", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return <div className="flex h-64 w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }
  
  if (!data) {
    return <div>Não foi possível carregar os dados da agenda.</div>;
  }

  return <AgendaView initialBookings={data.bookings} procedures={data.procedures} initialAvailability={data.availability} />;
}

export default function AgendaPage() {
  
  return (
    <div className="space-y-6">
        <Card>
            <CardHeader>
                <CardTitle>Agenda de Clientes</CardTitle>
                <CardDescription>Visualize e gerencie todos os seus agendamentos, confirme os pendentes ou adicione novos manualmente.</CardDescription>
            </CardHeader>
        </Card>
        <AgendaData />
    </div>
  );
}
