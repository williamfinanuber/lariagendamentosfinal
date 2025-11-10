
"use client";

import { Suspense } from "react";
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, Calendar, Clock, MessageSquare, Timer } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

function ConfirmationContent() {
  const searchParams = useSearchParams();
  const procedure = searchParams.get('procedure');
  const dateStr = searchParams.get('date');
  const time = searchParams.get('time');
  const name = searchParams.get('name');
  const price = parseFloat(searchParams.get('price') || '0');
  const duration = searchParams.get('duration');

  const formattedDate = dateStr ? format(parseISO(dateStr), 'EEEE, dd \'de\' MMMM \'de\' yyyy', { locale: ptBR }) : 'Data não informada';
  const formattedApiDate = dateStr ? format(parseISO(dateStr), 'dd/MM/yyyy') : 'Data não informada';
  const signalValue = price * 0.30;
  
  const whatsappMessage = encodeURIComponent(
    `Olá! Meu nome é ${name}. Gostaria de confirmar meu agendamento:\n\n` +
    `*Procedimento:* ${procedure}\n` +
    `*Data:* ${formattedApiDate}\n` +
    `*Hora:* ${time}\n` +
    `*Valor Total:* ${price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}\n` +
    `*Sinal (30%):* ${signalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}\n\n` +
    `Gostaria de pagar o valor do sinal para finalizar meu agendamento.`
  );

  const whatsappUrl = `https://wa.me/5563984259190?text=${whatsappMessage}`;

  return (
    <div className="flex justify-center items-center py-8 sm:py-12 md:py-24 px-4">
      <Card className="w-full max-w-lg text-center shadow-2xl">
        <CardHeader className="items-center px-4 pt-6 md:px-6 md:pt-8">
          <CheckCircle className="w-12 h-12 md:w-16 md:h-16 text-green-500 mb-4" />
          <CardTitle className="text-2xl md:text-3xl font-bold text-primary">Agendamento Solicitado!</CardTitle>
          <CardDescription className="text-base md:text-lg">Obrigada por agendar com o Studio Larissa Santos.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 px-4 pb-6 md:px-6 md:pb-8">
          <p className="text-sm md:text-base">Seu pedido foi recebido! Para garantir seu horário, por favor, finalize a confirmação e o pagamento do sinal pelo WhatsApp.</p>
          <Card className="text-left bg-secondary">
            <CardHeader className="p-4">
              <CardTitle className="text-lg md:text-xl">Resumo do Agendamento</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 p-4 pt-0 text-sm md:text-base">
              <p className="flex items-center gap-2"><strong>Procedimento:</strong> {procedure}</p>
              <p className="flex items-center gap-2"><Calendar className="text-accent w-5 h-5" /> <strong>Data:</strong> {formattedDate}</p>
              <p className="flex items-center gap-2"><Clock className="text-accent w-5 h-5" /> <strong>Hora:</strong> {time}</p>
              {duration && <p className="flex items-center gap-2"><Timer className="text-accent w-5 h-5" /> <strong>Duração:</strong> {duration} min</p>}
            </CardContent>
          </Card>
          <div className="space-y-2">
            <Button asChild size="lg" className="w-full bg-green-500 hover:bg-green-600 text-white">
              <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                <MessageSquare className="mr-2" /> Finalizar no WhatsApp
              </a>
            </Button>
            <Button asChild size="sm" className="w-full" variant="outline">
              <Link href="/">Voltar à Página Inicial</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


export default function ConfirmationPage() {
    return (
        <Suspense fallback={<div>Carregando...</div>}>
            <ConfirmationContent />
        </Suspense>
    )
}
