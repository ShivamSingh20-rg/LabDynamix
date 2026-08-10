const cron = require('node-cron');
const Booking = require('../models/Booking');
const Resource = require('../models/Resource');
const { getIO } = require('../socket');

// Helper: Safely normalize any date input to "YYYY-MM-DD"
function formatDateStr(dateInput) {
  if (!dateInput) return '';
  if (dateInput instanceof Date) return dateInput.toISOString().split('T')[0];
  if (typeof dateInput === 'string') return dateInput.split('T')[0].trim();
  return String(dateInput);
}

// Helper: Parse slot end time safely into a valid JavaScript Date object
function getSlotEndTime(bookingDate, timeSlot) {
  try {
    const dateStr = formatDateStr(bookingDate);
    if (!dateStr) return null;

    if (!timeSlot || typeof timeSlot !== 'string') {
      return new Date(`${dateStr}T23:59:59`);
    }

    // Extract end time portion (e.g., "12:00 PM" from "10:00 AM - 12:00 PM")
    const parts = timeSlot.split('-');
    const endPart = parts.length > 1 ? parts[1].trim() : parts[0].trim();

    const parsedDate = new Date(`${dateStr} ${endPart}`);
    if (!isNaN(parsedDate.getTime())) {
      return parsedDate;
    }

    // Fallback if slot parsing fails: end of the booking date
    return new Date(`${dateStr}T23:59:59`);
  } catch (err) {
    return null;
  }
}

function initCronJobs() {
  // Runs every 5 minutes
  cron.schedule('*/5 * * * *', async () => {
    try {
      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];

      // 1. Case-insensitive status match
      const activeBookings = await Booking.find({
        status: { $in: ['Pending', 'pending', 'Approved', 'approved', 'Accepted', 'accepted'] },
      });

      if (!activeBookings || activeBookings.length === 0) return;

      for (const booking of activeBookings) {
        try {
          const bookingDateStr = formatDateStr(booking.bookingDate);
          const slotEndTime = getSlotEndTime(booking.bookingDate, booking.timeSlot);

          // Expiration check:
          // 1. Slot end time is strictly before current timestamp
          // 2. OR fallback: booking date is strictly earlier than today's date
          const isExpired =
            (slotEndTime && slotEndTime < now) ||
            (bookingDateStr && bookingDateStr < todayStr);

          if (isExpired) {
            booking.status = 'Completed';
            await booking.save();

            // Release slot count on the Resource
            if (booking.resource) {
              const resource = await Resource.findById(booking.resource);
              if (resource && Array.isArray(resource.slotBookings)) {
                // Match slot safely using string normalization
                const slotData = resource.slotBookings.find(
                  (s) =>
                    formatDateStr(s.date) === bookingDateStr &&
                    String(s.timeSlot).trim() === String(booking.timeSlot).trim()
                );

                if (slotData) {
                  const releaseQty = booking.quantity || 1;
                  slotData.bookedCount = Math.max(0, slotData.bookedCount - releaseQty);
                  await resource.save();

                  const updatedAvailable = resource.totalQuantity - slotData.bookedCount;

                  // Safely emit slot availability update
                  try {
                    const io = getIO();
                    if (io) {
                      io.emit('slot_availability_updated', {
                        resourceId: resource._id,
                        date: bookingDateStr,
                        timeSlot: booking.timeSlot,
                        availableCount: updatedAvailable,
                      });
                    }
                  } catch (socketErr) {
                    console.error('Socket emit error (slot_availability_updated):', socketErr.message);
                  }
                }
              }
            }

            // Safely emit status update to user room
            try {
              const io = getIO();
              if (io) {
                const userIdStr = String(booking.user._id || booking.user);
                io.to(`user_${userIdStr}`).emit('booking_status_changed', {
                  _id: booking._id,
                  status: 'Completed',
                  bookingDate: booking.bookingDate,
                  timeSlot: booking.timeSlot,
                });
              }
            } catch (socketErr) {
              console.error('Socket emit error (booking_status_changed):', socketErr.message);
            }

            console.log(`⏰ [CRON] Booking ${booking._id} marked as Completed.`);
          }
        } catch (bookingErr) {
          console.error(`Error updating individual booking ${booking._id}:`, bookingErr);
        }
      }
    } catch (error) {
      console.error('Cron job top-level error:', error);
    }
  });

  console.log('🚀 Booking auto-completion cron job initialized.');
}

module.exports = { initCronJobs };