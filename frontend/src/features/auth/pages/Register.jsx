import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { isEmail, minLength } from "../../../utils/validators";
import { register } from "../../../api/authApi";

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    displayName: "",
    username: "",
    email: "",
    password: "",
    confirmPassword: ""
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (error) setError("");
    if (success) setSuccess("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!form.displayName.trim() || !form.username.trim() || !form.email.trim()) {
      setError("Fill all required fields.");
      return;
    }
    if (!isEmail(form.email)) {
      setError("Enter a valid email address.");
      return;
    }
    if (!minLength(form.password, 6)) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      setLoading(true);
      const response = await register({
        username: form.username.trim(),
        displayName: form.displayName.trim(),
        email: form.email.trim(),
        password: form.password
      });
      // Registration now requires OTP verification before login.
      if (response?.data?.success) {
        setSuccess(response.data.message || "Registration successful. Verify your email OTP.");
        navigate("/verify-email", { state: { email: form.email.trim() } });
      }
    } catch (err) {
      const apiMessage = err?.response?.data?.message;
      setError(apiMessage || "Registration failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-screen">
      <section className="auth-panel">
        <h1>Register</h1>
        <p className="auth-subtitle">Create your account and start chatting.</p>
        <form className="auth-form" onSubmit={handleSubmit}>
          <label htmlFor="displayName">Display Name</label>
          <input
            id="displayName"
            name="displayName"
            type="text"
            value={form.displayName}
            onChange={handleChange}
            placeholder="Enter display name"
          />
          <label htmlFor="username">Username</label>
          <input
            id="username"
            name="username"
            type="text"
            value={form.username}
            onChange={handleChange}
            placeholder="Choose username"
          />
          <label htmlFor="email">Email</label>
          <input
            id="email"
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
            placeholder="Enter email"
          />
          <label htmlFor="password">Password</label>
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            value={form.password}
            onChange={handleChange}
            placeholder="Create password"
          />
          <button type="button" className="ghost-btn small" onClick={() => setShowPassword((prev) => !prev)}>
            {showPassword ? "Hide Password" : "Show Password"}
          </button>
          <label htmlFor="confirmPassword">Confirm Password</label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type={showConfirmPassword ? "text" : "password"}
            value={form.confirmPassword}
            onChange={handleChange}
            placeholder="Repeat password"
          />
          <button type="button" className="ghost-btn small" onClick={() => setShowConfirmPassword((prev) => !prev)}>
            {showConfirmPassword ? "Hide Confirm Password" : "Show Confirm Password"}
          </button>
          {error ? <p className="form-error">{error}</p> : null}
          {success ? <p className="toast inline">{success}</p> : null}
          <button type="submit" className="primary-btn" disabled={loading}>
            {loading ? "Please wait..." : "Create Account"}
          </button>
        </form>
        <p className="auth-footer">
          Already have an account? <Link to="/login">Login</Link>
        </p>
      </section>
    </div>
  );
}
