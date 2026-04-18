import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import axios from 'axios';
import { db } from '../firebase';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';

const RideTaker = () => {
  const navigate = useNavigate();
  const [user] = useState(() => JSON.parse(localStorage.getItem('user')) || null);

  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rides, setRides] = useState([]);
  
  const [filters, setFilters] = useState({
    source: '',
    destination: '',
    timeMode: 'immediate',
    scheduledTime: '',
    genderPreference: false,
    sameInstitution: false 
  });

  // --- 🧮 HELPER: Haversine Distance ---
  const getDistanceFromLatLonInKm = (lat1, lon1, lat2, lon2) => {
    const R = 6371; 
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; 
  };

  const deg2rad = (deg) => deg * (Math.PI / 180);

  // --- 🧠 INTELLIGENCE: Get Index of Closest Point ---
  const getClosestPointOnRoute = (userCoords, routePath) => {
    if (!userCoords || !routePath || routePath.length === 0) return null;
    
    let minDistance = Infinity;
    let closestIndex = -1;

    routePath.forEach((point, index) => {
        const dist = getDistanceFromLatLonInKm(userCoords.lat, userCoords.lng, point.lat, point.lng);
        if (dist < minDistance) {
            minDistance = dist;
            closestIndex = index;
        }
    });

    return { index: closestIndex, distance: minDistance };
  };

  // --- 🌍 GEOCODING WITH LOCATION BIAS ---
  const getCoordinates = async (address) => {
    try {
        console.log(`🌍 Geocoding: ${address}`);
        // 👇 FIX: Added lat=19.07&lon=72.87 to bias results towards Mumbai
        // This prevents "Amar Mahal" from resolving to Jaipur/Jammu
        const res = await axios.get(`https://photon.komoot.io/api/?q=${encodeURIComponent(address)}&limit=1&lat=19.07&lon=72.87`);
        
        if (res.data.features.length > 0) {
            const feature = res.data.features[0];
            const [lng, lat] = feature.geometry.coordinates;
            
            // Log what city it found to help debug
            const city = feature.properties.city || feature.properties.state || "Unknown Area";
            console.log(`✅ Found: ${address} in ${city} (${lat}, ${lng})`);
            
            return { lat, lng, city };
        }
        console.warn(`❌ No Coords found for ${address}`);
        return null;
    } catch (err) {
        console.error("Geocoding failed", err);
        return null;
    }
  };

  const getDomain = (email) => {
    if (!email) return "";
    return email.split('@')[1].toLowerCase();
  };

  const handleSearch = async () => {
    if (!user) {
        toast.error("Please login to search for rides");
        navigate('/auth');
        return;
    }
    if (!filters.source || !filters.destination) {
      toast.error("Please enter source and destination");
      return;
    }

    setSearching(true);
    setLoading(true);
    const toastId = toast.loading("Analyzing routes...");

    try {
      // 1. Get Coordinates with Local Bias
      const [sourceData, destData] = await Promise.all([
          getCoordinates(filters.source),
          getCoordinates(filters.destination)
      ]);
      
      if (!sourceData || !destData) {
          toast.error("Could not locate places. Try adding 'Mumbai' to the name.", { id: toastId });
          setLoading(false);
          return;
      }

      // 2. Fetch Active Rides
      const q = query(
        collection(db, "rides"), 
        where("status", "==", "ACTIVE"),
        orderBy("createdAt", "desc")
      );
      
      const querySnapshot = await getDocs(q);
      const fetchedRides = [];
      const takerDomain = getDomain(user.email);

      querySnapshot.forEach((doc) => {
        const ride = { id: doc.id, ...doc.data() };
        const giverDomain = getDomain(ride.driverEmail);
        const isSameOrg = takerDomain === giverDomain;

        // Privacy Filters
        if (ride.sameInstitution && !isSameOrg) return;
        if (filters.sameInstitution && !isSameOrg) return;
        if (filters.genderPreference && user.gender && ride.driverGender) {
             if (ride.driverGender.toLowerCase() !== user.gender.toLowerCase()) return;
        }

        // --- 🧠 ROUTE INTELLIGENCE ---
        const pickupMatch = getClosestPointOnRoute(sourceData, ride.routeGeometry);
        const dropoffMatch = getClosestPointOnRoute(destData, ride.routeGeometry);

        let isRouteMatch = false;

        if (pickupMatch && dropoffMatch) {
            // 5km Buffer
            const isPickupNear = pickupMatch.distance <= 5.0; 
            const isDropoffNear = dropoffMatch.distance <= 5.0;
            
            // 👇 FIX: Use <= to allow short trips starting at index 0
            const isCorrectDirection = pickupMatch.index <= dropoffMatch.index;

            if (isPickupNear && isDropoffNear && isCorrectDirection) {
                isRouteMatch = true;
            }
        }

        // Text Fallback
        const textMatch = ride.source.toLowerCase().includes(filters.source.toLowerCase()) && 
                          ride.destination.toLowerCase().includes(filters.destination.toLowerCase());

        if (isRouteMatch || textMatch) {
            ride.isSameOrg = isSameOrg; 
            ride.matchType = isRouteMatch ? 'ROUTE_MATCH' : 'TEXT_MATCH';
            fetchedRides.push(ride);
        }
      });

      fetchedRides.sort((a, b) => (a.isSameOrg === b.isSameOrg) ? 0 : a.isSameOrg ? -1 : 1);
      setRides(fetchedRides);

      if (fetchedRides.length === 0) {
          toast.error("No matches found. Try specific landmarks.", { id: toastId });
      } else {
          toast.success(`Found ${fetchedRides.length} rides!`, { id: toastId });
      }

    } catch (error) {
      console.error("Search Error:", error);
      toast.error("Failed to fetch rides.", { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-9xl mx-auto px-6 py-8 flex flex-col md:flex-row gap-8">
        
        {/* --- LEFT: Filter Panel --- */}
        <aside className="w-full md:w-1/4 space-y-6">
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 sticky top-24">
            <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
              <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
              Filters
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-md font-bold text-slate-700 mb-2 ml-1">Pickup Location</label>
                <input 
                  type="text" placeholder="e.g. Chembur Naka" 
                  onChange={(e) => setFilters({...filters, source: e.target.value})}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all text-sm" 
                />
              </div>

              <div>
                <label className="block text-md font-bold text-slate-700 mb-2 ml-1">Destination</label>
                <input 
                  type="text" placeholder="e.g. Amar Mahal" 
                  onChange={(e) => setFilters({...filters, destination: e.target.value})}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all text-sm" 
                />
              </div>

              {/* Toggles */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                  <span className="font-bold text-emerald-900 text-md">Same-Gender Only</span>
                  <button type="button" onClick={() => setFilters({...filters, genderPreference: !filters.genderPreference})} className={`w-10 h-5 rounded-full relative transition-colors ${filters.genderPreference ? 'bg-emerald-600' : 'bg-slate-300'}`}>
                    <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${filters.genderPreference ? 'left-5' : 'left-1'}`} />
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 bg-blue-50 rounded-2xl border border-blue-100">
                  <div>
                    <span className="font-bold text-blue-900 text-md block">Same Institution</span>
                    <p className="text-sm text-blue-700">Verify via campus email</p>
                  </div>
                  <button type="button" onClick={() => setFilters({...filters, sameInstitution: !filters.sameInstitution})} className={`w-10 h-5 rounded-full relative transition-colors ${filters.sameInstitution ? 'bg-blue-600' : 'bg-slate-300'}`}>
                    <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${filters.sameInstitution ? 'left-5' : 'left-1'}`} />
                  </button>
                </div>
              </div>

              <button 
                onClick={handleSearch}
                disabled={loading}
                className="w-full bg-slate-900 text-md text-white font-bold py-4 rounded-2xl hover:bg-slate-800 transition shadow-xl active:scale-95 mt-4 disabled:bg-slate-400"
              >
                {loading ? "Analyzing Routes..." : "Find Best Matches"}
              </button>
            </div>
          </div>
        </aside>

        {/* --- RIGHT: Ride Cards --- */}
        <main className="w-full md:w-3/4">
          {!searching ? (
            <div className="bg-white rounded-3xl p-20 text-center border-2 border-dashed border-slate-200">
              <div className="text-5xl mb-4 text-slate-200">🔍</div>
              <p className="text-slate-400 font-bold text-lg tracking-tight">Enter your route. We verify direction and proximity.</p>
            </div>
          ) : (
            <div className="grid gap-6 animate-in fade-in slide-in-from-right-4 duration-500">
              {rides.length === 0 && !loading && (
                 <div className="text-center p-10 text-slate-500">
                    No matching rides found.<br/><span className="text-sm text-slate-400">Try checking the spelling or adding "Mumbai" to the location.</span>
                 </div>
              )}
              
              {rides.map((ride) => (
                <div key={ride.id} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl transition-all group relative overflow-hidden">
                  
                  {ride.matchType === 'ROUTE_MATCH' && (
                    <div className="absolute top-0 left-0 bg-emerald-500 text-white text-[10px] font-bold px-3 py-1 rounded-br-xl shadow-sm z-10">
                        ✨ DIRECTION MATCH
                    </div>
                  )}

                  {ride.isSameOrg && (
                    <div className="absolute top-0 right-0 bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-bl-xl shadow-sm z-10">
                        SAME ORGANIZATION
                    </div>
                  )}

                  <div className="flex flex-col md:flex-row justify-between gap-6 pt-2">
                     <div className="flex gap-4">
                      <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center text-2xl shadow-inner border border-white overflow-hidden">
                        {ride.driverImage ? <img src={ride.driverImage} className="w-full h-full object-cover" /> : "👤"}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 text-lg">{ride.driverName}</h4>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                            {ride.distance} km • {ride.duration} min
                        </p>
                      </div>
                    </div>

                    <div className="flex-grow md:px-8 border-l border-slate-100">
                      <div className="flex items-start gap-3 mb-3">
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 mt-1.5 ring-4 ring-emerald-100" />
                        <p className="text-sm font-semibold text-slate-600 tracking-tight">{ride.source}</p>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="w-2.5 h-2.5 rounded-full bg-slate-300 mt-1.5 ring-4 ring-slate-100" />
                        <p className="text-sm font-black text-slate-900 tracking-tight">{ride.destination}</p>
                      </div>
                    </div>

                    <div className="text-right flex flex-col justify-between items-end min-w-[120px]">
                      <div className="bg-emerald-50 text-emerald-700 px-4 py-1.5 rounded-xl text-sm font-black shadow-sm border border-emerald-100">
                        {ride.departureTime === 'NOW' ? 'Leaving Now' : new Date(ride.departureTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>

                      <button 
                        onClick={() => navigate(`/ride-details/${ride.id}`, {
                            state: { 
                                userPickup: filters.source, 
                            } 
                        })}
                        className="text-emerald-600 font-bold text-sm hover:text-emerald-700..."
                      >
                        View Details <span className="text-lg">→</span>
                      </button>
                    </div>

                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default RideTaker;