export default function Modal({ isOpen, children }) {
  if (!isOpen) return null;
  return <div className="modal">{children}</div>;
}

