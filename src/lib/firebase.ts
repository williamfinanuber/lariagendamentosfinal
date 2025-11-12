

// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { 
    getFirestore, 
    collection, 
    getDocs, 
    doc, 
    addDoc, 
    updateDoc, 
    deleteDoc,
    writeBatch,
    query,
    orderBy,
    Timestamp,
    runTransaction,
    DocumentData,
    QueryDocumentSnapshot,
    QuerySnapshot,
    getDoc,
    Firestore,
    increment,
    where,
    limit,
    DocumentReference,
    setDoc
} from "firebase/firestore";
import { getAuth } from "firebase/auth";
import type { Availability, Procedure, Booking, Category, Transaction, Product, StockCategory, AvailabilitySettings, VerificationToken } from './types';


// Your web app's Firebase configuration is now loaded from environment variables
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};


// Initialize Firebase
let app: FirebaseApp;
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

const db = getFirestore(app);
const auth = getAuth(app);

const defaultProcedures: Omit<Procedure, 'id'>[] = [
  { name: 'Volume Brasileiro', description: 'Técnica que mescla fios finos para um volume natural e marcante.', price: 100, duration: 120, imageUrl: '' },
  { name: 'Volume Express', description: 'Volume rápido para um look mais cheio em menos tempo.', price: 80, duration: 90, imageUrl: '' },
  { name: 'Volume Glamour', description: 'Cílios densos e definidos para um olhar glamouroso.', price: 120, duration: 150, imageUrl: '' },
  { name: 'Volume Luxo', description: 'Máximo de volume e definição para um efeito de luxo.', price: 150, duration: 180, imageUrl: '' },
  { name: 'Manutenção Volume Brasileiro', description: 'Manutenção da extensão de volume brasileiro.', price: 70, duration: 90, imageUrl: '' },
  { name: 'Manutenção Volume Glamour', description: 'Manutenção da extensão de volume glamour.', price: 80, duration: 100, imageUrl: '' },
  { name: 'Manutenção Volume Luxo', description: 'Manutenção da extensão de volume de luxo.', price: 100, duration: 120, imageUrl: '' },
  { name: 'Remoção', description: 'Remoção segura das extensões de cílios.', price: 30, duration: 30, imageUrl: '' },
  { name: 'Design de Sobrancelha Simples', description: 'Modelagem e alinhamento das sobrancelhas.', price: 25, duration: 30, imageUrl: '' },
  { name: 'Design de Sobrancelha com Henna', description: 'Design com aplicação de henna para preenchimento e cor.', price: 35, duration: 45, imageUrl: '' },
];

// Procedures
export const getProcedures = async (): Promise<Procedure[]> => {
    const proceduresCollection = collection(db, "procedures");
    const snapshot: QuerySnapshot<DocumentData> = await getDocs(query(proceduresCollection, orderBy("name")));
    return snapshot.docs.map((doc: QueryDocumentSnapshot<DocumentData>) => {
        const data = doc.data();
        return {
            id: doc.id,
            name: data.name || '',
            description: data.description || '',
            price: data.price || 0,
            duration: data.duration || 0,
            imageUrl: data.imageUrl || '',
        }
    }) as Procedure[];
};

export const restoreDefaultProcedures = async () => {
    const proceduresCollection = collection(db, "procedures");
    const snapshot = await getDocs(proceduresCollection);

    // Check if procedures already exist to avoid duplication
    const existingNames = new Set(snapshot.docs.map(doc => doc.data().name));
    const proceduresToAdd = defaultProcedures.filter(p => !existingNames.has(p.name));
    
    if (proceduresToAdd.length === 0) {
        throw new Error("Os procedimentos padrão já existem. Nenhuma ação foi realizada.");
    }

    const batch = writeBatch(db);
    proceduresToAdd.forEach(proc => {
        const docRef = doc(proceduresCollection);
        batch.set(docRef, proc);
    });
    await batch.commit();
};


export const addProcedure = (data: Omit<Procedure, 'id'>) => {
    const proceduresCollection = collection(db, "procedures");
    return addDoc(proceduresCollection, {
        name: data.name || 'Sem nome',
        description: data.description || '',
        price: data.price || 0,
        duration: data.duration || 0,
        imageUrl: data.imageUrl || '',
    });
};

