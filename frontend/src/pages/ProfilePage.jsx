import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getMyProfile } from "../services/profileService";

function fallbackAvatar(name) {
  return (name || "U").slice(0, 2).toUpperCase();
}

export default function ProfilePage() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const response = await getMyProfile();
        setProfile(response.data.data);
      } catch (err) {
        setError(err.userFriendlyMessage || "Failed to load profile.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  if (loading) return <div className="profile-page">Loading profile...</div>;
  if (error) return <div className="profile-page form-error">{error}</div>;

  return (
    <div className="profile-page">
      <div
        className="profile-cover"
        style={profile?.coverImageUrl ? { backgroundImage: `url(http://localhost:8080${profile.coverImageUrl})` } : {}}
      />
      <section className="profile-card">
        <div className="profile-avatar-wrap">
          {profile?.profileImageUrl ? (
            <img src={`http://localhost:8080${profile.profileImageUrl}`} alt="profile" className="profile-avatar" />
          ) : (
            <div className="profile-avatar fallback">{fallbackAvatar(profile?.displayName || profile?.username)}</div>
          )}
        </div>
        <h1>{profile?.displayName || profile?.username}</h1>
        <p className="profile-meta">@{profile?.username}</p>
        <p className="profile-meta">{profile?.email}</p>
        <p className="profile-bio">{profile?.bio || "No bio added yet."}</p>
        <div className="profile-actions">
          <button type="button" className="primary-btn" onClick={() => navigate("/profile/edit")}>
            Edit Profile
          </button>
          <button type="button" className="ghost-btn" onClick={() => navigate("/chats")}>
            Back to Chat
          </button>
        </div>
      </section>
    </div>
  );
}
