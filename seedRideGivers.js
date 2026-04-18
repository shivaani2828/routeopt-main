import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";

export const seedRideGivers = async () => {

  const demoRides = [
    {
      driverEmail: "alice@ves.ac.in",
      source: "Andheri West",
      destination: "VESIT Campus",
      seats: 3,
      genderPreference: false,
      sameInstitution: true,
      institutionDomain: "ves.ac.in",
      departure: "09:00 AM",
      status: "open",
    },
    {
      driverEmail: "saniya@ves.ac.in",
      source: "Ghatkopar East",
      destination: "VESIT Campus",
      seats: 2,
      genderPreference: true,
      sameInstitution: true,
      institutionDomain: "ves.ac.in",
      departure: "09:15 AM",
      status: "open",
    },
    {
      driverEmail: "rohan@ves.ac.in",
      source: "Chembur",
      destination: "VESIT Campus",
      seats: 1,
      genderPreference: false,
      sameInstitution: true,
      institutionDomain: "ves.ac.in",
      departure: "08:45 AM",
      status: "open",
    },
    {
      driverEmail: "neha@ves.ac.in",
      source: "Kurla",
      destination: "VESIT Campus",
      seats: 3,
      genderPreference: true,
      sameInstitution: true,
      institutionDomain: "ves.ac.in",
      departure: "09:30 AM",
      status: "open",
    },
    {
      driverEmail: "amit@iitb.ac.in",
      source: "Powai",
      destination: "IIT Bombay",
      seats: 2,
      genderPreference: false,
      sameInstitution: true,
      institutionDomain: "iitb.ac.in",
      departure: "10:00 AM",
      status: "open",
    },
    {
      driverEmail: "priya@iitb.ac.in",
      source: "Vikhroli",
      destination: "IIT Bombay",
      seats: 1,
      genderPreference: true,
      sameInstitution: true,
      institutionDomain: "iitb.ac.in",
      departure: "09:45 AM",
      status: "open",
    },
    {
      driverEmail: "rahul@tcs.com",
      source: "Thane",
      destination: "TCS Office Powai",
      seats: 4,
      genderPreference: false,
      sameInstitution: true,
      institutionDomain: "tcs.com",
      departure: "10:30 AM",
      status: "open",
    },
    {
      driverEmail: "anita@tcs.com",
      source: "Mulund",
      destination: "TCS Office Powai",
      seats: 2,
      genderPreference: true,
      sameInstitution: true,
      institutionDomain: "tcs.com",
      departure: "10:00 AM",
      status: "open",
    },
    {
      driverEmail: "kabir@startup.io",
      source: "Bandra",
      destination: "BKC Tech Hub",
      seats: 3,
      genderPreference: false,
      sameInstitution: false,
      institutionDomain: "startup.io",
      departure: "11:00 AM",
      status: "open",
    },
    {
      driverEmail: "meera@startup.io",
      source: "Santacruz",
      destination: "BKC Tech Hub",
      seats: 1,
      genderPreference: true,
      sameInstitution: false,
      institutionDomain: "startup.io",
      departure: "11:15 AM",
      status: "open",
    },
    {
      driverEmail: "arjun@company.com",
      source: "Lower Parel",
      destination: "Corporate Park",
      seats: 2,
      genderPreference: false,
      sameInstitution: false,
      institutionDomain: "company.com",
      departure: "09:50 AM",
      status: "open",
    },
  ];

  try {
    for (const ride of demoRides) {
      await addDoc(collection(db, "rides"), {
        ...ride,
        createdAt: serverTimestamp(),
      });
    }

    console.log("✅ Demo ride givers seeded");
    alert("Seeding completed successfully!");
  } catch (error) {
    console.error("❌ Seeding failed", error);
    alert("Seeding failed — check console");
  }
};