export const updateProcedure = (id: string, data: Partial<Omit<Procedure, 'id'>>) => {
    const procedureDoc = doc(db, "procedures", id);
    return updateDoc(procedureDoc, data);
};

export const deleteProcedure = async (id: string) => {
    const procedureDoc = doc(db, "procedures", id);
    return deleteDoc(procedureDoc);
};


// --- NEW AVAILABILITY LOGIC ---

const defaultSettings: AvailabilitySettings = {
  weekdays: [1, 2, 3, 4, 5, 6], // Mon-Sat
  startTime: '08:00',
  endTime: '20:30',
  slotInterval: 30,
  sundayScheduling: false,
};

export const getAvailabilitySettings = async (): Promise<AvailabilitySettings> => {
    const settingsDocRef = doc(db, "settings", "availability");
    const docSnap = await getDoc(settingsDocRef);

    if (docSnap.exists()) {
        const data = docSnap.data();
        // Merge with defaults to ensure all properties are present
        return { ...defaultSettings, ...data };
    } else {
        // If settings don't exist, create them with defaults
        await setDoc(settingsDocRef, defaultSettings);
        return defaultSettings;
    }
};

export const updateAvailabilitySettings = (settings: AvailabilitySettings) => {
    const settingsDocRef = doc(db, "settings", "availability");
    return setDoc(settingsDocRef, settings, { merge: true });
};

function generateTimeSlots(startStr: string, endStr: string, interval: number): string[] {
    const slots = [];
    let current = new Date(`1970-01-01T${startStr}:00`);
    const end = new Date(`1970-01-01T${endStr}:00`);

    while (current <= end) { // Use <= to include the end time if it's a valid slot
        slots.push(current.toTimeString().substring(0, 5));
        current.setMinutes(current.getMinutes() + interval);
    }
    return slots;
}

export const getAvailability = async (): Promise<Availability> => {
    const settings = await getAvailabilitySettings();
    const confirmedBookings = (await getBookings()).filter(b => b.status === 'confirmed' || b.status === 'completed');
    const procedures = await getProcedures();
    
    const availability: Availability = {};
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const activeWeekdays = settings.sundayScheduling 
        ? [...settings.weekdays, 0] // Add Sunday if toggled
        : settings.weekdays.filter(d => d !== 0); // Make sure Sunday is not there if not toggled

    // Generate availability for the next 60 days
    for (let i = 0; i < 60; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() + i);
        const dayOfWeek = date.getDay();

        if (activeWeekdays.includes(dayOfWeek)) {
            const dateKey = date.toISOString().split('T')[0]; // YYYY-MM-DD
            let timeSlots = generateTimeSlots(settings.startTime, settings.endTime, settings.slotInterval);

            // Filter out booked slots
            const bookingsForDate = confirmedBookings.filter(b => b.date === dateKey);

            bookingsForDate.forEach(booking => {
                const procedure = procedures.find(p => p.id === booking.procedureId);
                if (!procedure) return;

                const startTime = booking.time;
                const duration = procedure.duration;
                const slotsToBlock = Math.ceil(duration / settings.slotInterval);
                
                const startIndex = timeSlots.indexOf(startTime);
                if (startIndex > -1) {
                    for (let j = 0; j < slotsToBlock; j++) {
                        const slotIndex = startIndex + j;
                        if (slotIndex < timeSlots.length) {
                             timeSlots[slotIndex] = ''; // Mark for removal
                        }
                    }
                }
            });

            availability[dateKey] = timeSlots.filter(Boolean); // Remove empty strings
        }
    }
    
    return availability;
};

// --- END NEW AVAILABILITY LOGIC ---


