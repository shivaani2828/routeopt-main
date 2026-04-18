import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { db } from '../firebase';
import { doc, onSnapshot, getDoc } from 'firebase/firestore';
import useLiveLocation from '../hooks/useLiveLocation'; 

const routeIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  iconSize: [20, 32], iconAnchor: [10, 32]
});

const passengerIcon = new L.Icon({ 
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
});

const driverIcon = new L.Icon({ 
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
});

const isValidCoords = (coords) => {
    return coords && typeof coords.lat === 'number' && typeof coords.lng === 'number';
};

const MapBounds = ({ route, driverLoc, passengerLoc }) => {
  const map = useMap();
  useEffect(() => {
    if (!route || route.length === 0) return;
    const bounds = L.latLngBounds(route);
    if (isValidCoords(driverLoc)) bounds.extend([driverLoc.lat, driverLoc.lng]);
    if (isValidCoords(passengerLoc)) bounds.extend([passengerLoc.lat, passengerLoc.lng]);
    if (bounds.isValid()) map.fitBounds(bounds, { padding: [50, 50] });
  }, [route, driverLoc, passengerLoc, map]);
  return null;
};

const RideTakerLiveView = () => { 
    const [rideDetails, setRideDetails] = useState(null);
    const [driverInfo, setDriverInfo] = useState(null);
    const [currentRideRoute, setCurrentRideRoute] = useState([]);
    const { rideId } = useParams();
    const [user] = useState(() => JSON.parse(localStorage.getItem('user')));
    
    useEffect(() => {
        if (!rideId) return;

        const rideRef = doc(db, 'rides', rideId);
        const unsubscribe = onSnapshot(rideRef, async (docSnap) => {
            if (docSnap.exists()) {
                const rideData = docSnap.data();
                setRideDetails({ id: docSnap.id, ...rideData });

                if (rideData.routeGeometry && Array.isArray(rideData.routeGeometry)) {
                    const polyline = rideData.routeGeometry.filter(p => isValidCoords(p)).map(p => [p.lat, p.lng]);
                    setCurrentRideRoute(polyline);
                }

                if (rideData.driverId) {
                    const driverUserRef = doc(db, 'users', rideData.driverId);
                    const driverSnap = await getDoc(driverUserRef);
                    if (driverSnap.exists()) {
                        setDriverInfo(driverSnap.data());
                    }
                }
            } else {
                setRideDetails(null);
            }
        });

        return () => unsubscribe();
    }, [rideId]);

    const { myLocation: passengerLiveLoc, othersLocations: driverLiveLocData } = useLiveLocation(
        rideId,         
        user?.uid,      
        'passenger'    
    );

    const driverLiveLoc = driverLiveLocData;


    if (!rideDetails || currentRideRoute.length === 0) {
        return <div className="p-8 text-center text-slate-500">Loading ride details...</div>;
    }

    return (
        <div className="h-[85vh] max-h-[85vh] m-2 w-[99%] rounded-3xl bg-slate-50 flex flex-col md:flex-row overflow-hidden border-b border-slate-200 shadow-xl">

            <div className="w-full md:w-[30%] lg:w-[25%] bg-white border-r border-slate-200 flex flex-col h-full z-10">
                <div className="p-6 border-b border-slate-100 bg-slate-50">
                    <h1 className="text-xl font-black text-slate-900 mb-2 flex items-center gap-2">
                        🚗 Your Ride
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] rounded-full uppercase tracking-wider">Live</span>
                    </h1>
                    <p className="text-sm font-bold text-slate-700 truncate">
                        {rideDetails.source} → {rideDetails.destination}
                    </p>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
      
                    {driverInfo && (
                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                             <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Driver Details</h3>
                             <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-black text-lg">
                                    {driverInfo.name ? driverInfo.name[0] : 'D'}
                                </div>
                                <div>
                                    <h4 className="font-bold text-slate-900 text-md">{driverInfo.name || "Driver"}</h4>
                                    <p className="text-xs text-slate-500 font-medium">Example Car Model • MH-01-AB-1234</p>
                                </div>
                             </div>
                        </div>
                    )}

                     <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100">
                        <h3 className="text-sm font-bold text-amber-800 mb-1">Driver is on the way!</h3>
                        <p className="text-xs text-amber-600">Keep your app open to share your location.</p>
                    </div>
                </div>
            </div>

            <div className="flex-1 bg-slate-200 relative h-full">
                <MapContainer center={currentRideRoute[0] || [19.0760, 72.8777]} zoom={13} style={{ height: '100%', width: '100%' }}>
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

                    <MapBounds route={currentRideRoute} driverLoc={driverLiveLoc} passengerLoc={passengerLiveLoc} />

                    {currentRideRoute.length > 0 && (
                        <>
                            <Polyline positions={currentRideRoute} color="#0f172a" weight={4} opacity={0.6} />
                            <Marker position={currentRideRoute[0]} icon={routeIcon}><Popup>Start</Popup></Marker>
                            <Marker position={currentRideRoute[currentRideRoute.length - 1]} icon={routeIcon}><Popup>End</Popup></Marker>
                        </>
                    )}

                    {isValidCoords(passengerLiveLoc) && (
                        <Marker position={[passengerLiveLoc.lat, passengerLiveLoc.lng]} icon={passengerIcon} zIndexOffset={1000}>
                            <Popup>You (Live)</Popup>
                        </Marker>
                    )}

                    {isValidCoords(driverLiveLoc) && (
                        <Marker position={[driverLiveLoc.lat, driverLiveLoc.lng]} icon={driverIcon} zIndexOffset={1001}>
                             <Popup>{driverInfo?.name || "Driver"} (Live)</Popup>
                        </Marker>
                    )}

                </MapContainer>

                <div className="absolute top-3 right-3 bg-white/90 backdrop-blur px-3 py-2.5 rounded-xl shadow-lg z-[1000] border border-white/50 text-[10px] space-y-1.5 font-bold">
                    <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-blue-500"></div> Driver (Live)</div>
                    <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> You (Live)</div>
                    <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-slate-900"></div> Route</div>
                </div>
            </div>
        </div>
    );
};

export default RideTakerLiveView;