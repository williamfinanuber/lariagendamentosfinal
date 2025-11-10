
"use client";

import { Instagram, Facebook, MessageCircle } from "lucide-react"
import Link from "next/link"

export default function Footer() {

    return (
        <footer className="bg-white py-4 border-t border-black">
            <div className="container mx-auto px-4 flex justify-center items-center">
                <div className="flex space-x-4">
                    <Link href="https://www.instagram.com/larissasantosstudiodb?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw==" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
                        <Instagram className="h-5 w-5 text-muted-foreground hover:text-primary transition-colors" />
                    </Link>
                    <Link href="https://www.facebook.com/" target="_blank" rel="noopener noreferrer" aria-label="Facebook">
                        <Facebook className="h-5 w-5 text-muted-foreground hover:text-primary transition-colors" />
                    </Link>
                    <Link href="https://api.whatsapp.com/send/?phone=63984001146&text&type=phone_number&app_absent=0" target="_blank" rel="noopener noreferrer" aria-label="WhatsApp">
                        <MessageCircle className="h-5 w-5 text-muted-foreground hover:text-primary transition-colors" />
                    </Link>
                </div>
            </div>
        </footer>
    )
}
