import React from 'react';
import {
  Button,
  Card,
  Form,
  Input,
  InputNumber,
  Select,
  Table,
  Tag,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  AppstoreAddOutlined,
  CheckCircleOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import { useTrade } from '../../context/TradeContext';
import { ProductItem } from '../../types/trade';
import { formatBDT, formatPercent } from '../../utils/format';

interface AddProductValues {
  name: string;
  category: string;
  unit: string;
  unitPrice: number;
}

export const DealerProductsPage: React.FC = () => {
  const [form] = Form.useForm<AddProductValues>();
  const { state, addDealerProduct } = useTrade();

  const watchedPrice = Form.useWatch('unitPrice', form) || 0;
  const dealerItems = state.products.filter((p) => p.source === 'dealer');

  const handleFinish = (values: AddProductValues) => {
    const ok = addDealerProduct(values);
    if (ok) {
      message.success(`"${values.name.trim()}" added to Dealer Catalog and published to Suppliers.`);
      form.resetFields();
    }
  };

  const baseSupplierRate = (price: number) =>
    Math.round(price * ((100 - state.baseDiscountPercentage) / 100));

  const columns: ColumnsType<ProductItem> = [
    {
      title: 'SKU',
      dataIndex: 'sku',
      key: 'sku',
      width: 110,
      render: (sku: string) => (
        <span className="font-mono text-xs font-semibold text-slate-600">
          {sku}
        </span>
      ),
    },
    {
      title: 'Product Name',
      dataIndex: 'name',
      key: 'name',
      render: (name: string) => (
        <span className="font-semibold text-slate-900">{name}</span>
      ),
    },
    {
      title: 'Category',
      dataIndex: 'category',
      key: 'category',
      width: 140,
      render: (category: string) => <Tag>{category}</Tag>,
    },
    {
      title: 'Unit',
      dataIndex: 'unit',
      key: 'unit',
      width: 100,
    },
    {
      title: 'List Price (MRP)',
      dataIndex: 'unitPrice',
      key: 'unitPrice',
      align: 'right',
      width: 155,
      render: (price: number) => (
        <span className="font-semibold text-slate-900">{formatBDT(price)}</span>
      ),
    },
    {
      title: `Supplier Rate (-${formatPercent(state.baseDiscountPercentage)})`,
      key: 'supplierRate',
      align: 'right',
      width: 185,
      render: (_, record) => (
        <span className="font-medium text-emerald-700">
          {formatBDT(baseSupplierRate(record.unitPrice))}
        </span>
      ),
    },
    {
      title: 'Visibility',
      key: 'visibility',
      width: 170,
      render: () => (
        <Tag color="processing" icon={<CheckCircleOutlined />}>
          Visible to Supplier
        </Tag>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="m-0 text-2xl font-bold tracking-tight text-slate-900">
          Dealer Product Catalog
        </h1>
        <p className="mt-1 mb-0 text-sm text-slate-500">
          Add company products under {state.dealerName}. Every item added here becomes immediately available to Suppliers.
        </p>
      </div>

      {/* Add Product Card */}
      <Card
        title={
          <div className="flex items-center gap-2">
            <AppstoreAddOutlined className="text-blue-600" />
            <span>Add Product to Dealer Catalog</span>
          </div>
        }
        className="border border-solid border-slate-200 shadow-sm"
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleFinish}
          initialValues={{ category: 'Edible Oil', unit: 'Carton' }}
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
            <Form.Item
              label="Product Name"
              name="name"
              className="md:col-span-5"
              rules={[{ required: true, message: 'Enter product name' }]}
            >
              <Input
                size="large"
                placeholder="e.g., Fortified Ata Flour (2kg × 20 Sack)"
              />
            </Form.Item>

            <Form.Item
              label="Category"
              name="category"
              className="md:col-span-3"
              rules={[{ required: true, message: 'Select category' }]}
            >
              <Select
                size="large"
                options={[
                  { value: 'Edible Oil', label: 'Edible Oil' },
                  { value: 'Grains', label: 'Grains & Rice' },
                  { value: 'Essentials', label: 'Essentials & Sugar' },
                  { value: 'Dairy', label: 'Dairy Products' },
                  { value: 'Beverages', label: 'Tea & Beverages' },
                  { value: 'Spices', label: 'Spices & Condiments' },
                  { value: 'Household', label: 'Household Care' },
                ]}
              />
            </Form.Item>

            <Form.Item
              label="Packaging Unit"
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
                  { value: 'Chest', label: 'Chest' },
                  { value: 'Pack', label: 'Pack' },
                ]}
              />
            </Form.Item>

            <Form.Item
              label="List Price (BDT)"
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
                placeholder="4500"
                prefix="৳"
              />
            </Form.Item>
          </div>

          <div className="flex flex-col items-start justify-between gap-3 border-t border-solid border-slate-100 pt-4 sm:flex-row sm:items-center">
            <div className="text-xs text-slate-500">
              {watchedPrice > 0 ? (
                <>
                  Standard Supplier Transfer Rate (after{' '}
                  {formatPercent(state.baseDiscountPercentage)} base discount):{' '}
                  <span className="font-semibold text-emerald-700">
                    {formatBDT(baseSupplierRate(watchedPrice))}
                  </span>
                </>
              ) : (
                `Suppliers receive ${formatPercent(state.baseDiscountPercentage)} base discount plus any active monthly target slab bonus.`
              )}
            </div>

            <Button
              type="primary"
              htmlType="submit"
              size="large"
              icon={<PlusOutlined />}
            >
              Add Product
            </Button>
          </div>
        </Form>
      </Card>

      {/* Dealer Catalog Table */}
      <Card
        title={
          <span className="font-semibold text-slate-900">
            Dealer Products ({dealerItems.length})
          </span>
        }
        className="border border-solid border-slate-200 shadow-sm"
        styles={{ body: { padding: 0 } }}
      >
        <Table
          rowKey="id"
          columns={columns}
          dataSource={dealerItems}
          pagination={{ pageSize: 10, hideOnSinglePage: true }}
          scroll={{ x: 760 }}
        />
      </Card>
    </div>
  );
};
