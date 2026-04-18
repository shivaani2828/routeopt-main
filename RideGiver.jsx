import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from 'react-leaflet';
import L from 'leaflet';
import axios from 'axios';
import toast from 'react-hot-toast';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

// Fix Leaflet Icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

const RideGiver = () => {
  const navigate = useNavigate();
  const [user] = useState(() => JSON.parse(localStorage.getItem('user')));

  const [source, setSource] = useState("");
  const [destination, setDestination] = useState("");
  const [seats, setSeats] = useState(3);
  const [dateTime, setDateTime] = useState('');
  const [sameGender, setSameGender] = useState(false);
  const [sameInstitution, setSameInstitution] = useState(false);

  const [route, setRoute] = useState(null);
  const [distance, setDistance] = useState(null);
  const [duration, setDuration] = useState(null);
  const [sourceCoords, setSourceCoords] = useState(null);
  const [calculatedPrice, setCalculatedPrice] = useState(0);

  const [loading, setLoading] = useState(false);

  const getCoordinates = async (address) => {
    try {
      const res = await axios.get(
        `https://photon.komoot.io/api/?q=${encodeURIComponent(
          address
        )}&limit=1&lat=19.07&lon=72.87`
      );
      if (res.data.features.length > 0) {
        const [lng, lat] = res.data.features[0].geometry.coordinates;
        return { lat, lng };
      }
      return null;
    } catch (error) {
      return null;
    }
  };

  const handleCalculateRoute = async (e) => {
    e.preventDefault();
    if (!source || !destination) return toast.error("Please enter both locations");
    setLoading(true);
    const toastId = toast.loading("Calculating...");

    try {
      const srcCoords = await getCoordinates(source);
      const destCoords = await getCoordinates(destination);
      if (!srcCoords || !destCoords) {
        toast.error("Locations not found", { id: toastId });
        setLoading(false);
        return;
      }
      setSourceCoords(srcCoords); 

      const response = await axios.get(
        `https://router.project-osrm.org/route/v1/driving/${srcCoords.lng},${srcCoords.lat};${destCoords.lng},${destCoords.lat}?overview=full&geometries=geojson`
      );

      if (response.data.routes.length > 0) {
        const routeData = response.data.routes[0];
        const decodedPath = routeData.geometry.coordinates.map(coord => ({ lat: coord[1], lng: coord[0] }));
        setRoute(decodedPath);
        const distKm = (routeData.distance / 1000).toFixed(1);
        setDistance(distKm);
        setDuration(Math.round(routeData.duration / 60));
        const price = Math.round(distKm * 7);
        setCalculatedPrice(price < 10 ? 10 : price); 
        toast.success(`Route Found`, { id: toastId });
      }
    } catch (error) {
      toast.error("Error calculating route", { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  // --- Updated handlePostRide with Storage Fix & Custom Toast ---
const handlePostRide = async () => {
  if (!route || !user) return;

  // Custom Toast Confirmation
  toast((t) => (
    <div className="flex flex-col gap-4 min-w-[300px] p-2">
      <div className="flex items-center gap-3">
        <span className="text-3xl">🚗</span>
        <p className="text-lg font-bold text-slate-800">
          Post ride for <span className="text-emerald-600">₹{calculatedPrice}</span>?
        </p>
      </div>
      
      <div className="flex justify-end gap-3 mt-2">
        <button
          onClick={() => toast.dismiss(t.id)}
          className="px-5 py-2 text-sm font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition"
        >
          Cancel
        </button>
        <button
          onClick={() => {
            toast.dismiss(t.id);
            executePostRide(); // Triggers actual Firebase logic
          }}
          className="px-6 py-2 text-sm font-bold bg-emerald-600 text-white rounded-xl shadow-lg hover:bg-emerald-700 transition active:scale-95"
        >
          Confirm
        </button>
      </div>
    </div>
  ), {
    duration: 8000,
    position: 'top-center',
    style: { borderRadius: '24px', padding: '16px', border: '1px solid #e2e8f0' }
  });
};

// --- Actual Execution Logic ---
const executePostRide = async () => {
  setLoading(true);
  const toastId = toast.loading("Finalizing your ride...");

  try {
    // ⚠️ IMPORTANT: If driverImage is a massive Base64 string, 
    // it will cause the 1MB error. We use a placeholder for now 
    // or you should integrate Firebase Storage here.
    const safeImageUrl = user.profileImage?.length > 100000 
      ? "" // Clear if too big to prevent crash
      : user.profileImage || "";

    await addDoc(collection(db, "rides"), {
      driverId: user.uid,
      driverName: user.name,
      driverEmail: user.email,
      driverImage: safeImageUrl,
      source,
      sourceCoords,
      destination,
      seatsAvailable: parseInt(seats),
      departureTime: dateTime || "NOW",
      distance,
      duration,
      routeGeometry: route,
      pricePerSeat: calculatedPrice,
      status: "ACTIVE",
      createdAt: serverTimestamp(),
      passengers: []
    });

    toast.success("Ride Posted Successfully!", { id: toastId });
    navigate('/ride-giver-dashboard');
  } catch (error) {
    console.error(error);
    toast.error("Failed to post ride. Image might be too large.", { id: toastId });
  } finally {
    setLoading(false);
  }
};

  const RecenterMap = ({ coords }) => {
    const map = useMap();
    useEffect(() => {
      if (coords) map.setView([coords[0].lat, coords[0].lng], 13);
    }, [coords, map]);
    return null;
  };

  if (!user) return <div className="p-10 text-center font-bold">Please Login First</div>;

  return (
    <div className="h-[85vh] max-h-[85vh] m-2 bg-slate-50 flex flex-col md:flex-row overflow-hidden border-b border-slate-200 shadow-sm">
      {/* LEFT: FORM - Spacing and fonts reduced by ~25% */}
      <div className="w-full md:w-1/3 p-4 md:p-6 bg-white border-r border-slate-200 overflow-y-auto z-10 custom-scrollbar">
        <h1 className="text-3xl font-black text-slate-900 mb-1">Offer a Ride</h1>
        <p className="text-md text-slate-500 mb-4 font-medium ">Share your car, Save cost.</p>

        <form onSubmit={handleCalculateRoute} className="space-y-3">
          <div>
            <label className="block text-sm font-bold text-slate-500 mb-0.5 ml-1">Pickup Location</label>
            <input 
              type="text" required 
              className="w-full p-2.5 bg-slate-50 rounded-xl border border-slate-200 focus:ring-1 focus:ring-emerald-500 outline-none text-md font-medium"
              placeholder="Chembur Naka"
              value={source} onChange={(e) => setSource(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-500 mb-0.5 ml-1">Destination</label>
            <input 
              type="text" required 
              className="w-full p-2.5 bg-slate-50 rounded-xl border border-slate-200 focus:ring-1 focus:ring-emerald-500 outline-none text-md font-medium"
              placeholder="VESIT Campus"
              value={destination} onChange={(e) => setDestination(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
             <div>
                <label className="block text-sm font-bold text-slate-500  mb-0.5 ml-1">Seats</label>
                <input 
                  type="number" min="1" max="6" required 
                  className="w-full p-2.5 bg-slate-50 rounded-xl border border-slate-200 outline-none font-bold text-md"
                  value={seats} onChange={(e) => setSeats(e.target.value)}
                />
             </div>
             <div>
                <label className="block text-sm font-bold text-slate-500  mb-0.5 ml-1">Time</label>
                <input 
                  type="datetime-local" 
                  className="w-full p-2.5 bg-slate-50 rounded-xl border border-slate-200 outline-none text-md font-bold"
                  value={dateTime} onChange={(e) => setDateTime(e.target.value)}
                />
             </div>
          </div>

          {/* SAFETY PREFERENCES SECTION - Tightened padding */}
          <div className="space-y-1.5 pt-1">
            <h3 className="text-sm font-bold text-slate-500  ml-1">Security Filters</h3>
            
            <div className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition-all ${sameGender ? 'bg-emerald-50 border-emerald-500' : 'bg-white border-slate-200'}`} onClick={() => setSameGender(!sameGender)}>
                <div className="flex items-center gap-2.5">
                    <span className="text-2xl">👩‍🦰</span>
                    <div>
                        <p className={`text-sm font-bold ${sameGender ? 'text-emerald-900' : 'text-slate-700'}`}>Same Gender Only</p>
                        <p className="text-xs text-slate-400 font-medium tracking-tight">Only {user.gender || 'verified'} users</p>
                    </div>
                </div>
                <div className={`w-8 h-4 rounded-full relative ${sameGender ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                    <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${sameGender ? 'left-4.5' : 'left-0.5'}`} />
                </div>
            </div>

            <div className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition-all ${sameInstitution ? 'bg-blue-50 border-blue-500' : 'bg-white border-slate-200'}`} onClick={() => setSameInstitution(!sameInstitution)}>
                <div className="flex items-center gap-2.5">
                    <span className="text-2xl">🎓</span>
                    <div>
                        <p className={`text-sm font-bold ${sameInstitution ? 'text-blue-900' : 'text-slate-700'}`}>Same Institution Only</p>
                        <p className="text-xs text-slate-400 font-medium tracking-tight">Email domain verification</p>
                    </div>
                </div>
                <div className={`w-8 h-4 rounded-full relative ${sameInstitution ? 'bg-blue-500' : 'bg-slate-300'}`}>
                    <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${sameInstitution ? 'left-4.5' : 'left-0.5'}`} />
                </div>
            </div>
          </div>

          <button 
            type="submit" disabled={loading}
            className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold text-sm shadow-lg hover:bg-slate-800 transition active:scale-95 disabled:opacity-50 uppercase tracking-widest"
          >
            {loading ? "Calculating..." : "Preview Route"}
          </button>
        </form>

        {/* PRICE PREVIEW CARD - Compact layout */}
        {distance && (
          <div className="mt-4 animate-in slide-in-from-bottom-2 fade-in duration-300">
             <div className="bg-emerald-50 border border-emerald-100 p-3 rounded-xl relative overflow-hidden">
                <div className="flex justify-between items-center">
                   <div>
                      <p className="text-[10px] font-bold text-emerald-600 uppercase">Est. Earning</p>
                      <h3 className="text-xl font-black text-emerald-900 leading-none mt-0.5">₹{calculatedPrice}<span className="text-sm font-normal">/seat</span></h3>
                   </div>
                   <div className="text-right">
                      <p className="text-sm font-bold text-slate-700">{distance} km</p>
                      <p className="text-[9px] text-slate-400 font-bold uppercase">Distance</p>
                   </div>
                </div>
             </div>

             <button 
               onClick={handlePostRide} disabled={loading}
               className="w-full mt-2 py-3 bg-emerald-600 text-white rounded-xl font-bold text-sm shadow-xl hover:bg-emerald-700 transition active:scale-95 uppercase tracking-tight"
             >
               Confirm & Post Ride
             </button>
          </div>
        )}
      </div>

      {/* RIGHT: MAP - Full height minus the form wrapper */}
      <div className="flex-1 bg-slate-200 relative h-full">
        <MapContainer center={[19.0760, 72.8777]} zoom={11} style={{ height: '100%', width: '100%' }}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          {route && <RecenterMap coords={route} />}
          {route && (
              <>
                <Polyline positions={route} color="#10b981" weight={5} opacity={0.6} />
                <Marker position={[route[0].lat, route[0].lng]}><Popup>Start</Popup></Marker>
                <Marker position={[route[route.length-1].lat, route[route.length-1].lng]}><Popup>End</Popup></Marker>
              </>
          )}
        </MapContainer>
      </div>
    </div>
  );
};

export default RideGiver;