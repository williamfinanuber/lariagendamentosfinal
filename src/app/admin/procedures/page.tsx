
"use client";

import { getProcedures } from '@/lib/firebase';
import type { Procedure } from '@/lib/types';
import ProceduresClientPage from './ProceduresClientPage';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function ProceduresPage() {
  const [initialProcedures, setInitialProcedures] = useState<Procedure[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProceduresData = async () => {
      try {
        const procedures = await getProcedures();
        setInitialProcedures(procedures);
      } catch (e: any) {
        console.error("Firebase connection error:", e);
        let errorMessage = "Ocorreu um erro ao carregar os procedimentos.";
        if (e.code === 'not-found' || e.message.includes("5 NOT_FOUND")) {
            errorMessage = "Falha na conexão: O banco de dados Firestore não foi encontrado ou não está ativado no seu projeto Firebase. Por favor, crie/ative o Firestore no Console do Firebase.";
        }
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };
    fetchProceduresData();
  }, []);

  if (isLoading) {
    return <div className="flex h-64 w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  if (error) {
    return (
      <div className="container mx-auto p-4">
          <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Erro Crítico de Conexão</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
          </Alert>
      </div>
    );
  }

  if (!initialProcedures) {
    return <div>Não foi possível carregar os procedimentos.</div>;
  }

  return <ProceduresClientPage initialProcedures={initialProcedures} />;
}
