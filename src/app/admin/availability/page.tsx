
"use client";

import { useState, useEffect } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Sun, Moon, Calendar, Loader2 } from "lucide-react";
import { getAvailabilitySettings, updateAvailabilitySettings } from "@/lib/firebase";
import type { AvailabilitySettings } from "@/lib/types";

export default function AvailabilityPage() {
  const [settings, setSettings] = useState<AvailabilitySettings>({
    weekdays: [1, 2, 3, 4, 5, 6],
    startTime: '08:00',
    endTime: '20:30',
    slotInterval: 30,
    sundayScheduling: false,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    async function fetchSettings() {
      setIsLoading(true);
      try {
        const data = await getAvailabilitySettings();
        setSettings(data);
      } catch (error) {
        console.error("Error fetching availability settings:", error);
        toast({ title: "Erro ao carregar configurações", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    }
    fetchSettings();
  }, [toast]);

  const handleSundayToggle = async (isToggled: boolean) => {
    setIsSaving(true);
    try {
        const newSettings = { ...settings, sundayScheduling: isToggled };
        await updateAvailabilitySettings(newSettings);
        setSettings(newSettings);
        toast({
            title: isToggled ? "Agenda de domingo ativada!" : "Agenda de domingo desativada.",
            description: isToggled ? "Agora você pode receber agendamentos aos domingos." : "Os domingos não estarão mais disponíveis para agendamento."
        });
    } catch (error) {
        console.error("Error updating Sunday scheduling:", error);
        toast({ title: "Erro ao salvar alteração", variant: "destructive" });
    } finally {
        setIsSaving(false);
    }
  };
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl md:text-2xl">
            <Calendar /> Configurações de Disponibilidade
          </CardTitle>
          <CardDescription className="text-sm md:text-base">
            Defina as regras gerais para a sua agenda. O sistema gerará os horários disponíveis automaticamente.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
            <div className="flex items-center space-x-4 rounded-md border p-4">
                <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium leading-none">Agenda aos Domingos</p>
                    <p className="text-sm text-muted-foreground">
                       {settings.sundayScheduling ? "Sua agenda está aberta para agendamentos aos domingos." : "Sua agenda está fechada aos domingos."}
                    </p>
                </div>
                <Switch
                    checked={settings.sundayScheduling}
                    onCheckedChange={handleSundayToggle}
                    disabled={isSaving}
                    aria-readonly
                />
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
