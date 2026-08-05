const Resource = require('../models/Resource');
const Lab = require('../models/Lab');
const mongoose = require('mongoose');
 const Booking = require('../models/Booking');  


exports.getResources = async (req, res) => {
  try {
    const { search, category, labId } = req.query;
    const filter = {};

    console.log('Received query parameters:', { search, category, labId });
    // 1. Search by name (case-insensitive)
    if (search && search.trim()) {
      filter.name = { $regex: search.trim(), $options: 'i' };
    }

    // 2. Case-insensitive category match
    if (category && category !== 'All') {
      filter.category = { $regex: new RegExp(`^${category.trim()}$`, 'i') };
    }

    // 3. Filter by lab inside assignedLabs array
    if (labId && labId !== 'All') {
      filter['assignedLabs.labId'] = labId;
    }

    const resources = await Resource.find(filter)
      .populate('assignedLabs.labId', 'name roomNumber location');

    return res.status(200).json(resources);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
// @desc    Get single resource by ID
// @route   GET /api/resources/:id
exports.getResourceById = async (req, res) => {
  try {
    const resource = await Resource.findById(req.params.id)
      .populate('assignedLabs.labId', 'name roomNumber location');

    if (!resource) {
      return res.status(404).json({ message: 'Resource not found' });
    }
    res.json(resource);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

 

exports.getBookingsByResource = async (req, res) => {
  try {
    const resourceId = req.params.resourceId || req.params.id;
    const { date } = req.query;

    // 1. Check for valid Mongo ObjectId
    if (!resourceId || !mongoose.Types.ObjectId.isValid(resourceId)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid or missing Resource ID' 
      });
    }

    // 2. Build filter for active bookings
    const filter = {
      resource: new mongoose.Types.ObjectId(resourceId),
      status: { $nin: ['Rejected', 'Canceled', 'Cancelled'] }
    };

    // 3. Optional date filter
    if (date) {
      const cleanDate = date.trim();
      filter.$or = [
        { bookingDate: cleanDate },
        { date: cleanDate }
      ];
    }

    const bookings = await Booking.find(filter)
      .select('bookingDate date timeSlot status quantity resource user')
      .lean();

    return res.status(200).json({
      success: true,
      count: bookings.length,
      bookings
    });
  } catch (error) {
    console.error('Error in getBookingsByResource:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
exports.createResource = async (req, res) => {
  try {
    const { name, category, totalQuantity, status } = req.body;

    const resource = new Resource({
      name,
      category,
      totalQuantity,
      availableQuantity: totalQuantity,
      status: status || 'Available'
    });

    const savedResource = await resource.save();
    res.status(201).json(savedResource);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// @desc    Assign an existing inventory resource to a Lab
// @route   POST /api/resources/:id/assign
// POST /api/resources/:id/assign
// POST /api/resources/:id/assign
exports.assignResourceToLab = async (req, res) => {
  try {
    const { id } = req.params;
    const { labId, quantity, assignedQuantity } = req.body;

    // Support both key names sent from frontend
    const qtyToAssign = Number(assignedQuantity || quantity);

    if (!labId || !qtyToAssign) {
      return res.status(400).json({ 
        message: "Both labId and assignedQuantity are required." 
      });
    }

    const resource = await Resource.findById(id);
    if (!resource) return res.status(404).json({ message: "Resource not found" });

    // Find existing assignment index
    const existingIndex = resource.assignedLabs.findIndex(
      (item) => String(item.labId) === String(labId)
    );

    if (existingIndex > -1) {
      resource.assignedLabs[existingIndex].assignedQuantity += qtyToAssign;
    } else {
      // Must match Mongoose schema path names: labId and assignedQuantity
      resource.assignedLabs.push({
        labId: labId,
        assignedQuantity: qtyToAssign
      });
    }

    await resource.save();

    // Populate lab details before returning to client
    const updated = await Resource.findById(id).populate('assignedLabs.labId');

    return res.status(200).json(updated);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};
// @desc    Unassign resource from Lab
// @route   DELETE /api/resources/:id/unassign/:labId
exports.unassignResourceFromLab = async (req, res) => {
  try {
    const { id, labId } = req.params;

    const resource = await Resource.findById(id);
    if (!resource) {
      return res.status(404).json({ message: 'Resource not found.' });
    }

    const lab = await Lab.findById(labId);

    // 1. REMOVE FROM RESOURCE DOCUMENT
    const index = (resource.assignedLabs || []).findIndex((item) => {
      const targetId = item.labId || item.lab;
      return targetId && targetId.toString() === labId.toString();
    });

    if (index === -1) {
      return res.status(404).json({ message: 'Lab assignment not found for this resource.' });
    }

    resource.assignedLabs.splice(index, 1);
    await resource.save();

    // 2. REMOVE FROM LAB DOCUMENT
    if (lab && lab.assignedResources) {
      lab.assignedResources = lab.assignedResources.filter((item) => {
        const targetId = item.resourceId || item.resource || item._id;
        return targetId ? targetId.toString() !== resource._id.toString() : item.name !== resource.name;
      });
      await lab.save();
    }

    // Return populated updated resource
    const updatedResource = await Resource.findById(id)
      .populate('assignedLabs.labId', 'name roomNumber location');

    return res.status(200).json(updatedResource);
  } catch (error) {
    console.error('Error unassigning lab:', error);
    return res.status(500).json({ message: error.message });
  }
};

// @desc    Update a resource
// @route   PUT /api/resources/:id
exports.updateResource = async (req, res) => {
  try {
    const { id } = req.params;

    // Fixed deprecation warning: replacement of { new: true } with { returnDocument: 'after' }
    const updatedResource = await Resource.findByIdAndUpdate(
      id,
      { $set: req.body },
      { returnDocument: 'after', runValidators: true }
    ).populate('assignedLabs.labId', 'name roomNumber location');

    if (!updatedResource) {
      return res.status(404).json({ message: 'Resource not found' });
    }

    res.status(200).json(updatedResource);
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to update resource' });
  }
};

// @desc    Delete a resource entirely from inventory
// @route   DELETE /api/resources/:id
exports.deleteResource = async (req, res) => {
  try {
    const resource = await Resource.findByIdAndDelete(req.params.id);
    if (!resource) {
      return res.status(404).json({ message: 'Resource not found' });
    }
    
    await Lab.updateMany(
      {},
      { $pull: { assignedResources: { resourceId: req.params.id } } }
    );

    res.json({ message: 'Resource deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};