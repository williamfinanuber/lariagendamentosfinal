
"use client";

import { useState } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { getBookingsByContact } from '@/lib/firebase';
import type { Booking } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Calendar, Clock, AlertCircle, MessageSquare, ArrowLeft, Pencil, Phone, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const ContactSchema = z.object({
  contact: z.string().min(10, 'Por favor, insira um número de telefone completo com DDD.'),
});

type ContactFormData = z.infer<typeof ContactSchema>;

export default function MyBookingsPage() {
  const [bookings, setBookings] = useState<Booking[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const contactForm = useForm<ContactFormData>({
    resolver: zodResolver(ContactSchema),
    defaultValues: { contact: '' },
  });

  const onSearchSubmit: SubmitHandler<ContactFormData> = async (data) => {
    setIsLoading(true);
    setHasSearched(true);
    setBookings(null);

    try {
      const foundBookings = await getBookingsByContact(data.contact);
      const sortedBookings = foundBookings.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setBookings(sortedBookings);
      if(sortedBookings.length === 0){
        toast({ title: "Nenhum resultado", description: "Não encontramos agendamentos para este número.", variant: "destructive" });
      }
    } catch (error) {
      console.error("Error fetching bookings:", error);
      toast({ title: "Erro na Busca", description: "Não foi possível buscar os agendamentos.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleEditClick = (bookingId: string) => {
    router.push(`/agendar?bookingId=${bookingId}`);
  };

  const getStatusVariant = (status: Booking['status']) => {
    switch (status) {
      case 'confirmed': return 'default';
      case 'pending': return 'secondary';
      case 'cancelled': return 'destructive';
      case 'completed': return 'default';
      default: return 'outline';
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
  };
  
  const generateWhatsAppLink = (booking: Booking) => {
    const formattedApiDate = format(parseISO(booking.date), 'dd/MM/yyyy');
    const signalValue = booking.price * 0.30;
    
    const whatsappMessage = encodeURIComponent(
      `Olá! Meu nome é ${booking.clientName}. Gostaria de confirmar meu agendamento:\n\n` +
      `*Procedimento:* ${booking.procedureName}\n` +
      `*Data:* ${formattedApiDate}\n` +
      `*Hora:* ${booking.time}\n` +
      `*Valor Total:* ${booking.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}\n` +
      `*Sinal (30%):* ${signalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}\n\n` +
      `Gostaria de pagar o valor do sinal para finalizar meu agendamento.`
    );

    return `https://wa.me/5563984259190?text=${whatsappMessage}`;
  }

  const renderSearchForm = () => (
    <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Meus Agendamentos</CardTitle>
          <CardDescription>
            Digite seu número de telefone (com DDD) para encontrar seus agendamentos.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...contactForm}>
            <form onSubmit={contactForm.handleSubmit(onSearchSubmit)} className="space-y-4">
              <FormField
                control={contactForm.control}
                name="contact"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefone com DDD</FormLabel>
                    <FormControl>
                        <div className="relative">
                            <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input placeholder="(XX) XXXXX-XXXX" {...field} className="pl-10" />
                        </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <Button type="submit" disabled={isLoading} className="w-full">
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                    Buscar Agendamentos
                </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="border-t pt-6">
            <Button asChild variant="outline" className="w-full">
              <Link href="/">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar à Página Inicial
              </Link>
            </Button>
        </CardFooter>
      </Card>
  );

  const renderBookings = () => (
     <div className="mt-8 max-w-2xl mx-auto space-y-4">
        {bookings && bookings.length > 0 ? (
            bookings.map(booking => (
            <Card key={booking.id} className="overflow-hidden">
                    <CardHeader className="bg-muted/50 p-4 flex-col items-start gap-3">
                    <div className="flex justify-between items-start w-full">
                        <CardTitle className="text-lg md:text-xl leading-tight mb-1">{booking.procedureName}</CardTitle>
                        <Badge variant={getStatusVariant(booking.status)} className={cn('flex-shrink-0', booking.status === 'completed' && 'bg-green-600 text-white hover:bg-green-600')}>
                            {getStatusText(booking.status)}
                        </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1.5"><Calendar size={14} /> {format(parseISO(booking.date), "dd/MM/yyyy")}</span>
                        <span className="flex items-center gap-1.5"><Clock size={14} /> {booking.time}</span>
                    </div>
                    
                        {(booking.status === 'pending' || booking.status === 'confirmed') && (
                        <div className='flex flex-wrap gap-2 items-center'>
                        <Button size="sm" variant="outline" onClick={() => handleEditClick(booking.id)} disabled={isLoading} className="text-xs px-2 py-1 h-auto">
                            <Pencil className="mr-1.5 h-3 w-3" />
                            Alterar
                        </Button>
                        </div>
                        )}
                    </CardHeader>
                    {booking.status === 'pending' && (
                    <CardFooter className="p-3 sm:p-4 bg-amber-50 border-t border-amber-200 text-amber-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-4">
                        <div className="flex items-start">
                            <AlertCircle className="h-5 w-5 mr-2 sm:mr-3 flex-shrink-0" />
                            <p className="text-xs sm:text-sm">Seu agendamento está pendente. Finalize pelo WhatsApp para garantir seu horário.</p>
                        </div>
                        <Button asChild size="sm" className="w-full sm:w-auto bg-green-500 hover:bg-green-600 text-white flex-shrink-0 text-xs px-3 py-1 h-auto">
                            <a href={generateWhatsAppLink(booking)} target="_blank" rel="noopener noreferrer">
                                <MessageSquare className="mr-1.5 h-3 w-3"/>
                                Finalizar
                            </a>
                        </Button>
                    </CardFooter>
                    )}
            </Card>
            ))
        ) : (
        <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
                <p>Nenhum agendamento encontrado para este número.</p>
            </CardContent>
        </Card>
        )}
        <div className="text-center pt-4">
            <Button variant="link" onClick={() => { setHasSearched(false); setBookings(null); contactForm.reset(); }}>Buscar por outro número</Button>
        </div>
    </div>
  );


  return (
    <div className="container mx-auto px-4 py-8">
      {!hasSearched || !bookings ? renderSearchForm() : renderBookings()}
    </div>
  );
}
