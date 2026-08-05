const cron = require('node-cron');
const Booking = require('../models/Booking');
const Resource = require('../models/Resource');
const { parseSlotEndTime } = require('../utils');
const { getIO } = require('../socket');

function initCronJobs() {
  // Runs every 5 minutes
  cron.schedule('*/5 * * * *', async () => {
    try {
      const now = new Date();
      const activeBookings = await Booking.find({
        status: { $in: ['Pending', 'Approved'] },
      });

      for (const booking of activeBookings) {
        const slotEndTime = parseSlotEndTime(booking.bookingDate, booking.timeSlot);

        if (slotEndTime && slotEndTime < now) {
          booking.status = 'Completed';
          await booking.save();

          // Release slot count
          const resource = await Resource.findById(booking.resource);
          if (resource) {
            const slotData = resource.slotBookings.find(
              (s) => s.date === booking.bookingDate && s.timeSlot === booking.timeSlot
            );

            if (slotData) {
              slotData.bookedCount = Math.max(0, slotData.bookedCount - booking.quantity);
              await resource.save();

              const updatedAvailable = resource.totalQuantity - slotData.bookedCount;

              // Emit live slot count restoration to students
              getIO().emit('slot_availability_updated', {
                resourceId: resource._id,
                date: booking.bookingDate,
                timeSlot: booking.timeSlot,
                availableCount: updatedAvailable,
              });
            }
          }

          // Emit status update to student's room
          getIO().to(`user_${booking.user}`).emit('booking_status_changed', {
            _id: booking._id,
            status: 'Completed',
            bookingDate: booking.bookingDate,
            timeSlot: booking.timeSlot,
          });
        }
      }
    } catch (error) {
      console.error('Cron job error:', error);
    }
  });
}

module.exports = { initCronJobs };