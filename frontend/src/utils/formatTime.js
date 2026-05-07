export default function formatTime(date) {
  if (!date) return "";
  return new Date(date).toLocaleTimeString();
}

