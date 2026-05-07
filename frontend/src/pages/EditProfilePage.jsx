import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import {
  changePassword,
  deleteAccount,
  getMyProfile,
  updateMyProfile,
  uploadCoverPhoto,
  uploadProfilePhoto
} from "../services/profileService";
import { logout } from "../features/auth/authSlice";

export default function EditProfilePage() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phoneNumber: "",
    bio: ""
  });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: "", newPassword: "" });
  const [deletePassword, setDeletePassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const response = await getMyProfile();
        const data = response.data.data;
        setProfile(data);
        setForm({
          firstName: data.firstName || "",
          lastName: data.lastName || "",
          email: data.email || "",
          phoneNumber: data.phoneNumber || "",
          bio: data.bio || ""
        });
      } catch (err) {
        setError(err.userFriendlyMessage || "Failed to load profile.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const handleSave = async (event) => {
    event.preventDefault();
    try {
      setSaving(true);
      setError("");
      const response = await updateMyProfile(form);
      setProfile(response.data.data);
      setMessage("Profile updated.");
      setTimeout(() => setMessage(""), 2000);
    } catch (err) {
      setError(err.userFriendlyMessage || err?.response?.data?.message || "Failed to update profile.");
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoUpload = async (event, type) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      setSaving(true);
      setError("");
      const response = type === "profile" ? await uploadProfilePhoto(formData) : await uploadCoverPhoto(formData);
      const fileUrl = response.data.data.fileUrl;
      setProfile((prev) => ({
        ...prev,
        profileImageUrl: type === "profile" ? fileUrl : prev.profileImageUrl,
        coverImageUrl: type === "cover" ? fileUrl : prev.coverImageUrl
      }));
      setMessage(type === "profile" ? "Profile photo updated." : "Cover photo updated.");
      setTimeout(() => setMessage(""), 2000);
    } catch (err) {
      setError(err.userFriendlyMessage || "Failed to upload file.");
    } finally {
      setSaving(false);
      event.target.value = "";
    }
  };

  const handleChangePassword = async (event) => {
    event.preventDefault();
    try {
      await changePassword(passwordForm);
      setPasswordForm({ currentPassword: "", newPassword: "" });
      setMessage("Password changed.");
      setTimeout(() => setMessage(""), 2000);
    } catch (err) {
      setError(err.userFriendlyMessage || err?.response?.data?.message || "Failed to change password.");
    }
  };

  const handleDeleteAccount = async (event) => {
    event.preventDefault();
    if (!window.confirm("Delete your account permanently? This action cannot be undone.")) {
      return;
    }

    try {
      setDeleting(true);
      setError("");
      await deleteAccount({ password: deletePassword });
      dispatch(logout());
      navigate("/login");
    } catch (err) {
      setError(err.userFriendlyMessage || err?.response?.data?.message || "Failed to delete account.");
    } finally {
      setDeleting(false);
    }
  };

  if (loading) return <div className="profile-page">Loading...</div>;

  return (
    <div className="profile-page">
      <section className="profile-card edit">
        <h1>Edit Profile</h1>
        <form className="profile-form" onSubmit={handleSave}>
          <label>
            First Name
            <input value={form.firstName} onChange={(e) => setForm((prev) => ({ ...prev, firstName: e.target.value }))} />
          </label>
          <label>
            Last Name
            <input value={form.lastName} onChange={(e) => setForm((prev) => ({ ...prev, lastName: e.target.value }))} />
          </label>
          <label>
            Email
            <input value={form.email} onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))} />
          </label>
          <label>
            Phone Number
            <input value={form.phoneNumber} onChange={(e) => setForm((prev) => ({ ...prev, phoneNumber: e.target.value }))} />
          </label>
          <label>
            Bio
            <textarea rows={4} value={form.bio} onChange={(e) => setForm((prev) => ({ ...prev, bio: e.target.value }))} />
          </label>
          <div className="upload-actions">
            <label className="ghost-btn small">
              Upload Profile Photo
              <input type="file" accept=".jpg,.jpeg,.png,.webp" hidden onChange={(e) => handlePhotoUpload(e, "profile")} />
            </label>
            <label className="ghost-btn small">
              Upload Cover Photo
              <input type="file" accept=".jpg,.jpeg,.png,.webp" hidden onChange={(e) => handlePhotoUpload(e, "cover")} />
            </label>
          </div>
          <button type="submit" className="primary-btn" disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </form>

        <form className="profile-form password-form" onSubmit={handleChangePassword}>
          <h2>Change Password</h2>
          <label>
            Current Password
            <input
              type="password"
              value={passwordForm.currentPassword}
              onChange={(e) => setPasswordForm((prev) => ({ ...prev, currentPassword: e.target.value }))}
              required
            />
          </label>
          <label>
            New Password
            <input
              type="password"
              value={passwordForm.newPassword}
              onChange={(e) => setPasswordForm((prev) => ({ ...prev, newPassword: e.target.value }))}
              required
            />
          </label>
          <button type="submit" className="primary-btn">
            Update Password
          </button>
        </form>

        <form className="profile-form password-form delete-account-form" onSubmit={handleDeleteAccount}>
          <h2>Delete Account</h2>
          <label>
            Confirm Password
            <input
              type="password"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              required
            />
          </label>
          <button type="submit" className="ghost-btn danger" disabled={deleting}>
            {deleting ? "Deleting..." : "Delete Account"}
          </button>
        </form>

        {message ? <p className="toast inline">{message}</p> : null}
        {error ? <p className="form-error">{error}</p> : null}
        <button type="button" className="ghost-btn" onClick={() => navigate("/profile")}>
          Back
        </button>
      </section>
    </div>
  );
}
