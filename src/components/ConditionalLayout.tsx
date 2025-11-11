
"use client";

import { usePathname } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { cn } from '@/lib/utils';

export default function ConditionalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isAdminPage = pathname.startsWith('/admin');
  const isHomePage = pathname === '/';

  if (isAdminPage) {
    return (
       <main className="flex-1">
        {children}
      </main>
    )
  }
  
  return (
    <div className={cn("flex flex-col h-full", isHomePage ? "bg-[#FFBBFF]" : "bg-white")}>
      <Header />
      <main className="flex-1 flex flex-col">
        {children}
      </main>
      <Footer />
    </div>
  );
}
