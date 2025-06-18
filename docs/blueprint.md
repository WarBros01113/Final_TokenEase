# **App Name**: TokenEase

## Core Features:

- Patient Authentication: Patient registration and login using Firebase Authentication (email/password).
- Appointment Booking: Appointment booking with time slot selection and doctor availability check, capped at 15 patients per doctor per slot.
- Token Tracking: Display of live token number, current wait time, and estimated appointment time via Firestore real-time updates.
- Real-Time Chat: Real-time chat between doctor and patient using Firestore, enabling direct communication and file sharing via Firebase Storage.
- Billing & Payments: Billing module calculates total bill based on selected tests. The application allows patients to complete the payment, creating an order via the Razorpay SDK and updates the payment status in Firestore upon success.
- Admin Module: Admin login with role-based access control using Firebase Authentication and Firestore to manage doctors, slots, tests and penalties.
- Penalty System: System to track missed appointments and automatically block bookings after 3 strikes. Timestamps from missed appointments track the length of the cooldown period.

## Style Guidelines:

- Primary color: A refreshing light blue (#7EC4CF) to convey a sense of trust and health.
- Background color: A very light desaturated blue (#F0F8FF) to create a clean and calming environment.
- Accent color: A vibrant green (#90EE90) used for important actions and highlights.
- Body and headline font: 'PT Sans' (sans-serif) for a modern and approachable look.
- Code font: 'Source Code Pro' for displaying code snippets.
- Simple, clean, and modern icons to represent different functions and categories within the app.
- A clean and intuitive layout with clear separation of information for easy navigation and user experience.