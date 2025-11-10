

export interface Procedure {
  id: string;
  name: string;
  description: string;
  price: number;
  duration: number; // in minutes
  imageUrl: string;
}

export type Availability = Record<string, string[]>; // e.g. { "2024-05-20": ["09:00", "10:00"] }

export interface AvailabilitySettings {
  weekdays: number[]; // 0 for Sunday, 1 for Monday, etc.
  startTime: string; // "HH:MM"
  endTime: string; // "HH:MM"
  slotInterval: number; // in minutes
  sundayScheduling: boolean;
}

export interface Booking {
    id: string;
    procedureId: string;
    procedureName: string;
    date: string; // YYYY-MM-DD
    time: string;
    clientName: string;
    clientContact: string;
    clientBirthDate: string;
    price: number;
    status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
    createdAt: string; // Changed to string to be serializable
    reminderSent?: boolean;
    maintenanceReminderSent?: boolean;
    duration: number;
}

export interface Category {
  id: string;
  name: string;
  type: 'revenue' | 'expense';
}

export interface Transaction {
  id: string;
  type: 'revenue' | 'expense';
  description: string;
  amount: number;
  date: string; // YYYY-MM-DD
  categoryId: string;
  categoryName: string;
  bookingId?: string; // To link back to a booking if it's from a service
  stockMovementId?: string; // To link to a product or stock entry
  createdAt: string; // ISO String
}

export interface StockCategory {
    id: string;
    name: string;
}

export interface Product {
    id: string;
    name: string;
    quantity: number;
    categoryId: string;
    categoryName: string;
    createdAt: string; // ISO String
}

export interface VerificationToken {
    id?: string;
    contact: string;
    token: string;
    expiresAt: any; // Firestore Timestamp
}
