import { useState } from "react";
import { useAuth } from "./hooks/useAuth.jsx";
import { theme } from "./styles/theme";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await login(email, password);

    if (!result.success) {
      setError(result.error || "Login failed");
      setLoading(false);
    }
    // If successful, the AuthProvider will update and App will re-render
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: theme.colors.background.primary,
        padding: theme.spacing.lg,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "440px",
        }}
      >
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: theme.spacing['2xl'] }}>
          <div
            style={{
              width: "80px",
              height: "80px",
              backgroundColor: theme.colors.accent.primary,
              borderRadius: theme.radius.xl,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "3rem",
              marginBottom: theme.spacing.md,
            }}
          >
            🚐
          </div>
          <h1
            style={{
              color: theme.colors.text.primary,
              marginBottom: theme.spacing.xs,
              fontSize: theme.fontSize['3xl'],
              fontWeight: theme.fontWeight.bold,
            }}
          >
            VanSupport
          </h1>
          <p
            style={{
              color: theme.colors.text.secondary,
              fontSize: theme.fontSize.base,
            }}
          >
            Sign in to access your dashboard
          </p>
        </div>

        {/* Login Card */}
        <div
          style={{
            padding: theme.spacing['2xl'],
            backgroundColor: theme.colors.background.secondary,
            borderRadius: theme.radius.xl,
            border: `1px solid ${theme.colors.border.light}`,
            boxShadow: theme.shadows.lg,
          }}
        >

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: theme.spacing.lg }}>
              <label
                htmlFor="email"
                style={{
                  display: "block",
                  color: theme.colors.text.primary,
                  marginBottom: theme.spacing.sm,
                  fontSize: theme.fontSize.sm,
                  fontWeight: theme.fontWeight.medium,
                }}
              >
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="you@example.com"
                style={{
                  width: "100%",
                  padding: `${theme.spacing.md} ${theme.spacing.lg}`,
                  backgroundColor: theme.colors.background.tertiary,
                  color: theme.colors.text.primary,
                  border: `1px solid ${theme.colors.border.medium}`,
                  borderRadius: theme.radius.lg,
                  fontSize: theme.fontSize.base,
                  outline: "none",
                  transition: "border-color 0.2s, box-shadow 0.2s",
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = theme.colors.accent.primary;
                  e.target.style.boxShadow = `0 0 0 3px ${theme.colors.accent.primary}20`;
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = theme.colors.border.medium;
                  e.target.style.boxShadow = "none";
                }}
              />
            </div>

            <div style={{ marginBottom: theme.spacing.xl }}>
              <label
                htmlFor="password"
                style={{
                  display: "block",
                  color: theme.colors.text.primary,
                  marginBottom: theme.spacing.sm,
                  fontSize: theme.fontSize.sm,
                  fontWeight: theme.fontWeight.medium,
                }}
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                placeholder="Enter your password"
                style={{
                  width: "100%",
                  padding: `${theme.spacing.md} ${theme.spacing.lg}`,
                  backgroundColor: theme.colors.background.tertiary,
                  color: theme.colors.text.primary,
                  border: `1px solid ${theme.colors.border.medium}`,
                  borderRadius: theme.radius.lg,
                  fontSize: theme.fontSize.base,
                  outline: "none",
                  transition: "border-color 0.2s, box-shadow 0.2s",
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = theme.colors.accent.primary;
                  e.target.style.boxShadow = `0 0 0 3px ${theme.colors.accent.primary}20`;
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = theme.colors.border.medium;
                  e.target.style.boxShadow = "none";
                }}
              />
            </div>

            {error && (
              <div
                style={{
                  padding: theme.spacing.md,
                  marginBottom: theme.spacing.lg,
                  backgroundColor: `${theme.colors.accent.danger}20`,
                  border: `1px solid ${theme.colors.accent.danger}`,
                  borderRadius: theme.radius.lg,
                  color: theme.colors.accent.danger,
                  fontSize: theme.fontSize.sm,
                  display: "flex",
                  alignItems: "center",
                  gap: theme.spacing.sm,
                }}
              >
                <span>⚠️</span>
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                padding: `${theme.spacing.md} ${theme.spacing.lg}`,
                backgroundColor: loading ? theme.colors.background.hover : theme.colors.accent.primary,
                color: theme.colors.text.primary,
                border: "none",
                borderRadius: theme.radius.lg,
                fontSize: theme.fontSize.base,
                fontWeight: theme.fontWeight.semibold,
                cursor: loading ? "not-allowed" : "pointer",
                transition: "all 0.2s",
                boxShadow: loading ? "none" : theme.shadows.md,
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.target.style.backgroundColor = theme.colors.accent.primaryHover;
                  e.target.style.transform = "translateY(-1px)";
                  e.target.style.boxShadow = theme.shadows.lg;
                }
              }}
              onMouseLeave={(e) => {
                if (!loading) {
                  e.target.style.backgroundColor = theme.colors.accent.primary;
                  e.target.style.transform = "translateY(0)";
                  e.target.style.boxShadow = theme.shadows.md;
                }
              }}
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Login;
