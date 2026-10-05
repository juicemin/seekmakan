import { createContext, useContext } from "react";

export const DecisionContext = createContext(null);

export function useDecision() {
  const context = useContext(DecisionContext);

  if (context === null) {
    throw new Error("useDecision must be used inside DecisionProvider.");
  }

  return context;
}