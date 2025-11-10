
"use client";

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { Procedure } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, ArrowLeft } from 'lucide-react';

interface ProceduresListProps {
  procedures: Procedure[];
}

export default function ProceduresList({ procedures }: ProceduresListProps) {
  const router = useRouter();

  function handleProcedureSelect(procedure: Procedure) {
    router.push(`/agendar?procedureId=${procedure.id}`);
  }

  return (
    <Card>
      <div className="p-6 pb-0">
         <Button asChild variant="outline">
              <Link href="/">
                  <ArrowLeft className="mr-2" />
                  Voltar
              </Link>
          </Button>
      </div>
      <CardHeader>
        <CardTitle>Escolha o Procedimento</CardTitle>
        <CardDescription>Selecione um dos nossos serviços para iniciar o agendamento.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {procedures.map((procedure) => (
            <Card 
              key={procedure.id}
              onClick={() => handleProcedureSelect(procedure)}
              className="cursor-pointer transition-all duration-300 hover:shadow-lg hover:-translate-y-1 flex flex-col"
            >
              <CardHeader className="p-0">
                <Image
                  data-ai-hint="nail art"
                  src={procedure.imageUrl || 'https://picsum.photos/600/400'}
                  alt={procedure.name}
                  width={600}
                  height={400}
                  className="rounded-t-lg aspect-video object-cover"
                />
              </CardHeader>
              <CardContent className="p-4 pb-2 flex-1">
                <h3 className="font-semibold text-lg">{procedure.name}</h3>
                <p className="text-sm text-muted-foreground line-clamp-2">{procedure.description}</p>
                 <div className="flex items-center text-sm text-muted-foreground pt-2">
                    <Clock className="w-4 h-4 mr-1.5" />
                    <span>Duração: {procedure.duration} min</span>
                </div>
              </CardContent>
              <CardFooter className="p-4 pt-2 flex justify-between items-center mt-auto">
                <p className="text-primary font-bold text-lg">
                  {procedure.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </p>
                <Button>Agendar</Button>
              </CardFooter>
            </Card>
          ))}
        </div>
        {procedures.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
                <p>Nenhum procedimento cadastrado.</p>
                <p className="text-sm">Adicione novos procedimentos no seu painel de administrador.</p>
            </div>
        )}
      </CardContent>
    </Card>
  );
}
