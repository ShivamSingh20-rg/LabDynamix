# Labdynamix – Real-Time Lab Resource Scheduling Platform

[![Tech Stack](https://img.shields.io/badge/Stack-MERN-blue.svg)](https://react.dev/)
[![Real-Time](https://img.shields.io/badge/WebSockets-Socket.IO-black.svg)](https://socket.io/)
[![Styling](https://img.shields.io/badge/UI-Tailwind_CSS-38B2AC.svg)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

**Labdynamix** is a full-stack MERN web application designed to automate, streamline, and modernize laboratory resource management and slot scheduling. By replacing legacy, manual booking systems, Labdynamix eliminates scheduling collisions through automated conflict detection, centralized resource management, and real-time status updates powered by WebSockets.

---

## 🚀 Core Features

* **Role-Based Access Control (RBAC):** Granular access management and dedicated dashboards tailored for **Students**, **Faculty**, and **Administrators**.
* **Dynamic Slot Booking & Conflict Detection:** Automated validation engine that cross-checks lab schedules to prevent double-booking or resource overlaps.
* **Approval Workflows:** Structured approval pipelines allowing faculty and administrators to approve, reject, or modify pending lab reservation requests.
* **Real-Time Updates (Socket.IO):** Instant push notifications for booking approvals, status changes, and dynamic resource availability updates across all active user sessions.
* **Centralized Resource Management:** Admin controls to add, update, maintain, and monitor equipment, inventory status, and lab capacity.
* **Analytics & Reporting:** Interactive analytics dashboards for tracking lab utilization rates, peak usage hours, and booking history.

---

## 🛠️ Tech Stack

### **Frontend**
* **Framework:** React.js (Vite)
* **Styling:** Tailwind CSS
* **Real-Time Client:** Socket.io-client
* **State & Routing:** Axios, React Router DOM

### **Backend**
* **Runtime:** Node.js
* **Framework:** Express.js
* **Database:** MongoDB (Mongoose ORM)
* **Real-Time Server:** Socket.IO
* **Authentication:** JSON Web Tokens (JWT) & bcrypt.js

---

## 📁 Repository Structure

```text
Labdynamix/
├── backend/                  # Node.js Express server & API routes
│   ├── config/               # Database & socket setup
│   ├── controllers/          # Request handlers
│   ├── models/               # Mongoose schemas (User, Booking, Resource)
│   ├── routes/               # Express API endpoints
│   ├── middleware/           # Auth & role-validation middleware
│   ├── server.js             # Entry point
│   └── package.json
│
└── Labdynamic/               # React frontend application
    ├── src/
    │   ├── assets/           # Static assets & icons
    │   ├── components/       # Reusable UI components
    │   ├── context/          # Auth & Socket contexts
    │   ├── pages/            # Page layouts & role dashboards
    │   └── services/         # API & Axios configurations
    ├── vercel.json           # Client-side routing configuration
    ├── package.json
    └── vite.config.js
