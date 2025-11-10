
"use client";

import { getBookings } from '@/lib/firebase';
import BookingsClientPage from './BookingsClientPage';
import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import type { Booking } from '@/lib/types';


export default function BookingsPage() {
  const [initialBookings, setInitialBookings] = useState<Booking[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    const fetchInitialBookings = async () => {
        try {
            const bookings = await getBookings();
            setInitialBookings(bookings);
        } catch (error) {
            console.error("Error fetching initial bookings", error);
        } finally {
            setIsLoading(false);
        }
    }
    fetchInitialBookings();
  }, []);

  if(isLoading) {
    return <div className="flex h-64 w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>
  }

  if(!initialBookings) {
    return <div>Não foi possível carregar os agendamentos.</div>
  }

  return <BookingsClientPage initialBookings={initialBookings} />;
}
