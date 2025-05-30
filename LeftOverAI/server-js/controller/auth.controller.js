const { generateToken } = require("../lib/utils.js");
const User = require("../models/user.model.js");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// Helper function to create JWT token
const createToken = (userId) => {
  return jwt.sign({ userId }, process.env.SECRET, {
    expiresIn: '30d',
  });
};

// Helper function to validate email format
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const signup = async (req, res) => {
  const { email, password, fullName } = req.body;
  try {
    // Input validation
    if (!fullName || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({ message: "Invalid email format" });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email already exists" });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create new user
    const newUser = new User({
      fullName,
      email,
      password: hashedPassword,
    });

    if (newUser) {
      // Save the user first to ensure it has an _id
      await newUser.save();
      
      // Generate cookie-based token (keep for backward compatibility)
      generateToken(newUser._id, res);
      
      // Generate JWT token for header-based auth
      const token = createToken(newUser._id);
      
      console.log('User created successfully with token');
      
      res.status(201).json({
        _id: newUser._id,
        fullName: newUser.fullName,
        email: newUser.email,
        token
      });
    } else {
      return res.status(400).json({ message: "Invalid user data" });
    }
  } catch (error) {
    console.log("Error in the signup controller", error.message);
    res.status(500).json({ message: "Internal Server error" });
  }
};

const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    // Input validation
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({ message: "Invalid email format" });
    }

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Compare passwords
    const isPasswordCorrect = await bcrypt.compare(password, user.password);
    if (!isPasswordCorrect) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Generate cookie-based token (keep for backward compatibility)
    generateToken(user._id, res);
    
    // Generate JWT token for header-based auth
    const token = createToken(user._id);
    
    console.log('User logged in successfully with token');
    
    res.status(200).json({
      _id: user._id,
      email: user.email,
      fullName: user.fullName,
      token
    });
  } catch (error) {
    console.log("Error in the login controller", error.message);
    res.status(500).json({ message: "Internal Server error" });
  }
};

const logout = (req, res) => {
  try {
    // Clear cookie
    res.cookie("jwt", "", { maxAge: 0 });
    res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    console.log("Error in the logout controller", error.message);
    res.status(500).json({ message: "Internal Server error" });
  }
};

const checkAuth = (req, res) => {
  try {
    // The user is already attached to the request by the protectRoute middleware
    console.log('Auth check successful for user:', req.user._id);
    res.status(200).json(req.user);
  } catch (error) {
    console.log("Error in checkAuth controller", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = { signup, login, logout, checkAuth };