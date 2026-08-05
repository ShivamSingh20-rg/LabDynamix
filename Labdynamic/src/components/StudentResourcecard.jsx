import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BACKEND_URL } from '../pages/Api';

const FIXED_TIME_SLOTS = [
  { id: 'slot-1', label: '09:00 AM - 10:00 AM', startHour: 9 },
  { id: 'slot-2', label: '10:00 AM - 11:00 AM', startHour: 10 },
  { id: 'slot-3', label: '11:00 AM - 12:00 PM', startHour: 11 },
  { id: 'slot-4', label: '12:00 PM - 01:00 PM', startHour: 12 },
  { id: 'slot-5', label: '01:00 PM - 02:00 PM', startHour: 13 },
  { id: 'slot-6', label: '02:00 PM - 03:00 PM', startHour: 14 },
  { id: 'slot-7', label: '03:00 PM - 04:00 PM', startHour: 15 },
  { id: 'slot-8', label: '04:00 PM - 05:00 PM', startHour: 16 },
];

export default function StudentResourceCard({ resource, onBook }) {
  const navigate = useNavigate();

  const [isSlotModalOpen, setIsSlotModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [slotBookings, setSlotBookings] = useState([]);
  const [isFetchingSlots, setIsFetchingSlots] = useState(false);

  const {
    _id,
    name,
    category,
    totalQuantity = 0,
    assignedLabs = [],
    imageUrl,
    bookedQuantity = 0,
  } = resource || {};

  const primaryLab = assignedLabs[0];

  const displayLabName =
    primaryLab?.labId?.name ||
    primaryLab?.lab?.name ||
    primaryLab?.name ||
    'Main Lab';

  const displayLabLocation =
    primaryLab?.labId?.location ||
    primaryLab?.labId?.roomNumber ||
    primaryLab?.location ||
    primaryLab?.roomNumber ||
    '';

  const assignedCount =
    primaryLab?.assignedQuantity ??
    resource?.assignedQuantity ??
    totalQuantity;

  // Fallback global availability
  const overallAvailableCount = Math.max(0, assignedCount - bookedQuantity);

  const getUpcomingDays = () => {
    const days = [];
    const today = new Date();

    for (let i = 0; i < 2; i++) {
      const nextDate = new Date(today);
      nextDate.setDate(today.getDate() + i);

      const year = nextDate.getFullYear();
      const month = String(nextDate.getMonth() + 1).padStart(2, '0');
      const day = String(nextDate.getDate()).padStart(2, '0');
      const formattedISO = `${year}-${month}-${day}`;

      const dayLabel = i === 0 ? 'Today' : 'Tomorrow';
      days.push({ dateISO: formattedISO, label: dayLabel });
    }
    return days;
  };

  const availableDays = getUpcomingDays();

  const isSlotExpired = (slotStartHour, dateISO) => {
    const now = new Date();
    const todayISO = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    if (dateISO === todayISO) {
      return now.getHours() >= slotStartHour;
    }
    return false;
  };

  const handleOpenModal = () => {
    
    setIsSlotModalOpen(true);
  };

  useEffect(() => {
    if ((isSlotModalOpen || selectedSlot) && _id && selectedDate) {
      fetchSlotBookings(_id, selectedDate);
    }
  }, [isSlotModalOpen, selectedSlot, _id, selectedDate]);

  const fetchSlotBookings = async (resourceId, dateISO) => {
    try {
      setIsFetchingSlots(true);
      const token = localStorage.getItem('token');

      const res = await fetch(
        `${BACKEND_URL}/resources/time-slot/${resourceId}?date=${dateISO}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await res.json();
      if (res.ok) {
        setSlotBookings(data.bookings || data || []);
      }
    } catch (error) {
      console.error('Error fetching slot availability:', error);
    } finally {
      setIsFetchingSlots(false);
    }
  };

  const getSlotAvailability = (slotLabel) => {
    const countBookedForSlot = slotBookings.filter((b) => {
      const bDate = b.bookingDate || b.dateISO || b.date;
      const bSlot = b.timeSlot || b.slot;
      return (
        bDate === selectedDate &&
        bSlot === slotLabel &&
        b.status !== 'Rejected' &&
        b.status !== 'Canceled'
      );
    }).length;

    const remainingForSlot = Math.max(0, assignedCount - countBookedForSlot);
    return {
      remaining: remainingForSlot,
      isFull: remainingForSlot <= 0,
    };
  };

  // DYNAMIC AVAILABILITY: If slot is selected, display slot availability; otherwise overall
  const activeSlotLabel = selectedSlot?.label || selectedSlot;
  const slotAvailability = activeSlotLabel
    ? getSlotAvailability(activeSlotLabel).remaining
    : null;

  const effectiveAvailable =
    selectedSlot && selectedDate ? slotAvailability : overallAvailableCount;

  const isAvailable = effectiveAvailable > 0;

  const handleSaveAndNavigate = () => {
    setIsSlotModalOpen(false);
  };

  
  return (
    <>
      <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden shadow-sm hover:border-slate-700 transition-all duration-200 flex flex-col justify-between max-w-sm">
        <div>
          {imageUrl && (
            <div className="h-28 w-full overflow-hidden relative">
              <img src={imageUrl} alt={name} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent" />
            </div>
          )}

          <div className="p-3.5">
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <span className="text-[10px] font-bold tracking-wider text-slate-300 uppercase bg-slate-800/80 border border-slate-700 px-2 py-0.5 rounded truncate max-w-[180px]">
                {category || 'Equipment'}
              </span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${
                  isAvailable
                    ? 'bg-emerald-950/50 text-emerald-400 border-emerald-800/60'
                    : 'bg-rose-950/50 text-rose-400 border-rose-800/60'
                }`}
              >
                {isAvailable ? 'Available' : 'Out of Stock'}
              </span>
            </div>

            <h3 className="text-sm font-bold text-slate-100 truncate mt-1">{name}</h3>

            <p className="text-xs text-indigo-400 font-medium mt-0.5 flex items-center gap-1 truncate">
              🏛️ {displayLabName}
              {displayLabLocation && (
                <span className="text-slate-400 font-normal">
                  ({displayLabLocation})
                </span>
              )}
            </p>

            {/* Dynamic Stock Display Bar */}
            <div className="mt-3 pt-2 border-t border-slate-800/80">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-400 text-[11px]">
                  {selectedSlot ? 'Slot Availability' : 'Assigned Availability'}
                </span>
                <span className={`text-[11px] font-semibold ${isAvailable ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {effectiveAvailable} / {assignedCount} Left
                </span>
              </div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${isAvailable ? 'bg-emerald-500' : 'bg-rose-500'}`}
                  style={{ width: `${assignedCount > 0 ? (effectiveAvailable / assignedCount) * 100 : 0}%` }}
                />
              </div>
            </div>

            {selectedSlot && selectedDate && (
              <div className="mt-2.5 p-1.5 bg-indigo-950/40 border border-indigo-800/50 rounded flex justify-between items-center text-xs">
                <div className="text-indigo-300 text-[11px]">
                  <span className="font-semibold">{selectedDate}</span> | {activeSlotLabel}
                </div>
                <button
                  onClick={() => setSelectedSlot(null)}
                  className="text-slate-400 hover:text-slate-200 text-xs pl-1"
                >
                  ✕
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="p-3.5 pt-0 space-y-1.5">
          <button
            onClick={handleOpenModal}
            className="w-full py-1.5 px-3 text-xs font-medium text-slate-300 bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 rounded transition-colors"
          >
            🗓️ Select Date & Time Slot
          </button>

          <button
              onClick={() => {

              navigate(`/resource/${_id}`, {

                state: {

                  resource,

                  selectedDate,

                  selectedSlot: selectedSlot?.label || selectedSlot,

                },

              });

            }}
            disabled={!isAvailable}
            className={`w-full py-1.5 px-3 text-xs font-semibold rounded transition-all ${
              !isAvailable
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm shadow-indigo-950'
            }`}
          >
            {!isAvailable ? 'Out of Stock' : selectedSlot ? 'Confirm & Book Now' : 'Book Now'}
          </button>
        </div>
      </div>

      {isSlotModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-5 shadow-2xl">
            <div className="flex justify-between items-start pb-3 border-b border-slate-800">
              <div>
                <h4 className="text-sm font-bold text-slate-100">{name}</h4>
                <p className="text-[11px] text-indigo-400 font-medium mt-0.5">
                  🏛️ {displayLabName} {displayLabLocation ? `(${displayLabLocation})` : ''}
                </p>
              </div>
              <button
                onClick={() => setIsSlotModalOpen(false)}
                className="text-slate-400 hover:text-slate-200 text-base p-1"
              >
                ✕
              </button>
            </div>

            <div className="mt-4">
              <label className="text-xs font-semibold text-slate-300 block mb-2">
                1. Pick Date
              </label>
              <div className="grid grid-cols-2 gap-2">
                {availableDays.map((day) => {
                  const isSelected = selectedDate === day.dateISO;
                  return (
                    <button
                      key={day.dateISO}
                      onClick={() => {
                        setSelectedDate(day.dateISO);
                        if (
                          selectedSlot &&
                          isSlotExpired(selectedSlot.startHour, day.dateISO)
                        ) {
                          setSelectedSlot(null);
                        }
                      }}
                      className={`py-2 px-3 rounded-lg border text-xs text-center font-semibold transition-all ${
                        isSelected
                          ? 'bg-indigo-600 border-indigo-500 text-white shadow-sm'
                          : 'bg-slate-800/60 border-slate-700/80 text-slate-300 hover:border-slate-600'
                      }`}
                    >
                      {day.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-4">
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-semibold text-slate-300 block">
                  2. Select 1-Hour Time Slot (09:00 AM - 05:00 PM)
                </label>
                {isFetchingSlots && (
                  <span className="text-[10px] text-indigo-400 animate-pulse">
                    Checking live availability...
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 max-h-52 overflow-y-auto pr-1">
                {FIXED_TIME_SLOTS.map((slot) => {
                  const expired = isSlotExpired(slot.startHour, selectedDate);
                  const { remaining, isFull } = getSlotAvailability(slot.label);
                  const slotDisabled = expired || isFull;
                  const isSelected = selectedSlot?.id === slot.id;

                  return (
                    <button
                      key={slot.id}
                      disabled={slotDisabled}
                      onClick={() => setSelectedSlot(slot)}
                      className={`p-2 rounded-lg border text-left transition-all ${
                        slotDisabled
                          ? 'bg-slate-950/40 border-slate-800/80 opacity-40 cursor-not-allowed'
                          : isSelected
                          ? 'bg-indigo-950/90 border-indigo-500 text-indigo-200 ring-1 ring-indigo-500'
                          : 'bg-slate-800/50 border-slate-700/60 hover:border-slate-600 text-slate-300'
                      }`}
                    >
                      <p className="text-xs font-medium">{slot.label}</p>
                      <p
                        className={`text-[10px] mt-0.5 font-semibold ${
                          expired
                            ? 'text-slate-500'
                            : isFull
                            ? 'text-rose-400'
                            : isSelected
                            ? 'text-indigo-300'
                            : 'text-emerald-400'
                        }`}
                      >
                        {expired
                          ? 'Expired'
                          : isFull
                          ? 'Full (0 Left)'
                          : isSelected
                          ? `Selected (${remaining} Left)`
                          : `${remaining} Available`}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-800 flex justify-end gap-2">
              <button
                onClick={() => setIsSlotModalOpen(false)}
                className="px-3.5 py-1.5 text-xs text-slate-300 hover:bg-slate-800 rounded border border-slate-700"
              >
                Close
              </button>

              <button
                onClick={handleSaveAndNavigate}
                disabled={!selectedSlot || !selectedDate}
                className={`px-4 py-1.5 text-xs font-semibold rounded transition-all ${
                  selectedSlot && selectedDate
                    ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm shadow-indigo-950'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                }`}
              >
                Save Selection & Proceed
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}