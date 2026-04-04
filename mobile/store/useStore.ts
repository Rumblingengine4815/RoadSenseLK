import { create } from 'zustand';

export interface Report {
  id: string;
  type: string;
  severity: string;
  confidence: number;
  latitude: number;
  longitude: number;
  imageUri: string;
}

interface AppState {
  pendingReports: Report[];
  addReport: (report: Report) => void;
  removeReport: (id: string) => void;
}

export const useStore = create<AppState>((set) => ({
  pendingReports: [],
  addReport: (report: Report) => set((state: AppState) => ({ pendingReports: [...state.pendingReports, report] })),
  removeReport: (id: string) => set((state: AppState) => ({ pendingReports: state.pendingReports.filter((r: Report) => r.id !== id) })),
}));
