import "./App.css";
import { NavLink, Navigate, Route, Routes } from "react-router";
import RestaurantDiscoveryPage from "./components/RestaurantDiscovery";
import RestaurantDetailsPage from "./pages/RestaurantDetailsPage";
import FoodDiscoveryPage from "./pages/FoodDiscoveryPage";
import DecideForMePage from "./pages/DecideForMePage";
import { VerifyEmailPage } from "./pages/AuthPages";
import AuthAccess from "./components/AuthAccess";
import { ResetPasswordPage } from "./pages/PasswordRecovery";
import ProfilePage from "./pages/ProfilePage";
import FavouritesPage from "./pages/FavouritesPage";

function App() {
  return (
    <>
      <nav className="discovery-nav" aria-label="Discovery pages">
        <NavLink to="/restaurants">Restaurant Discovery</NavLink>
        <NavLink to="/food">Food Discovery</NavLink>
        <NavLink to="/decide">Decide For Me</NavLink>
        <NavLink to="/favourites">Favourites</NavLink>
        <AuthAccess />
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

      <Route
      path="/login"
      element={<Navigate to="/restaurants?auth=login" replace />}
      />

      <Route
      path="/register"
      element={<Navigate to="/restaurants?auth=register" replace />}
      />

      <Route 
      path="/verify-email" 
      element={<VerifyEmailPage />} />

      <Route 
      path="/reset-password" 
      element={<ResetPasswordPage />} />

      <Route 
      path="/profile" 
      element={<ProfilePage />} />

      <Route 
      path="/favourites" 
      element={<FavouritesPage />} />

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