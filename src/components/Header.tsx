
import Link from 'next/link';
import { UserCog, MapPin, MoreVertical } from 'lucide-react';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export default function Header() {
  return (
    <header className="bg-white border-b border-black">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <Link href="/" className="flex items-center gap-2 text-primary hover:opacity-80 transition-opacity">
          <span className="text-xl font-bold tracking-tight font-headline">Larissa Santos</span>
        </Link>
        <nav className="flex items-center gap-2">
           <Button asChild variant="ghost">
            <a href="https://maps.app.goo.gl/vSHErAosMmVnGMnx9" target="_blank" rel="noopener noreferrer">
              <MapPin className="mr-2 h-4 w-4" />
              Localização
            </a>
          </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="h-5 w-5" />
                  <span className="sr-only">Abrir menu</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link href="/admin">
                    <UserCog className="mr-2 h-4 w-4" />
                    <span>Painel do Administrador</span>
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
        </nav>
      </div>
    </header>
  );
}
