📍 RouteOpt : The Secure Commute Ecosystem
Live Demo React Firebase Tailwind CSS

A closed-network carpooling platform designed exclusively for organizations. Secure. Verified. Sustainable.

🔗 Live Deployment : https://routeopt-beige.vercel.app/

📖 Overview
Traffic congestion and unsafe public commuting are major issues for students and employees. Existing solutions like Uber are expensive, while WhatsApp groups are inefficient and unregulated.

RouteOpt is a specialized carpooling platform that restricts access to verified organizational emails (e.g., @ves.ac.in). Unlike standard apps, it uses Polyline Route Matching to find passengers strictly along a driver's actual path, not just at the start or end points. It creates a complete ecosystem with real-time security monitoring and eco-friendly gamification.

🚀 Key Features
🔒 1. Domain-Locked Security & Safety
Verified Access Only : Registration is strictly gated by institutional email domains.
Safety Toggles : Drivers can restrict rides to "Same Gender Only" or "Same Institution Only" for added comfort.
Driver Transparency : Passengers see verified driver profiles and vehicle details before requesting.
🚨 2. Centralized SOS & Admin Dashboard
One-Tap SOS : Users can trigger an emergency alert that instantly logs their live coordinates.
Security Command Center : A dedicated Admin Dashboard acts as a listening authority. It uses real-time listeners to detect SOS alerts instantly.
Dispatch Logic : Admins can view the alert location on Google Maps and mark incidents as "RESOLVED" after dispatching help.
🗺️ 3. Intelligent Route Matching (Polyline Algorithm)
Deviation Logic : We don't just match endpoints. Our algorithm buffers the driver's actual route path (OSRM) to find passengers waiting along the way.
Geocoding Intelligence : Integrated with Photon/OpenStreetMap to convert local landmarks (e.g., "Amar Mahal") into precise coordinates with location biasing for accuracy.
💰 4. Fair Pricing & UPI Payments
Automated Costing : Fare is automatically calculated based on vehicle type (Car/Bike) and distance (e.g., ₹7/km).
Direct Payments : Integrated Dynamic QR Codes allow passengers to pay drivers directly via UPI (GPay/Paytm) without platform fees.
🌱 5. The "Eco-Loop" Gamification
Live Carbon Dashboard : Tracks total CO₂ emissions saved per user.
Dynamic Leaderboard : Real-time ranking of top "Green Commuters" in the organization based on actual ride data.
Analytics : Visual charts showing organization-wide sustainability impact.
🚖 6. Real-Time Ride Management
Driver Dashboard : Interactive map view with color-coded pins for the route (Red), confirmed passengers (Green), and pending requests (Yellow).
Lifecycle Management : Drivers can accept/reject requests and mark rides as "Completed" to archive them.
🛠️ Tech Stack
Component	Technology	Usage
Frontend	React.js (Vite)	Core UI & Component Logic
Styling	Tailwind CSS	Glassmorphism UI & Responsive Design
Backend / DB	Firebase Firestore	Real-time Database & Querying
Auth	Firebase Auth	Email/Password & Session Management
Maps & Routing	Leaflet + React-Leaflet	Interactive Map Rendering
Routing API	OSRM	Calculating Paths & Distances
Geocoding	Photon (Komoot)	Address to Coordinate Conversion
Payments	React-QR-Code	Dynamic UPI Payment Generation
Analytics	Recharts	Data Visualization for Admin Dashboard
📸 Usage Guide
Sign Up : Create an account with your organization email.
Post a Ride (Driver) : Enter start/end points. The app calculates the route, price, and distance automatically.
Find a Ride (Passenger) : Enter your pickup/drop location. The smart filter finds drivers passing within 5km of your route.
Request & Approve : Passenger sends a request; Driver approves via the Dashboard.
Ride & Pay : Meet at the pickup point. On completion, scan the driver's QR code to pay the calculated fare.
Emergency : In case of danger, press the SOS button to alert the Admin Dashboard immediately.

# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
