import { useState } from "react";
import { Link } from "react-router-dom";
import { Bus, LogIn } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import "./Login.css";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    await login(username, password);
    setIsLoading(false);
  };

  return (
    <div className="login-container">
      {/* Animated Background Orbs */}
      <div className="login-bg-orb-1"></div>

      <div className="login-content">
        {/* Logo Section */}
        <div className="login-logo-container">
          <div className="login-logo-wrapper">
            <div className="login-logo-glow"></div>
            <div className="login-logo">
              <Bus />
            </div>
          </div>
        </div>

        {/* Header */}
        <div className="login-header">
          <h2 className="login-title">Smart Bus Safety System</h2>
          <p className="login-subtitle">Sign in to your account</p>
        </div>

        {/* Login Form */}
        <form className="login-form" onSubmit={handleSubmit}>
          <div className="login-form-fields">
            <div className="login-field">
              <label htmlFor="username" className="login-label">
                Username
              </label>
              <input
                id="username"
                name="username"
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="login-input"
                placeholder="Enter your username"
              />
            </div>

            <div className="login-field">
              <label htmlFor="password" className="login-label">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="login-input"
                placeholder="Enter your password"
              />
            </div>
          </div>

          <button type="submit" disabled={isLoading} className="login-submit">
            {isLoading ? (
              <>
                <div className="login-spinner"></div>
                <span>Signing in...</span>
              </>
            ) : (
              <>
                <LogIn />
                Sign In
              </>
            )}
          </button>

          <div className="login-divider">
            <span className="login-divider-text">New to Smart Bus?</span>
          </div>

          <div className="login-register-link">
            <Link to="/register">
              Create an account
              <span className="login-register-arrow">→</span>
            </Link>
          </div>
        </form>

        {/* Footer */}
        <div className="login-footer">
          <p>✓ Secure • ✓ Reliable • ✓ Real-time</p>
        </div>
      </div>
    </div>
  );
}
