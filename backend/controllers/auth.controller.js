const User = require('../models/User');
const axios = require('axios');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');


 
const googleAuth = async (req, res) => {
  const { code, redirect_uri } = req.body; // Accept redirect_uri from frontend dynamically if needed

  if (!code) {
    return res.status(400).json({ message: 'Authorization code is required' });
  }

  try {
    // 1. Swap authorization code for access token with Google API
    const tokenResponse = await axios.post('https://oauth2.googleapis.com/token', {
      code,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      // Fallback to process.env.FRONTEND_URL if not passed from frontend
      redirect_uri: redirect_uri || process.env.FRONTEND_URL, 
      grant_type: 'authorization_code'
    });

    const { access_token } = tokenResponse.data;

    // 2. Fetch user profile data from Google using the access token
    const userProfileResponse = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${access_token}` }
    });

    const profile = userProfileResponse.data;

    // 3. Find existing user or create a new one in MongoDB
    let user = await User.findOne({ email: profile.email.toLowerCase() });

    if (!user) {
      user = new User({
        email: profile.email.toLowerCase(),
        name: profile.name,
        avatar: profile.picture,
        role: 'Student',
        status: 'Active',
        // Provide a dummy hash if your schema enforces a password requirement
        password: await bcrypt.hash(Math.random().toString(36).slice(-8), 10) 
      });
      await user.save();
    }

    if (user.status === 'Blocked') {
      return res.status(403).json({ message: 'Your account has been blocked.' });
    }

    // 4. Sign standard application JWT
    const appToken = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: '7d' }
    );

    // 5. Return standardized payload matching loginUser/createUser
    res.json({
      message: 'Google login successful',
      token: appToken,
      user: {
        id: user._id,
        _id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        role: user.role,
        status: user.status || 'Active'
      }
    });

  } catch (error) {
    // Log details to identify Google API issues clearly
    console.error("OAuth Exchange Failure:", error.response?.data || error.message);
    
    const googleErrorMsg = error.response?.data?.error_description || 'Authentication handshake failed';
    res.status(500).json({ message: googleErrorMsg });
  }
};
 
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-__v');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};
 
const createUser = async (req, res) => {
  try {
    // 1. Destructure category and role along with required fields
    const { name, email, password, role, category } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'All required fields must be provided.' });
    }

    // 2. Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ message: 'Email is already registered.' });
    }

    // 3. Save user directly (Mongoose pre('save') hook handles password hashing)
    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password, // Passed raw so pre('save') hashes it ONCE
      role: role || 'Student', // Uses selected role instead of hardcoding
      category: category || '', // Persists the category
      status: 'Active' // Explicitly sets initial active status
    });

    // 4. Generate JWT
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: '7d' }
    );

    // 5. Send complete user payload to frontend
    res.status(201).json({
      message: 'User created successfully',
      token,
      user: {
        id: user._id,
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        category: user.category,
        status: user.status
      }
    });
  } catch (err) {
    console.error("Error creating user:", err);
    res.status(500).json({ message: err.message || 'Internal Server Error' });
  }
};
 

const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Fetch user and explicitly select hidden password field
    const user = await User.findOne({ email: normalizedEmail }).select('+password');

    
    

    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    if (user.status === 'Blocked') {
      return res.status(403).json({ message: 'Your account has been blocked.' });
    }

    // Compare raw password against stored hash using the method on your schema
    const isPasswordMatch = await user.matchPassword(password);
    
     
    if (!isPasswordMatch) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET || 'your_fallback_secret',
      { expiresIn: '7d' }
    );

    return res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        category: user.category || '',
        status: user.status || 'Active'
      },
    });
  } catch (error) {
    console.error('Login Error:', error);
    return res.status(500).json({ message: 'Server error during login.' });
  }
};

module.exports = {
  googleAuth,
  getMe,
  createUser,
  loginUser
};