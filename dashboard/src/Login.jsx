import { useState } from "react";
import { useAuth } from "./hooks/useAuth.jsx";

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
        backgroundColor: "#1e293b",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "400px",
          padding: "2rem",
          backgroundColor: "#334155",
          borderRadius: "8px",
          border: "1px solid #475569",
        }}
      >
        <h1
          style={{
            color: "#f1f5f9",
            marginBottom: "0.5rem",
            fontSize: "1.875rem",
            textAlign: "center",
          }}
        >
          VanSupport Dashboard
        </h1>
        <p
          style={{
            color: "#94a3b8",
            marginBottom: "2rem",
            textAlign: "center",
          }}
        >
          Sign in to continue
        </p>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "1rem" }}>
            <label
              htmlFor="email"
              style={{
                display: "block",
                color: "#f1f5f9",
                marginBottom: "0.5rem",
                fontSize: "0.875rem",
                fontWeight: "500",
              }}
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              style={{
                width: "100%",
                padding: "0.75rem",
                backgroundColor: "#1e293b",
                color: "#f1f5f9",
                border: "1px solid #475569",
                borderRadius: "4px",
                fontSize: "1rem",
                outline: "none",
              }}
              onFocus={(e) => {
                e.target.style.borderColor = "#60A5FA";
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "#475569";
              }}
            />
          </div>

          <div style={{ marginBottom: "1.5rem" }}>
            <label
              htmlFor="password"
              style={{
                display: "block",
                color: "#f1f5f9",
                marginBottom: "0.5rem",
                fontSize: "0.875rem",
                fontWeight: "500",
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
              style={{
                width: "100%",
                padding: "0.75rem",
                backgroundColor: "#1e293b",
                color: "#f1f5f9",
                border: "1px solid #475569",
                borderRadius: "4px",
                fontSize: "1rem",
                outline: "none",
              }}
              onFocus={(e) => {
                e.target.style.borderColor = "#60A5FA";
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "#475569";
              }}
            />
          </div>

          {error && (
            <div
              style={{
                padding: "0.75rem",
                marginBottom: "1rem",
                backgroundColor: "#7f1d1d",
                border: "1px solid #ef4444",
                borderRadius: "4px",
                color: "#fecaca",
                fontSize: "0.875rem",
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "0.75rem",
              backgroundColor: loading ? "#475569" : "#2563eb",
              color: "#f1f5f9",
              border: "none",
              borderRadius: "4px",
              fontSize: "1rem",
              fontWeight: "500",
              cursor: loading ? "not-allowed" : "pointer",
              transition: "background-color 0.2s",
            }}
            onMouseEnter={(e) => {
              if (!loading) e.target.style.backgroundColor = "#1d4ed8";
            }}
            onMouseLeave={(e) => {
              if (!loading) e.target.style.backgroundColor = "#2563eb";
            }}
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Login;
