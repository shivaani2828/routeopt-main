import React, { useState, useEffect } from "react";
import { db, auth } from "../firebase"; // 🔥 Added auth import
import { signOut } from "firebase/auth"; // 🔥 Added signOut import
import { useNavigate } from "react-router-dom"; // 🔥 Added for redirection
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  updateDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";
import {
  AreaChart,
  Area,
  XAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import toast from "react-hot-toast";

const AdminDashboard = () => {
  const navigate = useNavigate(); // 🔥 Hook for redirection
  const [alerts, setAlerts] = useState([]);
  const [pendingUsers, setPendingUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // 🔥 Selected User for Detailed Review Modal
  const [selectedUser, setSelectedUser] = useState(null);

  const [stats, setStats] = useState({
    totalUsers: 0,
    activeRides: 0,
    totalCo2Saved: "0.0",
  });
  const [chartData, setChartData] = useState([]);

  // 🔥 Logout Function
  const handleLogout = async () => {
    try {
      await signOut(auth);
      localStorage.removeItem("user"); // Clear local storage session
      toast.success("Admin logged out successfully");
      navigate("/auth"); // Redirect to login page
    } catch (error) {
      console.error("Logout error:", error);
      toast.error("Failed to log out");
    }
  };

  useEffect(() => {
    // 1. SOS FEED
    const qAlerts = query(
      collection(db, "sos_alerts"),
      orderBy("timestamp", "desc")
    );
    const unsubAlerts = onSnapshot(qAlerts, (snapshot) => {
      setAlerts(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    // 2. PENDING VERIFICATIONS LISTENER
    const qPending = query(
      collection(db, "users"),
      where("verificationStatus", "==", "pending")
    );
    const unsubPending = onSnapshot(qPending, (snapshot) => {
      setPendingUsers(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });

    // 3. STATS LISTENER
    const unsubRides = onSnapshot(collection(db, "rides"), (snapshot) => {
      let totalKm = 0;
      let activeCount = 0;
      const monthlyMap = {};

      snapshot.docs.forEach((doc) => {
        const ride = doc.data();
        const distance = parseFloat(ride.distance || 0);
        totalKm += distance;

        if (["requested", "accepted", "ongoing"].includes(ride.status))
          activeCount++;

        if (ride.createdAt) {
          const month = ride.createdAt
            .toDate()
            .toLocaleString("default", { month: "short" });
          if (!monthlyMap[month]) monthlyMap[month] = 0;
          monthlyMap[month] += distance * 0.12;
        }
      });

      setStats((prev) => ({
        ...prev,
        activeRides: activeCount,
        totalCo2Saved: (totalKm * 0.12).toFixed(1),
      }));

      setChartData(
        Object.keys(monthlyMap).map((m) => ({
          name: m,
          saved: parseFloat(monthlyMap[m].toFixed(1)),
        }))
      );
    });

    const unsubUsers = onSnapshot(collection(db, "users"), (snapshot) => {
      setStats((prev) => ({ ...prev, totalUsers: snapshot.size }));
    });

    return () => {
      unsubAlerts();
      unsubPending();
      unsubRides();
      unsubUsers();
    };
  }, []);

  // --- ACTIONS ---

  const resolveAlert = async (id, userName) => {
    try {
      const alertRef = doc(db, "sos_alerts", id);
      await updateDoc(alertRef, {
        status: "RESOLVED",
        dispatchedAt: serverTimestamp(),
      });
      toast.success(`Security dispatched for ${userName}`);
    } catch (error) {
      toast.error("Failed to update status");
    }
  };

  const handleApproveUser = async (uid, name) => {
    try {
      await updateDoc(doc(db, "users", uid), {
        isVerified: true,
        verificationStatus: "verified",
      });
      toast.success(`${name} Approved ✅`);
      setSelectedUser(null); // Close modal
    } catch (error) {
      toast.error("Approval failed");
    }
  };

  const handleRejectUser = async (uid, name) => {
    if (!window.confirm("Are you sure you want to reject this user?")) return;
    try {
      await updateDoc(doc(db, "users", uid), {
        verificationStatus: "rejected",
      });
      toast.success(`${name} Rejected ❌`);
      setSelectedUser(null); // Close modal
    } catch (error) {
      toast.error("Rejection failed");
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] p-4 md:p-8 font-sans antialiased text-slate-900 relative">
      <div className="max-w-7xl mx-auto">
        {/* HEADER */}
        <header className="mb-10 flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-black uppercase tracking-tighter italic">
              Admin Dashboard
            </h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
              Real-time Security & Identity Management
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-white rounded-xl shadow-sm border border-slate-100">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-wider">
                System: Secure
              </span>
            </div>
            
            {/* 🔥 LOGOUT BUTTON */}
            <button
              onClick={handleLogout}
              className="px-5 py-2.5 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-red-600 transition-all shadow-lg active:scale-95"
            >
              Log Out
            </button>
          </div>
        </header>

        {/* STATS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          <StatCard
            title="Pending IDs"
            value={pendingUsers.length}
            color={
              pendingUsers.length > 0 ? "text-amber-500" : "text-slate-400"
            }
          />
          <StatCard
            title="Active SOS"
            value={alerts.filter((a) => a.status === "ACTIVE").length}
            color="text-red-600"
          />
          <StatCard
            title="Active Rides"
            value={stats.activeRides}
            color="text-emerald-600"
          />
          <StatCard
            title="CO₂ Saved"
            value={`${stats.totalCo2Saved}kg`}
            color="text-blue-600"
          />
        </div>

        <div className="grid lg:grid-cols-12 gap-8">
          {/* LEFT: ACTIONS */}
          <div className="lg:col-span-5 space-y-8">
            {/* SOS FEED */}
            <div>
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                🚨 Security Feed
              </h3>
              <div className="space-y-4 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
                {alerts.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 bg-white rounded-[2rem] border-2 border-dashed border-slate-200 text-xs font-bold">
                    No Active Emergencies
                  </div>
                ) : (
                  alerts.map((alert) => (
                    <div
                      key={alert.id}
                      className={`p-5 rounded-3xl border-l-8 shadow-sm transition-all ${
                        alert.status === "ACTIVE"
                          ? "bg-red-50 border-red-500"
                          : "bg-white border-slate-200 opacity-60"
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                            alert.status === "ACTIVE"
                              ? "bg-red-600 text-white animate-pulse"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {alert.status}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400">
                          {alert.timestamp?.toDate().toLocaleTimeString()}
                        </span>
                      </div>
                      <h4 className="font-bold text-slate-900">
                        {alert.userName}
                      </h4>
                      <div className="flex gap-2 mt-4">
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${alert.location?.lat},${alert.location?.lng}`}
                          target="_blank"
                          rel="noreferrer"
                          className="flex-1 py-2 bg-white border border-slate-200 text-slate-600 text-[10px] font-bold rounded-xl text-center hover:bg-slate-50 transition"
                        >
                          VIEW MAP
                        </a>
                        {alert.status === "ACTIVE" && (
                          <button
                            onClick={() =>
                              resolveAlert(alert.id, alert.userName)
                            }
                            className="flex-1 py-2 bg-red-600 text-white text-[10px] font-black rounded-xl hover:bg-red-700 transition shadow-lg shadow-red-100"
                          >
                            DISPATCH
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* 🔥 PENDING VERIFICATIONS LIST */}
            <div>
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                🆔 Verification Queue{" "}
                <span className="text-amber-500">({pendingUsers.length})</span>
              </h3>
              <div className="space-y-4 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
                {pendingUsers.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 bg-white rounded-[2rem] border-2 border-dashed border-slate-200 text-xs font-bold">
                    All Users Verified
                  </div>
                ) : (
                  pendingUsers.map((user) => (
                    <div
                      key={user.id}
                      className="bg-white p-5 rounded-3xl shadow-sm border border-amber-100 relative overflow-hidden"
                    >
                      <div className="absolute top-0 right-0 w-12 h-12 bg-amber-50 rounded-bl-full z-0"></div>
                      <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-lg font-bold">
                            {user.name?.[0]}
                          </div>
                          <div>
                            <h4 className="font-bold text-slate-900 text-sm">
                              {user.name}
                            </h4>
                            <p className="text-[10px] text-slate-500 font-mono">
                              {user.email}
                            </p>
                          </div>
                        </div>

                        {/* Review Button */}
                        <button
                          onClick={() => setSelectedUser(user)}
                          className="w-full mt-2 py-2.5 bg-slate-900 text-white text-[10px] font-bold rounded-xl hover:bg-slate-800 transition shadow-md"
                        >
                          REVIEW DETAILS 🔍
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* RIGHT: ANALYTICS */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm relative overflow-hidden">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-8">
                Sustainability Analytics
              </h3>
              <div className="h-64 w-full">
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient
                          id="colorSaved"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="5%"
                            stopColor="#10b981"
                            stopOpacity={0.2}
                          />
                          <stop
                            offset="95%"
                            stopColor="#10b981"
                            stopOpacity={0}
                          />
                        </linearGradient>
                      </defs>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                        stroke="#f1f5f9"
                      />
                      <XAxis
                        dataKey="name"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 10, fill: "#94a3b8" }}
                        dy={10}
                      />
                      <Tooltip
                        contentStyle={{
                          borderRadius: "16px",
                          border: "none",
                          boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)",
                          fontSize: "12px",
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="saved"
                        stroke="#10b981"
                        fillOpacity={1}
                        fill="url(#colorSaved)"
                        strokeWidth={3}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-slate-400 uppercase tracking-widest font-bold animate-pulse">
                    Waiting for ride data...
                  </div>
                )}
              </div>
            </div>

            <div className="bg-slate-900 p-6 rounded-[2rem] text-white">
              <h4 className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-2">
                System Log
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed font-medium">
                Admin actions are permanent. Please verify the email domain
                matches the institution before approving pending requests
                manually.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 🔥 DETAILS MODAL */}
      {selectedUser && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[2rem] p-8 max-w-md w-full shadow-2xl relative max-h-[90vh] overflow-y-auto custom-scrollbar">
            <button
              onClick={() => setSelectedUser(null)}
              className="absolute top-6 right-6 text-slate-400 hover:text-slate-600"
            >
              ✕
            </button>

            <h2 className="text-xl font-black text-slate-900 mb-6 uppercase tracking-tighter italic">
              Verification Review
            </h2>

            <div className="space-y-4 mb-8">
              {/* 📸 SUBMITTED IMAGE */}
              <div className="mb-6">
                <p className="text-xs font-bold text-slate-400 uppercase mb-2">
                  Submitted ID Card
                </p>
                <div className="rounded-2xl overflow-hidden border-2 border-slate-100 bg-slate-50 shadow-inner flex justify-center">
                  {selectedUser.idCardImage ? (
                    <img
                      src={selectedUser.idCardImage}
                      alt="User Submitted ID"
                      className="w-full h-auto max-h-[300px] object-contain"
                    />
                  ) : (
                    <div className="p-8 text-center text-slate-400 text-xs font-bold">
                      🚫 No Image Data Found
                    </div>
                  )}
                </div>
              </div>

              {/* USER CLAIMED DATA */}
              <div className="bg-slate-50 p-4 rounded-xl">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                  User Claimed
                </p>
                <DetailRow label="Name" value={selectedUser.name} />
                <DetailRow label="Email" value={selectedUser.email} />
              </div>

              {/* 🤖 AI DETECTED DATA */}
              <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100">
                <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-2">
                  AI Analysis
                </p>

                <DetailRow
                  label="Name on ID"
                  value={selectedUser.studentName || "Not Detected"}
                />

                <DetailRow
                  label="Institution on ID"
                  value={selectedUser.aiInstitution || "Not Detected"}
                />

                <div className="flex justify-between items-center pt-2 mt-1 border-t border-emerald-100">
                  <span className="text-xs font-bold text-slate-400 uppercase">
                    Match Status
                  </span>
                  <span
                    className={`text-xs font-bold ${
                      selectedUser.verificationStatus === "verified"
                        ? "text-emerald-600"
                        : "text-amber-600"
                    }`}
                  >
                    {selectedUser.verificationReason || "Pending Review"}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() =>
                  handleApproveUser(selectedUser.id, selectedUser.name)
                }
                className="py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl transition shadow-lg shadow-emerald-200 text-sm"
              >
                ✅ APPROVE
              </button>
              <button
                onClick={() =>
                  handleRejectUser(selectedUser.id, selectedUser.name)
                }
                className="py-3 bg-white border-2 border-slate-100 text-slate-500 hover:border-red-100 hover:text-red-500 font-bold rounded-xl transition text-sm"
              >
                ❌ REJECT
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const StatCard = ({ title, value, color }) => (
  <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
      {title}
    </p>
    <h3 className={`text-3xl font-black mt-1 ${color}`}>{value}</h3>
  </div>
);

const DetailRow = ({ label, value }) => (
  <div className="flex justify-between items-center border-b border-slate-200/50 last:border-0 pb-2 mb-2 last:mb-0 last:pb-0">
    <span className="text-xs font-bold text-slate-400 uppercase">{label}</span>
    <span className="text-sm font-bold text-slate-900">{value}</span>
  </div>
);

export default AdminDashboard;