
"use client";

import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Check,
  X,
  Loader2,
  Calendar as CalendarIcon,
  Clock,
  User,
  Phone,
  Trash2,
  CheckCircle,
  Filter,
  Cake
} from 'lucide-react';
import type { Booking } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  updateBookingStatus,
  deleteBookingAndRestoreTime,
  getBookings
} from '@/lib/firebase';
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';


interface BookingsClientPageProps {
  initialBookings: Booking[];
}

export default function BookingsClientPage({ initialBookings }: BookingsClientPageProps) {
  const [bookings, setBookings] = useState(initialBookings);
  const [isLoading, setIsLoading] = useState(false);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [bookingToDiscard, setBookingToDiscard] = useState<Booking | null>(null);
  
  const [procedureFilter, setProcedureFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<Date | undefined>();

  const { toast } = useToast();
  
  const uniqueProcedures = useMemo(() => {
    const procedureNames = new Set(bookings.map(b => b.procedureName));
    return Array.from(procedureNames);
  }, [bookings]);

  const filteredBookings = useMemo(() => {
    return bookings.filter(booking => {
      const procedureMatch = procedureFilter === 'all' || booking.procedureName === procedureFilter;
      const dateMatch = !dateFilter || booking.date === format(dateFilter, 'yyyy-MM-dd');
      return procedureMatch && dateMatch;
    });
  }, [bookings, procedureFilter, dateFilter]);

  const fetchBookings = async () => {
    setIsLoading(true);
    try {
        const freshBookings = await getBookings();
        setBookings(freshBookings);
    } catch (error) {
        console.error("Error fetching bookings:", error);
        toast({ title: "Erro ao atualizar agendamentos.", variant: "destructive" });
    } finally {
        setIsLoading(false);
    }
  }
  
  const generateConfirmationMessage = (booking: Booking) => {
    const formattedDate = format(new Date(booking.date + 'T12:00:00'), "EEEE, dd 'de' MMMM", { locale: ptBR });
    return encodeURIComponent(
      `Olá, ${booking.clientName}! ✨\n\n` +
      `Sua hora de brilhar foi confirmada! Estamos ansiosos para te receber no Studio Larissa Santos.\n\n` +
      `*Detalhes do seu momento:*\n` +
      `💖 *Procedimento:* ${booking.procedureName}\n` +
      `🗓️ *Data:* ${formattedDate}\n` +
      `⏰ *Hora:* ${booking.time}\n\n` +
      `Prepare-se para realçar ainda mais sua beleza! Se tiver qualquer dúvida, é só chamar.\n\n` +
      `Até breve! 💖`
    );
  };

  const handleUpdateStatus = async (booking: Booking, status: 'confirmed' | 'cancelled') => {
    setIsLoading(true);
    try {
      const updatedBooking = await updateBookingStatus(booking.id, status);
      toast({ title: `Agendamento ${status === 'confirmed' ? 'confirmado' : 'cancelado'}!`, variant: status === 'confirmed' ? 'default' : 'destructive' });
      
      if (status === 'confirmed' && updatedBooking) {
        const message = generateConfirmationMessage(updatedBooking);
        const whatsappUrl = `https://wa.me/${updatedBooking.clientContact.replace(/\D/g, '')}?text=${message}`;
        window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
      }
      
      await fetchBookings();
    } catch (error) {
      console.error('Error updating status:', error);
      toast({ title: 'Erro ao atualizar status', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const openDiscardAlert = (booking: Booking) => {
    setBookingToDiscard(booking);
    setIsAlertOpen(true);
  }
  
  const handleDiscardBooking = async () => {
    if (!bookingToDiscard) return;
    
    setIsLoading(true);
    setIsAlertOpen(false);
    try {
      await deleteBookingAndRestoreTime({
          id: bookingToDiscard.id,
          date: bookingToDiscard.date,
          time: bookingToDiscard.time,
      });
      toast({ title: 'Agendamento descartado', description: 'O horário foi liberado novamente.', variant: 'destructive' });
      setBookingToDiscard(null);
      await fetchBookings();
    } catch (error) {
       console.error('Error discarding booking:', error);
       toast({ title: 'Erro ao descartar agendamento', variant: 'destructive' });
    } finally {
        setIsLoading(false);
    }
  };
  

  const getStatusVariant = (status: Booking['status']) => {
    switch (status) {
      case 'confirmed':
        return 'default';
      case 'pending':
        return 'secondary';
      case 'cancelled':
        return 'destructive';
      case 'completed':
        return 'default';
      default:
        return 'outline';
    }
  };
  
  const getStatusText = (status: Booking['status']) => {
    const map = {
      pending: "Pendente",
      confirmed: "Confirmado",
      cancelled: "Cancelado",
      completed: "Finalizado",
    };
    return map[status];
  }


  return (
    <>
    <Card>
      <CardHeader>
        <CardTitle className="text-base md:text-xl">Gerenciar Agendamentos</CardTitle>
        <CardDescription className="text-sm">Confirme ou descarte os agendamentos solicitados. Use os filtros para encontrar agendamentos específicos.</CardDescription>
        <div className="flex flex-col md:flex-row gap-4 pt-4">
            <div className="flex-1">
                <Select value={procedureFilter} onValueChange={setProcedureFilter}>
                    <SelectTrigger className="w-full md:w-[280px]">
                         <Filter className="h-4 w-4 mr-2" />
                        <SelectValue placeholder="Filtrar por procedimento" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todos os procedimentos</SelectItem>
                        {uniqueProcedures.map(proc => (
                            <SelectItem key={proc} value={proc}>{proc}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            <div className="flex-1 flex gap-2">
                 <Popover>
                    <PopoverTrigger asChild>
                    <Button
                        variant={"outline"}
                        className={cn(
                        "w-full md:w-[280px] justify-start text-left font-normal",
                        !dateFilter && "text-muted-foreground"
                        )}
                    >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateFilter ? format(dateFilter, "PPP", { locale: ptBR }) : <span>Filtrar por data</span>}
                    </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                    <Calendar
                        mode="single"
                        selected={dateFilter}
                        onSelect={setDateFilter}
                        initialFocus
                        locale={ptBR}
                    />
                    </PopoverContent>
                </Popover>
                {dateFilter && <Button variant="ghost" onClick={() => setDateFilter(undefined)}>Limpar</Button>}
            </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading && bookings.length === 0 ? (
             <div className="flex items-center justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary"/>
            </div>
        ) : filteredBookings.length === 0 ? (
            <p className="text-center text-muted-foreground py-8 text-sm">Nenhum agendamento encontrado para os filtros selecionados.</p>
        ) : (
        <div className="divide-y divide-border">
          {filteredBookings.map((booking) => (
            <div key={booking.id} className="p-4 flex flex-col gap-3">
              <p className="font-bold text-sm">{booking.procedureName}</p>
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="space-y-1">
                  <p className="flex items-center gap-2 text-muted-foreground"><User size={14}/> {booking.clientName}</p>
                  <p className="flex items-center gap-2 text-muted-foreground"><Phone size={14}/> {booking.clientContact}</p>
                  {booking.clientBirthDate && <p className="flex items-center gap-2 text-muted-foreground"><Cake size={14}/> {format(new Date(booking.clientBirthDate), 'dd/MM/yyyy')}</p>}
                </div>
                <div className="space-y-1">
                  <p className="flex items-center gap-2 font-medium"><CalendarIcon size={14} className="text-primary"/> {format(new Date(booking.date + 'T00:00:00'), 'dd/MM/yy', { locale: ptBR })}</p>
                  <p className="flex items-center gap-2 font-medium"><Clock size={14} className="text-primary"/> {booking.time}</p>
                </div>
              </div>
              <div className="flex items-center justify-between gap-2 mt-2">
                 <Badge variant={getStatusVariant(booking.status)} className={cn('text-xs px-2 py-0.5 h-fit', booking.status === 'completed' && 'bg-green-600 text-white hover:bg-green-600')}>
                    {booking.status === 'completed' && <CheckCircle size={12} className="mr-1"/>}
                    {getStatusText(booking.status)}
                 </Badge>
                
                <div className="flex items-center justify-end gap-2">
                    {booking.status === 'pending' && (
                      <>
                        <Button size="icon" variant="outline" className="h-7 w-7 text-green-600 border-green-600 hover:bg-green-100 hover:text-green-700" onClick={() => handleUpdateStatus(booking, 'confirmed')} disabled={isLoading}>
                          <Check className="h-4 w-4"/>
                        </Button>
                         <Button size="icon" variant="outline" className="h-7 w-7 text-red-600 border-red-600 hover:bg-red-100 hover:text-red-700" onClick={() => openDiscardAlert(booking)} disabled={isLoading}>
                           <Trash2 className="h-4 w-4"/>
                        </Button>
                      </>
                    )} 
                    {booking.status === 'confirmed' && (
                         <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => handleUpdateStatus(booking, 'cancelled')} disabled={isLoading}>
                           <X className="mr-1 h-3 w-3"/> Cancelar
                        </Button>
                    )}
                </div>
              </div>
            </div>
          ))}
        </div>
         )}
      </CardContent>
    </Card>

    <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
            <AlertDialogTitle>Descartar Agendamento?</AlertDialogTitle>
            <AlertDialogDescription>
                Esta ação irá apagar o agendamento permanentemente e liberar o horário novamente.
                Isso geralmente é feito quando a cliente não realiza o pagamento do sinal. Deseja continuar?
            </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Não, manter</AlertDialogCancel>
            <AlertDialogAction onClick={handleDiscardBooking} disabled={isLoading}>
                 {isLoading && <Loader2 className="animate-spin mr-2"/>}
                Sim, descartar
            </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
