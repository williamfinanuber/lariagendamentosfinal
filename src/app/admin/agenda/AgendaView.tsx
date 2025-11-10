
"use client";

import { useState, useMemo, useEffect } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Availability, Booking, Procedure } from '@/lib/types';
import { Calendar as CalendarIcon, Clock, User, CheckCircle, Loader2, PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { markBookingAsCompleted, getBookings, getAvailability } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import AdminBookingDialog from './AdminBookingDialog';


interface AgendaViewProps {
  initialBookings: Booking[];
  procedures: Procedure[];
  initialAvailability: Availability;
}

export default function AgendaView({ initialBookings, procedures, initialAvailability }: AgendaViewProps) {
  const [bookings, setBookings] = useState<Booking[]>(initialBookings);
  const [availability, setAvailability] = useState<Availability>(initialAvailability);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [isLoading, setIsLoading] = useState<Record<string, boolean>>({});
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();
  
  useEffect(() => {
    setSelectedDate(new Date());
  }, [])


  const fetchAllData = async () => {
    try {
      const [freshBookings, freshAvailability] = await Promise.all([
          getBookings(),
          getAvailability()
      ]);
      const confirmed = freshBookings.filter(b => b.status === 'confirmed' || b.status === 'completed');
      setBookings(confirmed);
      setAvailability(freshAvailability);
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };
  
  const onBookingCreated = async () => {
    setIsDialogOpen(false);
    await fetchAllData();
  };

  const handleMarkAsCompleted = async (bookingId: string, price: number) => {
    setIsLoading(prev => ({ ...prev, [bookingId]: true }));
    try {
      await markBookingAsCompleted(bookingId, price);
      toast({ title: "Atendimento finalizado!", description: "O valor foi contabilizado no seu faturamento." });
      await fetchAllData();
    } catch (error) {
      console.error("Error marking as completed:", error);
      toast({ title: "Erro ao finalizar atendimento", variant: "destructive" });
    } finally {
      setIsLoading(prev => ({ ...prev, [bookingId]: false }));
    }
  };

  const bookingsByDate = useMemo(() => {
    const map = new Map<string, Booking[]>();
    bookings.forEach(booking => {
      const dateKey = booking.date; // Already in 'yyyy-MM-dd' format
      if (!map.has(dateKey)) {
        map.set(dateKey, []);
      }
      map.get(dateKey)?.push(booking);
      map.get(dateKey)?.sort((a,b) => a.time.localeCompare(b.time));
    });
    return map;
  }, [bookings]);

  const { completedDays, hasConfirmedDays } = useMemo(() => {
    const completed: Date[] = [];
    const hasConfirmed: Date[] = [];
    
    bookingsByDate.forEach((dayBookings, dateStr) => {
        const date = new Date(dateStr + 'T12:00:00Z');
        const hasConfirmedBooking = dayBookings.some(b => b.status === 'confirmed');
        const allCompleted = dayBookings.every(b => b.status === 'completed');

        if (hasConfirmedBooking) {
            hasConfirmed.push(date);
        } else if (allCompleted) {
            completed.push(date);
        }
    });
    return { completedDays: completed, hasConfirmedDays: hasConfirmed };
  }, [bookingsByDate]);

  const todaysBookings = useMemo(() => {
    if (!selectedDate) return [];
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    return bookingsByDate.get(dateKey) || [];
  }, [selectedDate, bookingsByDate]);

  return (
    <>
    <AdminBookingDialog
        isOpen={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        procedures={procedures}
        availability={availability}
        onBookingCreated={onBookingCreated}
        selectedDate={selectedDate}
    />
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
      <Card className="lg:col-span-2">
        <CardHeader className="flex flex-row justify-between items-center">
          <CardTitle className="flex items-center gap-2 text-base md:text-xl"><CalendarIcon /> Calendário</CardTitle>
           <Button size="sm" onClick={() => setIsDialogOpen(true)}><PlusCircle className="mr-2 h-4 w-4" />Agendar</Button>
        </CardHeader>
        <CardContent className="flex justify-center">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            initialFocus
            locale={ptBR}
            className="rounded-md border"
            modifiers={{ 
              hasConfirmed: hasConfirmedDays,
              allCompleted: completedDays,
            }}
            modifiersStyles={{ 
                hasConfirmed: {
                    backgroundColor: '#22c55e', // green-500
                    color: 'white',
                },
                allCompleted: {
                    backgroundColor: '#ef4444', // red-500
                    color: 'white',
                }
            }}
          />
        </CardContent>
      </Card>
      <Card className="lg:col-span-3">
        <CardHeader>
          <CardTitle className="text-sm md:text-lg">Agendamentos para {selectedDate ? format(selectedDate, "dd 'de' MMMM", { locale: ptBR }) : '...'}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {todaysBookings.length > 0 ? (
            todaysBookings.map(booking => (
              <div key={booking.id} className="p-4 rounded-lg border bg-card flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex-1 space-y-1">
                  <p className="flex items-center gap-2 font-semibold text-xs md:text-sm"><User size={16} className="text-primary"/> {booking.clientName}</p>
                  <p className="text-xs text-muted-foreground">{booking.procedureName}</p>
                   <Badge variant="secondary" className="flex items-center gap-1.5 text-xs w-fit px-2 py-0.5">
                      <Clock size={14} />
                      {booking.time}
                   </Badge>
                </div>
                 <div className="flex items-center gap-2 self-end sm:self-center">
                   {booking.status === 'completed' ? (
                       <span className="text-sm font-medium text-green-600 flex items-center gap-2"><CheckCircle size={16}/> Finalizado</span>
                   ) : (
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="text-green-600 border-green-600 hover:bg-green-100 hover:text-green-700 h-8 px-2 md:h-9 md:px-3 text-xs"
                        onClick={() => handleMarkAsCompleted(booking.id, booking.price)}
                        disabled={isLoading[booking.id]}
                      >
                         {isLoading[booking.id] ? <Loader2 className="animate-spin mr-2 h-4 w-4"/> : <CheckCircle className="mr-2 h-4 w-4"/>}
                         Atendido
                      </Button>
                   )}
                 </div>
              </div>
            ))
          ) : (
            <p className="text-center text-muted-foreground py-8 text-sm md:text-base">Nenhum agendamento confirmado para esta data.</p>
          )}
        </CardContent>
      </Card>
    </div>
    </>
  );
}
