
"use client";

import { useState, useMemo, useCallback } from 'react';
import { format, startOfWeek, addDays, subDays, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Clock, ChevronLeft, ChevronRight, User, XCircle, Ban, Loader2, Info } from 'lucide-react';
import type { Booking } from '@/lib/types';
import { cn } from '@/lib/utils';
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { markBookingAsCompleted, updateBookingStatus } from '@/lib/firebase';

interface DynamicAgendaViewProps {
  initialBookings: Booking[];
  onBookingUpdate: () => void;
}

const timeToMinutes = (time: string) => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

const colors = [
  'border-pink-400 bg-pink-50',
  'border-purple-400 bg-purple-50',
  'border-blue-400 bg-blue-50',
  'border-green-400 bg-green-50',
  'border-yellow-400 bg-yellow-50',
  'border-orange-400 bg-orange-50',
  'border-red-400 bg-red-50',
  'border-indigo-400 bg-indigo-50',
];

const getColor = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash % colors.length);
  return colors[index];
};

const hourSlots = Array.from({ length: 14 }, (_, i) => `${String(i + 8).padStart(2, '0')}:00`); // 8 AM to 9 PM

export default function DynamicAgendaView({ initialBookings, onBookingUpdate }: DynamicAgendaViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isLoading, setIsLoading] = useState<Record<string, boolean>>({});
  const { toast } = useToast();

  const weekDays = useMemo(() => {
    const start = startOfWeek(currentDate, { weekStartsOn: 0 }); // Start of week on Sunday
    return Array.from({ length: 7 }).map((_, i) => addDays(start, i));
  }, [currentDate]);

  const bookingsByDate = useMemo(() => {
    const map = new Map<string, Booking[]>();
    initialBookings.forEach(booking => {
      if (booking.status === 'confirmed' || booking.status === 'completed') {
        const dateKey = booking.date; // 'yyyy-MM-dd'
        if (!map.has(dateKey)) {
          map.set(dateKey, []);
        }
        map.get(dateKey)?.push(booking);
      }
    });
    return map;
  }, [initialBookings]);

  const handleNextWeek = () => {
    setCurrentDate(addDays(currentDate, 7));
  };

  const handlePreviousWeek = () => {
    setCurrentDate(subDays(currentDate, 7));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const calculateBookingPosition = (booking: Booking) => {
    const startMinutes = timeToMinutes(booking.time);
    const top = ((startMinutes - (8 * 60)) / 60) * 60; // 60px per hour
    const height = (booking.duration / 60) * 60 - 2; // -2 for a small gap
    return { top: `${top}px`, height: `${height}px` };
  };

  const handleStatusChange = async (booking: Booking, newStatus: 'completed' | 'cancelled') => {
    setIsLoading(prev => ({ ...prev, [booking.id]: true }));
    try {
      if (newStatus === 'completed') {
        await markBookingAsCompleted(booking.id, booking.price);
        toast({ title: "Atendimento finalizado!", description: "O valor foi contabilizado no seu faturamento." });
      } else { // cancelled
        await updateBookingStatus(booking.id, newStatus);
        toast({ title: "Agendamento cancelado.", variant: "destructive" });
      }
      onBookingUpdate(); // Refetch data in parent component
    } catch (error) {
      console.error(`Error updating booking to ${newStatus}:`, error);
      toast({ title: "Erro ao atualizar status", variant: "destructive" });
    } finally {
       setIsLoading(prev => ({ ...prev, [booking.id]: false }));
    }
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-col sm:flex-row justify-between items-center p-4 border-b">
        <CardTitle className="text-base md:text-xl font-semibold">
           {format(weekDays[0], "dd 'de' MMM", { locale: ptBR })} - {format(weekDays[6], "dd 'de' MMM 'de' yyyy", { locale: ptBR })}
        </CardTitle>
        <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleToday}>Hoje</Button>
            <Button variant="ghost" size="icon" onClick={handlePreviousWeek}><ChevronLeft /></Button>
            <Button variant="ghost" size="icon" onClick={handleNextWeek}><ChevronRight /></Button>
        </div>
      </CardHeader>
      <div className="flex w-full overflow-x-auto">
        {/* Time column */}
        <div className="flex flex-col min-w-[50px] border-r">
          <div className="h-16 border-b"></div>
          <div className="relative flex-1">
             {hourSlots.map((hour) => (
                <div key={hour} className="relative h-[60px] border-t border-dashed">
                    <span className="absolute -top-3 left-1 text-xs text-muted-foreground bg-card px-1">{hour}</span>
                </div>
            ))}
          </div>
        </div>
        
        {/* Days columns */}
        <div className="grid grid-cols-7 flex-1">
          {weekDays.map(day => {
            const dateKey = format(day, 'yyyy-MM-dd');
            const dayBookings = bookingsByDate.get(dateKey) || [];
            const isToday = isSameDay(day, new Date());

            return (
              <div key={dateKey} className="flex flex-col border-r last:border-r-0">
                <div className={cn("text-center p-2 border-b h-16 flex flex-col justify-center", isToday ? "bg-primary/10" : "")}>
                  <p className="font-semibold text-sm capitalize">{format(day, 'EEE', { locale: ptBR })}</p>
                  <p className={cn("text-lg font-bold", isToday ? "text-primary" : "")}>{format(day, 'dd')}</p>
                </div>
                <div className="relative flex-1 bg-muted/20 h-[840px]">
                  {dayBookings.map(booking => {
                    const { top, height } = calculateBookingPosition(booking);
                    const cardColor = getColor(booking.procedureName);
                    const isCompleted = booking.status === 'completed';
                    const isProcessing = isLoading[booking.id];

                    return (
                        <DropdownMenu key={booking.id}>
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <DropdownMenuTrigger asChild disabled={isCompleted || isProcessing}>
                                            <div
                                                className={cn(
                                                    "absolute left-1 right-1 rounded-lg p-2 text-xs shadow-md border-l-4 transition-all duration-200 ease-in-out flex flex-col overflow-hidden",
                                                    isCompleted || isProcessing ? "cursor-default" : "cursor-pointer hover:scale-[1.02] hover:z-10",
                                                    cardColor,
                                                    "text-gray-800",
                                                    { 'opacity-60 saturate-50': isCompleted },
                                                    { 'animate-pulse': isProcessing }
                                                )}
                                                style={{ top, height }}
                                            >
                                                <p className="font-bold truncate text-gray-900">{booking.procedureName}</p>
                                                <p className="text-xs truncate flex items-center gap-1.5"><User size={12}/>{booking.clientName}</p>
                                                <div className="flex items-center gap-1.5 text-xs mt-auto">
                                                    <Clock size={12} />
                                                    <span>{booking.time}</span>
                                                </div>
                                                {isProcessing && <Loader2 className="absolute top-1 right-1 h-4 w-4 animate-spin"/>}
                                                {isCompleted && !isProcessing && (
                                                    <div className="absolute top-1 right-1 bg-white/70 rounded-full p-0.5">
                                                    <CheckCircle size={14} className="text-green-600" />
                                                    </div>
                                                )}
                                            </div>
                                        </DropdownMenuTrigger>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p className="font-bold">{booking.procedureName}</p>
                                        <p>Cliente: {booking.clientName}</p>
                                        <p>Horário: {booking.time}</p>
                                        <p>Duração: {booking.duration} min</p>
                                        {isCompleted && <p className="font-semibold text-green-600">Status: Finalizado</p>}
                                        {!isCompleted && <p className="text-muted-foreground text-xs mt-1">Clique para ver as ações</p>}
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                            <DropdownMenuContent>
                                <DropdownMenuLabel>Ações</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => handleStatusChange(booking, 'completed')}>
                                    <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                                    <span>Atendido</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-red-500 focus:text-red-500" onClick={() => handleStatusChange(booking, 'cancelled')}>
                                    <Ban className="mr-2 h-4 w-4" />
                                    <span>Cancelar</span>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </Card>
  );
}