export const createBooking = async (bookingData: {
    procedureId: string,
    procedureName: string,
    date: string, // YYYY-MM-DD
    time: string,
    clientName: string,
    clientContact: string,
    clientBirthDate: string,
    price: number,
    duration: number, // procedure duration
}) => {
     // Fetch procedures outside the transaction
    const procedures = await getProcedures();

     await runTransaction(db, async (transaction) => {
        const bookingsCol = collection(db, "bookings");
        // Check for overlapping bookings
        const q = query(bookingsCol, where("date", "==", bookingData.date), where("status", "in", ["confirmed", "completed"]));
        const dayBookingsSnap = await getDocs(q);
        
        const newBookingStart = new Date(`1970-01-01T${bookingData.time}:00`);
        const newBookingEnd = new Date(newBookingStart.getTime() + bookingData.duration * 60000);

        for (const doc of dayBookingsSnap.docs) {
            const existingBooking = doc.data();
            const procedure = procedures.find(p => p.id === existingBooking.procedureId);
            if (!procedure) continue;

            const existingStart = new Date(`1970-01-01T${existingBooking.time}:00`);
            const existingEnd = new Date(existingStart.getTime() + procedure.duration * 60000);
            
            // Check for overlap
            if (newBookingStart < existingEnd && newBookingEnd > existingStart) {
                throw new Error("Este horário ou parte dele foi preenchido. Por favor, escolha outro.");
            }
        }
        
        // If no overlap, create booking
        const { duration, ...restOfBookingData } = bookingData;
        const newBookingRef = doc(bookingsCol);
        transaction.set(newBookingRef, {
            ...restOfBookingData,
            status: 'pending',
            createdAt: Timestamp.now(),
        });
    });
};

export const createAdminBooking = async (bookingData: {
    procedureId: string,
    procedureName: string,
    date: string, // YYYY-MM-DD
    time: string,
    clientName: string,
    clientContact: string,
    clientBirthDate: string,
    price: number,
}) => {
    // This function needs the duration to check for conflicts, let's fetch it
    const procedureDoc = await getDoc(doc(db, "procedures", bookingData.procedureId));
    if (!procedureDoc.exists()) {
        throw new Error("Procedimento não encontrado.");
    }
    const procedureDuration = procedureDoc.data().duration;
    const procedures = await getProcedures();

     await runTransaction(db, async (transaction) => {
        const bookingsCol = collection(db, "bookings");
        const q = query(bookingsCol, where("date", "==", bookingData.date), where("status", "in", ["confirmed", "completed"]));
        const dayBookingsSnap = await getDocs(q);
        
        const newBookingStart = new Date(`1970-01-01T${bookingData.time}:00`);
        const newBookingEnd = new Date(newBookingStart.getTime() + procedureDuration * 60000);

        for (const doc of dayBookingsSnap.docs) {
            const existingBooking = doc.data();
            const proc = procedures.find(p => p.id === existingBooking.procedureId);
            if (!proc) continue;

            const existingStart = new Date(`1970-01-01T${existingBooking.time}:00`);
            const existingEnd = new Date(existingStart.getTime() + proc.duration * 60000);
            
            if (newBookingStart < existingEnd && newBookingEnd > existingStart) {
                throw new Error("Este horário está em conflito com outro agendamento.");
            }
        }

        const newBookingRef = doc(bookingsCol);
        transaction.set(newBookingRef, {
            ...bookingData,
            status: 'confirmed',
            createdAt: Timestamp.now(),
        });
    });
};

const mapDocToBooking = (doc: QueryDocumentSnapshot<DocumentData>): Booking => {
    const data = doc.data();
    const createdAt = data.createdAt;

    const serializableCreatedAt = createdAt instanceof Timestamp 
        ? createdAt.toDate().toISOString() 
        : new Date().toISOString();

    return {
        id: doc.id,
        procedureId: data.procedureId || '',
        procedureName: data.procedureName || '',
        date: data.date || '',
        time: data.time || '',
        clientName: data.clientName || '',
        clientContact: data.clientContact || '',
        clientBirthDate: data.clientBirthDate || '',
        price: data.price || 0,
        status: data.status || 'pending',
        createdAt: serializableCreatedAt,
        reminderSent: data.reminderSent || false,
        maintenanceReminderSent: data.maintenanceReminderSent || false,
        duration: data.duration || 0,
    } as Booking;
}

// Bookings
export const getBookings = async (): Promise<Booking[]> => {
    const bookingsCollection = collection(db, "bookings");
    const snapshot = await getDocs(query(bookingsCollection, orderBy("createdAt", "desc")));
    return snapshot.docs.map(mapDocToBooking);
};

