
"use client";

import { useState } from 'react';
import Image from 'next/image';
import { PlusCircle, MoreHorizontal, Pencil, Trash2, Upload, Loader2 } from 'lucide-react';
import type { Procedure } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { getProcedures, addProcedure, updateProcedure, deleteProcedure } from '@/lib/firebase';

interface ProceduresClientPageProps {
  initialProcedures: Procedure[];
}

const emptyProcedure: Omit<Procedure, 'id'> = {
  name: '',
  description: '',
  price: 0,
  duration: 0,
  imageUrl: ''
};

export default function ProceduresClientPage({ initialProcedures }: ProceduresClientPageProps) {
  const [procedures, setProcedures] = useState<Procedure[]>(initialProcedures);
  const [isLoading, setIsLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [procedureToDelete, setProcedureToDelete] = useState<Procedure | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentProcedure, setCurrentProcedure] = useState<Partial<Procedure>>({});
  const { toast } = useToast();

  const fetchProcedures = async () => {
    try {
      const procs = await getProcedures();
      setProcedures(procs);
    } catch (error) {
      console.error("Error fetching procedures: ", error);
      toast({ title: "Erro ao atualizar a lista de procedimentos", variant: 'destructive' });
    }
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setCurrentProcedure(prev => ({ ...prev, [id]: value }));
  }
  
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setCurrentProcedure(prev => ({ ...prev, imageUrl: result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const resetDialogState = () => {
    setCurrentProcedure({});
    setIsEditMode(false);
  }

  const openDialog = (procedure?: Procedure) => {
    if (procedure) {
      setIsEditMode(true);
      setCurrentProcedure(procedure);
    } else {
      resetDialogState();
    }
    setIsDialogOpen(true);
  }

  const closeDialog = () => {
    setIsDialogOpen(false);
    setTimeout(resetDialogState, 300);
  }

  const handleSubmit = async () => {
    const price = parseFloat(String(currentProcedure.price));
    const duration = parseInt(String(currentProcedure.duration), 10);
      
    if (!currentProcedure.name || !price || price <= 0 || !duration || duration <= 0) {
        toast({ title: "Dados incompletos", description: "Por favor, preencha nome, preço e duração com valores válidos.", variant: "destructive" });
        return;
    }
    
    const procedureData: Omit<Procedure, 'id'> = {
        name: currentProcedure.name,
        description: currentProcedure.description || '',
        price: price,
        duration: duration,
        imageUrl: currentProcedure.imageUrl || '',
    };

    setIsLoading(true);
    try {
      if (isEditMode && currentProcedure.id) {
        await updateProcedure(currentProcedure.id, procedureData);
        toast({ title: "Sucesso!", description: "Procedimento atualizado." });
      } else {
        await addProcedure(procedureData);
        toast({ title: "Sucesso!", description: "Procedimento adicionado." });
      }
      await fetchProcedures();
      closeDialog();
    } catch (error) {
      console.error("Error saving procedure: ", error);
      toast({ title: "Erro ao salvar", description: "Ocorreu um erro ao salvar o procedimento.", variant: 'destructive'});
    } finally {
      setIsLoading(false);
    }
  }

  const openDeleteAlert = (procedure: Procedure) => {
    setProcedureToDelete(procedure);
    setIsAlertOpen(true);
  };

  const handleDeleteProcedure = async () => {
    if (!procedureToDelete) return;

    setIsLoading(true);
    try {
      await deleteProcedure(procedureToDelete.id);
      toast({ title: "Sucesso!", description: "Procedimento deletado.", variant: 'destructive' });
      await fetchProcedures();
    } catch(error: any) {
      console.error("Error deleting procedure: ", error);
      toast({ 
        title: "Erro ao deletar", 
        description: error.message || "Ocorreu um erro ao deletar o procedimento.", 
        variant: 'destructive'
      });
    } finally {
        setIsLoading(false);
        setIsAlertOpen(false);
        setProcedureToDelete(null);
    }
  }

  const renderFormFields = () => (
    <div className="grid gap-4 py-4">
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="name" className="text-right text-sm">Nome</Label>
        <Input id="name" value={currentProcedure.name || ''} onChange={handleFormChange} className="col-span-3" />
      </div>
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="description" className="text-right text-sm">Descrição</Label>
        <Textarea id="description" value={currentProcedure.description || ''} onChange={handleFormChange} className="col-span-3" />
      </div>
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="price" className="text-right text-sm">Preço (R$)</Label>
        <Input id="price" type="number" value={currentProcedure.price || ''} onChange={handleFormChange} className="col-span-3" placeholder="Ex: 180" />
      </div>
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="duration" className="text-right text-sm">Duração (min)</Label>
        <Input id="duration" type="number" value={currentProcedure.duration || ''} onChange={handleFormChange} className="col-span-3" placeholder="Ex: 120" />
      </div>
       <div className="grid grid-cols-4 items-start gap-4">
        <Label htmlFor="imageUpload" className="text-right pt-2 text-sm">Imagem</Label>
        <div className="col-span-3">
          <Input id="imageUpload" type="file" onChange={handleImageChange} className="hidden" accept="image/*" />
          <Button asChild variant="outline">
            <label htmlFor="imageUpload" className="cursor-pointer w-full">
              <Upload className="mr-2 h-4 w-4" />
              Buscar Imagem
            </label>
          </Button>
          {currentProcedure.imageUrl && (
            <div className="mt-2 relative w-32 h-32">
              <Image
                alt="Preview da Imagem"
                className="rounded-md object-cover"
                fill
                src={currentProcedure.imageUrl}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );


  return (
    <>
      <Card>
        <CardHeader className="flex flex-col gap-y-2 md:flex-row md:items-center md:justify-between">
          <div>
              <CardTitle className="text-xl md:text-2xl">Procedimentos</CardTitle>
              <CardDescription className="text-sm">Gerencie os procedimentos oferecidos no studio.</CardDescription>
          </div>
            <Button size="sm" className="gap-1" onClick={() => openDialog()}>
                <PlusCircle className="h-4 w-4" />
                Adicionar Procedimento
            </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="hidden w-[100px] sm:table-cell">
                  <span className="sr-only">Imagem</span>
                </TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Preço</TableHead>
                <TableHead className="hidden md:table-cell">Duração</TableHead>
                <TableHead>
                  <span className="sr-only">Ações</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {procedures.map((procedure) => (
                <TableRow key={procedure.id}>
                  <TableCell className="hidden sm:table-cell">
                    <Image
                      alt={procedure.name}
                      className="aspect-video rounded-md object-cover"
                      height="64"
                      src={procedure.imageUrl || 'https://picsum.photos/128/72'}
                      width="128"
                    />
                  </TableCell>
                  <TableCell className="font-medium text-sm md:text-base">{procedure.name}</TableCell>
                  <TableCell className="text-sm md:text-base">
                    {procedure.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-sm">{procedure.duration} min</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button aria-haspopup="true" size="icon" variant="ghost" disabled={isLoading}>
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Ações</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => openDialog(procedure)} disabled={isLoading}>
                          <Pencil className="mr-2 h-4 w-4" /> Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-red-600 focus:text-red-600 focus:bg-red-50" onClick={() => openDeleteAlert(procedure)} disabled={isLoading}>
                          <Trash2 className="mr-2 h-4 w-4" /> Deletar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-xl">{isEditMode ? 'Editar Procedimento' : 'Adicionar Procedimento'}</DialogTitle>
            <DialogDescription className="text-sm">
                {isEditMode ? 'Atualize os detalhes do serviço.' : 'Preencha os detalhes do novo serviço.'}
            </DialogDescription>
          </DialogHeader>
          {renderFormFields()}
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={closeDialog} disabled={isLoading}>Cancelar</Button>
            <Button type="submit" onClick={handleSubmit} disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
            <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
                Esta ação não pode ser desfeita. Isso irá deletar permanentemente o procedimento "{procedureToDelete?.name}".
            </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading} onClick={() => setProcedureToDelete(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteProcedure} disabled={isLoading} className="bg-destructive hover:bg-destructive/90">
                 {isLoading && <Loader2 className="animate-spin mr-2"/>}
                Sim, deletar
            </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    </>
  );
}

    