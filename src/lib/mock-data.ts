import type { Procedure } from './types';

// This file is now deprecated as we are fetching data from Firebase.
// It is kept for reference but is no longer used in the application.

export const procedures: Procedure[] = [
  {
    id: '1',
    name: 'Manicure Simples',
    description: 'Cutilagem e esmaltação tradicional.',
    price: 30,
    duration: 60,
    imageUrl: 'https://picsum.photos/600/400',
  },
  {
    id: '2',
    name: 'Alongamento em Fibra de Vidro',
    description: 'Técnica de alongamento que oferece um resultado natural e resistente.',
    price: 180,
    duration: 180,
    imageUrl: 'https://picsum.photos/600/400',
  },
  {
    id: '3',
    name: 'Esmaltação em Gel',
    description: 'Esmalte com secagem em cabine UV para maior durabilidade e brilho.',
    price: 70,
    duration: 90,
    imageUrl: 'https://picsum.photos/600/400',
  },
  {
    id: '4',
    name: 'Spa dos Pés',
    description: 'Tratamento completo com hidratação, esfoliação e massagem.',
    price: 60,
    duration: 75,
    imageUrl: 'https://picsum.photos/600/400',
  },
   {
    id: '5',
    name: 'Nail Art Decorada',
    description: 'Decoração artística personalizada em uma ou mais unhas.',
    price: 45,
    duration: 90,
    imageUrl: 'https://picsum.photos/600/400',
  },
  {
    id: '6',
    name: 'Manutenção de Alongamento',
    description: 'Manutenção periódica para garantir a beleza e saúde das unhas alongadas.',
    price: 100,
    duration: 120,
    imageUrl: 'https://picsum.photos/600/400',
  },
];
