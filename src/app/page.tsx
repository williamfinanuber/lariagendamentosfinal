import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

function Hero() {
    return (
        <div className="w-full max-w-md mx-auto">
            <Image
                src="/lari lash303.png"
                alt="Logo do Studio Lari Lash"
                width={600}
                height={200}
                className="h-auto object-contain"
                priority
            />
        </div>
    )
}

export default function Home() {
  return (
    <div className="h-full flex flex-col justify-center">
        <div className="container mx-auto px-4 flex flex-col items-center text-center">
            <Hero />
            <div className="relative z-10 -mt-8 flex flex-col gap-4 sm:flex-row">
                 <Button asChild size="lg" className="px-8 py-6 text-lg text-white shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-xl">
                    <Link href="/procedimentos">
                        Agendar Procedimentos
                    </Link>
                </Button>
                 <Button asChild size="lg" variant="outline" className="border-2 border-primary/50 bg-white/80 px-8 py-6 text-lg text-primary shadow-lg backdrop-blur-sm transition-all duration-300 hover:scale-105 hover:border-primary hover:bg-white hover:shadow-xl">
                    <Link href="/meus-agendamentos">
                        Meus Agendamentos
                    </Link>
                </Button>
            </div>
        </div>
    </div>
  );
}
