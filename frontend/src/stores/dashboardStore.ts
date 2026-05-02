import { create } from 'zustand';

interface DashboardCard {
  id: string;
  title: string;
  visible: boolean;
}

interface DashboardState {
  cards: DashboardCard[];
  setCards: (cards: DashboardCard[]) => void;
  toggleCard: (id: string) => void;
  reset: () => void;
}

const defaultCards: DashboardCard[] = [
  { id: 'users', title: 'Utilisateurs actifs', visible: true },
  { id: 'leaves', title: 'Conges en attente', visible: true },
  { id: 'roles', title: 'Roles actifs', visible: true },
  { id: 'permissions', title: 'Permissions', visible: true }
];

export const useDashboardStore = create<DashboardState>((set) => ({
  cards: [...defaultCards],
  setCards: (cards) => set({ cards }),
  toggleCard: (id) => set((state) => ({
    cards: state.cards.map((c) => (c.id === id ? { ...c, visible: !c.visible } : c))
  })),
  reset: () => set({ cards: [...defaultCards] })
}));
