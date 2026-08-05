import React, { useState } from 'react';
import { useSocket } from '../context/SocketContext';

export default function NotificationPage() {
  const { notifications, markAsRead } = useSocket();
  const [filter, setFilter] = useState('all');  

  const filteredNotifications = notifications.filter((item) => {
    if (filter === 'unread') return !item.read;
    return true;
  });

  return (
    <div className="max-w-3xl mx-auto p-6 bg-slate-950 text-slate-100 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between pb-6 border-b border-slate-800 mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Notifications</h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time updates regarding your resource bookings and cancellations.
          </p>
        </div>

        {/* Filter Controls */}
        <div className="flex bg-slate-900 p-1 rounded-lg border border-slate-800">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
              filter === 'all'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All ({notifications.length})
          </button>
          <button
            onClick={() => setFilter('unread')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
              filter === 'unread'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Unread ({notifications.filter((n) => !n.read).length})
          </button>
        </div>
      </div>

      {/* List Section */}
      <div className="space-y-3">
        {filteredNotifications.length > 0 ? (
          filteredNotifications.map((item) => {
            const isCanceled = item.type === 'BOOKING_CANCELED';

            return (
              <div
                key={item._id || item.createdAt}
                onClick={() => !item.read && markAsRead(item._id)}
                className={`p-4 rounded-xl border transition-all duration-200 cursor-pointer relative ${
                  isCanceled
                    ? 'bg-rose-950/10 border-rose-900/30 hover:border-rose-700/50'
                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                } ${!item.read ? 'ring-1 ring-indigo-500/30' : 'opacity-80'}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <span className="text-lg mt-0.5">
                      {isCanceled ? '🚫' : '✅'}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-slate-100">
                          {item.title}
                        </h3>
                        {!item.read && (
                          <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                        )}
                      </div>
                      <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                        {item.message}
                      </p>
                    </div>
                  </div>

                  <span className="text-[10px] text-slate-500 whitespace-nowrap">
                    {item.createdAt
                      ? new Date(item.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit'
                        })
                      : 'Just now'}
                  </span>
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-16 bg-slate-900/40 rounded-xl border border-dashed border-slate-800">
            <p className="text-xs text-slate-400">
              {filter === 'unread' ? 'No unread notifications.' : 'No notifications yet.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}