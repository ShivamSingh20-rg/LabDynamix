import React from 'react';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import StudentDashboard from './pages/StudentDashboard';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';      
import AdminSidebar from './Admin/AdminSidebar';   
import AdminDashboard from './Admin/AdminDashboard';
import StudentResourcePage from './pages/StudentResource';
import AdminResource from "./Admin/pages/AdminResource";  
import AdminUsers from "./Admin/pages/AdminUser";
import FacultySidebar from "./Faculty/FacultySidebar";
import FacultyDashboard from "./Faculty/pages/FacultyDash";
import Loginpage from "./pages/Loginpage";
import NotificationBell from "./components/Notification";
import Lab from "./Admin/pages/Lab";
import FacultyApprovedBookings from "./Faculty/pages/facultyapproved";
import ResourceDetails from "./pages/ResourceDetailpage";
import FacultyLab from "./Faculty/pages/FacultyLabs";
import BookingDetail from "./pages/BookingDetail";
import StudentRequest from "./Admin/pages/StudentRequest";
import MyBookings from "./pages/MyBooking";
import FacultyNOtifications from "./Faculty/pages/Notification";
import StudentBookingRequest from "./Faculty/pages/Bookingrequest";
import { useAuth } from './context/Authcontext'; 

export default function App() {
  const { user, loading, handleLogout } = useAuth();
  const location = useLocation();

  const hasOAuthCode = new URLSearchParams(location.search).has('code');

  if (loading) {
    return (
      <div className="min-h-screen bg-[#090d16] flex items-center justify-center text-indigo-400 font-bold gap-2">
        <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        Authenticating session with backend...
      </div>
    );
  } 

  const role = user?.role?.toLowerCase() || 'student';
  const isAdmin = role === 'admin';
  const isFaculty = role === 'faculty';

  const getInitialRedirect = () => {
    if (isAdmin) return '/admin/dashboard';
    if (isFaculty) return '/faculty/dashboard';
    return '/resources';  
  };

  return (
    <div className="min-h-screen bg-[#090d16] text-gray-100 flex flex-col">
      {/* ToastContainer placed at top level to ensure high z-index fixed positioning */}
      <ToastContainer 
        position="top-right" 
        theme="dark" 
        autoClose={3000} 
        pauseOnHover 
        closeOnClick 
      />

      <Navbar user={user} handleLogout={handleLogout} />

      <div className="flex flex-1 overflow-hidden">
        {/* Render Sidebars based on Role */}
        {isAdmin && <AdminSidebar user={user} handleLogout={handleLogout} />}
        {isFaculty && <FacultySidebar user={user} handleLogout={handleLogout} />}
        {!isAdmin && !isFaculty && <Sidebar user={user} />}

        <main className="flex-1 p-6 overflow-y-auto">
          <Routes>
            {/* Root Route Handler */}
            <Route 
              path="/" 
              element={
                hasOAuthCode ? (
                  <div className="text-indigo-400 font-semibold p-4">Processing Google Login...</div>
                ) : (
                  <Navigate to={getInitialRedirect()} replace />
                )
              } 
            />

            {/* Student / Shared Routes */}
            <Route path="/resources" element={<StudentResourcePage user={user} />} />
            <Route path="/Manual-login" element={<Loginpage />} />
            
            {/* Support both singular and plural paths to prevent redirect wipes */}
            <Route path="/resource/:id" element={<ResourceDetails user={user} />} />
            <Route path="/resources/:id" element={<ResourceDetails user={user} />} />
            <Route path="/student/dashboard" element={<StudentDashboard user={user} />} />
            <Route path="/notifications" element={<NotificationBell />} />
            <Route path="/my-bookings" element={<MyBookings user={user} />} />

            <Route path="/booking/:id" element={<BookingDetail user={user} />} />
            {/* Faculty Protected Routes */}
            <Route 
              path="/faculty/dashboard" 
              element={isFaculty ? <FacultyDashboard user={user} /> : <Navigate to="/" replace />} 
            /> 
            <Route 
              path="/faculty/my-labs" 
              element={isFaculty ? <FacultyLab user={user} /> : <Navigate to="/" replace />} 
            />
            <Route 
              path="/faculty/requests" 
              element={isFaculty ? <StudentBookingRequest user={user} /> : <Navigate to="/" replace />} />
<Route path="/faculty/approved" 
              element={isFaculty ? <FacultyApprovedBookings user={user} /> : <Navigate to="/" replace />} 
            />
            <Route 
              path="/faculty/notifications" 
              element={isFaculty ? <FacultyNOtifications user={user} /> : <Navigate to="/" replace />} 
            />
            {/* Admin Protected Routes */}
            <Route 
              path="/admin/dashboard" 
              element={isAdmin ? <AdminDashboard user={user} /> : <Navigate to="/" replace />} 
            />
            <Route 
              path="/admin/labs" 
              element={isAdmin ? <Lab user={user} /> : <Navigate to="/" replace />} 
            />
            <Route 
              path="/admin/resources" 
              element={isAdmin ? <AdminResource user={user} /> : <Navigate to="/" replace />} 
            />
            <Route 
              path="/admin/users" 
              element={isAdmin ? <AdminUsers user={user} /> : <Navigate to="/" replace />} 
            />
            <Route 
              path="/admin/requests" 
              element={isAdmin ? <StudentRequest user={user} /> : <Navigate to="/" replace />} 
            />

            {/* Catch-all Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}