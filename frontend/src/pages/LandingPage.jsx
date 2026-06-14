import { Link } from "react-router-dom";
import heroBackground from "../assets/landing/pulsechat-hero-background.png";

const metrics = [
  { value: "JWT", label: "Secure sessions" },
  { value: "STOMP", label: "Live messaging" },
  { value: "Groups", label: "Team conversations" }
];

const features = [
  {
    title: "Private and group chat",
    text: "Switch between direct conversations, managed groups, member roles, mentions, replies, and shared media."
  },
  {
    title: "Real-time presence",
    text: "WebSocket events keep messages, typing states, online status, seen updates, and poll results moving instantly."
  },
  {
    title: "Account security",
    text: "JWT authentication, email OTP verification, protected routes, refresh handling, and profile controls are built in."
  }
];

const conversation = [
  { name: "N", text: "Group poll is ready.", time: "09:41", mine: false },
  { name: "You", text: "Send the launch notes here.", time: "09:42", mine: true },
  { name: "M", text: "Images and replies are synced.", time: "09:43", mine: false }
];

export default function LandingPage() {
  return (
    <main className="landing-page" style={{ "--landing-hero-bg": `url(${heroBackground})` }}>
      <section className="landing-hero">
        <nav className="landing-nav" aria-label="Primary">
          <Link to="/" className="landing-brand" aria-label="PulseChat home">
            <span className="landing-brand-mark">PC</span>
            <span>PulseChat</span>
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
          <div className="landing-copy">
            <p className="landing-kicker">JWT WebSocket Chat App</p>
            <h1>PulseChat</h1>
            <p className="landing-lead">
              A secure real-time chat workspace for private messages, groups, media sharing, polls, and live
              presence.
            </p>
            <div className="landing-actions">
              <Link to="/register" className="landing-primary-btn large">
                Start chatting
              </Link>
              <Link to="/login" className="landing-secondary-btn large">
                Sign in
              </Link>
            </div>
          </div>

          <aside className="landing-product-preview" aria-label="PulseChat interface preview">
            <div className="preview-sidebar">
              <div className="preview-profile">
                <span className="preview-avatar">AN</span>
                <span>
                  <strong>Anuradha</strong>
                  <small>Online now</small>
                </span>
              </div>
              <div className="preview-tabs" aria-hidden="true">
                <span className="active">Private</span>
                <span>Groups</span>
              </div>
              <div className="preview-list">
                <span className="active">Project Team</span>
                <span>Design Review</span>
                <span>Backend Room</span>
                <span>Study Group</span>
              </div>
            </div>
            <div className="preview-chat">
              <div className="preview-chat-header">
                <div>
                  <strong>Project Team</strong>
                  <small>5 members active</small>
                </div>
                <span className="preview-live">Live</span>
              </div>
              <div className="preview-messages">
                {conversation.map((message) => (
                  <div key={`${message.name}-${message.time}`} className={`preview-message ${message.mine ? "mine" : ""}`}>
                    <span>{message.text}</span>
                    <small>{message.time}</small>
                  </div>
                ))}
              </div>
              <div className="preview-composer">
                <span>Type a message</span>
                <button type="button" aria-label="Preview send button">
                  Send
                </button>
              </div>
            </div>
          </aside>
        </div>
      </section>

      <section className="landing-metrics" aria-label="Project highlights">
        {metrics.map((metric) => (
          <div className="landing-metric" key={metric.label}>
            <strong>{metric.value}</strong>
            <span>{metric.label}</span>
          </div>
        ))}
      </section>

      <section className="landing-features" aria-label="PulseChat features">
        <div className="landing-section-heading">
          <p>Built for full-stack real-time workflows</p>
          <h2>Everything the chat app already supports, presented from the first screen.</h2>
        </div>
        <div className="landing-feature-grid">
          {features.map((feature) => (
            <article className="landing-feature-card" key={feature.title}>
              <h3>{feature.title}</h3>
              <p>{feature.text}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
