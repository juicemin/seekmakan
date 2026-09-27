import "./App.css";
import { NavLink, Route, Routes } from "react-router";
import RestaurantDiscoveryPage from "./components/RestaurantDiscovery";
import RestaurantDetailsPage from "./pages/RestaurantDetailsPage";
import FoodDiscoveryPage from "./pages/FoodDiscoveryPage";

function App() {
  return (
    <>
      <nav className="discovery-nav" aria-label="Discovery pages">
        <NavLink to="/restaurants">Restaurant Discovery</NavLink>
        <NavLink to="/food">Food Discovery</NavLink>
      </nav>

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

      <Route 
        path="/food" 
        element={<FoodDiscoveryPage />} 
      />

    </Routes>
  </>
  );
}

export default App;