
"use client";

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { format, parseISO, isWithinInterval, parse } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  DollarSign,
  PlusCircle,
  Trash2,
  TrendingUp,
  TrendingDown,
  Landmark,
  Loader2,
  Calendar as CalendarIcon,
  Printer,
  Pencil,
  AlertTriangle,
} from 'lucide-react';

import { Card, CardHeader, CardTitle, CardContent, CardFooter, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from '@/hooks/use-toast';
import { addTransaction, deleteTransaction, addCategory, deleteCategory, getTransactions, getCategories, getBookings, updateTransaction, deleteAllTransactions } from '@/lib/firebase';
import type { Transaction, Category, Booking } from '@/lib/types';
import { Badge } from '@/components/ui/badge';


const transactionSchema = z.object({
  id: z.string().optional(),
  type: z.enum(['revenue', 'expense']),
  description: z.string().min(2, "A descrição é obrigatória."),
  amount: z.coerce.number().positive("O valor deve ser positivo."),
  date: z.string().min(1, "A data é obrigatória."),
  categoryId: z.string().min(1, "A categoria é obrigatória."),
});

const reportSchema = z.object({
    startDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
        message: "Data de início inválida",
    }),
    endDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
        message: "Data final inválida",
    }),
}).refine(data => new Date(data.startDate) <= new Date(data.endDate), {
    message: "A data de início não pode ser posterior à data final.",
    path: ["startDate"],
});


interface FinancePageClientProps {
  initialTransactions: Transaction[];
  initialCategories: Category[];
  initialBookings: Booking[];
}

interface PrintableReportProps {
    transactions: Transaction[];
    totals: { totalRevenue: number, totalExpenses: number, netRevenue: number };
    categories: Category[];
    period?: { from: Date, to: Date };
}

