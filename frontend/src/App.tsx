
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import Dashboard from './pages/Dashboard';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<Dashboard />} />
          {/* Add other routes here later */}
          <Route path="inventory" element={<div className="p-6">Inventory Page</div>} />
          <Route path="orders" element={<div className="p-6">Orders Page</div>} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
