import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import db from "./db.js";

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "num-agent-default-secret-key-123456";

// JWT Authentication Middleware
export function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "未登录，请先登录。" });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: "登录凭证无效或已过期，请重新登录。" });
    }
    req.user = user;
    next();
  });
}

// User Registration Endpoint
router.post("/register", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: "用户名和密码不能为空。" });
  }

  if (username.length < 3 || password.length < 6) {
    return res.status(400).json({ message: "用户名至少3个字符，密码至少6个字符。" });
  }

  try {
    // Check if user already exists
    const existingUser = await db.get("SELECT * FROM users WHERE username = ?", [username]);
    if (existingUser) {
      return res.status(409).json({ message: "用户名已存在。" });
    }

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Insert user
    await db.run("INSERT INTO users (username, password) VALUES (?, ?)", [username, hashedPassword]);

    res.status(201).json({ message: "注册成功！" });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ message: "注册失败，请稍后重试。" });
  }
});

// User Login Endpoint
router.post("/login", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: "用户名和密码不能为空。" });
  }

  try {
    // Find user
    const user = await db.get("SELECT * FROM users WHERE username = ?", [username]);
    if (!user) {
      return res.status(401).json({ message: "用户名或密码错误。" });
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "用户名或密码错误。" });
    }

    // Generate JWT token (expires in 7 days)
    const token = jwt.sign(
      { id: user.id, username: user.username },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      message: "登录成功！",
      token,
      username: user.username
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "登录失败，请稍后重试。" });
  }
});

// Verify token validity (used by frontend to auto-login)
router.get("/me", authenticateToken, (req, res) => {
  res.json({
    username: req.user.username
  });
});

export default router;
