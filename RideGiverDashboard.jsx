import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import toast from 'react-hot-toast';
import useLiveLocation from '../hooks/useLiveLocation';

import { db } from '../firebase';
import { 
  collection, query, where, onSnapshot, 
  doc, updateDoc, increment, arrayUnion, orderBy, limit 
} from 'firebase/firestore';

const routeIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  iconSize: [20, 32], iconAnchor: [10, 32]
});

const passengerIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  iconSize: [20, 32], iconAnchor: [10, 32]
});

const requestIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-gold.png',
  iconSize: [20, 32], iconAnchor: [10, 32]
});

const driverLiveIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
});

const isValidCoords = (coords) => {
    return coords && typeof coords.lat === 'number' && typeof coords.lng === 'number';
};

const MapBounds = ({ route, passengers, selectedReq }) => {
  const map = useMap();
  useEffect(() => {
    if (!route || route.length === 0) return;
    const bounds = L.latLngBounds(route); 
    passengers.forEach(p => {
      if(isValidCoords(p.pickupCoords)) bounds.extend([p.pickupCoords.lat, p.pickupCoords.lng]);
    });
    if(isValidCoords(selectedReq?.pickupCoords)) bounds.extend([selectedReq.pickupCoords.lat, selectedReq.pickupCoords.lng]);
    if (bounds.isValid()) map.fitBounds(bounds, { padding: [30, 30] });
  }, [route, passengers, selectedReq, map]);
  return null;
};

