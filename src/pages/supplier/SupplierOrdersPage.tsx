import React, { useState } from 'react';
import {
  Button,
  Card,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Table,
  Tag,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  CheckCircleOutlined,
  PlusOutlined,
  RiseOutlined,
  ShopOutlined,
  ShoppingCartOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useTrade } from '../../context/TradeContext';
import { SaleOrder } from '../../types/trade';
import {
  evaluateMonthlyBonus,
  formatBDT,
  formatNumberBD,
  formatPercent,
} from '../../utils/format';

interface OrderFormValues {
  businessmanId: string;
  productId: string;
  quantity: number;
}

interface NewShopFormValues {
  shopName: string;
  area?: string;
}

export const SupplierOrdersPage: React.FC = () => {
  const [form] = Form.useForm<OrderFormValues>();
  const [shopForm] = Form.useForm<NewShopFormValues>();
  const [shopModalOpen, setShopModalOpen] = useState(false);

  const {
    state,
    totalSellAmount,
    bonusEligibility,
    addBusinessman,
    createSaleOrder,
  } = useTrade();

  const watchedProductId = Form.useWatch('productId', form);
  const watchedQuantity = Form.useWatch('quantity', form) || 0;

  const selectedProduct = state.products.find((p) => p.id === watchedProductId);
  const orderSubtotal = selectedProduct
    ? selectedProduct.unitPrice * watchedQuantity
    : 0;

  const projectedSellAmount = totalSellAmount + orderSubtotal;
  const projectedBonus = evaluateMonthlyBonus(
    projectedSellAmount,
    state.baseDiscountPercentage,
    state.bonusSlabs
  );

  const unlocksHigherBonus =
    orderSubtotal > 0 &&
    projectedBonus.totalDiscount > bonusEligibility.totalDiscount;

  const handlePlaceOrder = (values: OrderFormValues) => {
    const ok = createSaleOrder(values);
    if (ok) {
      const shop = state.businessmen.find((b) => b.id === values.businessmanId);
      message.success(
        `Sale recorded for ${shop?.shopName ?? 'Businessman'} (${formatBDT(orderSubtotal)}).`
      );
      form.setFieldsValue({ quantity: 10 });
    }
  };

  const handleCreateShop = (values: NewShopFormValues) => {
    const created = addBusinessman(values.shopName, values.area);
    if (created) {
      message.success(`Businessman shop "${created.shopName}" added.`);
      form.setFieldsValue({ businessmanId: created.id });
      shopForm.resetFields();
      setShopModalOpen(false);
    }
  };

  const columns: ColumnsType<SaleOrder> = [
    {
      title: 'Businessman / Shop',
      dataIndex: 'businessmanName',
      key: 'businessmanName',
      render: (name: string) => (
        <span className="font-semibold text-slate-900">{name}</span>
      ),
    },
    {
      title: 'Ordered Item',
      key: 'item',
      render: (_, record) => (
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium text-slate-800">{record.productName}</span>
          {record.productSource === 'dealer' ? (
            <Tag color="blue" className="!m-0 text-[11px]">
              Dealer Item
            </Tag>
          ) : (
            <Tag color="purple" className="!m-0 text-[11px]">
              Custom Item
            </Tag>
          )}
        </div>
      ),
    },
    {
      title: 'Unit Price',
      dataIndex: 'unitPrice',
      key: 'unitPrice',
      align: 'right',
      width: 135,
      render: (price: number) => (
        <span className="text-slate-600">{formatBDT(price)}</span>
      ),
    },
    {
      title: 'Quantity',
      dataIndex: 'quantity',
      key: 'quantity',
      align: 'right',
      width: 110,
      render: (qty: number) => (
        <span className="font-semibold text-slate-800">
          {formatNumberBD(qty)}
        </span>
      ),
    },
    {
      title: 'Total (BDT)',
      dataIndex: 'totalAmount',
      key: 'totalAmount',
      align: 'right',
      width: 165,
      render: (total: number) => (
        <span className="font-bold text-slate-900">{formatBDT(total)}</span>
      ),
    },
    {
      title: 'Order Date',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 135,
      render: (iso: string) => (
        <span className="text-xs text-slate-500">
          {dayjs(iso).format('DD MMM YYYY')}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="m-0 text-2xl font-bold tracking-tight text-slate-900">
            Order / Sell Product to Businessman
          </h1>
          <p className="mt-1 mb-0 text-sm text-slate-500">
            Select a businessman shop, choose any dealer or custom item, and enter order quantity.
          </p>
        </div>

        <Button
          icon={<ShopOutlined />}
          onClick={() => setShopModalOpen(true)}
        >
          Add New Businessman (Shop)
        </Button>
      </div>

      {/* Order Form & Live Bonus Calculator */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <Card
          title={
            <div className="flex items-center gap-2">
              <ShoppingCartOutlined className="text-blue-600" />
              <span>Create Businessman Order</span>
            </div>
          }
          className="border border-solid border-slate-200 shadow-sm lg:col-span-7"
        >
          <Form
            form={form}
            layout="vertical"
            onFinish={handlePlaceOrder}
            initialValues={{
              businessmanId: state.businessmen[0]?.id,
              productId: state.products[0]?.id,
              quantity: 10,
            }}
          >
            <Form.Item
              label="Select Businessman (Shop)"
              name="businessmanId"
              rules={[{ required: true, message: 'Select a businessman shop' }]}
            >
              <Select
                size="large"
                showSearch
                optionFilterProp="label"
                options={state.businessmen.map((b) => ({
                  value: b.id,
                  label: `${b.shopName} — ${b.area}`,
                }))}
              />
            </Form.Item>

            <Form.Item
              label="Select Item (Dealer or Custom)"
              name="productId"
              rules={[{ required: true, message: 'Select an item to order' }]}
            >
              <Select
                size="large"
                showSearch
                optionFilterProp="label"
                options={state.products.map((p) => ({
                  value: p.id,
                  label: `${p.name} (${p.source === 'dealer' ? 'Dealer' : 'Custom'}) — ${formatBDT(p.unitPrice)} / ${p.unit}`,
                }))}
              />
            </Form.Item>

            <Form.Item
              label={`Quantity${selectedProduct ? ` (${selectedProduct.unit}s)` : ''}`}
              name="quantity"
              rules={[
                { required: true, message: 'Enter quantity' },
                { type: 'number', min: 1, message: 'Quantity must be at least 1' },
              ]}
            >
              <InputNumber size="large" min={1} className="w-full" />
            </Form.Item>

            <div className="mb-5 flex flex-wrap items-center gap-2">
              <span className="text-xs text-slate-500">Quick quantity:</span>
              {[5, 10, 25, 50, 100].map((preset) => (
                <Button
                  key={preset}
                  size="small"
                  onClick={() => form.setFieldsValue({ quantity: preset })}
                >
                  {preset} units
                </Button>
              ))}
            </div>

            <Button
              type="primary"
              htmlType="submit"
              size="large"
              icon={<PlusOutlined />}
              block
            >
              Complete Sale Order
            </Button>
          </Form>
        </Card>

        {/* Live Order & Target Impact Summary */}
        <Card
          title={
            <div className="flex items-center gap-2">
              <RiseOutlined className="text-emerald-600" />
              <span>Order Summary & Monthly Target Impact</span>
            </div>
          }
          className="border border-solid border-slate-200 shadow-sm lg:col-span-5"
        >
          <div className="space-y-4">
            <div className="rounded-xl border border-solid border-slate-200 bg-slate-50 p-4">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Current Order Value
              </div>
              <div className="mt-1 text-3xl font-bold text-blue-700">
                {formatBDT(orderSubtotal)}
              </div>
              {selectedProduct && (
                <div className="mt-1 text-xs text-slate-500">
                  {formatNumberBD(watchedQuantity)} ×{' '}
                  {formatBDT(selectedProduct.unitPrice)} ({selectedProduct.name})
                </div>
              )}
            </div>

            <div className="space-y-2.5 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Current Monthly Sales:</span>
                <span className="font-semibold text-slate-800">
                  {formatBDT(totalSellAmount)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Projected Monthly Sales:</span>
                <span className="font-bold text-slate-900">
                  {formatBDT(projectedSellAmount)}
                </span>
              </div>
              <div className="flex items-center justify-between border-t border-solid border-slate-100 pt-2.5">
                <span className="text-slate-500">Current Eligible Discount:</span>
                <Tag color="blue" className="!m-0 font-semibold">
                  {formatPercent(bonusEligibility.totalDiscount)}
                </Tag>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Projected Discount After Order:</span>
                <Tag
                  color={unlocksHigherBonus ? 'success' : 'processing'}
                  className="!m-0 font-semibold"
                >
                  {formatPercent(projectedBonus.totalDiscount)} (Base{' '}
                  {formatPercent(projectedBonus.baseDiscount)} +{' '}
                  {formatPercent(projectedBonus.plusPercentage)})
                </Tag>
              </div>
            </div>

            {unlocksHigherBonus && (
              <div className="flex items-start gap-2 rounded-xl border border-solid border-emerald-200 bg-emerald-50 p-3 text-xs font-medium text-emerald-800">
                <CheckCircleOutlined className="mt-0.5 text-emerald-600" />
                <span>
                  This order pushes monthly sales into a higher target tier, increasing your dealer discount from{' '}
                  {formatPercent(bonusEligibility.totalDiscount)} to{' '}
                  {formatPercent(projectedBonus.totalDiscount)}!
                </span>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Sales Orders History */}
      <Card
        title={
          <span className="font-semibold text-slate-900">
            Businessman Sales Orders ({state.salesOrders.length})
          </span>
        }
        className="border border-solid border-slate-200 shadow-sm"
        styles={{ body: { padding: 0 } }}
      >
        <Table
          rowKey="id"
          columns={columns}
          dataSource={state.salesOrders}
          pagination={{ pageSize: 10, hideOnSinglePage: true }}
          scroll={{ x: 740 }}
        />
      </Card>

      {/* Add Businessman Modal */}
      <Modal
        title="Add Businessman (Shop)"
        open={shopModalOpen}
        onCancel={() => setShopModalOpen(false)}
        onOk={() => shopForm.submit()}
        okText="Add Shop"
      >
        <Form
          form={shopForm}
          layout="vertical"
          onFinish={handleCreateShop}
          className="mt-4"
        >
          <Form.Item
            label="Businessman / Shop Name"
            name="shopName"
            rules={[{ required: true, message: 'Enter shop name' }]}
          >
            <Input
              size="large"
              placeholder="e.g., Padma Departmental Store"
            />
          </Form.Item>
          <Form.Item label="Market / Area (Optional)" name="area">
            <Input size="large" placeholder="e.g., Motijheel, Dhaka" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};
