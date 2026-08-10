import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/Authcontext';
import { useSocket } from '../../context/SocketContext';
import axios from 'axios';
import { BACKEND_URL } from '../../pages/Api';

export default function FacultyDashboard() {
  const { user } = useAuth();
  const { socket } = useSocket();

  // State
  const [stats, setStats] = useState({
    pending: 8,
    approved: 12,
    todayBookings: 4,
    resources: 45,
  });

  const [pendingRequests, setPendingRequests] = useState([
    { id: '1', student: 'Rahul', resource: 'Arduino', date: '10 Aug', time: '10-11' },
    { id: '2', student: 'Aman', resource: 'Projector', date: '10 Aug', time: '11-12' },
    { id: '3', student: 'Priya', resource: 'RaspberryPi', date: '11 Aug', time: '2-3' },
  ]);

  const [todaySchedule] = useState([
    { time: '09:00 - 10:00', lab: 'Electronics Lab', status: 'Available', isAvailable: true },
    { time: '10:00 - 12:00', lab: 'Electronics Lab', status: 'Java Practical', isAvailable: false },
    { time: '12:00 - 01:00', lab: 'Electronics Lab', status: 'Available', isAvailable: true },
    { time: '02:00 - 04:00', lab: 'Computer Lab', status: 'Workshop', isAvailable: false },
  ]);

  const [upcomingBookings] = useState([
    { lab: 'Electronics Lab', date: '12 Aug', time: '10-12', status: 'Approved' },
    { lab: 'Computer Lab', date: '14 Aug', time: '02-04', status: 'Pending' },
  ]);

  // Handle Approve / Reject Actions
  const handleAction = async (requestId, action) => {
    try {
      const token = localStorage.getItem('labToken') || localStorage.getItem('token');
      await axios.put(
        `${BACKEND_URL}/bookings/${requestId}/${action}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Remove item locally upon success
      setPendingRequests((prev) => prev.filter((item) => item.id !== requestId));
      setStats((prev) => ({
        ...prev,
        pending: Math.max(0, prev.pending - 1),
        approved: action === 'approve' ? prev.approved + 1 : prev.approved,
      }));
    } catch (err) {
      console.error(`Failed to ${action} request:`, err);
      // Fallback UI update for testing
      setPendingRequests((prev) => prev.filter((item) => item.id !== requestId));
    }
  };

  // Listen for real-time incoming student requests
  useEffect(() => {
    const handleLiveBooking = (e) => {
      const newReq = e.detail;
      if (!newReq) return;

      setPendingRequests((prev) => [
        {
          id: newReq._id || Date.now().toString(),
          student: newReq.studentName || 'Student',
          resource: newReq.resourceName || 'Resource',
          date: newReq.date || 'Today',
          time: newReq.slot || '10-11',
        },
        ...prev,
      ]);

      setStats((prev) => ({ ...prev, pending: prev.pending + 1 }));
    };

    window.addEventListener('newBookingRequest', handleLiveBooking);
    return () => window.removeEventListener('newBookingRequest', handleLiveBooking);
  }, []);

  return (
    <div className="max-w-4xl mx-auto p-6 bg-slate-950 text-slate-100 min-h-screen font-sans">
      {/* Header Section */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          👋 Welcome, {user?.name || 'Dr. Priya'}
        </h1>
        <p className="text-slate-400 text-sm mt-1">Here's your lab activity for today.</p>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-xl text-center shadow-sm">
          <div className="text-xs text-slate-400 font-medium flex items-center justify-center gap-1">
            📋 Pending Requests
          </div>
          <p className="text-2xl font-extrabold text-white mt-2">{stats.pending}</p>
        </div>

        <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-xl text-center shadow-sm">
          <div className="text-xs text-slate-400 font-medium flex items-center justify-center gap-1">
            🟢 Approved Bookings
          </div>
          <p className="text-2xl font-extrabold text-white mt-2">{stats.approved}</p>
        </div>

        <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-xl text-center shadow-sm">
          <div className="text-xs text-slate-400 font-medium flex items-center justify-center gap-1">
            🧪 Today's Bookings
          </div>
          <p className="text-2xl font-extrabold text-white mt-2">{stats.todayBookings}</p>
        </div>

        <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-xl text-center shadow-sm">
          <div className="text-xs text-slate-400 font-medium flex items-center justify-center gap-1">
            📦 Resources
          </div>
          <p className="text-2xl font-extrabold text-white mt-2">{stats.resources}</p>
        </div>
      </div>

      {/* Section 1: Pending Student Requests */}
      <div className="mb-8">
        <h2 className="text-xs font-bold tracking-wider text-slate-400 uppercase mb-3 flex items-center gap-2">
          📋 Pending Student Requests
        </h2>
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900 border-b border-slate-800 text-slate-400 font-semibold uppercase">
                <tr>
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-4">Resource</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Time</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {pendingRequests.length > 0 ? (
                  pendingRequests.map((req) => (
                    <tr key={req.id} className="hover:bg-slate-900/80 transition-colors">
                      <td className="py-3 px-4 font-medium text-white">{req.student}</td>
                      <td className="py-3 px-4 text-slate-300">{req.resource}</td>
                      <td className="py-3 px-4 text-slate-400">{req.date}</td>
                      <td className="py-3 px-4 text-slate-400">{req.time}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleAction(req.id, 'approve')}
                            className="p-1 px-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded font-semibold transition-all"
                            title="Approve Request"
                          >
                            ✓
                          </button>
                          <button
                            onClick={() => handleAction(req.id, 'reject')}
                            className="p-1 px-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded font-semibold transition-all"
                            title="Reject Request"
                          >
                            ✕
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="py-6 text-center text-slate-500">
                      No pending student requests.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Section 2: Today's Lab Schedule */}
      <div className="mb-8">
        <h2 className="text-xs font-bold tracking-wider text-slate-400 uppercase mb-3 flex items-center gap-2">
          📅 Today's Lab Schedule
        </h2>
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden divide-y divide-slate-800/60 text-xs">
          {todaySchedule.map((item, idx) => (
            <div key={idx} className="flex items-center justify-between p-3.5 px-4 hover:bg-slate-900/80 transition-colors">
              <span className="font-mono text-slate-400">{item.time}</span>
              <span className="font-medium text-slate-200">{item.lab}</span>
              <div className="flex items-center gap-2">
                <span
                  className={`w-2 h-2 rounded-full ${
                    item.isAvailable ? 'bg-emerald-500' : 'bg-rose-500'
                  }`}
                />
                <span className={item.isAvailable ? 'text-emerald-400' : 'text-slate-300'}>
                  {item.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Section 3: My Upcoming Bookings */}
      <div className="mb-6">
        <h2 className="text-xs font-bold tracking-wider text-slate-400 uppercase mb-3 flex items-center gap-2">
          📝 My Upcoming Bookings
        </h2>
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden divide-y divide-slate-800/60 text-xs">
          {upcomingBookings.map((item, idx) => (
            <div key={idx} className="flex items-center justify-between p-3.5 px-4 hover:bg-slate-900/80 transition-colors">
              <span className="font-medium text-slate-200">{item.lab}</span>
              <div className="flex items-center gap-4 text-slate-400 font-mono">
                <span>{item.date}</span>
                <span>{item.time}</span>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`w-2 h-2 rounded-full ${
                    item.status === 'Approved' ? 'bg-emerald-500' : 'bg-amber-500'
                  }`}
                />
                <span
                  className={item.status === 'Approved' ? 'text-emerald-400' : 'text-amber-400'}
                >
                  {item.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}