import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from "react-router";
import "leaflet/dist/leaflet.css";
import App from './App.jsx'
import './index.css'
import { DecisionProvider } from "./context/DecisionContext";
import FavouritesProvider from "./context/FavouritesProvider";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <DecisionProvider>
        <FavouritesProvider>
          <App />
        </FavouritesProvider>
      </DecisionProvider>
    </BrowserRouter>
  </StrictMode>,
);