import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getUserProfile } from "../services/profileService";

export default function ViewProfilePage() {
  const { userId } = useParams();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const response = await getUserProfile(userId);
        setProfile(response.data.data);
      } catch (err) {
        setError(err.userFriendlyMessage || "Failed to load profile.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [userId]);

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
            <div className="profile-avatar fallback">{(profile?.displayName || profile?.username || "U").slice(0, 2).toUpperCase()}</div>
          )}
        </div>
        <h1>{profile?.displayName || profile?.username}</h1>
        <p className="profile-meta">@{profile?.username}</p>
        <p className="profile-bio">{profile?.bio || "No bio yet."}</p>
      </section>
    </div>
  );
}
