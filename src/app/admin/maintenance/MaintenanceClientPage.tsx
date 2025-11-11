
"use client";

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { format, parseISO, addDays, isPast } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Wrench, MessageSquare, Search, Loader2, Trash2, AlertTriangle } from 'lucide-react';
import type { Booking } from '@/lib/types';
import { markMaintenanceReminderAsSent, deleteAllData } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface MaintenanceClientPageProps {
  completedBookings: Booking[];
}

export default function MaintenanceClientPage({ completedBookings }: MaintenanceClientPageProps) {
  const [maintenanceDays, setMaintenanceDays] = useState('21');
  const [filteredClients, setFilteredClients] = useState<Booking[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  const { toast } = useToast();

  const handleFilterClick = () => {
    const days = parseInt(maintenanceDays, 10);
    if (isNaN(days) || days <= 0) {
      toast({ title: "Período inválido", description: "Por favor, insira um número de dias válido.", variant: "destructive" });
      return;
    }
    
    // The initial data from `completedBookings` prop already filters out those with `maintenanceReminderSent: true`.
    // We just need to check the date.
    const clientsDue = completedBookings.filter(booking => {
      const completedDate = parseISO(booking.date);
      const maintenanceDate = addDays(completedDate, days);
      return isPast(maintenanceDate);
    });

    setFilteredClients(clientsDue);
    setHasSearched(true);
  };
  
  const handleDaysChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMaintenanceDays(e.target.value);
  }

  const maintenanceMessage = (clientName: string) => {
    return encodeURIComponent(
        `Olá, ${clientName}! Tudo bem? 😊 Passando para lembrar com carinho que está na hora de cuidarmos da manutenção dos seus cílios para que eles continuem sempre impecáveis! ✨\n\nClique no link abaixo para agendar seu horário:\nhttps://lariagendamentos.vercel.app/\n\nSerá um prazer te receber!\nStudio Larissa Santos`
    );
  };

  const handleSendReminder = async (booking: Booking) => {
    setIsLoading(true);
    try {
      await markMaintenanceReminderAsSent(booking.id);
      
      // Update UI immediately by removing the client from the current list
      setFilteredClients(currentClients => currentClients.filter(c => c.id !== booking.id));
      toast({ title: "Lembrete marcado como enviado!", description: `O lembrete para ${booking.clientName} foi registrado.` });

      // Open WhatsApp link
      const whatsappUrl = `https://wa.me/${booking.clientContact.replace(/\D/g, '')}?text=${maintenanceMessage(booking.clientName)}`;
      window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
    } catch (error) {
      console.error("Error sending maintenance reminder: ", error);
      toast({ title: "Erro ao enviar lembrete", variant: "destructive" });
    } finally {
        setIsLoading(false);
    }
  };

  const handleClearAllData = async () => {
    setIsDeletingAll(true);
    toast({ title: "Iniciando limpeza...", description: "Isso pode levar alguns segundos." });
    try {
        await deleteAllData();
        toast({ title: "Sucesso!", description: "Todos os agendamentos, transações e procedimentos foram apagados." });
        setFilteredClients([]);
        // Ideally, you would trigger a full app refresh here or redirect.
        // For now, just clearing local state.
    } catch (error) {
        console.error("Error clearing all data: ", error);
        toast({ title: "Erro na Limpeza", description: "Não foi possível apagar todos os dados.", variant: "destructive" });
    } finally {
        setIsDeletingAll(false);
    }
  }

  return (
    <div className="space-y-6">
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl md:text-2xl"><Wrench/> Clientes para Manutenção</CardTitle>
        <CardDescription className="text-sm md:text-base">
          Encontre clientes que estão no período de fazer a manutenção com base na data do último atendimento concluído.
        </CardDescription>
        <div className="flex flex-col sm:flex-row gap-4 pt-4 items-end">
            <div className="grid gap-2 w-full sm:w-auto">
                <Label htmlFor="maintenance-days" className="text-sm font-medium">Período de manutenção (dias)</Label>
                <Input 
                    id="maintenance-days"
                    type="number"
                    value={maintenanceDays}
                    onChange={handleDaysChange}
                    className="w-full sm:w-[200px]"
                />
            </div>
            <Button onClick={handleFilterClick} className="w-full sm:w-auto">
                <Search className="mr-2"/>
                Buscar Clientes
            </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cliente</TableHead>
              <TableHead>Procedimento</TableHead>
              <TableHead>Último Atendimento</TableHead>
              <TableHead className="text-right">Ação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
                <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                        <Loader2 className="mx-auto h-6 w-6 animate-spin"/>
                    </TableCell>
                </TableRow>
            ) : filteredClients.length > 0 ? (
              filteredClients.map((booking) => (
                <TableRow key={booking.id}>
                  <TableCell className="font-medium text-sm md:text-base">{booking.clientName}</TableCell>
                  <TableCell className="text-sm md:text-base">{booking.procedureName}</TableCell>
                  <TableCell className="text-sm md:text-base">
                    {format(parseISO(booking.date), "dd/MM/yyyy", { locale: ptBR })}
                  </TableCell>
                  <TableCell className="text-right">
                      <Button size="sm" className="bg-green-500 hover:bg-green-600 text-xs md:text-sm" onClick={() => handleSendReminder(booking)}>
                          <MessageSquare className="mr-2" />
                          Enviar Lembrete
                      </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center text-sm md:text-base">
                  {hasSearched ? 'Nenhum cliente encontrado para este período.' : 'Clique em "Buscar Clientes" para ver os resultados.'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>

     <Card className="border-destructive">
        <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive"><AlertTriangle/> Área de Risco</CardTitle>
            <CardDescription>Ações nesta seção são permanentes e não podem ser desfeitas.</CardDescription>
        </CardHeader>
        <CardContent>
            <div className="flex flex-col sm:flex-row justify-between items-center rounded-lg border border-destructive/50 p-4">
                <div>
                    <h3 className="font-semibold">Limpar Todos os Dados</h3>
                    <p className="text-sm text-muted-foreground">Apaga todos os agendamentos, transações financeiras e procedimentos.</p>
                </div>
                 <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="destructive" disabled={isDeletingAll} className="mt-4 sm:mt-0">
                            {isDeletingAll ? <Loader2 className="animate-spin mr-2"/> : <Trash2 className="mr-2"/>}
                            Limpar Dados
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                        <AlertDialogTitle>Você tem certeza absoluta?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta ação é irreversível. Todos os agendamentos, faturamentos e procedimentos serão **permanentemente apagados**.
                             Sua aplicação será reiniciada do zero. Deseja continuar?
                        </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeletingAll}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleClearAllData} disabled={isDeletingAll}>
                            {isDeletingAll ? <Loader2 className="animate-spin mr-2"/> : null}
                            Sim, apagar tudo
                        </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        </CardContent>
    </Card>
    </div>
  );
}
