import React from 'react';
import { ConfigProvider } from 'antd';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { TradeProvider } from './context/TradeContext';
import { AppShell } from './components/AppShell';
import { DashboardPage } from './pages/DashboardPage';
import { DealerSuppliersPage } from './pages/dealer/DealerSuppliersPage';
import { DealerProductsPage } from './pages/dealer/DealerProductsPage';
import { DealerBonusSlabsPage } from './pages/dealer/DealerBonusSlabsPage';
import { DealerAdvancePage } from './pages/dealer/DealerAdvancePage';
import { SupplierItemsPage } from './pages/supplier/SupplierItemsPage';
import { SupplierOrdersPage } from './pages/supplier/SupplierOrdersPage';
import { SupplierAdvancesPage } from './pages/supplier/SupplierAdvancesPage';

export const App: React.FC = () => {
  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#1677ff',
          borderRadius: 10,
          fontFamily:
            "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        },
        components: {
          Menu: {
            darkItemBg: 'transparent',
            darkSubMenuItemBg: '#0b1324',
            darkItemSelectedBg: '#1d4ed8',
            itemBorderRadius: 8,
          },
          Card: {
            headerFontSize: 15,
          },
        },
      }}
    >
      <TradeProvider>
        <BrowserRouter>
          <AppShell>
            <Routes>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/dealer/suppliers" element={<DealerSuppliersPage />} />
              <Route path="/dealer/products" element={<DealerProductsPage />} />
              <Route path="/dealer/bonus-slabs" element={<DealerBonusSlabsPage />} />
              <Route path="/dealer/advance-products" element={<DealerAdvancePage />} />
              <Route path="/supplier/items" element={<SupplierItemsPage />} />
              <Route path="/supplier/orders" element={<SupplierOrdersPage />} />
              <Route path="/supplier/advances" element={<SupplierAdvancesPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </AppShell>
        </BrowserRouter>
      </TradeProvider>
    </ConfigProvider>
  );
};

export default App;
