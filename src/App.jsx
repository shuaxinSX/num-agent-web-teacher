import React, { useState, useEffect } from "react";
import { AgentPanel } from "./components/AgentPanel";
import { LoginPanel } from "./components/LoginPanel";
import "./components/LoginPanel.css";

export function App() {
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [username, setUsername] = useState(localStorage.getItem("username") || "");

  // Auto-validate token on application load
  useEffect(() => {
    if (token) {
      fetch("/api/auth/me", {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })
      .then((res) => {
        if (!res.ok) {
          throw new Error("Token expired");
        }
      })
      .catch(() => {
        // Token is invalid or backend is unreachable, trigger logout
        handleLogout();
      });
    }
  }, [token]);

  const handleLoginSuccess = (newToken, newUsername) => {
    setToken(newToken);
    setUsername(newUsername);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    setToken(null);
    setUsername("");
  };

  if (!token) {
    return <LoginPanel onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div style={{ position: "relative", minHeight: "100vh" }}>
      {/* Floating premium User Logout Bar */}
      <div className="auth-header-bar">
        <div className="auth-user-info">
          <span className="user-avatar">👤</span>
          <span className="user-name">{username}</span>
        </div>
        <button className="logout-btn" onClick={handleLogout}>
          退出登录
        </button>
      </div>
      <AgentPanel />
    </div>
  );
}
