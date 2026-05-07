import { Navigate } from "react-router-dom";

export default function ProtectedRoute({ isAllowed, children }) {
  return isAllowed ? children : <Navigate to="/login" replace />;
}

