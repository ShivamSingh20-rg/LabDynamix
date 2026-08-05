 
const mongoose = require('mongoose');

// Schema for individual 1-hour time slots
const timeSlotSchema = new mongoose.Schema(
  {
    slotId: {
      type: String, // e.g., 'slot-1', 'slot-2'
      required: true
    },
    label: {
      type: String, // e.g., '09:00 AM - 10:00 AM'
      required: true
    },
    startHour: {
      type: Number, // 24-hour format: 9, 10, ..., 16
      required: true,
      min: 0,
      max: 23
    },
    dateISO: {
      type: String, // Stored as 'YYYY-MM-DD'
      required: true
    },
    bookedCount: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  { _id: false }
);

const resourceSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true },
    imageUrl: { type: String, default: '' },
   totalQuantity: { type: Number, default: 1, min: 0 },
    availableQuantity: { type: Number, required: true },
    status: {
      type: String,
      enum: ['Available', 'In Use', 'Maintenance'],
      default: 'Available'
    },
    assignedLabs: [
      {
        labId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Lab',
          required: true
        },
        assignedQuantity: {
          type: Number,
          required: true,
          min: 1
        }
      }
    ],
    // Tracks slot bookings for specific dates (Today & Tomorrow)
    slotBookings: [timeSlotSchema]
  },
  { timestamps: true }
);

// Virtual for id string
resourceSchema.virtual('id').get(function () {
  return this._id.toHexString();
});

resourceSchema.set('toJSON', { virtuals: true });
resourceSchema.set('toObject', { virtuals: true });

/**
 * Helper Instance Method: Validates if a specific slot on a given date is bookable
 * Checks: 1. Date is Today or Tomorrow | 2. Slot is not in the past | 3. Quantity is available
 */
resourceSchema.methods.isSlotBookable = function (dateISO, startHour, labId) {
  const now = new Date();
  
  // Format Today and Tomorrow as YYYY-MM-DD in local time
  const formatISO = (d) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const todayISO = formatISO(now);
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const tomorrowISO = formatISO(tomorrow);

  // 1. Restrict booking date strictly to Today or Tomorrow
  if (dateISO !== todayISO && dateISO !== tomorrowISO) {
    return { bookable: false, reason: 'Bookings are only allowed for Today or Tomorrow.' };
  }

  // 2. Prevent booking expired slots on Today
  if (dateISO === todayISO && now.getHours() >= startHour) {
    return { bookable: false, reason: 'This time slot has already passed.' };
  }

  // 3. Check lab capacity limit
  let maxCapacity = this.totalQuantity;
  if (labId) {
    const assigned = this.assignedLabs.find(
      (item) => item.labId.toString() === labId.toString()
    );
    if (assigned) maxCapacity = assigned.assignedQuantity;
  }

  const existingSlot = this.slotBookings.find(
    (s) => s.dateISO === dateISO && s.startHour === startHour
  );

  const currentBooked = existingSlot ? existingSlot.bookedCount : 0;
  if (currentBooked >= maxCapacity) {
    return { bookable: false, reason: 'This time slot is fully booked.' };
  }

  return { bookable: true };
};

module.exports = mongoose.model('Resource', resourceSchema);