const Booking = require('../models/Booking');
const Resource = require('../models/Resource');
const Notification = require('../models/Notification');
const { getIO } = require('../socket');

// 1. GET SLOT AVAILABILITY
exports.getSlotAvailability = async (req, res) => {
  try {
    const { resourceId } = req.params;
    const { date, timeSlot, userId } = req.query;

    const resource = await Resource.findById(resourceId);
    if (!resource) {
      return res.status(404).json({ message: "Resource not found" });
    }

    const totalCapacity = Number(
      resource.totalQuantity ?? resource.quantity ?? resource.capacity ?? 1
    );

    const existingBookings = await Booking.countDocuments({
      resource: resourceId,
      bookingDate: date,
      timeSlot: timeSlot,
      status: { $in: ['Pending', 'Approved'] }
    });

    let isBookedBySelf = false;
    if (userId) {
      const selfBooking = await Booking.findOne({
        user: userId,
        resource: resourceId,
        bookingDate: date,
        timeSlot: timeSlot,
        status: { $in: ['Pending', 'Approved'] }
      });
      if (selfBooking) {
        isBookedBySelf = true;
      }
    }

    const availableCount = Math.max(0, totalCapacity - existingBookings);

    return res.json({
      availableCount,
      totalCapacity,
      existingBookings,
      isBookedBySelf
    });
  } catch (error) {
    console.error("Error in getSlotAvailability:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// 2. CREATE BOOKING (Status: Pending)
exports.createBooking = async (req, res) => {
  try {
    const { resourceId, labId, dateISO, slotId, label, startHour, purpose } = req.body;
    const userId = req.user?.id || req.user?._id || req.body.user;

    if (!userId) {
      return res.status(401).json({ message: 'User authentication required.' });
    }

    const numericStartHour = Number(startHour);

    const resource = await Resource.findById(resourceId);
    if (!resource) return res.status(404).json({ message: 'Resource not found' });

    const selectedLabId = labId || resource.assignedLabs?.[0]?.labId || null;

    if (!selectedLabId) {
      return res.status(400).json({ message: 'No lab associated with this resource.' });
    }

    if (typeof resource.isSlotBookable === 'function') {
      const validation = resource.isSlotBookable(dateISO, numericStartHour, selectedLabId);
      if (!validation.bookable) {
        return res.status(400).json({ message: validation.reason || 'Slot not bookable.' });
      }
    }

    const existingSlot = (resource.slotBookings || []).find(
      (s) => s.dateISO === dateISO && Number(s.startHour) === numericStartHour
    );

    if (existingSlot) {
      if (existingSlot.bookedCount >= resource.totalQuantity) {
        return res.status(400).json({ message: 'This slot is already fully booked.' });
      }

      await Resource.updateOne(
        {
          _id: resourceId,
          'slotBookings.dateISO': dateISO,
          'slotBookings.startHour': numericStartHour,
        },
        { $inc: { 'slotBookings.$.bookedCount': 1 } }
      );
    } else {
      await Resource.updateOne(
        { _id: resourceId },
        {
          $push: {
            slotBookings: {
              slotId: slotId || `slot-${numericStartHour}`,
              label: label || `${numericStartHour}:00`,
              timeSlot: label || `${numericStartHour}:00`,
              startHour: numericStartHour,
              dateISO,
              date: dateISO,
              bookedCount: 1,
            },
          },
        }
      );
    }

    const booking = await Booking.create({
      user: userId,
      resource: resourceId,
      lab: selectedLabId,
      bookingDate: dateISO,
      timeSlot: label || `${numericStartHour}:00`,
      purpose: purpose || '',
      quantity: 1,
      status: 'Pending',
    });

    const populatedBooking = await Booking.findById(booking._id)
      .populate('resource', 'name category imageUrl')
      .populate('lab', 'name location department floor roomNumber');

    // 🚀 1. PERSIST NOTIFICATION TO DATABASE
    const newNotif = await Notification.create({
      recipient: userId,
      title: 'Booking Placed',
      message: `Your booking for "${populatedBooking.resource?.name || 'Resource'}" on ${dateISO} (${populatedBooking.timeSlot}) has been placed and is pending approval.`,
      type: 'BOOKING_PLACED',
      bookingId: booking._id,
    });

    // 🚀 2. REAL-TIME SOCKET EMIT
    try {
      const io = req.app.get('io') || (typeof getIO === 'function' ? getIO() : null);
      if (io) {
        // Broadcast to user's dedicated socket room
        io.to(`user_${userId}`).emit('notification_received', newNotif);

        // Broadcast to admin room
        io.emit('adminNewBooking', {
          message: `New booking submitted for ${populatedBooking.resource?.name || 'Resource'}.`,
          booking: populatedBooking,
        });
      }
    } catch (socketErr) {
      console.warn('Socket notification error (booking saved successfully):', socketErr.message);
    }

    return res.status(201).json({
      success: true,
      message: 'Booking confirmed!',
      booking: populatedBooking,
      notification: newNotif
    });
  } catch (error) {
    console.error('Booking Error:', error);
    return res.status(500).json({ message: error.message });
  }
};

// 3. FACULTY APPROVE / REJECT BOOKING
exports.updateBookingStatus = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { status, rejectionReason } = req.body;

    const booking = await Booking.findById(bookingId).populate('resource user');
    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    booking.status = status;
    if (rejectionReason) booking.rejectionReason = rejectionReason;
    await booking.save();

    if (status === 'Rejected' && booking.resource) {
      const resource = await Resource.findById(booking.resource._id);
      if (resource) {
        const slotData = (resource.slotBookings || []).find(
          (s) =>
            (s.dateISO === booking.bookingDate || s.date === booking.bookingDate) &&
            (s.label === booking.timeSlot || s.timeSlot === booking.timeSlot)
        );

        if (slotData) {
          slotData.bookedCount = Math.max(0, slotData.bookedCount - (booking.quantity || 1));
          await resource.save();

          try {
            const io = req.app.get('io') || (typeof getIO === 'function' ? getIO() : null);
            if (io) {
              io.emit('slot_availability_updated', {
                resourceId: resource._id,
                date: booking.bookingDate,
                timeSlot: booking.timeSlot,
                availableCount: Math.max(0, resource.totalQuantity - slotData.bookedCount),
              });
            }
          } catch (e) {
            console.warn('Socket broadcast error:', e.message);
          }
        }
      }
    }

    const notif = await Notification.create({
      recipient: booking.user._id,
      title: status === 'Approved' ? 'Booking Approved! ✅' : 'Booking Rejected ❌',
      message:
        status === 'Approved'
          ? `Your booking for ${booking.resource?.name || 'Resource'} on ${booking.bookingDate} (${booking.timeSlot}) is approved!`
          : `Your booking was rejected: ${rejectionReason || 'No reason provided'}`,
      type: 'STATUS_CHANGE',
      bookingId: booking._id,
    });

    try {
      const io = req.app.get('io') || (typeof getIO === 'function' ? getIO() : null);
      if (io) {
        io.to(`user_${booking.user._id}`).emit('notification_received', notif);
        io.to(`user_${booking.user._id}`).emit('booking_status_changed', booking);
      }
    } catch (e) {
      console.warn('Socket emit error:', e.message);
    }

    return res.status(200).json({ message: `Booking ${status}`, booking });
  } catch (error) {
    console.error('Update Booking Status Error:', error);
    return res.status(500).json({ message: error.message });
  }
};

// 4. GET STUDENT BOOKINGS
exports.getMyBookings = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;

    if (!userId) {
      return res.status(401).json({ message: 'User authentication required.' });
    }

    const bookings = await Booking.find({ user: userId })
      .populate('resource', 'name category imageUrl')
      .sort({ createdAt: -1 });

    return res.status(200).json({ success: true, bookings });
  } catch (error) {
    console.error('Fetch Bookings Error:', error);
    return res.status(500).json({ message: error.message });
  }
};

