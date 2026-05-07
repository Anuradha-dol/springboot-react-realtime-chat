import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { requestForgotPasswordOtp } from "../../../api/authApi";
import { isEmail } from "../../../utils/validators";

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!isEmail(email)) {
      setError("Enter a valid email.");
      return;
    }

    try {
      setLoading(true);
      const response = await requestForgotPasswordOtp({ email: email.trim() });
      // Message stays generic for account security.
      setSuccess(response?.data?.message || "If this email exists, OTP has been sent.");
      navigate("/reset-password", { state: { email: email.trim() } });
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to request OTP.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-screen">
      <section className="auth-panel">
        <h1>Forgot Password</h1>
        <p className="auth-subtitle">Request an OTP to reset your password.</p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label htmlFor="forgot-email">Email</label>
          <input
            id="forgot-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Enter your email"
          />

          {error ? <p className="form-error">{error}</p> : null}
          {success ? <p className="toast inline">{success}</p> : null}

          <button type="submit" className="primary-btn" disabled={loading}>
            {loading ? "Sending..." : "Send OTP"}
          </button>
        </form>

        <p className="auth-footer">
          Back to <Link to="/login">Login</Link>
        </p>
        <p className="auth-footer">
          No account? <Link to="/register">Create one</Link>
        </p>
      </section>
    </div>
  );
}