export const getBookingById = async (id: string): Promise<Booking | null> => {
    const bookingDocRef = doc(db, "bookings", id);
    const bookingDoc = await getDoc(bookingDocRef);
    if (bookingDoc.exists()) {
        return mapDocToBooking(bookingDoc as QueryDocumentSnapshot<DocumentData>);
    }
    return null;
}

export const updateBooking = async (
    bookingId: string, 
    newBookingData: Omit<Booking & { duration: number }, 'id' | 'createdAt' | 'status' | 'maintenanceReminderSent' | 'reminderSent'>,
    oldBookingDate: string,
    oldBookingTime: string
) => {
    const { duration, ...restOfBookingData } = newBookingData;
     await runTransaction(db, async (transaction) => {
        const bookingDocRef = doc(db, "bookings", bookingId);

        // Check for conflicts if the date or time has changed
        if (newBookingData.date !== oldBookingDate || newBookingData.time !== oldBookingTime) {
            const bookingsCol = collection(db, "bookings");
            const q = query(bookingsCol, where("date", "==", newBookingData.date), where("status", "in", ["confirmed", "completed"]));
            const dayBookingsSnap = await getDocs(q); // Use getDocs for reads before a transaction write
            const procedures = await getProcedures();
            
            const newBookingStart = new Date(`1970-01-01T${newBookingData.time}:00`);
            const newBookingEnd = new Date(newBookingStart.getTime() + duration * 60000);

            for (const bDoc of dayBookingsSnap.docs) {
                if (bDoc.id === bookingId) continue; // Skip self
                const existingBooking = bDoc.data();
                const procedure = procedures.find(p => p.id === existingBooking.procedureId);
                if (!procedure) continue;

                const existingStart = new Date(`1970-01-01T${existingBooking.time}:00`);
                const existingEnd = new Date(existingStart.getTime() + procedure.duration * 60000);
                
                if (newBookingStart < existingEnd && newBookingEnd > existingStart) {
                    throw new Error("O novo horário conflita com outro agendamento existente.");
                }
            }
        }
        
        // Update the booking within the transaction
        transaction.update(bookingDocRef, {
            ...restOfBookingData,
            status: 'pending', // Reset status for re-confirmation
            updatedAt: Timestamp.now()
        });
    });
};


export const getBookingsByContact = async (contact: string): Promise<Booking[]> => {
    const allBookings = await getBookings();
    
    // Normalize the contact number by removing non-digits
    const normalize = (phone: string) => phone.replace(/\D/g, '');
    const normalizedContact = normalize(contact);
    
    return allBookings.filter(booking => {
        const bookingContact = booking.clientContact;
        return bookingContact && normalize(bookingContact).endsWith(normalizedContact);
    });
}


export const updateBookingStatus = async (bookingId: string, status: 'confirmed' | 'cancelled' | 'pending' | 'completed'): Promise<Booking | null> => {
    const bookingDoc = doc(db, "bookings", bookingId);
    await updateDoc(bookingDoc, { status });
    
    const updatedDoc = await getDoc(bookingDoc);
    if (updatedDoc.exists()) {
        return mapDocToBooking(updatedDoc as QueryDocumentSnapshot<DocumentData>);
    }
    return null;
};

export const markReminderAsSent = (bookingId: string) => {
    const bookingDoc = doc(db, "bookings", bookingId);
    return updateDoc(bookingDoc, { reminderSent: true });
};

export const markMaintenanceReminderAsSent = (bookingId: string) => {
    const bookingDoc = doc(db, "bookings", bookingId);
    return updateDoc(bookingDoc, { maintenanceReminderSent: true });
};

