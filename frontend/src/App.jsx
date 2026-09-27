import "./App.css";
import { Route, Routes } from "react-router";
import RestaurantDiscoveryPage from "./components/RestaurantDiscovery";
import RestaurantDetailsPage from "./pages/RestaurantDetailsPage";

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