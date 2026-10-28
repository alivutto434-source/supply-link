import React, { useMemo, useState } from 'react';
import {
  Button,
  Card,
  Form,
  Input,
  InputNumber,
  Modal,
  Segmented,
  Select,
  Table,
  Tag,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  AppstoreAddOutlined,
  PlusOutlined,
  ShoppingCartOutlined,
} from '@ant-design/icons';
import { useTrade } from '../../context/TradeContext';
import { ProductItem } from '../../types/trade';
import { formatBDT, formatPercent } from '../../utils/format';

interface CustomItemFormValues {
  name: string;
  category: string;
  unit: string;
  unitPrice: number;
}

interface QuickOrderValues {
  businessmanId: string;
  quantity: number;
}

export const SupplierItemsPage: React.FC = () => {
  const [customForm] = Form.useForm<CustomItemFormValues>();
  const [quickOrderForm] = Form.useForm<QuickOrderValues>();

  const [filter, setFilter] = useState<'all' | 'dealer' | 'supplier_custom'>('all');
  const [orderingProduct, setOrderingProduct] = useState<ProductItem | null>(null);

  const {
    state,
    bonusEligibility,
    addSupplierCustomProduct,
    createSaleOrder,
  } = useTrade();

  const watchedQty = Form.useWatch('quantity', quickOrderForm) || 1;

  const filteredProducts = useMemo(() => {
    if (filter === 'all') return state.products;
    return state.products.filter((p) => p.source === filter);
  }, [filter, state.products]);

  const handleAddCustom = (values: CustomItemFormValues) => {
    const ok = addSupplierCustomProduct(values);
    if (ok) {
      message.success(`Custom item "${values.name.trim()}" added to Supplier catalog.`);
      customForm.resetFields();
    }
  };

  const openQuickOrder = (product: ProductItem) => {
    setOrderingProduct(product);
    quickOrderForm.setFieldsValue({
      businessmanId: state.businessmen[0]?.id,
      quantity: 10,
    });
  };

  const handleQuickOrderSubmit = (values: QuickOrderValues) => {
    if (!orderingProduct) return;
    const ok = createSaleOrder({
      businessmanId: values.businessmanId,
      productId: orderingProduct.id,
      quantity: values.quantity,
    });
    if (ok) {
      const shop = state.businessmen.find((b) => b.id === values.businessmanId);
      message.success(
        `Order placed: ${values.quantity} × ${orderingProduct.name} for ${shop?.shopName ?? 'Shop'}.`
      );
      setOrderingProduct(null);
      quickOrderForm.resetFields();
    }
  };

  const effectiveSupplierCost = (item: ProductItem) => {
    if (item.source !== 'dealer') return null;
    const factor = (100 - bonusEligibility.totalDiscount) / 100;
    return Math.round(item.unitPrice * factor);
  };

  const columns: ColumnsType<ProductItem> = [
    {
      title: 'SKU',
      dataIndex: 'sku',
      key: 'sku',
      width: 105,
      render: (sku: string) => (
        <span className="font-mono text-xs font-semibold text-slate-600">
          {sku}
        </span>
      ),
    },
    {
      title: 'Item Name',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record) => (
        <div>
          <div className="font-semibold text-slate-900">{name}</div>
          <div className="text-xs text-slate-500">
            {record.category} · Per {record.unit}
          </div>
        </div>
      ),
    },
    {
      title: 'Source',
      dataIndex: 'source',
      key: 'source',
      width: 155,
      render: (source: ProductItem['source']) =>
        source === 'dealer' ? (
          <Tag color="blue">From Dealer</Tag>
        ) : (
          <Tag color="purple">Custom Item</Tag>
        ),
    },
    {
      title: 'Selling Price (BDT)',
      dataIndex: 'unitPrice',
      key: 'unitPrice',
      align: 'right',
      width: 165,
      render: (price: number) => (
        <span className="font-semibold text-slate-900">{formatBDT(price)}</span>
      ),
    },
    {
      title: `Dealer Cost (-${formatPercent(bonusEligibility.totalDiscount)})`,
      key: 'dealerCost',
      align: 'right',
      width: 190,
      render: (_, record) => {
        const cost = effectiveSupplierCost(record);
        return cost !== null ? (
          <span className="font-medium text-emerald-700">
            {formatBDT(cost)}
          </span>
        ) : (
          <span className="text-xs text-slate-400">Own custom stock</span>
        );
      },
    },
    {
      title: 'Order',
      key: 'action',
      align: 'right',
      width: 145,
      render: (_, record) => (
        <Button
          type="primary"
          size="small"
          icon={<ShoppingCartOutlined />}
          onClick={() => openQuickOrder(record)}
        >
          Order Item
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="m-0 text-2xl font-bold tracking-tight text-slate-900">
          Supplier Catalog & Custom Items
        </h1>
        <p className="mt-1 mb-0 text-sm text-slate-500">
          View all items published by {state.dealerName}, add custom supplier items, and place quantity-based orders for businessmen.
        </p>
      </div>

      {/* Add Custom Item Card */}
      <Card
        title={
          <div className="flex items-center gap-2">
            <AppstoreAddOutlined className="text-purple-600" />
            <span>Add Custom Supplier Item</span>
          </div>
        }
        className="border border-solid border-slate-200 shadow-sm"
      >
        <Form
          form={customForm}
          layout="vertical"
          onFinish={handleAddCustom}
          initialValues={{ category: 'Local Supply', unit: 'Carton' }}
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
            <Form.Item
              label="Custom Item Name"
              name="name"
              className="md:col-span-5"
              rules={[{ required: true, message: 'Enter item name' }]}
            >
              <Input
                size="large"
                placeholder="e.g., Red Lentil Masoor Dal (25kg Sack)"
              />
            </Form.Item>

            <Form.Item
              label="Category"
              name="category"
              className="md:col-span-3"
              rules={[{ required: true, message: 'Enter category' }]}
            >
              <Input size="large" placeholder="e.g., Pulses & Spices" />
            </Form.Item>

            <Form.Item
              label="Unit"
              name="unit"
              className="md:col-span-2"
              rules={[{ required: true, message: 'Select unit' }]}
            >
              <Select
                size="large"
                options={[
                  { value: 'Carton', label: 'Carton' },
                  { value: 'Sack', label: 'Sack' },
                  { value: 'Case', label: 'Case' },
                  { value: 'Pack', label: 'Pack' },
                  { value: 'Unit', label: 'Unit' },
                ]}
              />
            </Form.Item>

            <Form.Item
              label="Unit Price (BDT)"
              name="unitPrice"
              className="md:col-span-2"
              rules={[
                { required: true, message: 'Enter price' },
                { type: 'number', min: 1, message: 'Must be > 0' },
              ]}
            >
              <InputNumber
                size="large"
                className="w-full"
                min={1}
                placeholder="2950"
                prefix="৳"
              />
            </Form.Item>
          </div>

          <div className="flex justify-end border-t border-solid border-slate-100 pt-3">
            <Button
              type="primary"
              htmlType="submit"
              size="large"
              icon={<PlusOutlined />}
            >
              Add Custom Item
            </Button>
          </div>
        </Form>
      </Card>

      {/* Unified Item Table */}
      <Card
        title={
          <span className="font-semibold text-slate-900">
            Available Items ({filteredProducts.length})
          </span>
        }
        extra={
          <Segmented
            value={filter}
            onChange={(val) =>
              setFilter(val as 'all' | 'dealer' | 'supplier_custom')
            }
            options={[
              {
                label: `All (${state.products.length})`,
                value: 'all',
              },
              {
                label: `From Dealer (${state.products.filter((p) => p.source === 'dealer').length})`,
                value: 'dealer',
              },
              {
                label: `Custom (${state.products.filter((p) => p.source === 'supplier_custom').length})`,
                value: 'supplier_custom',
              },
            ]}
          />
        }
        className="border border-solid border-slate-200 shadow-sm"
        styles={{ body: { padding: 0 } }}
      >
        <Table
          rowKey="id"
          columns={columns}
          dataSource={filteredProducts}
          pagination={{ pageSize: 10, hideOnSinglePage: true }}
          scroll={{ x: 760 }}
        />
      </Card>

      {/* Quick Order Modal Taking Quantity */}
      <Modal
        title={
          orderingProduct
            ? `Order Item: ${orderingProduct.name}`
            : 'Order Item'
        }
        open={Boolean(orderingProduct)}
        onCancel={() => setOrderingProduct(null)}
        onOk={() => quickOrderForm.submit()}
        okText="Confirm Order"
      >
        {orderingProduct && (
          <Form
            form={quickOrderForm}
            layout="vertical"
            onFinish={handleQuickOrderSubmit}
            className="mt-4"
          >
            <Form.Item
              label="Businessman (Shop)"
              name="businessmanId"
              rules={[{ required: true, message: 'Select businessman / shop' }]}
            >
              <Select
                size="large"
                options={state.businessmen.map((b) => ({
                  value: b.id,
                  label: `${b.shopName} (${b.area})`,
                }))}
              />
            </Form.Item>

            <Form.Item
              label={`Order Quantity (${orderingProduct.unit}s)`}
              name="quantity"
              rules={[
                { required: true, message: 'Enter quantity' },
                { type: 'number', min: 1, message: 'Minimum quantity is 1' },
              ]}
            >
              <InputNumber size="large" min={1} className="w-full" />
            </Form.Item>

            <div className="rounded-xl border border-solid border-slate-200 bg-slate-50 p-3.5 text-sm">
              <div className="flex justify-between text-slate-600">
                <span>Unit Price:</span>
                <span className="font-medium text-slate-900">
                  {formatBDT(orderingProduct.unitPrice)}
                </span>
              </div>
              <div className="mt-1.5 flex justify-between border-t border-solid border-slate-200 pt-1.5 font-semibold text-slate-900">
                <span>Order Total:</span>
                <span className="text-base text-blue-700">
                  {formatBDT(orderingProduct.unitPrice * watchedQty)}
                </span>
              </div>
            </div>
          </Form>
        )}
      </Modal>
    </div>
  );
};
