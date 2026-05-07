export default function Avatar({ src, alt = "avatar" }) {
  return <img src={src || "https://via.placeholder.com/40"} alt={alt} width={40} height={40} />;
}