const RideGiverDashboard = () => {
  const navigate = useNavigate();
  const [user] = useState(() => JSON.parse(localStorage.getItem('user')));
  const [requests, setRequests] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [currentRideRoute, setCurrentRideRoute] = useState([]);
  const [rideDetails, setRideDetails] = useState(null);
  const [confirmedPassengers, setConfirmedPassengers] = useState([]);

  const { myLocation: driverLiveLoc, othersLocations: passengerLiveLocs } = useLiveLocation(
        rideDetails?.id,  
        user?.uid,      
        'driver'      
    );

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "rides"),
      where("driverId", "==", user.uid),
      where("status", "==", "ACTIVE"),
      orderBy("createdAt", "desc"),
      limit(1)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const rideDoc = snapshot.docs[0];
        const rideData = rideDoc.data();
        setRideDetails({ id: rideDoc.id, ...rideData });
        setConfirmedPassengers(rideData.passengers || []);
        if (rideData.routeGeometry && Array.isArray(rideData.routeGeometry)) {
          const polyline = rideData.routeGeometry.filter(p => isValidCoords(p)).map(p => [p.lat, p.lng]);
          setCurrentRideRoute(polyline);
        }
      } else {
        setRideDetails(null); 
        setConfirmedPassengers([]);
        setCurrentRideRoute([]);
      }
    });
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "ride_requests"), where("driverId", "==", user.uid), where("status", "==", "PENDING"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
        const liveRequests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setRequests(liveRequests);
        if (liveRequests.length > 0 && !selectedRequest) setSelectedRequest(liveRequests[0]);
    });
    return () => unsubscribe();
  }, [user]);

  const handleAccept = async () => {
    if (!selectedRequest || !rideDetails) return;
    const toastId = toast.loading("Confirming...");
    try {
        await updateDoc(doc(db, "ride_requests", selectedRequest.id), { status: "ACCEPTED" });
        await updateDoc(doc(db, "rides", rideDetails.id), {
            seatsAvailable: increment(-1),
            passengers: arrayUnion({
                uid: selectedRequest.takerId,
                name: selectedRequest.takerName,
                pickupCoords: selectedRequest.pickupCoords || null, 
                pickupLocation: selectedRequest.pickupLocation || "Unknown"
            })
        });
        toast.success("Passenger Added!", { id: toastId });
        setSelectedRequest(null);
    } catch (error) {
        toast.error("Failed to accept.");
    }
  };

  const handleDecline = async () => {
    if (!selectedRequest) return;
    try {
        await updateDoc(doc(db, "ride_requests", selectedRequest.id), { status: "REJECTED" });
        toast.success("Request Declined");
        setSelectedRequest(null);
    } catch (error) {
        toast.error("Error declining");
    }
  };

  const handleFinishRide = async () => {
      if(!rideDetails) return;
      if(!window.confirm("Finish this ride?")) return;
      const toastId = toast.loading("Finishing...");
      try {
          await updateDoc(doc(db, "rides", rideDetails.id), { status: "COMPLETED" });
          toast.success("Ride Completed!", { id: toastId });
          navigate('/history');
      } catch (e) { toast.error("Error."); }
  };

  if (!rideDetails && currentRideRoute.length === 0) {
      return (
          <div className="h-[90vh] flex items-center justify-center bg-slate-50 p-4">
              <div className="bg-white p-8 rounded-3xl shadow-xl text-center max-w-sm">
                  <div className="text-5xl mb-4">🅿️</div>
                  <h2 className="text-xl font-bold text-slate-900 mb-2">No Active Ride</h2>
                  <button onClick={() => navigate('/ride-giver')} className="bg-emerald-600 text-white w-full py-3 rounded-xl font-bold hover:bg-emerald-700 transition text-sm">Post New Ride</button>
              </div>
          </div>
      );
  }

  return (
    <div className="h-[85vh] max-h-[85vh] m-2 w-[99%] rounded-3xl bg-slate-50 flex flex-col md:flex-row overflow-hidden border-b border-slate-200">      

      <div className="w-full md:w-[30%] lg:w-[25%] bg-white border-r border-slate-200 flex flex-col h-full z-10 shadow-xl">
        <div className="p-4 border-b border-slate-100 bg-slate-50">
            <h1 className="text-lg font-black text-slate-900 mb-0.5 flex items-center gap-2">🚖 Dashboard</h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase truncate mb-3">
                {rideDetails.source} → {rideDetails.destination}
            </p>
            <button onClick={handleFinishRide} className="w-full py-2.5 bg-slate-900 text-white rounded-xl font-bold text-md hover:bg-slate-800 transition flex items-center justify-center gap-2">
                🏁 Finish Ride
            </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
            <div>
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Waitlist ({requests.length})</h3>
                {requests.length === 0 ? (
                    <div className="p-3 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-center text-slate-400 text-xs italic">No pending requests</div>
                ) : (
                    requests.map(req => (
                        <div key={req.id} onClick={() => setSelectedRequest(req)}
                            className={`p-3 rounded-xl border-2 cursor-pointer transition-all mb-1.5 ${selectedRequest?.id === req.id ? 'border-amber-400 bg-amber-50' : 'border-transparent bg-white shadow-sm'}`}
                        >
                            <div className="flex justify-between items-center">
                                <div>
                                    <h4 className="font-bold text-slate-900 text-md">{req.takerName}</h4>
                                    <p className="text-sm font-bold text-amber-600 mt-0.5 truncate max-w-[120px]">📍 {req.pickupLocation}</p>
                                </div>
                                <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <div>
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">On Board ({confirmedPassengers.length})</h3>
                {confirmedPassengers.map((p, i) => (
                    <div key={i} className="flex items-center gap-2.5 p-2.5 bg-emerald-50/50 rounded-xl border border-emerald-100 mb-1.5">
                        <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-black text-sm">{p.name ? p.name[0] : '?'}</div>
                        <div className="min-w-0">
                            <p className="text-md font-bold text-slate-800 truncate">{p.name || 'User'}</p>
                            <p className="text-sm text-slate-400  font-bold truncate tracking-tight ">📍 {p.pickupLocation}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>

        {selectedRequest && (
            <div className="p-3 bg-white border-t border-slate-100">
                <p className="text-sm text-center text-slate-400 mb-2">Decision for <span className="font-bold text-slate-600">{selectedRequest.takerName}</span></p>
                <div className="flex gap-2">
                    <button onClick={handleDecline} className="flex-1 py-2 rounded-lg font-bold bg-slate-50 text-slate-500 text-sm hover:bg-slate-100">Decline</button>
                    <button onClick={handleAccept} className="flex-1 py-2 rounded-lg font-bold bg-emerald-500 text-white text-sm hover:bg-emerald-600 shadow-sm">Accept</button>
                </div>
            </div>
        )}
      </div>

      <div className="flex-1 bg-slate-200 relative h-full">
        <MapContainer center={[19.0760, 72.8777]} zoom={11} style={{ height: '100%', width: '100%' }}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <MapBounds route={currentRideRoute} passengers={confirmedPassengers} selectedReq={selectedRequest} />
            {currentRideRoute.length > 0 && (
                <>
                    <Polyline positions={currentRideRoute} color="#0f172a" weight={3} opacity={0.6} dashArray="8, 8" />
                    <Marker position={currentRideRoute[0]} icon={routeIcon} />
                    <Marker position={currentRideRoute[currentRideRoute.length - 1]} icon={routeIcon} />
                </>
            )}
            {confirmedPassengers.map((p, i) => isValidCoords(p.pickupCoords) && (
                <Marker key={i} position={[p.pickupCoords.lat, p.pickupCoords.lng]} icon={passengerIcon} />
            ))}
            {isValidCoords(selectedRequest?.pickupCoords) && (
                <Marker position={[selectedRequest.pickupCoords.lat, selectedRequest.pickupCoords.lng]} icon={requestIcon} zIndexOffset={1000} />
            )}
            {driverLiveLoc && (
                <Marker position={[driverLiveLoc.lat, driverLiveLoc.lng]} icon={driverLiveIcon} zIndexOffset={1000}>
                    <Popup>You (Live)</Popup>
                </Marker>
            )}

            {confirmedPassengers.map((p, i) => {
                const liveData = passengerLiveLocs[p.uid];
                const position = liveData ? [liveData.lat, liveData.lng] : (isValidCoords(p.pickupCoords) ? [p.pickupCoords.lat, p.pickupCoords.lng] : null);

                if (!position) return null;

                    return (
                        <Marker key={p.uid || i} position={position} icon={passengerIcon}>
                            <Popup>
                                <b>{p.name}</b><br/>
                                {liveData ? "Live Location" : "Pickup Point"}
                            </Popup>
                        </Marker>
                    )
                })}
        </MapContainer>

        <div className="absolute top-3 right-3 bg-white/90 backdrop-blur px-3 py-2.5 rounded-xl shadow-lg z-[1000] border border-white/50 text-[10px] space-y-1.5 font-bold">
            <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-blue-500"></div> You (Live)</div>
            <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-slate-900"></div> Route</div>
            <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> Passenger</div>
            <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-amber-400"></div> Request</div>
        </div>
      </div>
    </div>
  );
};

export default RideGiverDashboard;