const PrintableReport = React.forwardRef<HTMLDivElement, PrintableReportProps>(({ transactions, totals, categories, period }, ref) => (
  <div ref={ref} className="print-container space-y-6 p-8">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold">Relatório Financeiro</h2>
        {period && (
            <p className="text-muted-foreground">
                Período de {format(period.from, 'dd/MM/yyyy')} a {format(period.to, 'dd/MM/yyyy')}
            </p>
        )}
      </div>
      <div className="grid gap-4 md:grid-cols-3 print:grid-cols-3">
            <Card className="border-primary">
              <CardHeader className="pb-2"><CardTitle className="text-base">Faturamento Bruto</CardTitle></CardHeader>
              <CardContent><p className="text-xl font-bold">{totals.totalRevenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p></CardContent>
          </Card>
          <Card className="border-destructive">
              <CardHeader className="pb-2"><CardTitle className="text-base">Gasto Bruto</CardTitle></CardHeader>
              <CardContent><p className="text-xl font-bold">{totals.totalExpenses.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p></CardContent>
          </Card>
          <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Faturamento Líquido</CardTitle></CardHeader>
              <CardContent><p className="text-xl font-bold">{totals.netRevenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p></CardContent>
          </Card>
      </div>
      <h3 className="text-xl font-semibold">Detalhes das Transações</h3>
      <Table>
          <TableHeader>
          <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead className="text-right">Valor</TableHead>
          </TableRow>
          </TableHeader>
          <TableBody>
          {transactions.map(t => {
              const category = categories.find(c => c.id === t.categoryId);
              return (
                  <TableRow key={t.id}>
                      <TableCell>{format(parseISO(t.date), 'dd/MM/yyyy')}</TableCell>
                      <TableCell>{t.description}</TableCell>
                      <TableCell>{category?.name || t.categoryName || 'N/A'}</TableCell>
                      <TableCell className={`text-right font-medium ${t.type === 'revenue' ? 'text-green-600' : 'text-red-600'}`}>
                          {t.type === 'expense' && '- '}
                          {t.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </TableCell>
                  </TableRow>
              )
          })}
          </TableBody>
      </Table>
  </div>
));
PrintableReport.displayName = 'PrintableReport';


export default function FinancePageClient({ initialTransactions, initialCategories, initialBookings }: FinancePageClientProps) {
  const [transactions, setTransactions] = useState<Transaction[]>(initialTransactions);
  const [categories, setCategories] = useState<Category[]>(initialCategories);

  const [isLoading, setIsLoading] = useState(false);
  const [isCategoryLoading, setIsCategoryLoading] = useState(false);
  const [isTransactionDialogOpen, setIsTransactionDialogOpen] = useState(false);
  const [isDateSelectorOpen, setIsDateSelectorOpen] = useState(false);

  const [isEditMode, setIsEditMode] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  
  const reportRef = useRef<HTMLDivElement>(null);
  const [reportData, setReportData] = useState<PrintableReportProps | null>(null);

  const { toast } = useToast();
  
  const { register, handleSubmit, control, watch, reset, setValue, formState: { errors } } = useForm<z.infer<typeof transactionSchema>>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      type: 'expense',
      description: '',
      date: format(new Date(), 'yyyy-MM-dd'),
      categoryId: '',
    },
  });

   const reportForm = useForm<z.infer<typeof reportSchema>>({
    resolver: zodResolver(reportSchema),
    defaultValues: {
        startDate: format(new Date(), 'yyyy-MM-dd'),
        endDate: format(new Date(), 'yyyy-MM-dd'),
    }
  });
  
  const transactionType = watch('type');
  
    useEffect(() => {
        if (reportData) {
            window.print();
            setReportData(null); // Clean up after printing
        }
    }, [reportData]);

  const fetchAllData = async () => {
    setIsLoading(true);
    try {
        const [trans, cats] = await Promise.all([
            getTransactions(),
            getCategories()
        ]);
        setTransactions(trans);
        setCategories(cats);
    } catch (error) {
        console.error("Error fetching data:", error);
        toast({ title: "Erro ao atualizar dados", variant: 'destructive'});
    } finally {
        setIsLoading(false);
    }
  }


  const { totalRevenue, totalExpenses, netRevenue } = useMemo(() => {
    const revenueFromTransactions = transactions
      .filter(t => t.type === 'revenue')
      .reduce((acc, t) => acc + t.amount, 0);

    const expensesFromTransactions = transactions
      .filter(t => t.type === 'expense')
      .reduce((acc, t) => acc + t.amount, 0);

    return {
      totalRevenue: revenueFromTransactions,
      totalExpenses: expensesFromTransactions,
      netRevenue: revenueFromTransactions - expensesFromTransactions,
    };
  }, [transactions]);

  const filteredCategories = useMemo(() => {
    return categories.filter(c => c.type === transactionType);
  }, [categories, transactionType]);

  const openDialog = (transaction?: Transaction) => {
    reset({
        type: 'expense',
        description: '',
        date: format(new Date(), 'yyyy-MM-dd'),
        categoryId: '',
        amount: undefined,
    });
    setIsEditMode(!!transaction);
    if(transaction) {
        setValue('id', transaction.id);
        setValue('type', transaction.type);
        setValue('description', transaction.description);
        setValue('amount', transaction.amount);
        setValue('date', transaction.date);
        setValue('categoryId', transaction.categoryId);
    } else {
        setValue('date', format(new Date(), 'yyyy-MM-dd'));
        setValue('type', 'expense');
    }
    setIsTransactionDialogOpen(true);
  }


  const onSubmit = async (data: z.infer<typeof transactionSchema>) => {
    setIsLoading(true);
    try {
      const selectedCategory = categories.find(c => c.id === data.categoryId);
      if (!selectedCategory) throw new Error("Categoria não encontrada");

      const transactionData = { 
        type: data.type,
        description: data.description,
        amount: data.amount,
        date: data.date,
        categoryId: data.categoryId,
        categoryName: selectedCategory.name 
      };

      if (isEditMode && data.id) {
        await updateTransaction(data.id, transactionData);
        toast({ title: 'Transação atualizada com sucesso!' });
      } else {
        await addTransaction(transactionData);
        toast({ title: 'Transação adicionada com sucesso!' });
      }
      
      await fetchAllData();
      setIsTransactionDialogOpen(false);
      reset();
    } catch (error) {
      console.error(error);
      toast({ title: 'Erro ao salvar transação', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    if (!confirm("Tem certeza que deseja deletar esta transação? Esta ação não pode ser desfeita.")) return;
    
    setIsLoading(true);
    try {
      await deleteTransaction(id);
      toast({ title: 'Transação deletada.', variant: 'destructive' });
      await fetchAllData();
    } catch (error) {
       console.error(error);
       toast({ title: 'Erro ao deletar transação', variant: 'destructive' });
    } finally {
        setIsLoading(false);
    }
  };

  const handleClearHistory = async () => {
    setIsLoading(true);
    try {
        await deleteAllTransactions();
        toast({ title: 'Histórico de transações foi limpo!', variant: 'destructive' });
        await fetchAllData();
    } catch (error) {
        console.error(error);
        toast({ title: 'Erro ao limpar histórico', variant: 'destructive' });
    } finally {
        setIsLoading(false);
    }
  }
  
  const handleAddCategory = async (type: 'revenue' | 'expense') => {
      if (!newCategoryName.trim()) {
        toast({ title: "O nome da categoria não pode estar vazio.", variant: 'destructive' });
        return;
      }
      setIsCategoryLoading(true);
      try {
        const newCategory = { name: newCategoryName, type };
        await addCategory(newCategory);
        setNewCategoryName("");
        toast({ title: "Categoria adicionada!" });
        await fetchAllData();
      } catch (error) {
        console.error(error);
        toast({ title: "Erro ao criar categoria.", variant: 'destructive' });
      } finally {
        setIsCategoryLoading(false);
      }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm("Tem certeza que deseja deletar esta categoria? Todas as transações associadas a ela permanecerão, mas a categoria não poderá mais ser usada.")) return;
    
    setIsCategoryLoading(true);
    try {
        await deleteCategory(id);
        toast({ title: "Categoria deletada.", variant: 'destructive' });
        await fetchAllData();
    } catch (error) {
        toast({ title: "Erro ao deletar categoria.", variant: 'destructive' });
    } finally {
        setIsCategoryLoading(false);
    }
  }

  const handleGenerateReport = (data: z.infer<typeof reportSchema>) => {
    const from = parse(data.startDate, 'yyyy-MM-dd', new Date());
    const to = parse(data.endDate, 'yyyy-MM-dd', new Date());
    to.setHours(23, 59, 59, 999); // Include the whole end day

    const filteredTransactions = transactions.filter(t => {
        const transactionDate = parseISO(t.date);
        return isWithinInterval(transactionDate, { start: from, end: to });
    });

    const revenue = filteredTransactions
      .filter(t => t.type === 'revenue')
      .reduce((acc, t) => acc + t.amount, 0);

    const expenses = filteredTransactions
      .filter(t => t.type === 'expense')
      .reduce((acc, t) => acc + t.amount, 0);

    const reportPayload: PrintableReportProps = {
        transactions: filteredTransactions,
        totals: {
            totalRevenue: revenue,
            totalExpenses: expenses,
            netRevenue: revenue - expenses
        },
        categories: categories,
        period: { from, to }
    };
    
    setReportData(reportPayload);
    setIsDateSelectorOpen(false);
  };


  const renderFinancialCards = () => (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Faturamento Bruto</CardTitle>
          <TrendingUp className="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="text-xl md:text-2xl font-bold">{totalRevenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>
          <p className="text-xs text-muted-foreground">Receitas de serviços e outras entradas</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Gasto Bruto</CardTitle>
          <TrendingDown className="h-4 w-4 text-red-500" />
        </CardHeader>
        <CardContent>
          <div className="text-xl md:text-2xl font-bold">{totalExpenses.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>
          <p className="text-xs text-muted-foreground">Total de despesas registradas</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Faturamento Líquido</CardTitle>
          <Landmark className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-xl md:text-2xl font-bold">{netRevenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>
          <p className="text-xs text-muted-foreground">Faturamento bruto menos os gastos</p>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <>
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Controle Financeiro</h1>
            <p className="text-muted-foreground text-sm md:text-base">Registre suas receitas e despesas para acompanhar a saúde do seu negócio.</p>
        </div>
        <Dialog open={isTransactionDialogOpen} onOpenChange={setIsTransactionDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => openDialog()}><PlusCircle className="mr-2" /> Nova Transação</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{isEditMode ? 'Editar Transação' : 'Registrar Nova Transação'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <Controller
                name="type"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value} disabled={isEditMode}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="expense">Despesa</SelectItem>
                      <SelectItem value="revenue">Receita</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              <div>
                <Label htmlFor="description">Descrição</Label>
                <Input id="description" {...register('description')} />
                {errors.description && <p className="text-red-500 text-sm">{errors.description.message}</p>}
              </div>
              <div>
                <Label htmlFor="amount">Valor (R$)</Label>
                <Input id="amount" type="number" step="0.01" {...register('amount')} />
                 {errors.amount && <p className="text-red-500 text-sm">{errors.amount.message}</p>}
              </div>
              <div>
                <Label htmlFor="date">Data</Label>
                <Input id="date" type="date" {...register('date')} />
                 {errors.date && <p className="text-red-500 text-sm">{errors.date.message}</p>}
              </div>
              <div>
                <Label htmlFor="categoryId">Categoria</Label>
                <Controller
                  name="categoryId"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma categoria" />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredCategories.map(cat => (
                          <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                 {errors.categoryId && <p className="text-red-500 text-sm">{errors.categoryId.message}</p>}
              </div>
              <DialogFooter>
                <DialogClose asChild><Button type="button" variant="secondary" disabled={isLoading}>Cancelar</Button></DialogClose>
                <Button type="submit" disabled={isLoading}>
                    {isLoading && <Loader2 className="animate-spin mr-2" />}
                    {isEditMode ? 'Salvar Alterações' : 'Adicionar'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div>{renderFinancialCards()}</div>

       <Tabs defaultValue="transactions">
        <TabsList className="grid w-full grid-cols-3 text-xs md:text-sm">
            <TabsTrigger value="transactions">Transações</TabsTrigger>
            <TabsTrigger value="categories">Categorias</TabsTrigger>
            <TabsTrigger value="reports">Relatórios</TabsTrigger>
        </TabsList>
        <TabsContent value="transactions">
            <Card>
                <CardHeader className="flex flex-col gap-y-2 md:flex-row md:items-center md:justify-between">
                    <CardTitle className="text-lg md:text-xl">Histórico de Transações</CardTitle>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm" disabled={isLoading || transactions.length === 0}>
                            <Trash2 className="mr-2 h-4 w-4" />
                            Limpar Histórico
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle className="flex items-center gap-2"><AlertTriangle/>Tem certeza absoluta?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta ação é irreversível e irá apagar **todas** as suas transações financeiras permanentemente. 
                            Seu faturamento será zerado. Deseja continuar?
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Não, cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={handleClearHistory}
                            disabled={isLoading}
                            className="bg-destructive hover:bg-destructive/90"
                          >
                            {isLoading ? <Loader2 className="animate-spin mr-2"/> : null}
                            Sim, apagar tudo
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                        <TableRow>
                            <TableHead>Descrição</TableHead>
                            <TableHead>Valor</TableHead>
                            <TableHead>Categoria</TableHead>
                            <TableHead>Data</TableHead>
                            <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                        </TableHeader>
                        <TableBody>
                        {transactions.map(t => (
                            <TableRow key={t.id}>
                            <TableCell className="text-xs md:text-sm">{t.description}</TableCell>
                            <TableCell className={`text-xs md:text-sm ${t.type === 'revenue' ? 'text-green-500' : 'text-red-500'}`}>
                                {t.type === 'expense' && '- '}
                                {t.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </TableCell>
                            <TableCell className="text-xs md:text-sm"><Badge variant="secondary">{t.categoryName}</Badge></TableCell>
                            <TableCell className="text-xs md:text-sm">{format(parseISO(t.date), 'dd/MM/yyyy')}</TableCell>
                            <TableCell className="text-right">
                                {t.bookingId ? null : (
                                    <Button size="icon" variant="ghost" onClick={() => openDialog(t)} disabled={isLoading}>
                                        <Pencil className="h-4 w-4" />
                                    </Button>
                                )}
                                <Button size="icon" variant="ghost" onClick={() => handleDeleteTransaction(t.id)} disabled={isLoading}>
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                            </TableCell>
                            </TableRow>
                        ))}
                        {transactions.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center h-24 text-sm">Nenhuma transação registrada.</TableCell>
                            </TableRow>
                        )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </TabsContent>
        <TabsContent value="categories">
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg md:text-xl">Gerenciar Categorias</CardTitle>
                    <CardDescription className="text-sm">Adicione ou remova categorias para organizar suas finanças.</CardDescription>
                </CardHeader>
                <CardContent className="grid md:grid-cols-2 gap-8">
                   {['revenue', 'expense'].map(type => (
                       <div key={type} className="space-y-4">
                           <h3 className="text-base md:text-lg font-semibold">{type === 'revenue' ? 'Categorias de Receita' : 'Categorias de Despesa'}</h3>
                           <div className="flex gap-2">
                               <Input 
                                placeholder="Nova categoria..." 
                                value={newCategoryName}
                                onChange={(e) => setNewCategoryName(e.target.value)}
                               />
                               <Button size="sm" onClick={() => handleAddCategory(type as 'revenue' | 'expense')} disabled={isCategoryLoading}>
                                 {isCategoryLoading ? <Loader2 className="animate-spin" /> : <PlusCircle />}
                               </Button>
                           </div>
                           <div className="space-y-2">
                               {categories.filter(c => c.type === type).map(cat => (
                                   <div key={cat.id} className="flex items-center justify-between bg-muted p-2 rounded-md text-sm">
                                       <span>{cat.name}</span>
                                       <Button size="icon" variant="ghost" onClick={() => handleDeleteCategory(cat.id)} disabled={isCategoryLoading}>
                                           <Trash2 className="h-4 w-4 text-destructive" />
                                       </Button>
                                   </div>
                               ))}
                               {categories.filter(c => c.type === type).length === 0 && <p className="text-sm text-muted-foreground">Nenhuma categoria de {type === 'revenue' ? 'receita' : 'despesa'} criada.</p>}
                           </div>
                       </div>
                   ))}
                </CardContent>
            </Card>
        </TabsContent>
        <TabsContent value="reports">
            <Card>
                <CardHeader className="flex flex-col gap-y-2 md:flex-row md:items-center md:justify-between">
                    <div>
                        <CardTitle className="text-lg md:text-xl">Relatório Financeiro</CardTitle>
                        <CardDescription className="text-sm">Gere um relatório para um período específico.</CardDescription>
                    </div>
                    <Button onClick={() => setIsDateSelectorOpen(true)}><Printer className="mr-2"/> Imprimir Relatório</Button>
                </CardHeader>
                <CardContent>
                     <div className="border rounded-lg p-4">
                        <h3 className="text-base md:text-lg font-semibold mb-4 text-center">Resumo de todo o período</h3>
                        <div className="grid gap-4 md:grid-cols-3 mb-6">
                            <Card>
                                <CardHeader className="pb-2"><CardTitle className="text-xs md:text-sm">Faturamento Bruto</CardTitle></CardHeader>
                                <CardContent><p className="text-base md:text-lg font-bold">{totalRevenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p></CardContent>
                            </Card>
                            <Card>
                                <CardHeader className="pb-2"><CardTitle className="text-xs md:text-sm">Gasto Bruto</CardTitle></CardHeader>
                                <CardContent><p className="text-base md:text-lg font-bold">{totalExpenses.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p></CardContent>
                            </Card>
                            <Card>
                                <CardHeader className="pb-2"><CardTitle className="text-xs md:text-sm">Faturamento Líquido</CardTitle></CardHeader>
                                <CardContent><p className="text-base md:text-lg font-bold">{netRevenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p></CardContent>
                            </Card>
                        </div>
                        <p className="text-center text-muted-foreground mt-4 text-sm">Clique em "Imprimir Relatório" para selecionar um período e gerar o PDF.</p>
                     </div>
                </CardContent>
            </Card>
        </TabsContent>
      </Tabs>
    </div>

    {/* Date Range Selector Dialog */}
    <Dialog open={isDateSelectorOpen} onOpenChange={setIsDateSelectorOpen}>
        <DialogContent className="sm:max-w-md">
            <DialogHeader>
                <DialogTitle>Selecionar Período do Relatório</DialogTitle>
                <DialogDescription>
                    Escolha as datas de início e fim para gerar seu relatório financeiro.
                </DialogDescription>
            </DialogHeader>
            <form onSubmit={reportForm.handleSubmit(handleGenerateReport)} className="space-y-4 pt-4">
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                        <Label htmlFor="startDate">Data de Início</Label>
                        <Input type="date" id="startDate" {...reportForm.register('startDate')} />
                        {reportForm.formState.errors.startDate && <p className="text-sm text-destructive mt-1">{reportForm.formState.errors.startDate.message}</p>}
                    </div>
                    <div>
                        <Label htmlFor="endDate">Data Final</Label>
                        <Input type="date" id="endDate" {...reportForm.register('endDate')} />
                        {reportForm.formState.errors.endDate && <p className="text-sm text-destructive mt-1">{reportForm.formState.errors.endDate.message}</p>}
                    </div>
                </div>

                <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsDateSelectorOpen(false)}>Cancelar</Button>
                    <Button type="submit">
                        <Printer className="mr-2"/>Imprimir
                    </Button>
                </DialogFooter>
            </form>
        </DialogContent>
    </Dialog>
    
    <div className="hidden print:block">
      {reportData && <PrintableReport {...reportData} ref={reportRef} />}
    </div>
    </>
  );
}

    