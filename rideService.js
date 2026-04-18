// web/src/services/rideService.js
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../firebase";

/**
 * Fetches all rides that match the user's organization domain.
 * Replaces the old backend route: GET /api/rides/:domain
 */
export const fetchRidesByDomain = async (domain) => {
  try {
    // Safety check: if no domain is passed, return empty list
    if (!domain) {
      console.warn("No domain provided to fetchRidesByDomain");
      return [];
    }

    const ridesRef = collection(db, "rides");

    // Create a query against the 'rides' collection
    const q = query(ridesRef, where("orgDomain", "==", domain));

    // Execute the query
    const querySnapshot = await getDocs(q);

    // Convert the weird Firebase format into a normal array
    const rides = [];
    querySnapshot.forEach((doc) => {
      rides.push({ id: doc.id, ...doc.data() });
    });

    return rides;
  } catch (error) {
    console.error("Error fetching rides:", error);
    // Return empty array so the app doesn't crash
    return [];
  }
};
