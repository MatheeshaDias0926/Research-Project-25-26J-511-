import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { Bus, ShieldCheck, ArrowRight, Lock, User } from "lucide-react";

/**
 * Login Page - Industrial Enterprise Design
 * Styled employing Strict Inline CSS (No Tailwind)
 */
const Login = () => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();
  const { login } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  // Simple responsive handler for inline styles
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const isMobile = windowWidth < 1024;

  const onSubmit = async (data) => {
    setLoading(true);
    setError("");
    const result = await login(data.username, data.password);
    setLoading(false);

    if (result.success) {
      navigate("/");
    } else {
      setError(result.error);
    }
  };

  // --- STYLES ---
  const styles = {
    container: {
      display: "flex",
      minHeight: "100vh",
      backgroundColor: "#f8fafc", // slate-50
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      flexDirection: isMobile ? "column" : "row",
    },
    // Left Branding Panel
    brandPanel: {
      display: isMobile ? "none" : "flex",
      width: "50%",
      backgroundColor: "#0f172a", // slate-900
      flexDirection: "column",
      justifyContent: "space-between",
      padding: "3rem",
      color: "white",
      position: "relative",
      overflow: "hidden",
    },
    patternOverlay: {
      position: "absolute",
      top: 0,
      left: 0,
      width: "100%",
      height: "100%",
      opacity: 0.1,
      pointerEvents: "none",
    },
    brandHeader: {
      display: "flex",
      alignItems: "center",
      gap: "0.75rem",
      marginBottom: "1.5rem",
    },
    logoBox: {
      padding: "0.5rem",
      backgroundColor: "#2563eb", // blue-600
      borderRadius: "0.5rem",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    },
    brandTitle: {
      fontSize: "1.5rem",
      fontWeight: "700",
      letterSpacing: "-0.025em",
    },
    heroText: {
      fontSize: "2.25rem",
      fontWeight: "700",
      lineHeight: "1.2",
      marginBottom: "1rem",
      color: "#f1f5f9", // slate-100
    },
    subText: {
      color: "#94a3b8", // slate-400
      fontSize: "1.125rem",
      maxWidth: "28rem",
    },
    footerBadge: {
      display: "flex",
      gap: "2rem",
      color: "#94a3b8", // slate-400
      fontSize: "0.875rem",
      fontWeight: "500",
    },
    badgeItem: {
      display: "flex",
      alignItems: "center",
      gap: "0.5rem",
    },
    // Right Form Panel
    formPanel: {
      width: isMobile ? "100%" : "50%",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: isMobile ? "2rem" : "3rem",
      backgroundColor: "white",
    },
    formContainer: {
      width: "100%",
      maxWidth: "28rem",
    },
    mobileHeader: {
      display: isMobile ? "block" : "none",
      textAlign: "center",
      marginBottom: "2rem",
    },
    mobileLogo: {
      display: "inline-flex",
      padding: "0.5rem",
      backgroundColor: "#0f172a",
      borderRadius: "0.5rem",
      marginBottom: "1rem",
    },
    welcomeTitle: {
      fontSize: "1.875rem",
      fontWeight: "700",
      color: "#0f172a", // slate-900
      letterSpacing: "-0.025em",
      margin: "0 0 0.5rem 0",
    },
    welcomeSub: {
      color: "#64748b", // slate-500
      fontSize: "1rem",
      margin: 0,
    },
    formGroup: {
      marginBottom: "1.5rem",
    },
    label: {
      display: "block",
      fontSize: "0.875rem",
      fontWeight: "600",
      color: "#334155", // slate-700
      marginBottom: "0.5rem",
    },
    inputWrapper: {
      position: "relative",
    },
    inputIcon: {
      position: "absolute",
      top: 0,
      bottom: 0,
      left: 0,
      paddingLeft: "0.75rem",
      display: "flex",
      alignItems: "center",
      pointerEvents: "none",
      color: "#94a3b8", // slate-400
    },
    input: {
      width: "100%",
      padding: "0.625rem 1rem 0.625rem 2.5rem", // Left padding for icon
      borderRadius: "0.5rem",
      border: "1px solid #d1d5db", // gray-300
      fontSize: "1rem",
      color: "#0f172a", // slate-900
      outline: "none",
      transition: "all 0.2s",
      boxSizing: 'border-box'
    },
    button: {
      width: "100%",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: "0.5rem",
      backgroundColor: "#0f172a", // slate-900
      color: "white",
      fontWeight: "600",
      padding: "0.625rem",
      borderRadius: "0.5rem",
      border: "none",
      cursor: loading ? "not-allowed" : "pointer",
      opacity: loading ? 0.7 : 1,
      fontSize: "1rem",
      marginTop: "2rem",
      boxShadow: "0 4px 6px -1px rgba(15, 23, 42, 0.1)",
    },
    errorBox: {
      padding: "1rem",
      borderRadius: "0.375rem",
      backgroundColor: "#fef2f2", // red-50
      border: "1px solid #fecaca", // red-200
      color: "#b91c1c", // red-700
      fontSize: "0.875rem",
      display: "flex",
      alignItems: "start",
      gap: "0.5rem",
      marginBottom: "1.5rem",
    },
    errorText: {
      fontSize: "0.75rem",
      color: "#ef4444", // red-500
      marginTop: "0.25rem",
      fontWeight: "500",
    },
    footerLink: {
      textAlign: "center",
      paddingTop: "1rem",
      borderTop: "1px solid #f1f5f9", // gray-100
      marginTop: "2rem",
      fontSize: "0.875rem",
      color: "#64748b", // slate-500
    },
    link: {
      fontWeight: "600",
      color: "#0f172a", // slate-900
      textDecoration: "none",
    },
    copyright: {
      fontSize: "0.75rem",
      textAlign: "center",
      color: "#94a3b8", // slate-400
      marginTop: "2rem",
    }
  };

  return (
    <div style={styles.container}>
      {/* LEFT PANEL - Branding */}
      <div style={styles.brandPanel}>
        <div style={styles.patternOverlay}>
           <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
             <defs>
               <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                 <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.5"/>
               </pattern>
             </defs>
             <rect width="100%" height="100%" fill="url(#grid)" />
           </svg>
        </div>

        <div style={{ zIndex: 10 }}>
          <div style={styles.brandHeader}>
            <div style={styles.logoBox}>
              <Bus size={32} color="white" />
            </div>
            <span style={styles.brandTitle}>Smart Bus Ops</span>
          </div>
          <h1 style={styles.heroText}>
            Next-Gen Transit <br/>Operations Platform
          </h1>
          <p style={styles.subText}>
            Secure. Scalable. Real-time. <br/>
            Manage your fleet with enterprise-grade precision.
          </p>
        </div>

        <div style={{ ...styles.footerBadge, zIndex: 10 }}>
          <div style={styles.badgeItem}>
            <ShieldCheck size={20} color="#3b82f6" />
            <span>Encrypted Access</span>
          </div>
          <div style={styles.badgeItem}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#22c55e' }}></div>
            <span>System Operational</span>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL - Login Form */}
      <div style={styles.formPanel}>
        <div style={styles.formContainer}>
          
          {/* Mobile Header */}
          <div style={styles.mobileHeader}>
            <div style={styles.mobileLogo}>
                 <Bus size={32} color="white" />
            </div>
            <h2 style={{ fontSize: "1.5rem", fontWeight: "700", color: "#0f172a" }}>Smart Bus Ops</h2>
          </div>

          <div style={{ marginBottom: "2rem" }}>
            <h2 style={styles.welcomeTitle}>Welcome back</h2>
            <p style={styles.welcomeSub}>Please enter your credentials to access the console.</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)}>
            {error && (
              <div style={styles.errorBox}>
                <ShieldCheck size={20} color="#ef4444" style={{ flexShrink: 0 }} />
                <span>{error}</span>
              </div>
            )}

            <div style={styles.formGroup}>
              <label style={styles.label}>Username / ID</label>
              <div style={styles.inputWrapper}>
                <div style={styles.inputIcon}>
                  <User size={20} />
                </div>
                <input
                  {...register("username", { required: "Username is required" })}
                  style={styles.input}
                  placeholder="Enter your ID"
                  // Simple hover/focus effect via inline is hard, relying on default outline
                />
              </div>
              {errors.username && (
                <div style={styles.errorText}>{errors.username.message}</div>
              )}
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Password</label>
              <div style={styles.inputWrapper}>
                <div style={styles.inputIcon}>
                  <Lock size={20} />
                </div>
                <input
                  type="password"
                  {...register("password", { required: "Password is required" })}
                  style={styles.input}
                  placeholder="••••••••"
                />
              </div>
              {errors.password && (
                <span style={styles.errorText}>{errors.password.message}</span>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              style={styles.button}
              onMouseOver={(e) => !loading && (e.currentTarget.style.backgroundColor = "#1e293b")}
              onMouseOut={(e) => !loading && (e.currentTarget.style.backgroundColor = "#0f172a")}
            >
              {loading ? "Authenticating..." : "Sign In"}
              {!loading && <ArrowRight size={16} />}
            </button>

            <div style={styles.footerLink}>
              <p>
                Need access?{" "}
                <Link
                  to="/register"
                  style={styles.link}
                  onMouseOver={(e) => e.currentTarget.style.color = "#2563eb"}
                  onMouseOut={(e) => e.currentTarget.style.color = "#0f172a"}
                >
                  Register new account
                </Link>
              </p>
            </div>
          </form>

          <p style={styles.copyright}>
            © 2026 Smart Bus Research Project. Authorized Personnel Only.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
