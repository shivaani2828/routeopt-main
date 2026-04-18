import React, { useState } from "react";
import { db } from "../firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import toast from "react-hot-toast";

const SOSButton = ({ user }) => {
  if (!user) return null;

  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleConfirmSOS = () => {
    if (!user) {
      toast.error("You must be logged in!");
      return;
    }

    setLoading(true);
    setShowConfirm(false);

    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported");
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;

        try {
          await addDoc(collection(db, "sos_alerts"), {
            uid: user.uid || "guest-id",
            userName: user.name || "Unknown User",
            email: user.email || "No Email",
            location: { lat: latitude, lng: longitude },
            status: "ACTIVE",
            timestamp: serverTimestamp(),
            college: "VESIT",
          });

          toast.success("🚨 EMERGENCY ALERT SENT! Security Notified.", {
            duration: 6000,
            icon: "👮‍♂️",
            style: {
              background: "#ef4444",
              color: "#fff",
              fontWeight: "bold",
              padding: "16px",
            },
          });
        } catch (error) {
          console.error("SOS Error:", error);
          toast.error("Failed to send alert.");
        } finally {
          setLoading(false);
        }
      },
      (error) => {
        toast.error("Unable to retrieve location.");
        setLoading(false);
      }
    );
  };

  return (
    <>
      {showConfirm && (
        <div className="fixed bottom-24 right-6 z-[1050] animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div className="bg-white border-2 border-red-100 rounded-2xl shadow-2xl p-4 w-64">
            <div className="flex items-center gap-2 mb-3 text-red-600 font-bold border-b border-red-50 pb-2">
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              Confirm Emergency?
            </div>
            <p className="text-xs text-slate-500 mb-4">
              This will share your live location with Campus Security
              immediately.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 px-3 py-2 text-sm font-semibold text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmSOS}
                className="flex-1 px-3 py-2 text-sm font-bold text-white bg-red-600 rounded-lg hover:bg-red-700 shadow-md shadow-red-200 transition"
              >
                CONFIRM
              </button>
            </div>
          </div>
          <div className="absolute -bottom-2 right-6 w-4 h-4 bg-white border-b-2 border-r-2 border-red-100 transform rotate-45"></div>
        </div>
      )}

      <button
        onClick={() => setShowConfirm(!showConfirm)}
        disabled={loading}
        className={`fixed bottom-6 right-6 z-[1050] group flex items-center justify-center w-14 h-14 rounded-full shadow-xl border-4 border-white transition-all duration-300 hover:scale-105 ${
          loading
            ? "bg-slate-400 cursor-not-allowed"
            : showConfirm
            ? "bg-red-600 rotate-45"
            : "bg-red-600 hover:bg-red-700"
        }`}
        title="Emergency SOS"
      >
        {loading ? (
          <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
        ) : (
          <span
            className={`text-2xl transition-transform duration-300 ${
              showConfirm ? "rotate-45" : ""
            }`}
          >
            {showConfirm ? "➕" : "🆘"}
          </span>
        )}
      </button>

      {showConfirm && (
        <div
          onClick={() => setShowConfirm(false)}
          className="fixed inset-0 bg-white/50 backdrop-blur-sm z-[1040]"
        />
      )}
    </>
  );
};

export default SOSButton;
