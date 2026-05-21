import React, { useState } from "react";
import "./LoginPanel.css";

export function LoginPanel({ onLoginSuccess }) {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!username || !password) {
      setError("请填写所有必填字段");
      return;
    }

    if (!isLogin && password !== confirmPassword) {
      setError("两次输入的密码不一致");
      return;
    }

    setLoading(true);

    try {
      const endpoint = isLogin ? "/api/auth/login" : "/api/auth/register";
      const payload = isLogin 
        ? { username, password } 
        : { username, password };

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "请求失败，请稍后重试");
      }

      if (isLogin) {
        localStorage.setItem("token", data.token);
        localStorage.setItem("username", data.username);
        onLoginSuccess(data.token, data.username);
      } else {
        setSuccess("注册成功！请登录。");
        setIsLogin(true);
        setPassword("");
        setConfirmPassword("");
        // Clear success message after 3 seconds
        setTimeout(() => setSuccess(""), 4000);
      }
    } catch (err) {
      setError(err.message || "连接服务器失败，请检查网络");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleMode = () => {
    setIsLogin(!isLogin);
    setError("");
    setSuccess("");
    setUsername("");
    setPassword("");
    setConfirmPassword("");
  };

  return (
    <div className="login-container">
      <div className="login-backdrop">
        <div className="glow-circle glow-1"></div>
        <div className="glow-circle glow-2"></div>
      </div>
      
      <div className="login-card">
        <div className="login-header">
          <div className="logo-icon">📊</div>
          <h2>数值分析教学 Agent</h2>
          <p>{isLogin ? "欢迎回来，请登录你的账户" : "创建新账户开始数值分析学习"}</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="username">用户名</label>
            <div className="input-wrapper">
              <span className="input-icon">👤</span>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="输入用户名"
                required
                disabled={loading}
                autoComplete="username"
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="password">密码</label>
            <div className="input-wrapper">
              <span className="input-icon">🔒</span>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="输入密码 (至少6位)"
                required
                disabled={loading}
                autoComplete={isLogin ? "current-password" : "new-password"}
              />
            </div>
          </div>

          {!isLogin && (
            <div className="form-group">
              <label htmlFor="confirmPassword">确认密码</label>
              <div className="input-wrapper">
                <span className="input-icon">🛡️</span>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="再次输入密码"
                  required
                  disabled={loading}
                  autoComplete="new-password"
                />
              </div>
            </div>
          )}

          {error && <div className="error-message">⚠️ {error}</div>}
          {success && <div className="success-message">✅ {success}</div>}

          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? (
              <span className="spinner-loader"></span>
            ) : isLogin ? (
              "登 录"
            ) : (
              "注 册"
            )}
          </button>
        </form>

        <div className="login-footer">
          <span>{isLogin ? "还没有账户？" : "已有账户？"}</span>
          <button type="button" className="toggle-btn" onClick={handleToggleMode} disabled={loading}>
            {isLogin ? "立即注册" : "返回登录"}
          </button>
        </div>
      </div>
    </div>
  );
}
