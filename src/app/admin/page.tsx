
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, CalendarCheck, Users, TrendingDown, TrendingUp, Landmark, CalendarClock } from "lucide-react";
import { getBookings, getTransactions } from "@/lib/firebase";
import type { Booking, Transaction } from "@/lib/types";
import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { format, parseISO } from 'date-fns';
import BirthdayReminderDialog from "./BirthdayReminderDialog";


function DashboardSkeleton() {
  return (
    <div className="grid gap-4 grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <Skeleton className="h-4 w-2/3" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-7 w-1/3 mb-2" />
            <Skeleton className="h-3 w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

interface Client {
  name: string;
  contact: string;
  birthDate?: string;
}

function getUniqueClients(bookings: Booking[]): Client[] {
  const clientsMap = new Map<string, Client>();
  bookings.forEach(booking => {
    const key = booking.clientContact || booking.clientName;
    if (!key) return; 

    if (!clientsMap.has(key) || (booking.clientBirthDate && !clientsMap.get(key)?.birthDate)) {
      clientsMap.set(key, {
        name: booking.clientName,
        contact: booking.clientContact,
        birthDate: booking.clientBirthDate,
      });
    }
  });
  return Array.from(clientsMap.values());
}


export default function AdminDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [birthdayClients, setBirthdayClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardStats = async () => {
      try {
        const [bookings, transactions] = await Promise.all([
          getBookings(),
          getTransactions()
        ]);
        
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        const todayString = format(now, 'yyyy-MM-dd');
        const todayMonth = now.getMonth();
        const todayDate = now.getDate();

        // Stats Calculation
        let monthBookingsCount = 0;
        let todayBookingsCount = 0;
        const clientsThisMonth = new Set();
        const attendedClientsThisMonth = new Set();

        bookings.forEach((booking: Booking) => {
            const bookingDate = parseISO(booking.date);
            const bookingMonth = bookingDate.getMonth();
            const bookingYear = bookingDate.getFullYear();
            
            const isCurrentMonth = bookingYear === currentYear && bookingMonth === currentMonth;

            if (isCurrentMonth) {
              if (booking.status === 'confirmed' || booking.status === 'completed') {
                  monthBookingsCount++;
                  clientsThisMonth.add(booking.clientName);
              }
              if (booking.status === 'completed') {
                  attendedClientsThisMonth.add(booking.clientName);
              }
            }

            if (booking.date === todayString && (booking.status === 'confirmed' || booking.status === 'completed')) {
                todayBookingsCount++;
            }
        });

        const totalRevenue = transactions
            .filter((t: Transaction) => t.type === 'revenue')
            .reduce((sum, t) => sum + t.amount, 0);

        const totalExpenses = transactions
            .filter((t: Transaction) => t.type === 'expense')
            .reduce((sum, t) => sum + t.amount, 0);

        const netRevenue = totalRevenue - totalExpenses;

        setStats({
            totalRevenue,
            totalExpenses,
            netRevenue,
            monthBookingsCount,
            todayBookingsCount,
            newClientsCount: clientsThisMonth.size,
            attendedClientsCount: attendedClientsThisMonth.size,
        });

        // Birthday Logic
        const allClients = getUniqueClients(bookings);
        const todayBirthdayClients = allClients.filter(client => {
          if (!client.birthDate) return false;
          try {
              const birthDate = parseISO(client.birthDate);
              return birthDate.getMonth() === todayMonth && birthDate.getDate() === todayDate;
          } catch (e) {
              return false; // Invalid date format
          }
        });
        setBirthdayClients(todayBirthdayClients);

      } catch (error) {
        console.error("Error fetching dashboard stats", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardStats();
  }, []);

  if (isLoading) {
    return (
        <div className="space-y-6">
           <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Dashboard</h1>
            <DashboardSkeleton />
        </div>
      );
  }

  return (
    <div className="space-y-6">
       <BirthdayReminderDialog clients={birthdayClients} />
       <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Dashboard</h1>
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-3">
         <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Faturamento Bruto</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-xl md:text-2xl font-bold">{stats.totalRevenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>
            <p className="text-xs text-muted-foreground">
              Total de receitas e serviços concluídos.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gasto Bruto</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-xl md:text-2xl font-bold">{stats.totalExpenses.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>
            <p className="text-xs text-muted-foreground">
              Total de despesas registradas.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Faturamento Líquido</CardTitle>
            <Landmark className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl md:text-2xl font-bold">{stats.netRevenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>
            <p className="text-xs text-muted-foreground">
              Faturamento bruto menos os gastos.
            </p>
          </CardContent>
        </Card>
         <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Atendimentos de Hoje</CardTitle>
            <CalendarClock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl md:text-2xl font-bold">{stats.todayBookingsCount}</div>
            <p className="text-xs text-muted-foreground">
              Agendamentos confirmados para hoje.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Agendamentos (Mês)</CardTitle>
            <CalendarCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl md:text-2xl font-bold">{stats.monthBookingsCount}</div>
            <p className="text-xs text-muted-foreground">
              Agendamentos confirmados/concluídos no mês.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clientes Atendidos (Mês)</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl md:text-2xl font-bold">{stats.attendedClientsCount}</div>
            <p className="text-xs text-muted-foreground">
              Clientes únicos com atendimentos finalizados este mês.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
