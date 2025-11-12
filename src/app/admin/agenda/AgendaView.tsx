
"use client";

import { useState, useMemo, useEffect } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Availability, Booking, Procedure } from '@/lib/types';
import { Calendar as CalendarIcon, Clock, User, CheckCircle, Loader2, PlusCircle, Trash2, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { markBookingAsCompleted, getBookings, getAvailability, updateBookingStatus, deleteBookingAndRestoreTime } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import AdminBookingDialog from './AdminBookingDialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from '@/lib/utils';


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
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [bookingToCancel, setBookingToCancel] = useState<Booking | null>(null);

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
      const relevantBookings = freshBookings.filter(b => b.status === 'pending' || b.status === 'confirmed' || b.status === 'completed');
      setBookings(relevantBookings);
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

  const handleConfirmBooking = async (booking: Booking) => {
     setIsLoading(prev => ({ ...prev, [booking.id]: true }));
     try {
        await updateBookingStatus(booking.id, 'confirmed');
        toast({ title: "Agendamento confirmado!" });
        await fetchAllData();
     } catch (error) {
        console.error("Error confirming booking:", error);
        toast({ title: "Erro ao confirmar agendamento", variant: "destructive" });
     } finally {
        setIsLoading(prev => ({ ...prev, [booking.id]: false }));
     }
  }
  
  const openCancelAlert = (booking: Booking) => {
    setBookingToCancel(booking);
    setIsAlertOpen(true);
  }

  const handleCancelBooking = async () => {
    if (!bookingToCancel) return;
    
    setIsLoading(prev => ({ ...prev, [bookingToCancel.id]: true }));
    setIsAlertOpen(false);

    try {
      await deleteBookingAndRestoreTime({
          id: bookingToCancel.id,
          date: bookingToCancel.date,
          time: bookingToCancel.time,
      });
      toast({ title: 'Agendamento cancelado', description: 'O horário foi liberado novamente.', variant: 'destructive' });
      setBookingToCancel(null);
      await fetchAllData();
    } catch (error) {
       console.error('Error discarding booking:', error);
       toast({ title: 'Erro ao cancelar agendamento', variant: 'destructive' });
    } finally {
        if(bookingToCancel) {
            setIsLoading(prev => ({ ...prev, [bookingToCancel.id]: false }));
        }
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

  const { completedDays, hasConfirmedDays, hasPendingDays } = useMemo(() => {
    const completed: Date[] = [];
    const hasConfirmed: Date[] = [];
    const hasPending: Date[] = [];
    
    bookingsByDate.forEach((dayBookings, dateStr) => {
        const date = new Date(dateStr + 'T12:00:00Z');
        const hasConfirmedBooking = dayBookings.some(b => b.status === 'confirmed');
        const hasPendingBooking = dayBookings.some(b => b.status === 'pending');
        const allCompleted = dayBookings.every(b => b.status === 'completed');

        if (hasPendingBooking) {
            hasPending.push(date);
        } else if (hasConfirmedBooking) {
            hasConfirmed.push(date);
        } else if (allCompleted && dayBookings.length > 0) {
            completed.push(date);
        }
    });
    return { completedDays: completed, hasConfirmedDays: hasConfirmed, hasPendingDays: hasPending };
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
    <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
            <AlertDialogTitle>Cancelar Agendamento?</AlertDialogTitle>
            <AlertDialogDescription>
                Esta ação irá apagar o agendamento permanentemente e liberar o horário novamente. Deseja continuar?
            </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading[bookingToCancel?.id || '']}>Não, manter</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancelBooking} disabled={isLoading[bookingToCancel?.id || '']}>
                 {isLoading[bookingToCancel?.id || ''] && <Loader2 className="animate-spin mr-2"/>}
                Sim, cancelar
            </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>

    <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
      <Card className="lg:col-span-2">
        <CardHeader className="flex flex-row justify-between items-center">
          <CardTitle className="flex items-center gap-2 text-base md:text-xl"><CalendarIcon /> Calendário</CardTitle>
           <Button size="sm" onClick={() => setIsDialogOpen(true)}><PlusCircle className="mr-2 h-4 w-4" />Agendar</Button>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center gap-4">
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
                  hasPending: hasPendingDays,
                }}
                modifiersStyles={{ 
                    hasPending: {
                        backgroundColor: '#f59e0b', // amber-500
                        color: 'white',
                    },
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
              <div className="space-y-2 text-xs text-muted-foreground w-full max-w-xs md:w-auto">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#f59e0b' }}></div>
                    <span>Dia com agendamento(s) pendente(s).</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#22c55e' }}></div>
                    <span>Dia com agendamento(s) confirmado(s).</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#ef4444' }}></div>
                    <span>Dia com todos atendimentos finalizados.</span>
                </div>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card className="lg:col-span-3">
        <CardHeader>
          <CardTitle className="text-sm md:text-lg">Agendamentos para {selectedDate ? format(selectedDate, "dd 'de' MMMM", { locale: ptBR }) : '...'}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {todaysBookings.length > 0 ? (
            todaysBookings.map(booking => (
              <div key={booking.id} className={cn("p-4 rounded-lg border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4", {
                'bg-amber-50 border-amber-200': booking.status === 'pending',
                'bg-card': booking.status !== 'pending'
              })}>
                <div className="flex-1 space-y-1">
                  <p className="flex items-center gap-2 font-semibold text-xs md:text-sm"><User size={16} className="text-primary"/> {booking.clientName}</p>
                  <p className="text-xs text-muted-foreground">{booking.procedureName}</p>
                   <Badge variant="secondary" className="flex items-center gap-1.5 text-xs w-fit px-2 py-0.5">
                      <Clock size={14} />
                      {booking.time}
                   </Badge>
                </div>
                 <div className="flex items-center gap-2 self-end sm:self-center">
                   {booking.status === 'completed' && (
                       <span className="text-sm font-medium text-green-600 flex items-center gap-2"><CheckCircle size={16}/> Finalizado</span>
                   )}
                   {booking.status === 'confirmed' && (
                    <>
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
                       <Button 
                            size="sm" 
                            variant="outline" 
                            className="text-red-600 border-red-600 hover:bg-red-100 hover:text-red-700 h-8 px-2 text-xs"
                            onClick={() => openCancelAlert(booking)}
                            disabled={isLoading[booking.id]}
                        >
                           <X className="mr-1 h-3 w-3"/> Cancelar
                        </Button>
                    </>
                   )}
                   {booking.status === 'pending' && (
                     <>
                        <Button 
                            size="sm" 
                            variant="outline" 
                            className="text-green-600 border-green-600 hover:bg-green-100 hover:text-green-700 h-8 px-2 text-xs"
                            onClick={() => handleConfirmBooking(booking)}
                            disabled={isLoading[booking.id]}
                        >
                            {isLoading[booking.id] ? <Loader2 className="animate-spin mr-2 h-4 w-4"/> : <Check className="mr-2 h-4 w-4"/>}
                            Confirmar
                        </Button>
                        <Button 
                            size="sm" 
                            variant="outline" 
                            className="text-red-600 border-red-600 hover:bg-red-100 hover:text-red-700 h-8 px-2 text-xs"
                            onClick={() => openCancelAlert(booking)}
                            disabled={isLoading[booking.id]}
                        >
                           <X className="mr-1 h-3 w-3"/> Cancelar
                        </Button>
                     </>
                   )}
                 </div>
              </div>
            ))
          ) : (
            <p className="text-center text-muted-foreground py-8 text-sm md:text-base">Nenhum agendamento para esta data.</p>
          )}
        </CardContent>
      </Card>
    </div>
    </>
  );
}

    