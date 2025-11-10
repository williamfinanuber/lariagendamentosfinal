
"use client";

import { useState, useMemo, useEffect } from 'react';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from "@/hooks/use-toast";
import { createAdminBooking } from '@/lib/firebase';
import type { Procedure, Availability } from '@/lib/types';
import { Loader2 } from 'lucide-react';

const formSchema = z.object({
  procedureId: z.string().min(1, "Selecione um procedimento."),
  date: z.string().min(1, "Selecione uma data."),
  time: z.string().min(1, "Selecione um horário."),
  clientName: z.string().min(2, { message: "O nome deve ter pelo menos 2 caracteres." }),
  clientContact: z.string().min(10, { message: "Insira um contato válido com DDD." }),
  clientBirthDate: z.string().optional(),
});

interface AdminBookingDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    procedures: Procedure[];
    availability: Availability;
    onBookingCreated: () => void;
    selectedDate?: Date;
}

export default function AdminBookingDialog({
    isOpen,
    onOpenChange,
    procedures,
    availability,
    onBookingCreated,
    selectedDate: initialSelectedDate,
}: AdminBookingDialogProps) {
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            procedureId: "",
            date: "",
            time: "",
            clientName: "",
            clientContact: "",
            clientBirthDate: "",
        },
    });

    const selectedDate = form.watch('date');
    
    useEffect(() => {
        if(initialSelectedDate) {
            form.setValue('date', format(initialSelectedDate, 'yyyy-MM-dd'));
        }
    }, [initialSelectedDate, form]);

    const availableTimes = useMemo(() => {
        if (!selectedDate) return [];
        return availability[selectedDate] || [];
    }, [selectedDate, availability]);

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        setIsLoading(true);
        try {
            const selectedProcedure = procedures.find(p => p.id === values.procedureId);
            if (!selectedProcedure) {
                toast({ title: "Procedimento não encontrado", variant: "destructive" });
                return;
            }
            
            const bookingPayload = {
                procedureId: selectedProcedure.id,
                procedureName: selectedProcedure.name,
                date: values.date,
                time: values.time,
                clientName: values.clientName,
                clientContact: values.clientContact,
                clientBirthDate: values.clientBirthDate || '',
                price: selectedProcedure.price,
            };

            await createAdminBooking(bookingPayload);
            toast({ title: "Agendamento confirmado!", description: "O agendamento foi adicionado à agenda." });
            form.reset();
            onBookingCreated();

        } catch (error: any) {
            console.error("Error creating admin booking: ", error);
            toast({
                title: "Erro ao agendar",
                description: error.message || "Não foi possível criar o agendamento.",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleClose = () => {
        if (isLoading) return;
        form.reset();
        onOpenChange(false);
    }
    
    const handleNumericInputChange = (e: React.ChangeEvent<HTMLInputElement>, fieldName: 'clientContact') => {
        const { value } = e.target;
        form.setValue(fieldName, value.replace(/\D/g, ''));
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Novo Agendamento Manual</DialogTitle>
                    <DialogDescription>
                        Preencha os dados para criar um novo agendamento confirmado na agenda.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        
                         <FormField control={form.control} name="procedureId" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Procedimento</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Selecione um procedimento" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {procedures.map(proc => (
                                            <SelectItem key={proc.id} value={proc.id}>
                                                {proc.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}/>

                        <div className="grid grid-cols-2 gap-4">
                            <FormField control={form.control} name="date" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Data</FormLabel>
                                    <FormControl>
                                        <Input type="date" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}/>
                             <FormField control={form.control} name="time" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Horário</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value} disabled={!selectedDate || availableTimes.length === 0}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Selecione um horário" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {availableTimes.map(time => (
                                                <SelectItem key={time} value={time}>{time}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}/>
                        </div>

                        <FormField control={form.control} name="clientName" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Nome do Cliente</FormLabel>
                                <FormControl><Input placeholder="Nome completo" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}/>
                        
                        <FormField control={form.control} name="clientContact" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Contato (WhatsApp)</FormLabel>
                                <FormControl><Input type="tel" placeholder="(XX) XXXXX-XXXX" {...field} onChange={(e) => handleNumericInputChange(e, 'clientContact')} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}/>
                        
                         <FormField control={form.control} name="clientBirthDate" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Data de Nascimento (Opcional)</FormLabel>
                                <FormControl><Input type="date" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}/>

                        <DialogFooter>
                            <Button type="button" variant="secondary" onClick={handleClose} disabled={isLoading}>Cancelar</Button>
                            <Button type="submit" disabled={isLoading}>
                                {isLoading && <Loader2 className="animate-spin mr-2"/>}
                                Confirmar Agendamento
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