exports.getFacultyBookings = async (req, res) => {
  try {
    const bookings = await Booking.find()
      .populate('user', 'name email department')
      .populate('resource', 'name category')
      .sort({ createdAt: -1 });

    return res.status(200).json({ success: true, bookings });
  } catch (error) {
    console.error('Faculty Bookings Error:', error);
    return res.status(500).json({ message: error.message });
  }
};

exports.getBookingById = async (req, res) => {
  try {
    const { bookingId } = req.params; 
    const userId = req.user?.id || req.user?._id;

    if (!userId) {
      return res.status(401).json({ message: 'User authentication required.' });
    }

    const booking = await Booking.findById(bookingId)
      .populate('resource', 'name category description imageUrl')
      .populate('lab', 'name location department floor roomNumber') 
      .populate('approvedBy', 'name email department')
      .populate('reviewedBy', 'name email department');

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found.' });
    }

    return res.status(200).json({ success: true, booking });
  } catch (error) {
    console.error('Fetch Single Booking Error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 5. CANCEL BOOKING
exports.cancelBooking = async (req, res) => {
  try {
    const bookingId = req.params.id;
    const userId = req.user?.id || req.user?._id;

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found.' });
    }

    const isOwner = booking.user.toString() === userId.toString();
    const isAdmin = req.user?.role === 'Admin' || req.user?.isAdmin;

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: 'Unauthorized to cancel this booking.' });
    }

    if (booking.status === 'Canceled') {
      return res.status(400).json({ message: 'Booking is already canceled.' });
    }

    booking.status = 'Canceled';
    await booking.save();

    if (booking.resource && booking.bookingDate && booking.timeSlot) {
      await Resource.updateOne(
        {
          _id: booking.resource,
          'slotBookings.dateISO': booking.bookingDate,
        },
        {
          $inc: { 'slotBookings.$[elem].bookedCount': -1 }
        },
        {
          arrayFilters: [
            { 
              'elem.dateISO': booking.bookingDate,
              $or: [
                { 'elem.label': booking.timeSlot },
                { 'elem.slotId': booking.slotId }
              ]
            }
          ]
        }
      );
    }

    const updatedBooking = await Booking.findById(bookingId)
      .populate('resource', 'name category imageUrl')
      .populate('lab', 'name location department');

    // 🚀 1. PERSIST CANCELLATION NOTIFICATION TO DATABASE
    const cancelNotif = await Notification.create({
      recipient: booking.user,
      title: 'Booking Canceled 🚫',
      message: `Your booking for "${updatedBooking.resource?.name || 'Resource'}" on ${booking.bookingDate} (${booking.timeSlot}) was successfully canceled.`,
      type: 'BOOKING_CANCELED',
      bookingId: booking._id,
    });

    // 🚀 2. REAL-TIME SOCKET EMIT
    try {
      const io = req.app.get('io') || (typeof getIO === 'function' ? getIO() : null);
      if (io) {
        // Emit notification document to user room
        io.to(`user_${booking.user}`).emit('notification_received', cancelNotif);

        io.to(`user_${booking.user}`).emit('booking_canceled', {
          message: 'Your booking was successfully canceled.',
          bookingId: booking._id,
        });

        io.emit('adminBookingCanceled', {
          message: `Booking ${booking._id} has been canceled.`,
          booking: updatedBooking,
        });
      }
    } catch (socketErr) {
      console.warn('Socket notification error on cancellation:', socketErr.message);
    }

    return res.status(200).json({
      success: true,
      message: 'Booking canceled successfully.',
      booking: updatedBooking,
      notification: cancelNotif
    });
  } catch (error) {
    console.error('Cancel Booking Error:', error);
    return res.status(500).json({ message: error.message || 'Server error while canceling booking.' });
  }
};