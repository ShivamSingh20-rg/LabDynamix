import React, { useEffect, useState } from 'react';
import { useSocket } from '../context/SocketContext';
import { BACKEND_URL } from './Api';
import { useNavigate } from 'react-router-dom';

const MyBookings = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState('');
  const { socket } = useSocket();
  const navigate = useNavigate();

  useEffect(() => {
    fetchMyBookings();
  }, []);

  useEffect(() => {
    if (!socket) return;

    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const userId = user._id || user.id;

    if (userId) {
      socket.emit('joinUserRoom', userId);
    }

    socket.on('newBookingCreated', (data) => {
      setNotification(data.message);
      if (data.booking) {
        setBookings((prev) => [data.booking, ...prev]);
      }
      setTimeout(() => setNotification(''), 4000);
    });

    socket.on('bookingStatusUpdated', (updatedBooking) => {
      setBookings((prev) =>
        prev.map((b) => (b._id === updatedBooking._id ? { ...b, status: updatedBooking.status } : b))
      );
    });

    // Real-time socket event when a booking is canceled
    socket.on('booking_canceled', (data) => {
      if (data.bookingId) {
        setBookings((prev) =>
          prev.map((b) => (b._id === data.bookingId ? { ...b, status: 'Canceled' } : b))
        );
      }
    });

    return () => {
      socket.off('newBookingCreated');
      socket.off('bookingStatusUpdated');
      socket.off('booking_canceled');
    };
  }, [socket]);

  const fetchMyBookings = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${BACKEND_URL}/bookings/my-bookings`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();

      if (res.ok) {
        setBookings(data.bookings || []);
      }
    } catch (err) {
      console.error('Error loading bookings:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status = 'pending') => {
    const normalized = status.toLowerCase();

    const badgeConfigs = {
      pending: {
        wrapper: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
        dot: 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,1)]',
        label: 'Pending'
      },
      approved: {
        wrapper: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
        dot: 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,1)]',
        label: 'Approved'
      },
      accepted: {
        wrapper: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
        dot: 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,1)]',
        label: 'Accepted'
      },
      completed: {
        wrapper: 'bg-green-500/15 text-green-400 border-green-500/30',
        dot: 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,1)]',
        label: 'Completed'
      },
      rejected: {
        wrapper: 'bg-red-500/15 text-red-400 border-red-500/30',
        dot: 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,1)]',
        label: 'Rejected'
      },
      canceled: {
        wrapper: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
        dot: 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,1)]',
        label: 'Canceled'
      },
      cancelled: {
        wrapper: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
        dot: 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,1)]',
        label: 'Canceled'
      }
    };

    const config = badgeConfigs[normalized] || {
      wrapper: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
      dot: 'bg-slate-500 shadow-[0_0_8px_rgba(100,116,139,1)]',
      label: status.charAt(0).toUpperCase() + status.slice(1)
    };

    return (
      <span
        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-semibold tracking-wide whitespace-nowrap ${config.wrapper}`}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
        {config.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-15">
        <div className="w-8 h-8 border-3 border-slate-700 border-t-blue-500 rounded-full animate-spin" />
        <p className="mt-3.5 text-slate-400 text-sm font-medium">
          Fetching your bookings...
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto my-10 px-5 text-slate-50 font-sans">
      {/* Header Section */}
      <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-700">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-50">
            My Resource Bookings
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Track real-time approval status and upcoming lab slot schedules.
          </p>
        </div>
        <div className="bg-slate-700 text-slate-200 text-xs font-semibold px-3.5 py-1.5 rounded-full border border-slate-600">
          {bookings.length} Total
        </div>
      </div>

      {/* Real-time Toast Notification Banner */}
      {notification && (
        <div className="flex items-center gap-2.5 bg-blue-900/40 text-blue-300 border border-blue-500/40 px-4 py-3 rounded-xl mb-5 text-sm font-medium backdrop-blur-md shadow-lg">
          <span className="text-base">🔔</span>
          <span>{notification}</span>
        </div>
      )}

      {/* Bookings List */}
      {bookings.length === 0 ? (
        <div className="text-center py-12 px-5 bg-slate-900 border-2 border-dashed border-slate-700 rounded-xl">
          <div className="text-4xl mb-2.5">📅</div>
          <h3 className="text-slate-100 font-semibold mb-1">No Bookings Yet</h3>
          <p className="text-slate-400 text-sm">
            You haven't requested any resource or lab slot allocations.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {bookings.map((booking) => {
            const displayDate = booking.bookingDate || booking.dateISO || booking.date || 'N/A';
            const resourceName =
              typeof booking.resource === 'object'
                ? booking.resource?.name
                : 'Lab Resource';

            const bookingId = booking._id || booking.id;

            return (
              <div
                key={booking._id}
                onClick={() => navigate(`/booking/${bookingId}`)}
                className="bg-slate-800 border border-slate-700 rounded-xl p-5 shadow-md hover:border-slate-500 hover:bg-slate-800/90 transition-all cursor-pointer"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1 pr-4">
                    <h3 className="text-lg font-semibold text-slate-100 mb-2">
                      {resourceName}
                    </h3>
                    <div className="flex items-center gap-2 text-xs font-medium text-slate-300">
                      <span className="inline-flex items-center gap-1">
                        🗓️ {displayDate}
                      </span>
                      <span className="text-slate-600">•</span>
                      <span className="inline-flex items-center gap-1">
                        ⏰ {booking.timeSlot}
                      </span>
                    </div>
                  </div>
                  <div className="ml-auto self-start">
                    {getStatusBadge(booking.status)}
                  </div>
                </div>

                {booking.purpose && (
                  <div className="mt-3.5 pt-3 border-t border-dashed border-slate-700 text-xs flex gap-1.5">
                    <span className="font-semibold text-slate-400">Purpose:</span>
                    <span className="text-slate-300">{booking.purpose}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MyBookings;