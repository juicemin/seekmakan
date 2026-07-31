import { Route, Routes } from "react-router";
import { useEffect, useState } from "react";
import "./App.css";
import { API_BASE_URL } from "./config";
import RestaurantDiscoveryPage from "./pages/RestaurantDiscoveryPage";
import RestaurantDetailsPage from "./pages/RestaurantDetailsPage";

const API_URL = `${API_BASE_URL}/api/restaurants`;

function App() {
  return (
    <Routes>
      <Route
        path="/"
        element={<RestaurantDiscoveryPage />}
      />

      <Route
        path="/restaurants"
        element={<RestaurantDiscoveryPage />}
      />

      <Route
        path="/restaurants/:restaurantId"
        element={<RestaurantDetailsPage />}
      />
    </Routes>
  );
}

export default App;