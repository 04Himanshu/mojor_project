import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import Orders from './pages/Orders';
import WalkInOrder from './pages/WalkInOrder';
import Vendors from './pages/Vendors';
import UsersPage from './pages/Users';
import Login from './pages/Login';
import { ToastProvider } from './context/ToastContext';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
import { PERMISSIONS } from './utils/rbac';

function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Login Route */}
            <Route path="/login" element={<Login />} />

            {/* Strictly Protected App Routes - Land on Dashboard ONLY through Login */}
            <Route element={<ProtectedRoute />}>
              <Route path="/" element={<MainLayout />}>
                <Route index element={<Dashboard />} />

                {/* Point-of-Sale Walk-in Counter: requires order creation or order viewing */}
                <Route
                  path="walk-in-order"
                  element={
                    <ProtectedRoute requiredPermission={[PERMISSIONS.ORDERS_CREATE, PERMISSIONS.ORDERS_VIEW]}>
                      <WalkInOrder />
                    </ProtectedRoute>
                  }
                />

                {/* Inventory Management: requires inventory:view */}
                <Route
                  path="inventory"
                  element={
                    <ProtectedRoute requiredPermission={PERMISSIONS.INVENTORY_VIEW}>
                      <Inventory />
                    </ProtectedRoute>
                  }
                />

                {/* Sales Orders: requires orders:view */}
                <Route
                  path="orders"
                  element={
                    <ProtectedRoute requiredPermission={PERMISSIONS.ORDERS_VIEW}>
                      <Orders />
                    </ProtectedRoute>
                  }
                />

                {/* Procurement & Vendors: requires procurement:view */}
                <Route
                  path="vendors"
                  element={
                    <ProtectedRoute requiredPermission={PERMISSIONS.PROCUREMENT_VIEW}>
                      <Vendors />
                    </ProtectedRoute>
                  }
                />

                {/* Users & Roles: STRICTLY restricted to Administrator / Admin */}
                <Route
                  path="users"
                  element={
                    <ProtectedRoute adminOnly>
                      <UsersPage />
                    </ProtectedRoute>
                  }
                />
              </Route>
            </Route>

            {/* Fallback Catch-All Route */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ToastProvider>
  );
}

export default App;
