import { useState } from "react";
import { useAuth } from "./hooks/useAuth.jsx";
import { theme } from "./styles/theme";
import Button from "./components/Button";
import Input from "./components/Input";
import { AlertCircle } from "lucide-react";

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
  };

  const styles = {
    page: {
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.background.page,
      padding: theme.spacing.xl,
    },
    container: {
      width: "100%",
      maxWidth: "420px",
    },
    logoSection: {
      textAlign: "center",
      marginBottom: theme.spacing['3xl'],
    },
    logo: {
      maxWidth: "240px",
      width: "100%",
      height: "auto",
      marginBottom: theme.spacing.lg,
    },
    subtitle: {
      color: theme.colors.text.secondary,
      fontSize: theme.fontSize.base,
      margin: 0,
    },
    card: {
      padding: theme.spacing['2xl'],
      backgroundColor: theme.colors.background.secondary,
      borderRadius: theme.radius['2xl'],
      border: `1px solid ${theme.colors.border.light}`,
      boxShadow: theme.shadows.lg,
    },
    cardHeader: {
      marginBottom: theme.spacing['2xl'],
      textAlign: "center",
    },
    cardTitle: {
      margin: 0,
      fontSize: theme.fontSize['xl'],
      fontWeight: theme.fontWeight.semibold,
      color: theme.colors.text.primary,
      marginBottom: theme.spacing.xs,
    },
    cardDescription: {
      margin: 0,
      fontSize: theme.fontSize.sm,
      color: theme.colors.text.tertiary,
    },
    form: {
      display: "flex",
      flexDirection: "column",
      gap: theme.spacing.xl,
    },
    errorBox: {
      display: "flex",
      alignItems: "center",
      gap: theme.spacing.md,
      padding: theme.spacing.lg,
      backgroundColor: theme.colors.accent.dangerLight,
      border: `1px solid ${theme.colors.accent.danger}`,
      borderRadius: theme.radius.lg,
      color: theme.colors.accent.danger,
      fontSize: theme.fontSize.sm,
    },
    footer: {
      marginTop: theme.spacing['2xl'],
      textAlign: "center",
      color: theme.colors.text.tertiary,
      fontSize: theme.fontSize.xs,
    },
    footerLink: {
      color: theme.colors.accent.primary,
      textDecoration: "none",
      fontWeight: theme.fontWeight.medium,
    },
  };

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        {/* Logo Section */}
        <div style={styles.logoSection}>
          <img
            src="/max-logo.png"
            alt="MAX - Mobile AI Xpress Support"
            style={styles.logo}
          />
          <p style={styles.subtitle}>
            Van Support Management System
          </p>
        </div>

        {/* Login Card */}
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <h1 style={styles.cardTitle}>Welcome back</h1>
            <p style={styles.cardDescription}>
              Sign in to access your dashboard
            </p>
          </div>

          <form onSubmit={handleSubmit} style={styles.form}>
            <Input
              label="Email Address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoComplete="email"
              disabled={loading}
            />

            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              autoComplete="current-password"
              disabled={loading}
            />

            {error && (
              <div style={styles.errorBox}>
                <AlertCircle size={18} />
                <span>{error}</span>
              </div>
            )}

            <Button
              type="submit"
              loading={loading}
              fullWidth
              size="lg"
            >
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </form>

          <div style={styles.footer}>
            <p style={{ margin: 0 }}>
              Need help?{" "}
              <a href="mailto:support@maxsupport.com" style={styles.footerLink}>
                Contact Support
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
