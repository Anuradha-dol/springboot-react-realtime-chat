import { useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { resendEmailOtp, verifyEmailOtp } from "../../../api/authApi";
import { isEmail } from "../../../utils/validators";

export default function VerifyEmail() {
  const navigate = useNavigate();
  const location = useLocation();
  const initialEmail = useMemo(() => (location.state?.email || "").trim(), [location.state?.email]);
  const [email, setEmail] = useState(initialEmail);
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleVerify = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!isEmail(email)) {
      setError("Enter a valid email.");
      return;
    }
    if (!/^\d{4,8}$/.test(otp.trim())) {
      setError("Enter valid OTP.");
      return;
    }

    try {
      setLoading(true);
      await verifyEmailOtp({ email: email.trim(), otp: otp.trim() });
      setSuccess("Email verified. You can login now.");
      setTimeout(() => navigate("/login"), 800);
    } catch (err) {
      setError(err?.response?.data?.message || "OTP verification failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError("");
    setSuccess("");
    if (!isEmail(email)) {
      setError("Enter your registered email first.");
      return;
    }
    try {
      setResending(true);
      // Backend enforces resend cooldown and abuse limits.
      const response = await resendEmailOtp({ email: email.trim() });
      setSuccess(response?.data?.message || "OTP resent.");
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to resend OTP.");
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="auth-screen">
      <section className="auth-panel">
        <h1>Verify Email</h1>
        <p className="auth-subtitle">Enter the OTP sent to your email.</p>

        <form className="auth-form" onSubmit={handleVerify}>
          <label htmlFor="verify-email">Email</label>
          <input
            id="verify-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Enter your email"
          />

          <label htmlFor="verify-otp">OTP</label>
          <input
            id="verify-otp"
            type="text"
            value={otp}
            onChange={(event) => setOtp(event.target.value)}
            placeholder="Enter OTP"
            maxLength={8}
          />

          {error ? <p className="form-error">{error}</p> : null}
          {success ? <p className="toast inline">{success}</p> : null}

          <button type="submit" className="primary-btn" disabled={loading}>
            {loading ? "Verifying..." : "Verify"}
          </button>
          <button type="button" className="ghost-btn" disabled={resending} onClick={handleResend}>
            {resending ? "Resending..." : "Resend OTP"}
          </button>
        </form>

        <p className="auth-footer">
          <Link to="/login">Back to Login</Link>
        </p>
      </section>
    </div>
  );
}
