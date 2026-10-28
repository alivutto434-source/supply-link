import React, { useMemo, useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  Drawer,
  Layout,
  Menu,
  Popconfirm,
  Progress,
  Tag,
  Tooltip,
} from 'antd';
import type { MenuProps } from 'antd';
import {
  ApartmentOutlined,
  AppstoreAddOutlined,
  BarChartOutlined,
  CheckCircleOutlined,
  ClearOutlined,
  CreditCardOutlined,
  DatabaseOutlined,
  PercentageOutlined,
  ShopOutlined,
  ShoppingCartOutlined,
  TeamOutlined,
  MenuOutlined,
  WarningOutlined,
  WalletOutlined,
} from '@ant-design/icons';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTrade } from '../context/TradeContext';
import { formatBDT, formatPercent } from '../utils/format';

const { Header, Sider, Content } = Layout;

export const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  const {
    state,
    storageHealth,
    totalSellAmount,
    bonusEligibility,
    clearStorageKeepBaseline,
  } = useTrade();

  const menuItems: MenuProps['items'] = useMemo(
    () => [
      {
        key: '/',
        icon: <BarChartOutlined />,
        label: 'Supplier Dashboard',
      },
      {
        key: 'dealer-group',
        icon: <ApartmentOutlined />,
        label: 'Dealer Section',
        children: [
          {
            key: '/dealer/suppliers',
            icon: <TeamOutlined />,
            label: 'Manage Suppliers',
          },
          {
            key: '/dealer/products',
            icon: <AppstoreAddOutlined />,
            label: 'Dealer Products',
          },
          {
            key: '/dealer/bonus-slabs',
            icon: <PercentageOutlined />,
            label: 'Bonus Slabs',
          },
          {
            key: '/dealer/advance-products',
            icon: <CreditCardOutlined />,
            label: 'Advance Product',
          },
        ],
      },
      {
        key: 'supplier-group',
        icon: <ShopOutlined />,
        label: 'Supplier Section',
        children: [
          {
            key: '/supplier/items',
            icon: <AppstoreAddOutlined />,
            label: 'Catalog & Custom Items',
          },
          {
            key: '/supplier/orders',
            icon: <ShoppingCartOutlined />,
            label: 'Order for Businessman',
          },
          {
            key: '/supplier/advances',
            icon: <WalletOutlined />,
            label: 'Advance Stock Credit',
          },
        ],
      },
    ],
    []
  );

  const selectedKeys = [location.pathname];
  const defaultOpenKeys = ['dealer-group', 'supplier-group'];

  const handleMenuClick: MenuProps['onClick'] = ({ key }) => {
    navigate(key);
    setMobileDrawerOpen(false);
  };

  const usedKB = (storageHealth.usedBytes / 1024).toFixed(1);

  const sidebarContent = (
    <div className="flex h-full flex-col justify-between bg-slate-900 text-slate-100">
      <div>
        {/* Brand Header */}
        <div className="flex items-center gap-3 border-b border-solid border-slate-800 px-5 py-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-600 font-bold text-white shadow-sm">
            SL
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <div className="truncate text-base font-bold tracking-tight text-white">
                SupplyLink BD
              </div>
              <div className="truncate text-xs text-slate-400">
                Distribution Network
              </div>
            </div>
          )}
        </div>

        {/* Navigation Menu */}
        <div className="py-3">
          <Menu
            theme="dark"
            mode="inline"
            selectedKeys={selectedKeys}
            defaultOpenKeys={defaultOpenKeys}
            items={menuItems}
            onClick={handleMenuClick}
            style={{ background: 'transparent', borderRight: 0 }}
          />
        </div>
      </div>

      {/* Bottom Storage & Network Footer */}
      {!collapsed && (
        <div className="border-t border-solid border-slate-800 p-4">
          <div className="mb-3 rounded-lg bg-slate-800/80 p-3">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="flex items-center gap-1.5">
                <DatabaseOutlined />
                Local Storage
              </span>
              <span
                className={
                  storageHealth.isFull
                    ? 'font-semibold text-red-400'
                    : storageHealth.isNearFull
                      ? 'font-semibold text-amber-400'
                      : 'text-emerald-400'
                }
              >
                {storageHealth.isFull
                  ? 'Full'
                  : storageHealth.isNearFull
                    ? 'Near Limit'
                    : 'Healthy'}
              </span>
            </div>
            <div className="mt-1.5">
              <Progress
                percent={Math.max(1, storageHealth.usagePercent)}
                size="small"
                showInfo={false}
                strokeColor={
                  storageHealth.isFull
                    ? '#ef4444'
                    : storageHealth.isNearFull
                      ? '#f59e0b'
                      : '#3b82f6'
                }
                trailColor="#1e293b"
              />
            </div>
            <div className="mt-1 flex items-center justify-between text-[11px] text-slate-400">
              <span>{usedKB} KB used</span>
              <span>5,120 KB cap</span>
            </div>
          </div>

          <Popconfirm
            title="Clear Local Storage?"
            description="Custom changes will be cleared while default dealer, item, and shop records remain intact."
            onConfirm={clearStorageKeepBaseline}
            okText="Clear Storage"
            cancelText="Cancel"
            okButtonProps={{ danger: true }}
          >
            <Button
              danger
              block
              icon={<ClearOutlined />}
              size="middle"
              className="font-medium"
            >
              Clear Local Storage
            </Button>
          </Popconfirm>
        </div>
      )}
    </div>
  );

  return (
    <Layout className="min-h-screen">
      {/* Desktop Nested Sidebar */}
      <Sider
        width={260}
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        breakpoint="lg"
        className="hidden lg:block !bg-slate-900 shadow-lg"
      >
        {sidebarContent}
      </Sider>

      {/* Mobile Drawer Sidebar */}
      <Drawer
        placement="left"
        width={265}
        open={mobileDrawerOpen}
        onClose={() => setMobileDrawerOpen(false)}
        styles={{ body: { padding: 0, background: '#0f172a' }, header: { display: 'none' } }}
      >
        {sidebarContent}
      </Drawer>

      <Layout className="bg-slate-50">
        {/* Top Bar */}
        <Header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-solid border-slate-200 !bg-white px-4 shadow-sm sm:px-6">
          <div className="flex items-center gap-3">
            <Button
              type="text"
              icon={<MenuOutlined />}
              onClick={() => setMobileDrawerOpen(true)}
              className="lg:hidden"
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium uppercase tracking-wider text-slate-400">
                  Authorized Dealer:
                </span>
                <span className="text-sm font-semibold text-slate-800">
                  {state.dealerName}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden items-center gap-2 rounded-full border border-solid border-slate-200 bg-slate-50 px-3 py-1 text-xs sm:flex">
              <span className="text-slate-500">Monthly Sales:</span>
              <span className="font-semibold text-slate-900">
                {formatBDT(totalSellAmount)}
              </span>
            </div>

            <Tooltip
              title={`Base ${formatPercent(bonusEligibility.baseDiscount)} + Monthly Bonus ${formatPercent(bonusEligibility.plusPercentage)}`}
            >
              <Tag
                color={bonusEligibility.plusPercentage > 0 ? 'success' : 'processing'}
                icon={<CheckCircleOutlined />}
                className="!m-0 px-2.5 py-1 text-xs font-semibold"
              >
                Discount: {formatPercent(bonusEligibility.totalDiscount)}
              </Tag>
            </Tooltip>

            {storageHealth.isFull && (
              <Badge dot color="red">
                <Tag color="error" icon={<WarningOutlined />} className="!m-0">
                  Storage Full
                </Tag>
              </Badge>
            )}

            <Popconfirm
              title="Clear Local Storage?"
              description="Custom entries will be cleared while default items, dealer, and shops stay available."
              onConfirm={clearStorageKeepBaseline}
              okText="Clear Storage"
              cancelText="Cancel"
              okButtonProps={{ danger: true }}
            >
              <Button
                size="small"
                danger
                icon={<ClearOutlined />}
                className="lg:hidden"
              >
                Clear
              </Button>
            </Popconfirm>
          </div>
        </Header>

        {/* Storage Quota Alert Banner if Full or Near Full */}
        {(storageHealth.isFull || storageHealth.isNearFull || storageHealth.errorMessage) && (
          <div className="px-4 pt-4 sm:px-6">
            <Alert
              type={storageHealth.isFull ? 'error' : 'warning'}
              showIcon
              message={
                storageHealth.isFull
                  ? 'Browser LocalStorage Quota Reached'
                  : 'Browser LocalStorage Nearly Full'
              }
              description={
                storageHealth.errorMessage ||
                `Storage utilization is at ${storageHealth.usagePercent}%. Use "Clear Local Storage" to free space while retaining baseline records.`
              }
              action={
                <Button
                  size="small"
                  danger
                  onClick={clearStorageKeepBaseline}
                >
                  Clear Local Storage
                </Button>
              }
            />
          </div>
        )}

        {/* Main Workspace Content */}
        <Content className="p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl">{children}</div>
        </Content>
      </Layout>
    </Layout>
  );
};
