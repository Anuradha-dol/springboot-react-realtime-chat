import { Navigate, Route, Routes } from "react-router-dom";
import { useSelector } from "react-redux";
import ProtectedRoute from "../components/layout/ProtectedRoute";
import Login from "../features/auth/pages/Login";
import Register from "../features/auth/pages/Register";
import VerifyEmail from "../features/auth/pages/VerifyEmail";
import ForgotPassword from "../features/auth/pages/ForgotPassword";
import ResetPassword from "../features/auth/pages/ResetPassword";
import ChatPage from "../pages/ChatPage";
import ProfilePage from "../pages/ProfilePage";
import EditProfilePage from "../pages/EditProfilePage";
import ViewProfilePage from "../pages/ViewProfilePage";
import Settings from "../features/settings/pages/Settings";

export default function AppRoutes() {
  const isAuthenticated = useSelector((state) => state.auth.isAuthenticated);

  return (
    <Routes>
      <Route path="/" element={<Navigate to={isAuthenticated ? "/chats" : "/login"} replace />} />
      <Route path="/login" element={isAuthenticated ? <Navigate to="/chats" replace /> : <Login />} />
      <Route path="/register" element={isAuthenticated ? <Navigate to="/chats" replace /> : <Register />} />
      {/* Auth recovery routes stay public. */}
      <Route path="/verify-email" element={isAuthenticated ? <Navigate to="/chats" replace /> : <VerifyEmail />} />
      <Route path="/forgot-password" element={isAuthenticated ? <Navigate to="/chats" replace /> : <ForgotPassword />} />
      <Route path="/reset-password" element={isAuthenticated ? <Navigate to="/chats" replace /> : <ResetPassword />} />
      <Route
        path="/chats"
        element={
          <ProtectedRoute isAllowed={isAuthenticated}>
            <ChatPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute isAllowed={isAuthenticated}>
            <ProfilePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile/edit"
        element={
          <ProtectedRoute isAllowed={isAuthenticated}>
            <EditProfilePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile/:userId"
        element={
          <ProtectedRoute isAllowed={isAuthenticated}>
            <ViewProfilePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute isAllowed={isAuthenticated}>
            <Settings />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings/profile"
        element={
          <ProtectedRoute isAllowed={isAuthenticated}>
            <EditProfilePage />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
