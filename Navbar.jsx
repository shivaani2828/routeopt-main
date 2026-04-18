import React, { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth, db } from "../firebase"; // 🔥 Added db import
import { doc, getDoc } from "firebase/firestore"; // 🔥 Added Firestore imports
import toast from "react-hot-toast";

const Navbar = () => {
  const navigate = useNavigate();
  const [showDropdown, setShowDropdown] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [user, setUser] = useState(null);
  // We will use this state to store the full user profile from Firestore
  const [userData, setUserData] = useState(null);

  const dropdownRef = useRef(null);

  // 1. 🔥 Listen for Auth Changes AND Fetch User Profile Data 🔥
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);

      if (currentUser) {
        // User is logged in, fetch their profile data from Firestore immediately
        try {
          const userDocRef = doc(db, "users", currentUser.uid);
          const userDocSnap = await getDoc(userDocRef);

          if (userDocSnap.exists()) {
            const data = userDocSnap.data();
            setUserData(data);
            // Optional: Keep localStorage synced for other components
            localStorage.setItem("user", JSON.stringify(data));
          } else {
            // Handle rare case where auth exists but Firestore doc doesn't
            setUserData(null);
          }
        } catch (error) {
          console.error("Error fetching user data in Navbar:", error);
          setUserData(null);
        }
      } else {
        // User logged out
        setUserData(null);
        localStorage.removeItem("user");
      }
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      // State updates are now handled in the onAuthStateChanged listener above
      toast.success("Logged out successfully");
      setShowDropdown(false);
      setIsMobileMenuOpen(false);
      navigate("/");
    } catch (error) {
      console.error(error);
      toast.error("Error logging out");
    }
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // 🔥 Helper to check if verified using the fresh Firestore data
  const isVerified = userData?.isVerified === true;

  return (
    <nav className="sticky top-0 z-[1000] bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-b-4 border-emerald-500 px-4 md:px-8 py-4 shadow-2xl">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* LOGO */}
        <Link to="/" className="flex items-center gap-3 group">
          <div className="bg-slate-100/10 p-2 rounded-xl group-hover:bg-emerald-600/20 transition-colors">
            <img
              src="/Logo.png"
              alt="RouteOpt Logo"
              className="w-8 h-8 object-contain"
            />
          </div>
          <span className="text-2xl font-bold text-slate-100 tracking-tight">
            RouteOpt
          </span>
        </Link>

        {/* --- DESKTOP NAVIGATION (Hidden on Mobile) --- */}
        <div className="hidden md:flex items-center gap-6">
          {user ? (
            <>
              {/* 🔥 CONDITIONAL START A RIDE BUTTON */}
              {isVerified ? (
                <Link
                  to="/ride-selection"
                  className="bg-emerald-500 text-slate-900 px-6 py-2 rounded-lg font-black uppercase tracking-widest hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-900/40 text-xs"
                >
                  Start a Ride
                </Link>
              ) : (
                <button
                  onClick={() =>
                    toast.error("Verification Pending. Check Profile.")
                  }
                  className="bg-slate-700 text-slate-400 px-6 py-2 rounded-lg font-bold uppercase tracking-widest cursor-not-allowed text-xs border border-slate-600"
                >
                  🔒 Ride Locked
                </button>
              )}

              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setShowDropdown(!showDropdown)}
                  className="flex items-center gap-2 p-1 hover:bg-slate-100 rounded-full transition outline-none"
                >
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-slate-900 font-bold uppercase border-2 border-emerald-400 overflow-hidden bg-emerald-50">
                    {userData?.profileImage ? (
                      <img
                        src={userData.profileImage}
                        alt="User"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span>
                        {userData?.name ? userData.name[0] : user.email?.[0]}
                      </span>
                    )}
                  </div>
                  <svg
                    className={`w-4 h-4 text-emerald-400 transition-transform ${
                      showDropdown ? "rotate-180" : ""
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="3"
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>

                {showDropdown && (
                  <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-100 rounded-2xl shadow-xl py-2 animate-in fade-in zoom-in-95 duration-200 origin-top-right">
                    <div className="px-4 py-3 border-b border-slate-50 mb-1">
                      <p className="text-xs text-slate-400 font-medium uppercase tracking-wider mb-1">
                        Signed in as
                      </p>
                      <p className="text-sm font-bold text-slate-800 truncate">
                        {userData?.name || "User"}
                      </p>
                      <p className="text-xs text-slate-500 truncate">
                        {user.email}
                      </p>
                    </div>
                    <ul>
                      <li>
                        <Link
                          to="/profile"
                          className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 transition"
                        >
                          My Profile
                        </Link>
                      </li>

                      {/* Only show Driver Dash link if verified */}
                      {isVerified && (
                        <li>
                          <Link
                            to="/ride-giver-dashboard"
                            className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 transition"
                          >
                            Driver Dashboard
                          </Link>
                        </li>
                      )}

                      <li>
                        <Link
                          to="/history"
                          className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 transition"
                        >
                          Rides History
                        </Link>
                      </li>
                      <li className="border-t border-slate-50 mt-1">
                        <button
                          onClick={handleLogout}
                          className="w-full text-left flex items-center gap-2 px-4 py-2.5 text-sm text-red-500 font-semibold hover:bg-red-50 transition"
                        >
                          Logout
                        </button>
                      </li>
                    </ul>
                  </div>
                )}
              </div>
            </>
          ) : (
            <Link
              to="/auth"
              className="bg-emerald-500 text-white px-6 py-2.5 rounded-full font-semibold shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300"
            >
              Get Started
            </Link>
          )}
        </div>

        {/* --- MOBILE HAMBURGER BUTTON (Visible on Mobile Only) --- */}
        <div className="md:hidden flex items-center">
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="text-emerald-500 p-2 outline-none"
          >
            <svg
              className="w-7 h-7"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              {isMobileMenuOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 6h16M4 12h16m-7 6h7"
                />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* --- MOBILE MENU PANEL --- */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-slate-800 mt-4 rounded-2xl p-4 border border-white/10 animate-in slide-in-from-top-2 duration-300">
          {user ? (
            <div className="flex flex-col gap-3">
              {/* 🔥 CONDITIONAL MOBILE LINK */}
              {isVerified ? (
                <Link
                  to="/ride-selection"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="bg-emerald-500 text-slate-900 py-3 rounded-xl font-black uppercase tracking-widest text-center text-xs"
                >
                  Start a Ride
                </Link>
              ) : (
                <button
                  onClick={() => toast.error("Pending Verification")}
                  className="bg-slate-700 text-slate-400 py-3 rounded-xl font-black uppercase tracking-widest text-center text-xs border border-slate-600 cursor-not-allowed"
                >
                  🔒 Verification Pending
                </button>
              )}

              <Link
                to="/profile"
                onClick={() => setIsMobileMenuOpen(false)}
                className="text-white font-bold text-sm py-2 px-2"
              >
                My Profile
              </Link>

              {isVerified && (
                <Link
                  to="/ride-giver-dashboard"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="text-white font-bold text-sm py-2 px-2"
                >
                  Driver Dashboard
                </Link>
              )}

              <Link
                to="/history"
                onClick={() => setIsMobileMenuOpen(false)}
                className="text-white font-bold text-sm py-2 px-2"
              >
                Rides History
              </Link>
              <button
                onClick={handleLogout}
                className="text-red-400 font-bold text-sm py-2 px-2 text-left mt-2 border-t border-white/5 pt-3"
              >
                Logout
              </button>
            </div>
          ) : (
            <Link
              to="/auth"
              onClick={() => setIsMobileMenuOpen(false)}
              className="bg-emerald-500 text-slate-900 py-3 rounded-xl font-black uppercase tracking-widest text-center text-xs block"
            >
              Get Started
            </Link>
          )}
        </div>
      )}
    </nav>
  );
};

export default Navbar;