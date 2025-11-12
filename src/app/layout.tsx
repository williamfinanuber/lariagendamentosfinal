
import './globals.css';
import './print.css'; // Import print styles
import { cn } from '@/lib/utils';
import { Toaster } from "@/components/ui/toaster";
import ConditionalLayout from '@/components/ConditionalLayout';

export const metadata = {
  title: 'Lari Lash',
  description: 'Agende seu horário para procedimentos de cílios no studio Lari Lash.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {

  return (
    <html lang="pt-BR" className="h-full">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body
        className={cn(
          'h-full bg-background font-body antialiased flex flex-col'
        )}
      >
        <ConditionalLayout>
          {children}
        </ConditionalLayout>
        <Toaster />
      </body>
    </html>
  );
}

    