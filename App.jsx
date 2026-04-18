import { Routes, Route, useLocation, useNavigate, Navigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { Toaster, toast } from "react-hot-toast";
import ReactGA from "react-ga4";

import Landing from "./pages/Landing";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import Auth from "./pages/Auth";
import Profile from "./pages/Profile";
import RideHistory from "./pages/RideHistory";
import RideSelection from "./pages/RideSelection";
import RideGiver from "./pages/RideGiver";
import RideTaker from "./pages/RideTaker";
import RideDetails from "./pages/RideDetails";
import RideGiverDashboard from "./pages/RideGiverDashboard";
import SOSButton from "./components/SOSButton";
import AdminDashboard from "./pages/AdminDashboard";
import RideTakerLiveView from './pages/RideTakerLiveView';

ReactGA.initialize("G-DGMYLY6844");

const VerifiedRoute = ({ user, children }) => {
  if (!user) return <Navigate to="/auth" replace />;
  if (!user.isVerified) return <Navigate to="/profile" state={{ error: "verification_required" }} replace />;
  return children;
};

const AdminRoute = ({ user, children }) => {
  const localUser = JSON.parse(localStorage.getItem("user"));
  const currentUser = user || localUser;

  if (!currentUser) return <Navigate to="/auth" replace />;
  if (currentUser.role !== "admin") {
    toast.error("🔒 Admin privileges required. Please login with Admin credentials.", { id: "admin-deny" });
    return <Navigate to="/auth" replace />;
  }
  return children;
};

function App() {
  const [user, setUser] = useState(JSON.parse(localStorage.getItem("user")));
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const loggedInUser = JSON.parse(localStorage.getItem("user"));
    setUser(loggedInUser);
  }, [location]);

  const isAdminPage = location.pathname.startsWith("/admin");

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Toaster position="top-center" reverseOrder={false} />
      {!isAdminPage && <Navbar />}
      <main className="flex-grow">
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/auth" element={<Auth setUser={setUser} />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/history" element={<RideHistory />} />

          <Route path="/ride-selection" element={<VerifiedRoute user={user}><RideSelection /></VerifiedRoute>} />
          <Route path="/ride-giver" element={<VerifiedRoute user={user}><RideGiver /></VerifiedRoute>} />
          <Route path="/ride-taker" element={<VerifiedRoute user={user}><RideTaker /></VerifiedRoute>} />
          <Route path="/ride-giver-dashboard" element={<VerifiedRoute user={user}><RideGiverDashboard /></VerifiedRoute>} />
          <Route path="/ride-details/:id" element={<VerifiedRoute user={user}><RideDetails /></VerifiedRoute>} />
          <Route path="/live/:rideId" element={<RideTakerLiveView />} />
       
          <Route path="/admin" element={
            <AdminRoute user={user}>
              <AdminDashboard />
            </AdminRoute>
          } />
        </Routes>
      </main>
      {!isAdminPage && user && <SOSButton user={user} />}
      {!isAdminPage && <Footer />}
    </div>
  );
}

export default App;