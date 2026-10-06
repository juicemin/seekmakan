import "./App.css";
import { NavLink, Route, Routes } from "react-router";
import RestaurantDiscoveryPage from "./components/RestaurantDiscovery";
import RestaurantDetailsPage from "./pages/RestaurantDetailsPage";
import FoodDiscoveryPage from "./pages/FoodDiscoveryPage";
import DecideForMePage from "./pages/DecideForMePage";

function App() {
  return (
    <>
      <nav className="discovery-nav" aria-label="Discovery pages">
        <NavLink to="/restaurants">Restaurant Discovery</NavLink>
        <NavLink to="/food">Food Discovery</NavLink>
        <NavLink to="/decide">Decide For Me</NavLink>
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

      <Route 
      path="/decide" 
      element={<DecideForMePage />} 
      />

    </Routes>
    <footer>
      <p>
        Location data:{" "}
        <a href="https://www.geoapify.com/">Geoapify</a>
        {" · "}
        <a href="https://www.openstreetmap.org/copyright">
          © OpenStreetMap contributors — ODbL
        </a>
      </p>
    </footer>
  </>
  );
}

export default App;