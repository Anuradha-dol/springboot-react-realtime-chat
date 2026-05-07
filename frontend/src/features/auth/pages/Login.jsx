import { useState } from "react";
import { useDispatch } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import { setCredentials } from "../authSlice";
import { login } from "../../../api/authApi";

export default function Login() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: "", password: "" });
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (error) setError("");
  };

  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.username.trim() || !form.password.trim()) {
      setError("Enter username and password.");
      return;
    }

    try {
      setLoading(true);
      const response = await login({
        username: form.username.trim(),
        password: form.password
      });
      // Backend wraps payload inside ApiResponse.data.
      const data = response?.data?.data;
      if (!data?.token) {
        throw new Error("Invalid login response.");
      }

      dispatch(
        setCredentials({
          user: {
            id: data.userId,
            username: data.username,
            displayName: data.displayName,
            email: data.email
          },
          token: data.token
        })
      );
      navigate("/chats");
    } catch (err) {
      const apiMessage = err?.response?.data?.message || err?.message;
      setError(apiMessage || "Login failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-screen">
      <section className="auth-panel">
        <h1>Login</h1>
        <p className="auth-subtitle">Continue to your chat workspace.</p>
        <form className="auth-form" onSubmit={handleSubmit}>
          <label htmlFor="username">Username</label>
          <input
            id="username"
            name="username"
            type="text"
            autoComplete="username"
            value={form.username}
            onChange={handleChange}
            placeholder="Enter username"
          />
          <label htmlFor="password">Password</label>
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            value={form.password}
            onChange={handleChange}
            placeholder="Enter password"
          />
          <button type="button" className="ghost-btn small" onClick={() => setShowPassword((prev) => !prev)}>
            {showPassword ? "Hide Password" : "Show Password"}
          </button>
          {error ? <p className="form-error">{error}</p> : null}
          <button type="submit" className="primary-btn" disabled={loading}>
            {loading ? "Please wait..." : "Login"}
          </button>
        </form>
        <p className="auth-footer">
          <Link to="/forgot-password">Forgot Password?</Link>
        </p>
        <p className="auth-footer">
          No account? <Link to="/register">Create one</Link>
        </p>
      </section>
    </div>
  );
}
