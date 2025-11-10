
"use client";

import { useState, useMemo, Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import type { Procedure, Availability, Booking } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { useToast } from "@/hooks/use-toast";
import { Calendar as CalendarIcon, Clock, User, Phone, ArrowLeft, Loader2, Info, Cake } from 'lucide-react';
import Link from 'next/link';
import { createBooking, updateBooking } from '@/lib/firebase';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

const formSchema = z.object({
  name: z.string().min(2, { message: "O nome deve ter pelo menos 2 caracteres." }),
  contact: z.string().min(10, { message: "Por favor, insira um contato válido com DDD." }),
  birthDate: z.string().min(1, { message: "A data de nascimento é obrigatória." }),
});

interface BookingFlowProps {
    procedures: Procedure[];
    availability: Availability;
    existingBooking?: Booking | null;
}

function BookingFlowContent({ procedures, availability, existingBooking = null }: BookingFlowProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  
  const isEditMode = !!existingBooking;

  const getInitialProcedure = () => {
    if (existingBooking) {
      return procedures.find(p => p.id === existingBooking.procedureId) || null;
    }
    const procedureIdParam = searchParams.get('procedureId');
    if (procedureIdParam) {
      return procedures.find(p => p.id === procedureIdParam) || null;
    }
    return null;
  }

  const [selectedProcedure, setSelectedProcedure] = useState<Procedure | null>(getInitialProcedure());
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    existingBooking ? new Date(existingBooking.date + 'T12:00:00Z') : undefined
  );
  const [selectedTime, setSelectedTime] = useState<string | null>(existingBooking?.time || null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { 
        name: existingBooking?.clientName || "", 
        contact: existingBooking?.clientContact || "",
        birthDate: existingBooking?.clientBirthDate || "" 
    },
  });

    const availableTimes = useMemo(() => {
        if (!selectedDate || !selectedProcedure) return [];

        const dateKey = format(selectedDate, 'yyyy-MM-dd');
        const daySlots = availability[dateKey] || [];
        const procedureDuration = selectedProcedure.duration;

        const closingTime = new Date(`1970-01-01T20:30:00`);
        const lastBookableTime = new Date(`1970-01-01T18:00:00`);

        return daySlots.filter(time => {
            const startTime = new Date(`1970-01-01T${time}`);
            const endTime = new Date(startTime.getTime() + procedureDuration * 60000);

            // Slot must start on or before the last bookable time
            // And the procedure must end by the closing time
            return startTime <= lastBookableTime && endTime <= closingTime;
        });
    }, [selectedDate, availability, selectedProcedure]);
  
  const availableDays = useMemo(() => {
    return Object.keys(availability)
        .filter(dateKey => availability[dateKey] && availability[dateKey].length > 0)
        .map(dateKey => new Date(dateKey + 'T12:00:00Z'));
  }, [availability]);

  const disabledDays = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return (date: Date) => date < today;
  }, []);


  function handleDateSelect(date: Date | undefined) {
    if (date) {
      setSelectedDate(date);
      setSelectedTime(null);
    }
  }

  async function handleBookingRequest(values: z.infer<typeof formSchema>) {
    if (!selectedProcedure || !selectedDate || !selectedTime) {
      toast({ title: "Informação incompleta", description: "Por favor, selecione procedimento, data e hora.", variant: "destructive" });
      return;
    }
    
    setIsLoading(true);
    
    try {
        const dateString = format(selectedDate, 'yyyy-MM-dd');
        
        if (isEditMode && existingBooking) {
            const bookingPayload = {
                procedureId: selectedProcedure.id,
                procedureName: selectedProcedure.name,
                date: dateString,
                time: selectedTime,
                clientName: values.name,
                clientContact: values.contact,
                clientBirthDate: values.birthDate,
                price: selectedProcedure.price,
                duration: selectedProcedure.duration,
            };
            await updateBooking(existingBooking.id, bookingPayload, existingBooking.date, existingBooking.time);
        } else {
             const bookingPayload = {
                procedureId: selectedProcedure.id,
                procedureName: selectedProcedure.name,
                date: dateString,
                time: selectedTime,
                clientName: values.name,
                clientContact: values.contact,
                clientBirthDate: values.birthDate,
                price: selectedProcedure.price,
                duration: selectedProcedure.duration,
            };
             await createBooking(bookingPayload);
        }
        
        const params = new URLSearchParams({
          procedure: selectedProcedure.name,
          date: dateString,
          time: selectedTime,
          name: values.name,
          price: selectedProcedure.price.toString(),
          duration: selectedProcedure.duration.toString(),
        });
        
        router.push(`/confirmation?${params.toString()}`);

    } catch (error: any) {
        console.error("Error creating/updating booking: ", error);
        toast({
            title: "Erro ao agendar",
            description: error.message || `Não foi possível ${isEditMode ? 'alterar' : 'concluir'} o agendamento. Tente novamente.`,
            variant: "destructive"
        });
    } finally {
        setIsLoading(false);
    }
  }
  
  const handleNumericInputChange = (e: React.ChangeEvent<HTMLInputElement>, fieldName: 'contact') => {
    const { value } = e.target;
    form.setValue(fieldName, value.replace(/\D/g, ''));
  };
  
  if (!selectedProcedure) {
    return (
      <Card className="text-center">
        <CardHeader>
          <CardTitle>Procedimento não encontrado</CardTitle>
          <CardDescription>O procedimento que você selecionou não foi encontrado. Por favor, volte e tente novamente.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link href="/procedimentos"><ArrowLeft className="mr-2" />Voltar para a lista</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const isBookingReady = selectedDate && selectedTime;

  return (
    <div className="space-y-8">
      <Card>
         <div className="p-6 pb-0">
             <Button asChild variant="outline">
                <Link href="/procedimentos"><ArrowLeft className="mr-2"/> Voltar</Link>
            </Button>
          </div>
        <CardHeader>
          <CardTitle className="text-xl md:text-2xl">
            {isEditMode ? 'Alterando Agendamento' : 'Você está agendando:'}
          </CardTitle>
          <div className="space-y-2 pt-2">
            <p className="text-lg text-primary font-bold">{selectedProcedure.name}</p>
            <CardDescription>{selectedProcedure.description}</CardDescription>
          </div>
        </CardHeader>
        <CardFooter className="flex justify-between items-center">
          <p className="text-primary font-bold text-lg">{selectedProcedure.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
          <div className="flex items-center text-sm text-muted-foreground">
              <Clock className="w-4 h-4 mr-1.5" />
              <span>{selectedProcedure.duration} min</span>
          </div>
        </CardFooter>
      </Card>

      <div className="grid md:grid-cols-2 gap-8 items-start">
        <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><CalendarIcon className="text-primary"/> 1. Escolha a Data e Hora</CardTitle>
              <CardDescription>Selecione um dia e um horário disponíveis para seu agendamento.</CardDescription>
            </CardHeader>
             <CardContent className="flex flex-col lg:flex-row gap-8">
                <div className="flex flex-col items-center">
                    <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={handleDateSelect}
                        disabled={disabledDays}
                        className="rounded-md border"
                        locale={ptBR}
                        initialFocus={isEditMode}
                        modifiers={{ available: availableDays }}
                        modifiersStyles={{
                        available: {
                            border: '2px solid #22c55e', // green-500
                        },
                        selected: {
                            backgroundColor: '#a1a1aa', // zinc-400
                            color: 'white',
                        }
                        }}
                    />
                    <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground p-2 bg-muted rounded-md">
                         <div className="h-3 w-3 rounded-full border-2 border-green-500 flex-shrink-0"></div>
                        <span>Dias com horários disponíveis</span>
                    </div>
                </div>
              {selectedDate && (
                <div className="flex-1">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Clock className="text-primary"/> 
                     Horários para {format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}
                  </h3>
                  {availableTimes.length > 0 ? (
                    <div className="grid grid-cols-2 gap-2">
                      {availableTimes.map((time) => (
                        <Button key={time} variant={selectedTime === time ? 'default' : 'outline'} onClick={() => setSelectedTime(time)}>{time}</Button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">Não há horários disponíveis para esta data ou o procedimento selecionado é muito longo para os horários restantes.</p>
                  )}
                </div>
              )}
            </CardContent>
        </Card>

        <Card className={`transition-opacity duration-500 ${isBookingReady ? 'opacity-100' : 'opacity-50'}`}>
             <CardHeader>
              <CardTitle className="flex items-center gap-2"><User className="text-primary"/> 2. Finalize seu Agendamento</CardTitle>
              <CardDescription>Preencha seus dados e finalize pelo WhatsApp para garantir seu horário.</CardDescription>
            </CardHeader>
            <CardContent>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button className="w-full" size="lg" disabled={!isBookingReady}>
                            {isEditMode ? 'Revisar Dados' : 'Informar meus Dados'}
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{isEditMode ? 'Confirme seus dados para alterar' : 'Quase lá!'}</DialogTitle>
                            <DialogDescription>
                                Preencha seus dados para {isEditMode ? 'alterar' : 'solicitar'} seu agendamento.
                            </DialogDescription>
                        </DialogHeader>
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(handleBookingRequest)} className="space-y-4">
                                <FormField control={form.control} name="name" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Nome Completo</FormLabel>
                                        <FormControl><Input placeholder="Seu nome" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}/>
                                <FormField control={form.control} name="birthDate" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Data de Nascimento</FormLabel>
                                        <FormControl><Input type="date" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}/>
                                <FormField control={form.control} name="contact" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Telefone / WhatsApp</FormLabel>
                                        <FormControl>
                                            <Input 
                                                type="tel" 
                                                placeholder="(XX) XXXXX-XXXX" 
                                                {...field} 
                                                onChange={(e) => handleNumericInputChange(e, 'contact')} 
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}/>
                                 <Card className="bg-secondary/50 border-primary/20">
                                  <CardContent className="p-4 flex items-start gap-3">
                                    <Info className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                                    <div>
                                      <h4 className="font-semibold text-card-foreground">Confirmação com Sinal</h4>
                                      <p className="text-sm text-muted-foreground">Para confirmar seu agendamento, é necessário o pagamento de um sinal de 30% do valor do procedimento. O restante é pago no dia.</p>
                                    </div>
                                  </CardContent>
                                </Card>
                                <DialogFooter>
                                    <DialogClose asChild>
                                        <Button type="button" variant="secondary" disabled={isLoading}>Cancelar</Button>
                                    </DialogClose>
                                    <Button type="submit" disabled={isLoading}>
                                        {isLoading && <Loader2 className="animate-spin mr-2"/>}
                                        {isEditMode ? 'Confirmar Alteração' : 'Solicitar Agendamento'}
                                    </Button>
                                </DialogFooter>
                            </form>
                        </Form>
                    </DialogContent>
                </Dialog>
            </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function BookingFlow(props: BookingFlowProps) {
    return (
        <Suspense fallback={<div className="flex justify-center items-center h-64"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>}>
            <BookingFlowContent {...props} />
        </Suspense>
    )
}
