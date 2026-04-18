import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import ReactGA from "react-ga4";
import { auth, db } from "../firebase";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import dashboardPreview from "../assets/LandingImage.png";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const Landing = () => {
  const [user, setUser] = useState(null);
  const [topCommuters, setTopCommuters] = useState([]);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(true);

  const [timeframe, setTimeframe] = useState("monthly");
  const [chartData, setChartData] = useState([]);
  const [impactStats, setImpactStats] = useState({
    daily: { co2: "0.0", energy: "0.0" },
    weekly: { co2: "0.0", energy: "0.0" },
    monthly: { co2: "0.0", energy: "0.0" },
    total: { co2: "0", energy: "0", commuters: "0" },
  });

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, setUser);
    return () => unsub();
  }, []);

  useEffect(() => {
    const fetchAllData = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "rides"));
        const usersSnapshot = await getDocs(collection(db, "users")); 
        const now = new Date();
        const driverStats = {};

        let rawImpact = { daily: 0, weekly: 0, monthly: 0, totalDist: 0 };
        let trendMap = {}; 

        querySnapshot.forEach((doc) => {
          const ride = doc.data();
          if (ride.distance && ride.createdAt) {
            const dist = parseFloat(ride.distance);
            const rideDate = ride.createdAt.toDate();
            const diffDays = (now - rideDate) / (1000 * 60 * 60 * 24);

            rawImpact.totalDist += dist;

            if (ride.driverId) {
              driverStats[ride.driverId] =
                (driverStats[ride.driverId] || 0) + dist;
            }

            if (diffDays <= 1) rawImpact.daily += dist;
            if (diffDays <= 7) rawImpact.weekly += dist;
            if (diffDays <= 30) {
              rawImpact.monthly += dist;

              const dateKey = rideDate.toLocaleDateString("en-US", {
                day: "numeric",
                month: "short",
              });
              trendMap[dateKey] = (trendMap[dateKey] || 0) + dist * 0.12;
            }
          }
        });

        const formatMetrics = (d) => ({
          co2: (d * 0.12).toFixed(1),
          energy: (d * 0.05).toFixed(1),
        });

        setImpactStats({
          daily: formatMetrics(rawImpact.daily),
          weekly: formatMetrics(rawImpact.weekly),
          monthly: formatMetrics(rawImpact.monthly),
          total: {
            co2: Math.round(rawImpact.totalDist * 0.12).toLocaleString(),
            energy: Math.round(rawImpact.totalDist * 0.05).toLocaleString(),
            commuters: usersSnapshot.size,
          },
        });

        const trendArray = Object.keys(trendMap)
          .map((date) => ({
            date,
            co2: parseFloat(trendMap[date].toFixed(2)),
          }))
          .sort((a, b) => new Date(a.date) - new Date(b.date))
          .slice(-10); 
        setChartData(trendArray);
        const sortedIds = Object.keys(driverStats).sort(
          (a, b) => driverStats[b] - driverStats[a]
        );

        const potentialDriversPromises = sortedIds.map(async (uid) => {
          try {
            const userDoc = await getDoc(doc(db, "users", uid));

            if (userDoc.exists()) {
              return {
                userData: userDoc.data(),
                totalDistance: driverStats[uid],
              };
            } else {
              return null;
            }
          } catch (err) {
            console.error("Error fetching specific driver:", uid, err);
            return null; 
          }
        });

        const allPotentialDrivers = await Promise.all(potentialDriversPromises);

        const validTop3Drivers = allPotentialDrivers
          .filter((driver) => driver !== null)
          .slice(0, 3);

        const leaderboardData = validTop3Drivers.map((driver, index) => ({
          name: driver.userData.name || "Anonymous",
          institution: driver.userData.email?.includes("ves")
            ? "VESIT"
            : "Partner Org",
          co2: (driver.totalDistance * 0.12).toFixed(1) + " kg",
          rank: index + 1, 
          profileImage: driver.userData.profileImage || null,
        }));

        setTopCommuters(leaderboardData);

      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoadingLeaderboard(false);
      }
    };

    fetchAllData();
  }, []);

  const handleTimeframeChange = (t) => {
    setTimeframe(t);
    ReactGA.event({
      category: "Analytics",
      action: "Toggle_Timeframe",
      label: t,
    });
  };

  const dynamicStats = [
    {
      label: "CO₂ Saved",
      value: `${impactStats.total.co2} kg`,
      icon: "🌱",
      color: "text-emerald-500",
    },
    {
      label: "Active Commuters",
      value: `${impactStats.total.commuters}+`,
      icon: "👥",
      color: "text-blue-500",
    },
    {
      label: "Partner Colleges",
      value: "12",
      icon: "🏛️",
      color: "text-purple-500",
    },
  ];

  return (
    <div className="bg-slate-50 text-slate-900">
      <header className="pt-24 pb-28 px-6 max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
        <div className="space-y-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border text-xs font-semibold text-slate-600">
            Secure • Verified • Sustainable
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold leading-tight tracking-tight">
            Commute <br />
            <span className="text-emerald-600">Smarter</span>
          </h1>
          <p className="text-lg text-slate-600 max-w-lg">
            A trusted carpooling platform for close-knit communities. Safer
            rides, lower emissions, and smarter daily commutes.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Link
              to={user ? "/ride-selection" : "/auth"}
              className="px-8 py-4 rounded-xl bg-slate-900 text-white font-semibold hover:bg-slate-800 transition text-center"
            >
              {user ? "Find a Ride" : "Get Started"}
            </Link>
            <a
              href="#features"
              className="px-8 py-4 rounded-xl border bg-white text-slate-700 hover:bg-slate-100 transition text-center"
            >
              Explore Features
            </a>
          </div>
        </div>
        <div className="relative">
          <div className="absolute -inset-2 bg-emerald-200/30 rounded-3xl blur-2xl" />
          <div className="relative bg-white rounded-3xl p-4 shadow-2xl border">
            <img
              src={dashboardPreview}
              alt="App preview"
              className="rounded-2xl w-full aspect-[4/3] object-cover"
            />
          </div>
        </div>
      </header>

      <section className="py-24 bg-white border-y border-slate-100">
        <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <h2 className="text-4xl font-bold text-slate-900 mb-6">
              Top <span className="text-emerald-600">Green Commuters</span>{" "}
              <br />
              of the Month
            </h2>
            <p className="text-slate-600 text-lg mb-8">
              Join the leaderboard and earn eco-badges for every ride you share.
              Verified impact by verified commuters.
            </p>
            {topCommuters.length > 0 && (
              <div className="flex items-center gap-4 p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                <span className="text-2xl">🏆</span>
                <p className="text-sm font-medium text-emerald-800">
                  <span className="font-bold">{topCommuters[0].name}</span> is
                  leading this month with{" "}
                  <span className="font-bold">{topCommuters[0].co2}</span> CO₂
                  saved!
                </p>
              </div>
            )}
          </div>

          <div className="space-y-4">
            {loadingLeaderboard ? (
              <div className="text-center py-10 text-slate-400 animate-pulse">
                Calculating Impact...
              </div>
            ) : topCommuters.length === 0 ? (
              <div className="p-6 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-center text-slate-500">
                No rides recorded yet.
              </div>
            ) : (
              topCommuters.map((commuter, idx) => (
                <div
                  key={idx}
                  className={`flex items-center justify-between p-6 rounded-2xl border transition-all hover:scale-[1.02] ${
                    commuter.rank === 1
                      ? "bg-gradient-to-r from-emerald-50 to-white border-emerald-200 shadow-md"
                      : "bg-white border-slate-100"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg shrink-0 ${
                        commuter.rank === 1
                          ? "bg-amber-100 text-amber-600"
                          : commuter.rank === 2
                          ? "bg-slate-100 text-slate-500"
                          : "bg-orange-100 text-orange-600"
                      }`}
                    >
                      {commuter.rank}
                    </div>
                    <div className="w-12 h-12 rounded-full overflow-hidden bg-slate-200 border-2 border-white shadow-sm shrink-0">
                      {commuter.profileImage ? (
                        <img
                          src={commuter.profileImage}
                          alt={commuter.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-emerald-600 text-white font-bold text-xl">
                          {commuter.name[0]}
                        </div>
                      )}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900">
                        {commuter.name}
                      </h4>
                      <p className="text-xs text-slate-500 font-semibold uppercase">
                        {commuter.institution}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-emerald-600">
                      {commuter.co2}
                    </p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">
                      Saved
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      <section className="py-24 bg-slate-900 text-white relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
            <div>
              <h2 className="text-4xl font-bold mb-4">
                Platform <span className="text-emerald-400">Live Impact</span>
              </h2>
              <p className="text-slate-400">
                Public environmental analytics powered by our community
                commutes.
              </p>
            </div>

            <div className="flex bg-slate-800 p-1 rounded-xl border border-slate-700">
              {["daily", "weekly", "monthly"].map((t) => (
                <button
                  key={t}
                  onClick={() => handleTimeframeChange(t)}
                  className={`px-6 py-2 rounded-lg text-sm font-bold capitalize transition-all ${
                    timeframe === t
                      ? "bg-emerald-500 text-white shadow-lg"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            <div className="space-y-6">
              <div className="bg-slate-800/50 backdrop-blur p-8 rounded-[2.5rem] border border-slate-700 hover:border-emerald-500/50 transition-all">
                <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center text-2xl mb-4">
                  🌱
                </div>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">
                  CO₂ Prevented
                </p>
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-black text-white">
                    {impactStats[timeframe].co2}
                  </span>
                  <span className="text-xl font-bold text-emerald-400">kg</span>
                </div>
              </div>

              <div className="bg-slate-800/50 backdrop-blur p-8 rounded-[2.5rem] border border-slate-700 hover:border-blue-500/50 transition-all">
                <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center text-2xl mb-4">
                  ⚡
                </div>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">
                  Energy Conserved
                </p>
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-black text-white">
                    {impactStats[timeframe].energy}
                  </span>
                  <span className="text-xl font-bold text-blue-400">
                    Liters
                  </span>
                </div>
              </div>
            </div>

            <div className="lg:col-span-2 bg-slate-800/30 backdrop-blur p-8 rounded-[2.5rem] border border-slate-700 h-[420px]">
              <h3 className="text-sm font-bold text-slate-400 mb-8 uppercase tracking-tighter flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Environmental Impact Trend (Last 30 Days)
              </h3>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorCo2" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="5%"
                        stopColor="#10b981"
                        stopOpacity={0.3}
                      />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#334155"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="date"
                    stroke="#64748b"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    dy={10}
                  />
                  <YAxis
                    stroke="#64748b"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1e293b",
                      border: "none",
                      borderRadius: "12px",
                      fontSize: "12px",
                    }}
                    itemStyle={{ color: "#10b981" }}
                  />
                  <Area
                    type="monotone"
                    dataKey="co2"
                    name="CO2 Saved (kg)"
                    stroke="#10b981"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorCo2)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-emerald-500/5 blur-[120px] pointer-events-none" />
      </section>

      <section id="features" className="py-24 px-6 max-w-7xl mx-auto">
        <div className="mb-16 md:text-center max-w-3xl mx-auto">
          <h2 className="text-3xl md:text-5xl font-bold text-slate-900 mb-6">
            Everything you need for a <br />
            <span className="text-emerald-600">secure campus commute.</span>
          </h2>
        </div>
        <div className="grid md:grid-cols-3 gap-6 auto-rows-[300px]">
          <div className="md:col-span-2 bg-white rounded-3xl p-8 border border-slate-100 shadow-lg hover:shadow-xl transition-all group overflow-hidden relative">
            <div className="relative z-10 h-full flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-2xl mb-4">
                  🛡️
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-2">
                  Domain-Locked Security
                </h3>
                <p className="text-slate-600 max-w-md">
                  No strangers. We strictly restrict access to verified email
                  domains.
                </p>
              </div>
            </div>
          </div>

          <div className="row-span-2 bg-slate-900 rounded-3xl p-8 shadow-2xl flex flex-col justify-between relative overflow-hidden">
            <div className="relative z-10">
              <h3 className="text-2xl font-bold text-white mb-2">
                Collective Impact
              </h3>
              <p className="text-slate-400 text-sm">
                Real-time emissions saved by our community.
              </p>
            </div>
            <div className="relative z-10 space-y-4">
              {dynamicStats.map((stat, idx) => (
                <div
                  key={idx}
                  className="bg-slate-800/50 backdrop-blur border border-slate-700 p-4 rounded-xl transition-all hover:border-slate-500"
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-2xl text-white">{stat.icon}</span>
                    <span className={`text-xl font-bold ${stat.color}`}>
                      {stat.value}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-gradient-to-br from-pink-50 to-rose-50 rounded-3xl p-8 border border-pink-100 transition-all flex flex-col justify-center items-center text-center">
            <div className="w-16 h-16 bg-white rounded-full shadow-sm flex items-center justify-center text-3xl mb-4">
              👩‍🎓
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">
              Women-First Filters
            </h3>
          </div>

          <div className="bg-white rounded-3xl p-8 border border-slate-100 transition-all relative overflow-hidden group">
            <div className="relative z-10">
              <h3 className="text-xl font-bold text-slate-900 mb-2">
                Polyline Algo
              </h3>
            </div>
            <div className="absolute bottom-0 left-0 w-full h-24 flex items-end px-8 pb-8 gap-1 opacity-50">
              <div className="w-1/4 h-8 bg-emerald-200 rounded-t-lg"></div>
              <div className="w-1/4 h-16 bg-emerald-300 rounded-t-lg"></div>
              <div className="w-1/4 h-20 bg-emerald-500 rounded-t-lg"></div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Landing;