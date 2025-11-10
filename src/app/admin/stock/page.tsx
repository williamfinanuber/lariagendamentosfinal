
"use client";

import { getProducts, getStockCategories } from '@/lib/firebase';
import StockClientPage from './StockClientPage';
import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import type { Product, StockCategory } from '@/lib/types';

export default function StockPage() {
  const [stockData, setStockData] = useState<{
    products: Product[];
    categories: StockCategory[];
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStockData = async () => {
      try {
        const [initialProducts, initialCategories] = await Promise.all([
          getProducts(),
          getStockCategories(),
        ]);
        setStockData({ products: initialProducts, categories: initialCategories });
      } catch (error) {
        console.error("Error fetching stock data", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchStockData();
  }, []);

  if (isLoading) {
    return <div className="flex h-64 w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  if (!stockData) {
    return <div>Não foi possível carregar os dados de estoque.</div>;
  }

  return (
    <StockClientPage 
      initialProducts={stockData.products} 
      initialCategories={stockData.categories}
    />
  );
}
