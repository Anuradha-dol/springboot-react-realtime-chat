import { useState } from "react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { logoutApi } from "../../../api/authApi";
import { deleteAccount as deleteMyAccount } from "../../../api/userApi";
import { logout } from "../../auth/authSlice";

export default function Settings() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleDelete = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!confirmDelete) {
      setError("Please confirm account deletion.");
      return;
    }
    if (!password.trim()) {
      setError("Current password is required.");
      return;
    }

    try {
      setLoading(true);
      await deleteMyAccount({ password: password.trim() });
      // Backend clears cookies; Redux token is cleared here.
      dispatch(logout());
      setSuccess("Account deleted.");
      navigate("/register");
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to delete account.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logoutApi();
    } catch {
      // Logout should still continue on client side.
    } finally {
      dispatch(logout());
      navigate("/login");
    }
  };

  return (
    <div className="profile-page">
      <section className="profile-card edit">
        <h1>Settings</h1>
        <p className="auth-subtitle">Manage account security and profile navigation.</p>

        <div className="profile-actions">
          <button type="button" className="ghost-btn" onClick={() => navigate("/profile")}>
            Open Profile
          </button>
          <button type="button" className="ghost-btn" onClick={() => navigate("/profile/edit")}>
            Edit Profile
          </button>
          <button type="button" className="ghost-btn" onClick={handleLogout}>
            Sign out
          </button>
        </div>

        <form className="profile-form password-form delete-account-form" onSubmit={handleDelete}>
          <h2>Delete Account</h2>
          <p className="group-muted">
            This action will disable your account and sign you out.
          </p>
          <label>
            Current Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>
          <label className="group-user-option">
            <input
              type="checkbox"
              checked={confirmDelete}
              onChange={(event) => setConfirmDelete(event.target.checked)}
            />
            <span>I understand this action cannot be undone.</span>
          </label>
          {error ? <p className="form-error">{error}</p> : null}
          {success ? <p className="toast inline">{success}</p> : null}
          <button type="submit" className="ghost-btn danger" disabled={loading}>
            {loading ? "Deleting..." : "Delete Account"}
          </button>
        </form>
      </section>
    </div>
  );
}
