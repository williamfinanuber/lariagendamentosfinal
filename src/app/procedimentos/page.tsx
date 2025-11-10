
"use client";

import ProceduresList from '@/components/ProceduresList';
import { getProcedures } from '@/lib/firebase';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { useEffect, useState } from 'react';
import type { Procedure } from '@/lib/types';

function ProceduresListSkeleton() {
  return (
    <Card>
        <CardHeader>
             <Skeleton className="h-8 w-1/2" />
             <Skeleton className="h-4 w-3/4" />
        </CardHeader>
        <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 3 }).map((_, index) => (
                <Card key={index} className="flex flex-col">
                    <CardHeader className="p-0">
                        <Skeleton className="rounded-t-lg aspect-video" />
                    </CardHeader>
                    <CardContent className="p-4 flex-1">
                        <Skeleton className="h-5 w-3/4 mb-2" />
                        <Skeleton className="h-4 w-full" />
                    </CardContent>
                    <CardFooter className="p-4 flex justify-between items-center mt-auto">
                        <Skeleton className="h-8 w-1/3" />
                        <Skeleton className="h-10 w-24" />
                    </CardFooter>
                </Card>
            ))}
            </div>
        </CardContent>
    </Card>
  )
}

export default function ProcedimentosPage() {
  const [procedures, setProcedures] = useState<Procedure[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchProcedures = async () => {
      try {
        const procs = await getProcedures();
        const customOrder = [
          'Volume Brasileiro',
          'Volume Express',
          'Volume Glamour',
          'Volume Luxo',
          'Manutenção Volume Brasileiro',
          'Manutenção Volume Glamour',
          'Manutenção Volume Luxo',
          'Remoção',
          'Design de Sobrancelha Simples',
          'Design de Sobrancelha com Henna'
        ];

        const sortedProcedures = procs.sort((a, b) => {
          const indexA = customOrder.indexOf(a.name);
          const indexB = customOrder.indexOf(b.name);

          if (indexA === -1 && indexB === -1) return a.name.localeCompare(b.name);
          if (indexA === -1) return 1;
          if (indexB === -1) return -1;
          
          return indexA - indexB;
        });
        setProcedures(sortedProcedures);
      } catch (error) {
        console.error("Failed to fetch procedures", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProcedures();
  }, []);

  if (isLoading || !procedures) {
    return (
      <div className="container mx-auto px-4 py-8">
        <ProceduresListSkeleton />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <ProceduresList procedures={procedures} />
    </div>
  );
}
