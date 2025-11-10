
import { MapPin } from "lucide-react";

export default function AddressSection() {
    return (
        <section className="py-2 border-t" style={{ backgroundColor: '#FADBE9' }}>
            <div className="container mx-auto px-4">
                <div className="text-center text-muted-foreground text-sm flex items-center justify-center gap-2">
                    <MapPin size={14} />
                    <span>409 Norte Alameda 10 Lote 36</span>
                </div>
            </div>
        </section>
    )
}
