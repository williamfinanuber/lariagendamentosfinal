

"use client";

import { useState, useMemo, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import {
  Package,
  PlusCircle,
  Trash2,
  MoreHorizontal,
  Pencil,
  ArrowDown,
  ArrowUp,
  Tag,
  Loader2,
  FolderPlus,
  AlertTriangle,
  Search,
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
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
import { addProduct, deleteProduct, addStockCategory, deleteStockCategory, getProducts, getStockCategories, updateProduct, updateProductQuantity, addTransaction, getCategories, deleteAllStockCategories } from '@/lib/firebase';
import type { Product, StockCategory, Category as FinancialCategory } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const productSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2, "O nome é obrigatório."),
  quantity: z.coerce.number().min(0, "A quantidade não pode ser negativa."),
  categoryId: z.string().min(1, "A categoria é obrigatória."),
});

const movementSchema = z.object({
    quantity: z.coerce.number().positive("A quantidade deve ser maior que zero.")
});

interface StockClientPageProps {
  initialProducts: Product[];
  initialCategories: StockCategory[];
}

export default function StockClientPage({ initialProducts, initialCategories }: StockClientPageProps) {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [categories, setCategories] = useState<StockCategory[]>(initialCategories);
  const [financialCategories, setFinancialCategories] = useState<FinancialCategory[]>([]);

  const [isLoading, setIsLoading] = useState(false);
  const [isCategoryLoading, setIsCategoryLoading] = useState(false);

  const [isProductDialogOpen, setIsProductDialogOpen] = useState(false);
  const [isMovementDialogOpen, setIsMovementDialogOpen] = useState(false);

  const [isEditMode, setIsEditMode] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [movementType, setMovementType] = useState<'in' | 'out'>('in');
  const [currentProduct, setCurrentProduct] = useState<Product | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const { toast } = useToast();
  
  const sortedAndFilteredProducts = useMemo(() => {
    const filtered = searchTerm
      ? products.filter(p => 
          p.name.toLowerCase().includes(searchTerm.toLowerCase())
        )
      : products;
      
    // Sort by quantity ascending, so lowest stock is at the top
    return filtered.sort((a, b) => a.quantity - b.quantity);

  }, [products, searchTerm]);

  const productForm = useForm<z.infer<typeof productSchema>>({
    resolver: zodResolver(productSchema),
    defaultValues: {
        name: '',
        quantity: undefined,
        categoryId: ''
    }
  });
  
  const movementForm = useForm<z.infer<typeof movementSchema>>({
    resolver: zodResolver(movementSchema),
  });

  const fetchAllData = async () => {
    setIsLoading(true);
    try {
        const [prods, cats, finCats] = await Promise.all([
            getProducts(),
            getStockCategories(),
            getCategories(), // Fetch financial categories
        ]);
        setProducts(prods);
        setCategories(cats);
        setFinancialCategories(finCats);
    } catch (error) {
        console.error("Error fetching data:", error);
        toast({ title: "Erro ao atualizar dados", variant: 'destructive'});
    } finally {
        setIsLoading(false);
    }
  }

  useEffect(() => {
    // Initial fetch for financial categories as well
    fetchAllData();
  }, []);

  const openProductDialog = (product?: Product) => {
    productForm.reset();
    setIsEditMode(!!product);
    if(product) {
        productForm.setValue('id', product.id);
        productForm.setValue('name', product.name);
        productForm.setValue('quantity', product.quantity);
        productForm.setValue('categoryId', product.categoryId);
    } else {
        productForm.reset({
            name: '',
            quantity: undefined,
            categoryId: ''
        });
    }
    setIsProductDialogOpen(true);
  }

  const openMovementDialog = (product: Product, type: 'in' | 'out') => {
    movementForm.reset();
    setCurrentProduct(product);
    setMovementType(type);
    setIsMovementDialogOpen(true);
  };


  const onProductSubmit = async (data: z.infer<typeof productSchema>) => {
    setIsLoading(true);
    try {
      const selectedCategory = categories.find(c => c.id === data.categoryId);
      if (!selectedCategory) throw new Error("Categoria não encontrada");

      const productData = { 
        name: data.name,
        quantity: data.quantity || 0,
        categoryId: data.categoryId,
        categoryName: selectedCategory.name 
      };

      if (isEditMode && data.id) {
        await updateProduct(data.id, productData);
        toast({ title: 'Produto atualizado com sucesso!' });
      } else {
        await addProduct(productData);
        toast({ title: 'Produto adicionado com sucesso!' });
      }
      
      await fetchAllData();
      setIsProductDialogOpen(false);
    } catch (error) {
      console.error(error);
      toast({ title: 'Erro ao salvar produto', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const onMovementSubmit = async (data: z.infer<typeof movementSchema>) => {
    if(!currentProduct) return;

    setIsLoading(true);
    try {
        const amount = movementType === 'in' ? data.quantity : -data.quantity;
        
        if (movementType === 'out' && currentProduct.quantity < data.quantity) {
             toast({ title: "Quantidade insuficiente em estoque.", variant: "destructive" });
             setIsLoading(false);
             return;
        }

        await updateProductQuantity(currentProduct.id, amount);
        toast({ title: "Estoque atualizado!"});

        await fetchAllData();
        setIsMovementDialogOpen(false);
        setCurrentProduct(null);

    } catch (error) {
        console.error(error);
        toast({ title: 'Erro ao movimentar estoque', variant: 'destructive' });
    } finally {
        setIsLoading(false);
    }
  }

  const handleDeleteProduct = async (id: string) => {
    if (!confirm("Tem certeza que deseja deletar este produto? Esta ação não pode ser desfeita.")) return;
    
    setIsLoading(true);
    try {
      await deleteProduct(id);
      toast({ title: 'Produto deletado.', variant: 'destructive' });
      await fetchAllData();
    } catch (error) {
       console.error(error);
       toast({ title: 'Erro ao deletar produto', variant: 'destructive' });
    } finally {
        setIsLoading(false);
    }
  };
  
  const handleAddCategory = async () => {
      if (!newCategoryName.trim()) {
        toast({ title: "O nome da categoria não pode estar vazio.", variant: 'destructive' });
        return;
      }
      setIsCategoryLoading(true);
      try {
        await addStockCategory({ name: newCategoryName });
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
    if (!confirm("Tem certeza que deseja deletar esta categoria?")) return;
    
    setIsCategoryLoading(true);
    try {
        await deleteStockCategory(id);
        toast({ title: "Categoria deletada.", variant: 'destructive' });
        await fetchAllData();
    } catch (error: any) {
        toast({ 
            title: "Erro ao deletar categoria.", 
            description: error.message || "Ocorreu um erro desconhecido.",
            variant: 'destructive'
        });
    } finally {
        setIsCategoryLoading(false);
    }
  }

  const handleClearCategories = async () => {
    if (!confirm("Tem certeza que deseja apagar TODAS as categorias? Esta ação não pode ser desfeita.")) return;

    setIsCategoryLoading(true);
    try {
      await deleteAllStockCategories();
      toast({ title: "Todas as categorias foram apagadas.", variant: "destructive" });
      await fetchAllData();
    } catch (error: any) {
       toast({ 
            title: "Erro ao apagar categorias.", 
            description: error.message || "Ocorreu um erro desconhecido.",
            variant: 'destructive'
        });
    } finally {
        setIsCategoryLoading(false);
    }
  }


  const getQuantityClass = (quantity: number) => {
    if (quantity === 0) return 'text-red-600 font-bold';
    if (quantity <= 5) return 'text-amber-600 font-semibold';
    return '';
  }


  return (
    <>
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight">Controle de Estoque</h1>
            <p className="text-muted-foreground text-sm">Gerencie os produtos e materiais do seu salão.</p>
        </div>
          <Button onClick={() => openProductDialog()}><PlusCircle className="mr-2 h-4 w-4" /> Novo Produto</Button>
      </div>

       <Tabs defaultValue="products">
        <TabsList className="grid w-full grid-cols-2 text-xs md:text-sm">
            <TabsTrigger value="products">Produtos</TabsTrigger>
            <TabsTrigger value="categories">Categorias</TabsTrigger>
        </TabsList>
        <TabsContent value="products">
            <Card>
                <CardHeader>
                    <CardTitle className="text-base md:text-xl">Lista de Produtos</CardTitle>
                    <CardDescription className="text-sm">Controle as entradas e saídas e saiba quando comprar mais.</CardDescription>
                    <div className="relative pt-2">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar por nome do produto..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-8 w-full md:w-1/2 lg:w-1/3"
                        />
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                        <TableRow>
                            <TableHead>Produto</TableHead>
                            <TableHead>Qtd.</TableHead>
                            <TableHead className="hidden md:table-cell">Categoria</TableHead>
                            <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                        </TableHeader>
                        <TableBody>
                        {sortedAndFilteredProducts.map(p => (
                            <TableRow key={p.id}>
                            <TableCell className="font-medium text-xs md:text-sm">{p.name}</TableCell>
                            <TableCell className={cn("text-xs md:text-sm font-semibold", getQuantityClass(p.quantity))}>
                                {p.quantity === 0 && <AlertTriangle className="inline-block h-4 w-4 mr-1" />}
                                {p.quantity}
                            </TableCell>
                            <TableCell className="hidden md:table-cell text-xs md:text-sm"><Badge variant="secondary">{p.categoryName}</Badge></TableCell>
                            <TableCell className="text-right">
                               <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button aria-haspopup="true" size="icon" variant="ghost" disabled={isLoading}>
                                      <MoreHorizontal className="h-4 w-4" />
                                      <span className="sr-only">Menu</span>
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuLabel>Ações</DropdownMenuLabel>
                                    <DropdownMenuItem onClick={() => openMovementDialog(p, 'in')}>
                                      <ArrowUp className="mr-2 h-4 w-4 text-green-500" /> Entrada
                                    </DropdownMenuItem>
                                     <DropdownMenuItem onClick={() => openMovementDialog(p, 'out')}>
                                      <ArrowDown className="mr-2 h-4 w-4 text-red-500" /> Saída
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => openProductDialog(p)}>
                                      <Pencil className="mr-2 h-4 w-4" /> Editar
                                    </DropdownMenuItem>
                                    <DropdownMenuItem className="text-red-600 focus:text-red-600 focus:bg-red-50" onClick={() => handleDeleteProduct(p.id)}>
                                      <Trash2 className="mr-2 h-4 w-4" /> Deletar
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                            </TableCell>
                            </TableRow>
                        ))}
                        {sortedAndFilteredProducts.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center h-24 text-sm">
                                    {searchTerm ? 'Nenhum produto encontrado com este nome.' : 'Nenhum produto cadastrado.'}
                                </TableCell>
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
                    <CardTitle className="text-base md:text-xl">Categorias de Produtos</CardTitle>
                    <CardDescription className="text-sm">Adicione ou remova categorias para organizar seu estoque.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                   <div className="flex flex-col sm:flex-row gap-2 max-w-lg">
                       <Input 
                        placeholder="Nova categoria..." 
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                       />
                       <div className="flex gap-2">
                        <Button onClick={handleAddCategory} disabled={isCategoryLoading} className="w-full sm:w-auto">
                            {isCategoryLoading ? <Loader2 className="animate-spin" /> : <FolderPlus className="mr-2 h-4 w-4" />}
                            Adicionar
                        </Button>
                        {categories.length > 0 && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                {/* The TooltipTrigger needs a child, so we wrap the button */}
                                <div>
                                   <Button 
                                    variant="destructive" 
                                    onClick={handleClearCategories} 
                                    disabled={isCategoryLoading || products.length > 0}
                                    className="w-full sm:w-auto"
                                >
                                    <Trash2 className="mr-2 h-4 w-4"/>
                                    Limpar Tudo
                                  </Button>
                                </div>
                              </TooltipTrigger>
                              {products.length > 0 && (
                                <TooltipContent>
                                  <p>Exclua todos os produtos antes de limpar as categorias.</p>
                                </TooltipContent>
                              )}
                            </Tooltip>
                          </TooltipProvider>
                        )}
                       </div>
                   </div>
                   <div className="space-y-2">
                       {categories.map(cat => (
                           <div key={cat.id} className="flex items-center justify-between bg-muted p-2 rounded-md text-sm max-w-sm">
                               <span>{cat.name}</span>
                               <Button size="icon" variant="ghost" onClick={() => handleDeleteCategory(cat.id)} disabled={isCategoryLoading}>
                                   <Trash2 className="h-4 w-4 text-destructive" />
                               </Button>
                           </div>
                       ))}
                       {categories.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma categoria criada.</p>}
                   </div>
                </CardContent>
            </Card>
        </TabsContent>
      </Tabs>
    </div>

    {/* Product Dialog */}
    <Dialog open={isProductDialogOpen} onOpenChange={setIsProductDialogOpen}>
        <DialogContent>
        <DialogHeader>
            <DialogTitle>{isEditMode ? 'Editar Produto' : 'Novo Produto'}</DialogTitle>
        </DialogHeader>
        <Form {...productForm}>
            <form onSubmit={productForm.handleSubmit(onProductSubmit)} className="space-y-4">
                <FormField
                    control={productForm.control}
                    name="name"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Nome do Produto</FormLabel>
                        <FormControl>
                            <Input id="name" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}/>
                
                <FormField
                    control={productForm.control}
                    name="quantity"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Quantidade Inicial</FormLabel>
                        <FormControl>
                            <Input id="quantity" type="number" {...field} value={field.value ?? ''} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}/>
                
                <FormField
                    control={productForm.control}
                    name="categoryId"
                    render={({ field }) => (
                    <FormItem>
                    <FormLabel>Categoria</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="Selecione uma categoria" />
                            </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                        {categories.map(cat => (
                            <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                        ))}
                        </SelectContent>
                    </Select>
                    <FormMessage />
                </FormItem>
                )}/>
                <DialogFooter>
                <DialogClose asChild><Button type="button" variant="secondary" disabled={isLoading}>Cancelar</Button></DialogClose>
                <Button type="submit" disabled={isLoading}>
                    {isLoading && <Loader2 className="animate-spin mr-2" />}
                    {isEditMode ? 'Salvar Alterações' : 'Adicionar Produto'}
                </Button>
                </DialogFooter>
            </form>
        </Form>
        </DialogContent>
    </Dialog>

    {/* Movement Dialog */}
     <Dialog open={isMovementDialogOpen} onOpenChange={setIsMovementDialogOpen}>
        <DialogContent>
        <DialogHeader>
            <DialogTitle>
                {movementType === 'in' ? 'Registrar Entrada' : 'Registrar Saída'}
            </DialogTitle>
            <DialogDescription>
                Produto: <strong>{currentProduct?.name}</strong> (Estoque Atual: {currentProduct?.quantity})
            </DialogDescription>
        </DialogHeader>
        <Form {...movementForm}>
            <form onSubmit={movementForm.handleSubmit(onMovementSubmit)} className="space-y-4">
                <FormField
                    control={movementForm.control}
                    name="quantity"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Quantidade</FormLabel>
                        <FormControl>
                            <Input id="quantity" type="number" {...field} value={field.value ?? ''}/>
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}/>
                <DialogFooter>
                <DialogClose asChild><Button type="button" variant="secondary" disabled={isLoading}>Cancelar</Button></DialogClose>
                <Button type="submit" disabled={isLoading}>
                    {isLoading && <Loader2 className="animate-spin mr-2" />}
                    Confirmar
                </Button>
                </DialogFooter>
            </form>
        </Form>
        </DialogContent>
    </Dialog>
    </>
  );
}
