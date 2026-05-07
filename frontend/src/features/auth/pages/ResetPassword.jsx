import { useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { resendForgotPasswordOtp, resetPassword, verifyForgotPasswordOtp } from "../../../api/authApi";
import { isEmail, minLength } from "../../../utils/validators";

export default function ResetPassword() {
  const navigate = useNavigate();
  const location = useLocation();
  const initialEmail = useMemo(() => (location.state?.email || "").trim(), [location.state?.email]);

  const [form, setForm] = useState({
    email: initialEmail,
    otp: "",
    newPassword: "",
    confirmPassword: ""
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleChange = (name, value) => {
    setForm((prev) => ({ ...prev, [name]: value }));
    if (error) setError("");
    if (success) setSuccess("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!isEmail(form.email)) {
      setError("Enter a valid email.");
      return;
    }
    if (!/^\d{4,8}$/.test(form.otp.trim())) {
      setError("Enter valid OTP.");
      return;
    }
    if (!minLength(form.newPassword, 6)) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (form.newPassword !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      setLoading(true);
      // Verify endpoint is called first, then reset endpoint.
      await verifyForgotPasswordOtp({ email: form.email.trim(), otp: form.otp.trim() });
      await resetPassword({
        email: form.email.trim(),
        otp: form.otp.trim(),
        newPassword: form.newPassword
      });
      setSuccess("Password reset successful. Redirecting to login...");
      setTimeout(() => navigate("/login"), 1000);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to reset password.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError("");
    setSuccess("");
    if (!isEmail(form.email)) {
      setError("Enter a valid email.");
      return;
    }
    try {
      setResending(true);
      const response = await resendForgotPasswordOtp({ email: form.email.trim() });
      setSuccess(response?.data?.message || "If this email exists, OTP has been sent.");
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to resend OTP.");
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="auth-screen">
      <section className="auth-panel">
        <h1>Reset Password</h1>
        <p className="auth-subtitle">Verify OTP and set a new password.</p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label htmlFor="reset-email">Email</label>
          <input
            id="reset-email"
            type="email"
            value={form.email}
            onChange={(event) => handleChange("email", event.target.value)}
            placeholder="Enter your email"
          />

          <label htmlFor="reset-otp">OTP</label>
          <input
            id="reset-otp"
            type="text"
            value={form.otp}
            onChange={(event) => handleChange("otp", event.target.value)}
            placeholder="Enter OTP"
            maxLength={8}
          />

          <label htmlFor="reset-password">New Password</label>
          <input
            id="reset-password"
            type={showPassword ? "text" : "password"}
            value={form.newPassword}
            onChange={(event) => handleChange("newPassword", event.target.value)}
            placeholder="Enter new password"
          />
          <button type="button" className="ghost-btn small" onClick={() => setShowPassword((prev) => !prev)}>
            {showPassword ? "Hide Password" : "Show Password"}
          </button>

          <label htmlFor="reset-confirm-password">Confirm Password</label>
          <input
            id="reset-confirm-password"
            type={showConfirmPassword ? "text" : "password"}
            value={form.confirmPassword}
            onChange={(event) => handleChange("confirmPassword", event.target.value)}
            placeholder="Confirm password"
          />
          <button type="button" className="ghost-btn small" onClick={() => setShowConfirmPassword((prev) => !prev)}>
            {showConfirmPassword ? "Hide Confirm Password" : "Show Confirm Password"}
          </button>

          {error ? <p className="form-error">{error}</p> : null}
          {success ? <p className="toast inline">{success}</p> : null}

          <button type="submit" className="primary-btn" disabled={loading}>
            {loading ? "Submitting..." : "Reset Password"}
          </button>
          <button type="button" className="ghost-btn" disabled={resending} onClick={handleResend}>
            {resending ? "Resending..." : "Resend OTP"}
          </button>
        </form>

        <p className="auth-footer">
          Back to <Link to="/login">Login</Link>
        </p>
      </section>
    </div>
  );
}
