
"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Lock } from 'lucide-react';

interface LoginPageProps {
    onAuthSuccess: () => void;
}

export default function LoginPage({ onAuthSuccess }: LoginPageProps) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  
  const correctPassword = '123456';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    if (password === correctPassword) {
      try {
        sessionStorage.setItem('isAdminAuthenticated', 'true');
        toast({ title: 'Acesso liberado!', description: 'Bem-vindo(a) ao painel.' });
        onAuthSuccess();
        router.push('/admin');
      } catch (error) {
         setError('Seu navegador não suporta o armazenamento de sessão. Tente usar um navegador diferente.');
      }
    } else {
      setError('Senha incorreta. Tente novamente.');
      toast({ title: 'Acesso negado', description: 'A senha inserida está incorreta.', variant: 'destructive' });
    }
    setIsLoading(false);
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
            <div className="mx-auto bg-primary rounded-full p-3 w-fit mb-4">
                <Lock className="h-6 w-6 text-primary-foreground"/>
            </div>
          <CardTitle>Acesso Restrito</CardTitle>
          <CardDescription>
            Por favor, insira a senha para acessar o painel de administrador.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="password">Senha</Label>
                    <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    />
                </div>
                {error && <p className="text-sm text-center font-medium text-destructive">{error}</p>}
            </CardContent>
            <CardFooter>
                <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? 'Verificando...' : 'Entrar'}
                </Button>
            </CardFooter>
        </form>
      </Card>
    </div>
  );
}
