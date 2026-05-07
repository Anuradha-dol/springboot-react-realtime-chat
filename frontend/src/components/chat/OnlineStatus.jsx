export default function OnlineStatus({ online }) {
  return (
    <span className={`online-status ${online ? "online" : "offline"}`}>
      {online ? "Online" : "Offline"}
    </span>
  );
}
