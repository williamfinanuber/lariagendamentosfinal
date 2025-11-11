

"use client";

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { format, parseISO, addDays, isPast } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Wrench, MessageSquare, Search, Loader2, Trash2, AlertTriangle, KeyRound, RefreshCw } from 'lucide-react';
import type { Booking } from '@/lib/types';
import { markMaintenanceReminderAsSent, deleteAllData, restoreDefaultProcedures } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';

interface MaintenanceClientPageProps {
  completedBookings: Booking[];
}

export default function MaintenanceClientPage({ completedBookings }: MaintenanceClientPageProps) {
  const [maintenanceDays, setMaintenanceDays] = useState('21');
  const [filteredClients, setFilteredClients] = useState<Booking[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const { toast } = useToast();
  const correctPassword = '123456';

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
    setPasswordError('');
    if (password !== correctPassword) {
      setPasswordError('Senha incorreta. A limpeza de dados não foi executada.');
      toast({ title: "Senha Incorreta", description: "A operação foi cancelada.", variant: "destructive" });
      return;
    }

    setIsDeletingAll(true);
    toast({ title: "Iniciando limpeza...", description: "Isso pode levar alguns segundos." });
    
    try {
        await deleteAllData();
        toast({ title: "Sucesso!", description: "Todos os agendamentos e transações foram apagados." });
        setFilteredClients([]);
        setIsConfirmOpen(false);
        setPassword('');
    } catch (error) {
        console.error("Error clearing all data: ", error);
        toast({ title: "Erro na Limpeza", description: "Não foi possível apagar todos os dados.", variant: "destructive" });
    } finally {
        setIsDeletingAll(false);
    }
  }
  
  const resetConfirmation = () => {
      setIsConfirmOpen(false);
      setPassword('');
      setPasswordError('');
  }

  const handleRestoreProcedures = async () => {
    if(!confirm("Tem certeza que deseja restaurar os procedimentos padrão? Isso adicionará os serviços pré-definidos à sua lista. Procedimentos existentes com o mesmo nome não serão duplicados.")) return;

    setIsRestoring(true);
    try {
      await restoreDefaultProcedures();
      toast({ title: "Procedimentos restaurados!", description: "Sua lista de serviços foi atualizada." });
    } catch (error: any) {
      console.error("Error restoring procedures: ", error);
      toast({ title: "Erro ao restaurar", description: error.message || "Não foi possível restaurar os procedimentos.", variant: "destructive" });
    } finally {
      setIsRestoring(false);
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
            <CardDescription>Ações nesta seção são permanentes e podem impactar seus dados.</CardDescription>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-2 gap-4">
            <div className="flex flex-col sm:flex-row justify-between items-center rounded-lg border border-destructive/50 p-4">
                <div>
                    <h3 className="font-semibold">Limpar Dados do Histórico</h3>
                    <p className="text-sm text-muted-foreground">Apaga todos os agendamentos e transações financeiras. Seus procedimentos não serão afetados.</p>
                </div>
                 <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
                    <DialogTrigger asChild>
                        <Button variant="destructive" disabled={isDeletingAll} className="mt-4 sm:mt-0">
                            {isDeletingAll ? <Loader2 className="animate-spin mr-2"/> : <Trash2 className="mr-2"/>}
                            Limpar Dados
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2"><AlertTriangle/>Você tem certeza absoluta?</DialogTitle>
                            <DialogDescription>
                                Esta ação é irreversível. Todos os dados serão **permanentemente apagados**.
                                Para confirmar, por favor, insira a senha de administrador.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-2 pt-2">
                            <Label htmlFor="password-confirm" className="flex items-center gap-2">
                                <KeyRound className="h-4 w-4" />
                                Senha do Administrador
                            </Label>
                            <Input
                                id="password-confirm"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Digite a senha"
                            />
                            {passwordError && <p className="text-sm font-medium text-destructive">{passwordError}</p>}
                        </div>
                        <DialogFooter>
                            <Button variant="secondary" onClick={resetConfirmation} disabled={isDeletingAll}>Cancelar</Button>
                            <Button onClick={handleClearAllData} disabled={isDeletingAll} variant="destructive">
                                {isDeletingAll ? <Loader2 className="animate-spin mr-2"/> : null}
                                Sim, apagar tudo
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
             <div className="flex flex-col sm:flex-row justify-between items-center rounded-lg border border-border p-4">
                <div>
                    <h3 className="font-semibold">Restaurar Procedimentos</h3>
                    <p className="text-sm text-muted-foreground">Recadastra a lista de serviços padrão caso tenham sido removidos.</p>
                </div>
                <Button variant="outline" onClick={handleRestoreProcedures} disabled={isRestoring} className="mt-4 sm:mt-0">
                    {isRestoring ? <Loader2 className="animate-spin mr-2"/> : <RefreshCw className="mr-2"/>}
                    Restaurar
                </Button>
            </div>
        </CardContent>
    </Card>
    </div>
  );
}
