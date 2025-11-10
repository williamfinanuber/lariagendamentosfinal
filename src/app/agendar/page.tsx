
"use client";

import BookingFlow from '@/components/BookingFlow';
import { useEffect, useState, Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import { getProcedures, getAvailability, getBookingById } from '@/lib/firebase';
import type { Procedure, Booking, Availability } from '@/lib/types';
import { useSearchParams } from 'next/navigation';


function BookingDataLoader() {
    const searchParams = useSearchParams();
    const bookingId = searchParams.get('bookingId');
    
    const [data, setData] = useState<{
        procedures: Procedure[];
        availability: Availability;
        booking: Booking | null;
    } | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadData = async () => {
            try {
                const [procedures, availability] = await Promise.all([
                    getProcedures(),
                    getAvailability()
                ]);
                
                let booking: Booking | null = null;
                if (bookingId) {
                    booking = await getBookingById(bookingId);
                }
                setData({ procedures, availability, booking });
            } catch (error) {
                console.error("Failed to load booking data", error);
            } finally {
                setIsLoading(false);
            }
        };

        loadData();
    }, [bookingId]);

    if (isLoading) {
        return <div className="flex justify-center items-center h-64"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
    }

    if (!data) {
        return <div>Não foi possível carregar os dados para agendamento.</div>;
    }
    
    return <BookingFlow procedures={data.procedures} availability={data.availability} existingBooking={data.booking} />;
}


export default function SchedulePage() {
  return (
    <div className="container mx-auto px-4 py-8">
       <Suspense fallback={<div className="flex justify-center items-center h-64"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>}>
        <BookingDataLoader />
      </Suspense>
    </div>
  );
}
