import { Link } from "react-router-dom";
import heroBackground from "../assets/landing/pulsechat-hero-background.png";

export default function LandingPage() {
  return (
    <main className="landing-page" style={{ "--landing-hero-bg": `url(${heroBackground})` }}>
      <section className="landing-hero">
        <nav className="landing-nav" aria-label="Primary">
          <Link to="/" className="landing-brand" aria-label="PulseChat home">
            PulseChat
          </Link>
          <div className="landing-nav-actions">
            <Link to="/login" className="landing-link-btn">
              Login
            </Link>
            <Link to="/register" className="landing-primary-btn">
              Create account
            </Link>
          </div>
        </nav>

        <div className="landing-hero-content">
          <p className="landing-kicker">Secure real-time messaging</p>
          <h1>PulseChat</h1>
          <p className="landing-lead">
            Private chats, group conversations, media sharing, and live updates in one clean workspace.
          </p>
          <div className="landing-actions">
            <Link to="/register" className="landing-primary-btn large">
              Get started
            </Link>
            <Link to="/login" className="landing-secondary-btn large">
              Sign in
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
