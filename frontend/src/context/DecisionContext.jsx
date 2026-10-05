import { useState } from "react";
import { DecisionContext } from "./decision-context";

export function DecisionProvider({ children }) {
  const [location, setLocation] = useState(null);

  const [settings, setSettings] = useState({
    source: "nearby",
    radius: "5",
    price: "",
    rating: "",
    openNow: false,
  });

  const [pool, setPool] = useState(null);
  const [options, setOptions] = useState([]);
  const [winner, setWinner] = useState(null);
  const [rotation, setRotation] = useState(0);

  return (
    <DecisionContext.Provider
      value={{
        location,
        setLocation,
        settings,
        setSettings,
        pool,
        setPool,
        options,
        setOptions,
        winner,
        setWinner,
        rotation,
        setRotation,
      }}
    >
      {children}
    </DecisionContext.Provider>
  );
}