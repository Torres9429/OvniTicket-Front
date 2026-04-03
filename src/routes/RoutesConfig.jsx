import { useContext } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import MainLayout from '../components/MainLayout';
import Login from '../pages/Login';
import NotFound from '../pages/NotFound';
import AdminHome from '../pages/Admin/AdminHome';
import ClientHome from '../pages/Client/ClientHome';
import UserHome from '../pages/User/UserHome';
import PayloadCryptoLab from '../components/PayloadCryptoLab';
import { getHomePathByRole, normalizeRole } from '../utils/authRoutes';

function RoutesConfig() {
  const { user, loading } = useContext(AuthContext);

  if (loading) return <div>Cargando...</div>;

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    );
  }

  const role = normalizeRole(user.role);

  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route path="/login" element={<Navigate to={getHomePathByRole(user.role)} replace />} />
        {role === "ADMIN" && <Route index element={<AdminHome />} />}
        {(role === "CLIENTE" || role === "CLIENT") && (
          <Route index element={<ClientHome />} />
        )}
        {(role === "USER" || role === "USUARIO") && (
          <Route index element={<UserHome />} />
        )}

        <Route path="crypto-lab" element={<PayloadCryptoLab />} />
        <Route path="*" element={<Navigate to={getHomePathByRole(user.role)} replace />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}



export default RoutesConfig;