"use client";
import { createContext, useContext, type ReactNode } from "react";
import type { CustomErrorPresentation } from "@/lib/custom-errors";
const Context = createContext<CustomErrorPresentation | null>(null);
export function CustomErrorProvider({ value, children }: { value: CustomErrorPresentation | null; children: ReactNode }) {
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useCustomErrorPresentation() { return useContext(Context); }
