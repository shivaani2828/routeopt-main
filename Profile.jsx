import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../firebase";
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  doc, // 🔥 Added
  onSnapshot, // 🔥 Added
} from "firebase/firestore";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import toast from "react-hot-toast"; // 🔥 Added

import EcoLoopCoach from "../components/EcoLoopCoach";

const Profile = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [genderFilter, setGenderFilter] = useState(false);

  const [user, setUser] = useState(() => {
    const savedUser = JSON.parse(localStorage.getItem("user"));
    return savedUser || null;
  });

  const DEMO_STATS = {
    greenPoints: 1250,
    co2Saved: "45.8",
    ridesCompleted: 24,
    rank: 12,
  };
  const DEMO_CHART = [
    { name: "Oct", saved: 12.5 },
    { name: "Nov", saved: 18.2 },
    { name: "Dec", saved: 15.1 },
    { name: "Jan", saved: 8.5 },
  ];

  const [stats, setStats] = useState(DEMO_STATS);
  const [chartData, setChartData] = useState(DEMO_CHART);
  const [loading, setLoading] = useState(true);

  // 🔥 1. REAL-TIME LISTENER: Updates Profile automatically when Admin Approves
  useEffect(() => {
    if (!user?.uid) return;

    const unsubUser = onSnapshot(doc(db, "users", user.uid), (docSnap) => {
      if (docSnap.exists()) {
        const liveData = docSnap.data();

        // Check if status changed from Pending -> Verified
        if (liveData.isVerified && !user.isVerified) {
          toast.success("🎉 You are now VERIFIED! Access Granted.");
        }

        // Check if status changed to Rejected
        if (
          liveData.verificationStatus === "rejected" &&
          user.verificationStatus !== "rejected"
        ) {
          toast.error("❌ Your ID Verification was Rejected.");
        }

        // Sync with Local Storage so App.jsx knows we are allowed in
        const updatedUser = { ...user, ...liveData };

        // Only update state if something actually changed (prevents loops)
        if (
          JSON.stringify(updatedUser.isVerified) !==
            JSON.stringify(user.isVerified) ||
          updatedUser.verificationStatus !== user.verificationStatus
        ) {
          setUser(updatedUser);
          localStorage.setItem("user", JSON.stringify(updatedUser));
        }
      }
    });

    return () => unsubUser();
  }, [user?.uid]);

  // 2. Existing Stats Logic
  useEffect(() => {
    let isMounted = true;

    const fetchCarbonStats = async () => {
      if (!user?.uid) return;

      try {
        const q = query(
          collection(db, "rides"),
          where("driverId", "==", user.uid),
          orderBy("createdAt", "desc")
        );

        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
          if (isMounted) setLoading(false);
          return;
        }

        let totalDistance = 0;
        let totalRides = 0;
        const monthlyData = {};

        querySnapshot.forEach((doc) => {
          const ride = doc.data();
          const distance = parseFloat(
            ride.route?.distance || ride.distance || 0
          );
          totalDistance += distance;
          totalRides += 1;

          if (ride.createdAt) {
            const date = ride.createdAt.toDate();
            const month = date.toLocaleString("default", { month: "short" });
            if (!monthlyData[month]) monthlyData[month] = 0;
            monthlyData[month] += distance * 0.12;
          }
        });

        if (isMounted) {
          const co2Total = (totalDistance * 0.12).toFixed(1);
          const points = Math.round(totalDistance * 10);

          setStats({
            greenPoints: points,
            co2Saved: co2Total,
            ridesCompleted: totalRides,
            rank: points > 500 ? 5 : 120,
          });

          setChartData(
            Object.keys(monthlyData).map((month) => ({
              name: month,
              saved: parseFloat(monthlyData[month].toFixed(1)),
            }))
          );
        }
      } catch (error) {
        console.error("Fetch error:", error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchCarbonStats();
    return () => {
      isMounted = false;
    };
  }, [user?.uid]); // Updated dependency

  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64Image = reader.result;
        const updatedUser = { ...user, profileImage: base64Image };
        setUser(updatedUser);
        localStorage.setItem("user", JSON.stringify(updatedUser));
        window.dispatchEvent(new Event("userUpdated"));
      };
      reader.readAsDataURL(file);
    }
  };

  if (!user)
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-slate-400 font-medium animate-pulse">
          Session expired. Please log in.
        </p>
      </div>
    );

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col font-sans antialiased">
      <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-40">
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-emerald-100 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 -right-24 w-80 h-80 bg-blue-100 rounded-full blur-3xl"></div>
      </div>

      <main className="relative z-10 grow max-w-6xl mx-auto w-full px-4 py-10">
        <div className="grid lg:grid-cols-12 gap-6">
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white/80 backdrop-blur-md p-6 rounded-[2rem] shadow-sm border border-white/60 text-center group">
              <div className="relative mx-auto w-24 h-24 mb-4">
                <div className="w-24 h-24 rounded-full overflow-hidden shadow-2xl ring-4 ring-emerald-50 group-hover:ring-emerald-100 transition-all duration-300 bg-slate-100">
                  {user.profileImage ? (
                    <img
                      src={user.profileImage}
                      alt="Avatar"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-emerald-600 flex items-center justify-center text-white text-3xl font-bold uppercase tracking-tighter">
                      {user.name ? user.name[0] : "U"}
                    </div>
                  )}
                </div>

                <button
                  onClick={() => fileInputRef.current.click()}
                  className="absolute bottom-0 right-0 bg-slate-900 text-white p-2 rounded-full shadow-lg hover:bg-emerald-600 transition-all transform hover:scale-110 active:scale-90"
                >
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                    />
                  </svg>
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImageUpload}
                  accept="image/*"
                  className="hidden"
                />
              </div>

              <h2 className="text-xl font-bold text-slate-900 leading-tight">
                {user.name}
              </h2>
              <p className="text-xs text-slate-500 mb-4">{user.email}</p>

              {/* 🔥 UPDATED VERIFICATION STATUS BADGES */}
              <div className="flex flex-col items-center gap-2">
                {user.isVerified ? (
                  <>
                    <div className="inline-flex px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-[10px] font-bold tracking-widest uppercase border border-emerald-100">
                      ✓ Verified Student
                    </div>
                    {user.organization && (
                      <p className="text-xs text-slate-500 font-medium">
                        {user.organization}
                      </p>
                    )}
                  </>
                ) : user.verificationStatus === "rejected" ? (
                  <div className="inline-flex px-3 py-1 bg-red-50 text-red-700 rounded-full text-[10px] font-bold tracking-widest uppercase border border-red-100">
                    ❌ Verification Rejected
                  </div>
                ) : (
                  <div className="inline-flex px-3 py-1 bg-amber-50 text-amber-700 rounded-full text-[10px] font-bold tracking-widest uppercase border border-amber-100 animate-pulse">
                    ⏳ Verification Pending
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur-md p-5 rounded-[1.5rem] shadow-sm border border-white/60">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <div className="w-1 h-4 bg-emerald-500 rounded-full"></div>
                Account Settings
              </h3>
              <div className="flex items-center justify-between p-3 bg-slate-50/50 rounded-xl border border-slate-100">
                <div>
                  <p className="text-xs font-bold text-slate-800">
                    Same-Gender Only
                  </p>
                  <p className="text-[10px] text-slate-500">
                    Match with {user.gender || "verified"} users
                  </p>
                </div>
                <button
                  onClick={() => setGenderFilter(!genderFilter)}
                  className={`w-10 h-5 rounded-full transition-all relative ${
                    genderFilter
                      ? "bg-emerald-600 shadow-[0_0_10px_rgba(16,185,129,0.3)]"
                      : "bg-slate-200"
                  }`}
                >
                  <div
                    className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all shadow-sm ${
                      genderFilter ? "left-5.5" : "left-0.5"
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          <div className="lg:col-span-8 space-y-6">
            {!loading && (
              <EcoLoopCoach
                totalKmSaved={parseFloat(stats.co2Saved) / 0.12}
                totalCo2Saved={parseFloat(stats.co2Saved)}
              />
            )}

            <div className="grid md:grid-cols-3 gap-4">
              <div className="bg-emerald-600 p-5 rounded-3xl text-white shadow-xl shadow-emerald-200/50 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-10 text-6xl group-hover:rotate-12 transition-transform">
                  🌱
                </div>
                <p className="text-emerald-100 text-[10px] font-bold uppercase tracking-widest mb-1">
                  Green Points
                </p>
                <h4 className="text-3xl font-black">{stats.greenPoints}</h4>
                <p className="text-[10px] mt-1 opacity-70">
                  Lifetime Contributions
                </p>
              </div>

              <div className="bg-white p-5 rounded-3xl border border-slate-200/60 shadow-sm relative group overflow-hidden">
                <div className="absolute top-0 right-0 w-16 h-16 bg-blue-50/50 rounded-bl-full -mr-4 -mt-4 z-0"></div>
                <div className="relative z-10">
                  <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-1">
                    CO₂ Savings
                  </p>
                  <div className="flex items-baseline gap-1 text-slate-900">
                    <h4 className="text-3xl font-black">{stats.co2Saved}</h4>
                    <span className="text-xs font-bold opacity-50">kg</span>
                  </div>
                  <p className="text-[10px] mt-2 text-emerald-600 font-bold bg-emerald-50 inline-block px-2 py-0.5 rounded">
                    🌳 {Math.ceil(parseFloat(stats.co2Saved) * 2)} trees
                    equivalent
                  </p>
                </div>
              </div>

              <div className="bg-white p-5 rounded-3xl border border-slate-200/60 shadow-sm">
                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-1">
                  Campus Rank
                </p>
                <h4 className="text-3xl font-black text-slate-900">
                  #{stats.rank}
                </h4>
                <p className="text-[10px] mt-1 text-slate-500 font-medium">
                  Top Tier Commuter
                </p>
              </div>
            </div>

            <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-200/60">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-slate-900 text-sm uppercase tracking-widest">
                  Savings History
                </h3>
                <div className="flex gap-4 text-[10px] font-bold text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>{" "}
                    Saved
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-200"></span>{" "}
                    Average
                  </span>
                </div>
              </div>

              <div className="h-48 w-full">
                {loading ? (
                  <div className="h-full flex items-center justify-center space-x-2">
                    <div className="w-1 h-4 bg-emerald-500 animate-bounce"></div>
                    <div className="w-1 h-6 bg-emerald-500 animate-bounce [animation-delay:-0.2s]"></div>
                    <div className="w-1 h-4 bg-emerald-500 animate-bounce [animation-delay:-0.4s]"></div>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={chartData}
                      margin={{ top: 0, right: 0, left: -25, bottom: 0 }}
                    >
                      <XAxis
                        dataKey="name"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 10, fill: "#94a3b8" }}
                        dy={10}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 10, fill: "#94a3b8" }}
                      />
                      <Tooltip
                        cursor={{ fill: "#f8fafc", radius: 8 }}
                        contentStyle={{
                          borderRadius: "16px",
                          border: "none",
                          boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)",
                          fontSize: "12px",
                        }}
                      />
                      <Bar dataKey="saved" radius={[6, 6, 0, 0]} barSize={32}>
                        {chartData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={entry.saved > 5 ? "#10b981" : "#e2e8f0"}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-200/60">
              <div className="flex items-center gap-5 p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100/50">
                <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-xl shadow-sm">
                  🅿️
                </div>
                <div className="grow">
                  <div className="flex justify-between items-end mb-2">
                    <div>
                      <h4 className="font-bold text-emerald-900 text-xs">
                        Reserved Parking Spot
                      </h4>
                      <p className="text-[10px] text-emerald-600/70 italic font-medium">
                        Next Tier Unlock
                      </p>
                    </div>
                    <span className="text-base font-black text-emerald-600">
                      {Math.min(
                        100,
                        Math.round((stats.greenPoints / 2000) * 100)
                      )}
                      %
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-emerald-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 transition-all duration-1000 ease-out"
                      style={{
                        width: `${Math.min(
                          100,
                          (stats.greenPoints / 2000) * 100
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Profile;
