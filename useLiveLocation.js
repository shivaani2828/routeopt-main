import { useEffect, useState, useRef } from 'react';
import { rtdb } from '../firebase';
import { ref, set, onValue, off } from 'firebase/database';
import toast from 'react-hot-toast';

const useLiveLocation = (rideId, userId, role) => {
    const [myLocation, setMyLocation] = useState(null);
    const [othersLocations, setOthersLocations] = useState({});
    const watchIdRef = useRef(null);

    useEffect(() => {
        if (!rideId || !userId) return;

        if (!navigator.geolocation) {
            toast.error("Geolocation is not supported by your browser.");
            return;
        }

        const myLocRefStr = role === 'driver'
            ? `live_trips/${rideId}/driver`
            : `live_trips/${rideId}/passengers/${userId}`;
        const myLocDbRef = ref(rtdb, myLocRefStr);

        const successHandler = (position) => {
            const { latitude, longitude } = position.coords;
            const newLoc = { lat: latitude, lng: longitude };
            setMyLocation(newLoc);

            set(myLocDbRef, {
                lat: latitude,
                lng: longitude,
                timestamp: Date.now()
            }).catch(err => console.error("Error writing location to RTDB:", err));
        };

        const errorHandler = (error) => {
            console.error("Error getting location:", error);
            toast.error("Could not get your live location.");
        };

        watchIdRef.current = navigator.geolocation.watchPosition(
            successHandler,
            errorHandler,
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );

        return () => {
            if (watchIdRef.current !== null) {
                navigator.geolocation.clearWatch(watchIdRef.current);
            }
        };
    }, [rideId, userId, role]);

    useEffect(() => {
        if (!rideId) return;

        const pathToListento = role === 'driver'
            ? `live_trips/${rideId}/passengers`
            : `live_trips/${rideId}/driver`;     

        const othersRef = ref(rtdb, pathToListento);

        const listener = onValue(othersRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                setOthersLocations(data);
            } else {
                setOthersLocations({});
            }
        });

        return () => {
            off(othersRef, listener);
        };
    }, [rideId, role]);

    return { myLocation, othersLocations };
};

export default useLiveLocation;