export const markBookingAsCompleted = async (bookingId: string, price: number) => {
    await runTransaction(db, async (transaction) => {
        const bookingDocRef = doc(db, "bookings", bookingId);
        const bookingDoc = await transaction.get(bookingDocRef);

        if (!bookingDoc.exists()) {
            throw new Error("Agendamento não encontrado.");
        }

        const bookingData = bookingDoc.data() as Booking;
        transaction.update(bookingDocRef, { status: 'completed' });

        const categoriesCol = collection(db, 'categories');
        const serviceCategoryQuery = query(categoriesCol, where("name", "==", "Serviços Prestados"), where("type", "==", "revenue"));
        // Transactional read
        const serviceCategorySnapshot = await getDocs(serviceCategoryQuery);
        
        let categoryId = '';
        let categoryName = 'Serviços Prestados';

        if (serviceCategorySnapshot.empty) {
            const newCategoryRef = doc(collection(db, "categories"));
            const newCategory = { name: categoryName, type: 'revenue' };
            transaction.set(newCategoryRef, newCategory);
            categoryId = newCategoryRef.id;
        } else {
            categoryId = serviceCategorySnapshot.docs[0].id;
        }

        const transactionCollection = collection(db, "transactions");
        const newTransactionRef = doc(transactionCollection);
        transaction.set(newTransactionRef, {
            type: 'revenue',
            description: `Serviço: ${bookingData.procedureName} - ${bookingData.clientName}`,
            amount: price,
            date: bookingData.date,
            categoryId: categoryId,
            categoryName: categoryName,
            bookingId: bookingId,
            createdAt: Timestamp.now(),
        });
    });
};

export const deleteBookingAndRestoreTime = async (booking: { id: string, date: string, time: string }) => {
    const bookingDocRef = doc(db, "bookings", booking.id);
    await deleteDoc(bookingDocRef);
};

export const cancelBookingAndRestoreTime = async (booking: { id: string, date: string, time: string }) => {
    const bookingDocRef = doc(db, "bookings", booking.id);
    await updateDoc(bookingDocRef, { status: 'cancelled' });
};

const defaultCategories: Omit<Category, 'id'>[] = [
    { name: 'Serviços Prestados', type: 'revenue' },
    { name: 'Venda de Produtos', type: 'revenue' },
    { name: 'Compra de Estoque', type: 'expense'},
    { name: 'Materiais', type: 'expense' },
    { name: 'Aluguel', type: 'expense' },
    { name: 'Contas (Água, Luz, etc)', type: 'expense' },
    { name: 'Marketing', type: 'expense' },
    { name: 'Outros', type: 'expense' },
    { name: 'Outras', type: 'revenue' },
];

export const getCategories = async (): Promise<Category[]> => {
    const categoriesCollection = collection(db, "categories");
    const snapshot = await getDocs(query(categoriesCollection, orderBy("name")));
    
    if (snapshot.empty) {
        const batch = writeBatch(db);
        defaultCategories.forEach(cat => {
            const docRef = doc(collection(db, "categories"));
            batch.set(docRef, cat);
        });
        await batch.commit();
        const newSnapshot = await getDocs(query(categoriesCollection, orderBy("name")));
        return newSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category));
    }

    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category));
}

export const addCategory = async (category: Omit<Category, 'id'>): Promise<DocumentReference> => {
    const categoriesCollection = collection(db, "categories");
    const q = query(categoriesCollection, where("name", "==", category.name), where("type", "==", category.type));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      return snapshot.docs[0].ref;
    }
    return addDoc(categoriesCollection, category);
};


export const deleteCategory = (id: string) => {
    return deleteDoc(doc(db, "categories", id));
};

export const getTransactions = async (): Promise<Transaction[]> => {
    const transactionsCollection = collection(db, "transactions");
    const q = query(transactionsCollection, orderBy("date", "desc"));
    const snapshot = await getDocs(q);
    const transactions = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            ...data,
            date: data.date,
             createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : new Date().toISOString(),
        } as Transaction;
    });
    return transactions;
}

export const addTransaction = (transaction: Omit<Transaction, 'id' | 'createdAt'>): Promise<DocumentReference> => {
    return addDoc(collection(db, "transactions"), {
        ...transaction,
        createdAt: Timestamp.now(),
    });
};

export const updateTransaction = (id: string, data: Partial<Omit<Transaction, 'id' | 'createdAt'>>) => {
    const transactionDoc = doc(db, "transactions", id);
    return updateDoc(transactionDoc, data);
};

export const deleteTransaction = async (id: string) => {
    const transactionDocRef = doc(db, "transactions", id);
    await deleteDoc(transactionDocRef);
};

