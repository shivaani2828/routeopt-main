import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../firebase";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
  getDoc,
} from "firebase/firestore";
import QRCode from "react-qr-code";
import toast from "react-hot-toast";

const RideHistory = () => {
  const navigate = useNavigate();
  const [user] = useState(() => JSON.parse(localStorage.getItem("user")));
  const [activeTab, setActiveTab] = useState("taker");

  const [requests, setRequests] = useState([]);
  const [postedRides, setPostedRides] = useState([]);

  const [payModalData, setPayModalData] = useState(null);

  const getDynamicCost = (distance) => {
    const dist = parseFloat(distance || 0);
    return Math.round(20 + dist * 10);
  };

  const handleUpdateGlobalUPI = async (upiId) => {
    if (!upiId) return toast.error("Please enter a UPI ID");
    try {
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, { driverUpi: upiId });

      const updatedUser = { ...user, driverUpi: upiId };
      localStorage.setItem("user", JSON.stringify(updatedUser));

      toast.success("Your Global UPI ID is set for all rides!");
    } catch (error) {
      console.error("Error updating global UPI:", error);
      toast.error("Failed to save UPI ID");
    }
  };

  const handlePassengerPay = async (req) => {
    try {
      const driverRef = doc(db, "users", req.driverId);
      const driverSnap = await getDoc(driverRef);

      const driverUpi = driverSnap.exists()
        ? driverSnap.data().driverUpi
        : null;
      const fare = req.pricePerSeat || getDynamicCost(req.distance || 0);

      setPayModalData({
        ...req,
        fare,
        driverUpi: driverUpi, 
      });
    } catch (error) {
      console.error("Error fetching Driver UPI:", error);
      toast.error("Could not fetch driver payment details");
    }
  };

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "ride_requests"),
      where("takerId", "==", user.uid)
    );
    const unsub = onSnapshot(q, (snap) => {
      setRequests(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsub();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "rides"), where("driverId", "==", user.uid));
    const unsub = onSnapshot(q, (snap) => {
      setPostedRides(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsub();
  }, [user]);

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-12">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-black text-slate-900 mb-8 tracking-tighter uppercase italic">
          My Activity
        </h1>

        <div className="flex p-1 bg-white rounded-xl shadow-sm border border-slate-100 mb-8 w-fit">
          <button
            onClick={() => setActiveTab("taker")}
            className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${
              activeTab === "taker"
                ? "bg-slate-900 text-white shadow-md"
                : "text-slate-500 hover:bg-slate-50"
            }`}
          >
            Passenger
          </button>
          <button
            onClick={() => setActiveTab("giver")}
            className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${
              activeTab === "giver"
                ? "bg-slate-900 text-white shadow-md"
                : "text-slate-500 hover:bg-slate-50"
            }`}
          >
            Driver
          </button>
        </div>

        {activeTab === "giver" && (
          <div className="bg-emerald-900 text-white p-6 rounded-2xl mb-8 shadow-xl border border-emerald-700 flex flex-col md:flex-row justify-between items-center gap-4">
            <div>
              <h2 className="font-bold text-lg">My Payment Info</h2>
              <p className="text-emerald-200 text-[10px] uppercase font-bold tracking-widest">
                Set your UPI once for all rides
              </p>
            </div>
            <div className="flex items-center gap-2 w-full md:w-auto">
              <input
                type="text"
                id="global-upi-input"
                placeholder="yourname@upi"
                defaultValue={user.driverUpi || ""}
                className="bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-400 flex-1 md:w-64"
              />
              <button
                onClick={() =>
                  handleUpdateGlobalUPI(
                    document.getElementById("global-upi-input").value
                  )
                }
                className="bg-emerald-500 text-slate-900 font-black text-[10px] uppercase px-6 py-2.5 rounded-lg hover:bg-emerald-400 transition"
              >
                Save
              </button>
            </div>
          </div>
        )}

        <div className="space-y-4">
          {activeTab === "taker" &&
            (requests.length === 0 ? (
              <p className="text-slate-400 italic">No ride requests found.</p>
            ) : (
              requests.map((req) => (
                <div
                  key={req.id}
                  className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4"
                >
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <span
                        className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ${
                          req.status === "ACCEPTED"
                            ? "bg-emerald-100 text-emerald-700"
                            : req.status === "REJECTED"
                            ? "bg-red-100 text-red-700"
                            : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {req.status}
                      </span>
                      <span className="text-xs text-slate-400 font-medium">
                        {req.timestamp?.toDate().toLocaleDateString()}
                      </span>
                    </div>
                    <h3 className="font-bold text-slate-900 text-lg">
                      Pickup: {req.pickupLocation}
                    </h3>
                    <p className="text-sm text-slate-500 font-bold uppercase">
                      Driver: {req.driverName || "Unknown"}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2 justify-end">
                  {req.status === "ACCEPTED" && (
                    <>
                      <button
                        onClick={() => navigate(`/live/${req.rideId}`)}
                        className="px-5 py-3 bg-slate-900 text-white font-bold rounded-xl shadow-sm hover:bg-slate-800 transition flex items-center gap-2 text-sm animate-pulse"
                      >
                        <span>🔴</span> Live Track
                      </button>

                      <button
                        onClick={() => handlePassengerPay(req)}
                        className="px-5 py-3 bg-emerald-600 text-white font-bold rounded-xl shadow-lg shadow-emerald-200 hover:bg-emerald-700 transition flex items-center gap-2 text-sm"
                      >
                        <span>💸</span> Pay Fare
                      </button>
                    </>
                  )}
                </div>
              </div>
              ))
            ))}

          {activeTab === "giver" &&
            (postedRides.length === 0 ? (
              <p className="text-slate-400 italic">
                You haven't posted any rides.
              </p>
            ) : (
              postedRides.map((ride) => {
                const seatPrice =
                  ride.pricePerSeat || getDynamicCost(ride.distance);
                const totalEarned = (ride.passengers?.length || 0) * seatPrice;
                return (
                  <div
                    key={ride.id}
                    className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100"
                  >
                    <h3 className="font-bold text-slate-900 text-lg">
                      {ride.source} ➝ {ride.destination}
                    </h3>
                    <div className="flex gap-4 mt-2 text-sm text-slate-500">
                      <span>📅 {ride.departureTime}</span>
                      <span className="text-emerald-600 font-bold">
                        💰 Earned: ₹{totalEarned}
                      </span>
                    </div>
                  </div>
                );
              })
            ))}
        </div>
      </div>

      {payModalData && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[2000] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-8 max-sm w-full shadow-2xl relative">
            <button
              onClick={() => setPayModalData(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
            >
              ✕
            </button>

            <div className="text-center">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center text-3xl mx-auto mb-4">
                💸
              </div>
              <h3 className="text-xl font-black text-slate-900 mb-1">
                Payment
              </h3>
              <p className="text-slate-500 text-xs mb-6 font-medium">
                Scanning QR for Driver:{" "}
                <span className="text-emerald-600">
                  {payModalData.driverName}
                </span>
              </p>

              <div className="bg-white p-4 rounded-2xl border-2 border-slate-900 inline-block shadow-inner mb-6">
                <QRCode
                  value={`upi://pay?pa=${
                    payModalData.driverUpi || "merchant@upi"
                  }&pn=${payModalData.driverName}&am=${
                    payModalData.fare || 0
                  }&cu=INR`}
                  size={180}
                  viewBox={`0 0 180 180`}
                />
              </div>

              <div className="bg-slate-50 p-4 rounded-xl mb-4 border border-slate-100">
                <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">
                  Total Amount
                </p>
                <p className="text-4xl font-black text-slate-900">
                  ₹{payModalData.fare || 0}
                </p>
                <p className="text-[10px] text-slate-400 mt-2 truncate italic">
                  UPI: {payModalData.driverUpi || "Not set by driver"}
                </p>
              </div>

              <button
                onClick={() => {
                  setPayModalData(null);
                  alert("Payment marked as done! (Demo)");
                }}
                className="w-full py-3.5 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition uppercase tracking-widest text-[10px]"
              >
                I have Paid
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RideHistory;