export const deleteAllTransactions = async () => {
    const transactionsCollection = collection(db, "transactions");
    const snapshot = await getDocs(transactionsCollection);
    const batch = writeBatch(db);
    snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
    });
    await batch.commit();
};


const defaultStockCategories: Omit<StockCategory, 'id'>[] = [
    { name: 'Esmaltes' },
    { name: 'Pincéis' },
    { name: 'Gel' },
    { name: 'Lixas' },
    { name: 'Removedores' },
    { name: 'Outros' },
];

export const getStockCategories = async (): Promise<StockCategory[]> => {
    const categoriesCollection = collection(db, "stockCategories");
    const snapshot = await getDocs(query(categoriesCollection, orderBy("name")));

    if (snapshot.empty) {
        const batch = writeBatch(db);
        defaultStockCategories.forEach(cat => {
            const docRef = doc(collection(db, "stockCategories"));
            batch.set(docRef, cat);
        });
        await batch.commit();
        const newSnapshot = await getDocs(query(categoriesCollection, orderBy("name")));
        return newSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StockCategory));
    }
    
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StockCategory));
};

export const addStockCategory = async (category: Omit<StockCategory, 'id'>) => {
    const categoriesCollection = collection(db, "stockCategories");
    const q = query(categoriesCollection, where("name", "==", category.name));
    const snapshot = await getDocs(q);
    if (snapshot.empty) {
        return addDoc(categoriesCollection, category);
    }
    return Promise.resolve();
};

export const deleteStockCategory = async (id: string) => {
    const productsQuery = query(collection(db, "products"), where("categoryId", "==", id));
    const snapshot = await getDocs(productsQuery);
    if (!snapshot.empty) {
        throw new Error("Esta categoria não pode ser deletada pois existem produtos associados a ela.");
    }
    const categoryDoc = doc(db, "stockCategories", id);
    return deleteDoc(categoryDoc);
};

export const deleteAllStockCategories = async () => {
    const productsSnapshot = await getDocs(collection(db, "products"));
    if (!productsSnapshot.empty) {
        throw new Error("Exclua todos os produtos antes de limpar as categorias.");
    }
    
    const categoriesCollection = collection(db, "stockCategories");
    const snapshot = await getDocs(categoriesCollection);
    const batch = writeBatch(db);
    snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
    });
    await batch.commit();
};


export const getProducts = async (): Promise<Product[]> => {
    const productsCollection = collection(db, "products");
    const snapshot = await getDocs(query(productsCollection, orderBy("name")));
    return snapshot.docs.map(doc => {
        const data = doc.data();
        const createdAt = data.createdAt;
        const serializableCreatedAt = createdAt instanceof Timestamp
            ? createdAt.toDate().toISOString()
            : new Date().toISOString();

        return {
            id: doc.id,
            name: data.name || '',
            quantity: data.quantity || 0,
            categoryId: data.categoryId || '',
            categoryName: data.categoryName || '',
            createdAt: serializableCreatedAt,
        } as Product;
    });
};

export const addProduct = (product: Omit<Product, 'id' | 'createdAt'>): Promise<DocumentReference> => {
    return addDoc(collection(db, "products"), {
        ...product,
        createdAt: Timestamp.now()
    });
};

export const updateProduct = (id: string, data: Partial<Omit<Product, 'id' | 'createdAt'>>) => {
    const productDoc = doc(db, "products", id);
    return updateDoc(productDoc, data);
};

export const updateProductQuantity = (id: string, change: number) => {
    const productDoc = doc(db, "products", id);
    return updateDoc(productDoc, {
        quantity: increment(change)
    });
};

export const deleteProduct = (id: string) => {
    const productDocRef = doc(db, "products", id);
    return deleteDoc(productDocRef);
};


export const deleteAllData = async () => {
    const batch = writeBatch(db);

    const collectionsToDelete = ['bookings', 'transactions'];

    for (const collectionName of collectionsToDelete) {
        const snapshot = await getDocs(collection(db, collectionName));
        snapshot.docs.forEach(doc => {
            batch.delete(doc.ref);
        });
    }

    await batch.commit();
};

export { app, db, auth };
