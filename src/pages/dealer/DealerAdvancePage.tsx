import React, { useEffect } from 'react';
import {
  Button,
  Card,
  Form,
  Input,
  InputNumber,
  Popconfirm,
  Select,
  Table,
  Tag,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  CreditCardOutlined,
  SendOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useSearchParams } from 'react-router-dom';
import { useTrade } from '../../context/TradeContext';
import { AdvanceAllocation } from '../../types/trade';
import { formatBDT, formatNumberBD, formatPercent } from '../../utils/format';

interface AdvanceFormValues {
  supplierId: string;
  productId: string;
  quantity: number;
  note?: string;
}

export const DealerAdvancePage: React.FC = () => {
  const [form] = Form.useForm<AdvanceFormValues>();
  const [searchParams] = useSearchParams();
  const { state, issueAdvanceProduct, settleAdvanceAllocation } = useTrade();

  const dealerProducts = state.products.filter((p) => p.source === 'dealer');

  useEffect(() => {
    const preselectedSupplier = searchParams.get('supplierId');
    if (
      preselectedSupplier &&
      state.suppliers.some((s) => s.id === preselectedSupplier)
    ) {
      form.setFieldsValue({ supplierId: preselectedSupplier });
    }
  }, [form, searchParams, state.suppliers]);

  const watchedProductId = Form.useWatch('productId', form);
  const watchedQuantity = Form.useWatch('quantity', form) || 0;

  const selectedProduct = dealerProducts.find((p) => p.id === watchedProductId);
  const grossPreview = selectedProduct
    ? selectedProduct.unitPrice * watchedQuantity
    : 0;
  const netDeferredPreview = Math.round(
    grossPreview * ((100 - state.baseDiscountPercentage) / 100)
  );

  const handleFinish = (values: AdvanceFormValues) => {
    const ok = issueAdvanceProduct(values);
    if (ok) {
      message.success('Advance product dispatched to supplier on deferred payment terms.');
      form.resetFields();
    }
  };

  const columns: ColumnsType<AdvanceAllocation> = [
    {
      title: 'Supplier',
      dataIndex: 'supplierName',
      key: 'supplierName',
      render: (name: string) => (
        <span className="font-semibold text-slate-900">{name}</span>
      ),
    },
    {
      title: 'Advance Product',
      key: 'product',
      render: (_, record) => (
        <div>
          <div className="font-medium text-slate-800">{record.productName}</div>
          <div className="text-xs text-slate-500">{record.note}</div>
        </div>
      ),
    },
    {
      title: 'Qty',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 90,
      render: (qty: number) => (
        <span className="font-semibold text-slate-700">
          {formatNumberBD(qty)}
        </span>
      ),
    },
    {
      title: 'Gross Value',
      dataIndex: 'grossAmount',
      key: 'grossAmount',
      align: 'right',
      width: 140,
      render: (val: number) => (
        <span className="text-slate-500">{formatBDT(val)}</span>
      ),
    },
    {
      title: `Pay Later (-${formatPercent(state.baseDiscountPercentage)})`,
      dataIndex: 'netPayableAmount',
      key: 'netPayableAmount',
      align: 'right',
      width: 165,
      render: (val: number) => (
        <span className="font-bold text-slate-900">{formatBDT(val)}</span>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 150,
      render: (status: AdvanceAllocation['status']) =>
        status === 'pending' ? (
          <Tag color="warning" icon={<ClockCircleOutlined />}>
            Pay Later (Due)
          </Tag>
        ) : (
          <Tag color="success" icon={<CheckCircleOutlined />}>
            Settled
          </Tag>
        ),
    },
    {
      title: 'Date',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 125,
      render: (iso: string) => (
        <span className="text-xs text-slate-500">
          {dayjs(iso).format('DD MMM YYYY')}
        </span>
      ),
    },
    {
      title: 'Settlement',
      key: 'action',
      align: 'right',
      width: 135,
      render: (_, record) =>
        record.status === 'pending' ? (
          <Popconfirm
            title="Mark advance payment as settled?"
            onConfirm={() => {
              if (settleAdvanceAllocation(record.id)) {
                message.success('Advance balance marked as settled.');
              }
            }}
            okText="Confirm"
            cancelText="Cancel"
          >
            <Button size="small" type="primary" ghost>
              Mark Paid
            </Button>
          </Popconfirm>
        ) : (
          <span className="text-xs text-emerald-600">Cleared</span>
        ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="m-0 text-2xl font-bold tracking-tight text-slate-900">
          Advance Product Allocation (Credit)
        </h1>
        <p className="mt-1 mb-0 text-sm text-slate-500">
          Provide suppliers with advance product stock now and collect money later.
        </p>
      </div>

      {/* Advance Allocation Form */}
      <Card
        title={
          <div className="flex items-center gap-2">
            <CreditCardOutlined className="text-blue-600" />
            <span>Issue Advance Product to Supplier</span>
          </div>
        }
        className="border border-solid border-slate-200 shadow-sm"
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleFinish}
          initialValues={{ quantity: 10 }}
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
            <Form.Item
              label="Select Supplier"
              name="supplierId"
              className="md:col-span-4"
              rules={[{ required: true, message: 'Select a supplier' }]}
            >
              <Select
                size="large"
                placeholder="Choose supplier"
                options={state.suppliers.map((s) => ({
                  value: s.id,
                  label: s.name,
                }))}
              />
            </Form.Item>

            <Form.Item
              label="Dealer Product"
              name="productId"
              className="md:col-span-5"
              rules={[{ required: true, message: 'Select a product' }]}
            >
              <Select
                size="large"
                placeholder="Choose product from dealer catalog"
                options={dealerProducts.map((p) => ({
                  value: p.id,
                  label: `${p.name} — ${formatBDT(p.unitPrice)} / ${p.unit}`,
                }))}
              />
            </Form.Item>

            <Form.Item
              label="Quantity"
              name="quantity"
              className="md:col-span-3"
              rules={[
                { required: true, message: 'Enter quantity' },
                { type: 'number', min: 1, message: 'At least 1' },
              ]}
            >
              <InputNumber size="large" min={1} className="w-full" />
            </Form.Item>

            <Form.Item
              label="Credit Term / Note (Optional)"
              name="note"
              className="md:col-span-12 !mb-2"
            >
              <Input
                size="large"
                placeholder="e.g., 30-day supplier product loan — settle after retailer collection"
              />
            </Form.Item>
          </div>

          <div className="mt-2 flex flex-col items-start justify-between gap-3 rounded-xl border border-solid border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center">
            <div className="space-y-0.5 text-sm">
              <div className="text-slate-600">
                Gross Stock Value:{' '}
                <span className="font-semibold text-slate-900">
                  {formatBDT(grossPreview)}
                </span>
              </div>
              <div className="text-slate-600">
                Deferred Amount Payable Later (after{' '}
                {formatPercent(state.baseDiscountPercentage)} base discount):{' '}
                <span className="text-base font-bold text-blue-700">
                  {formatBDT(netDeferredPreview)}
                </span>
              </div>
            </div>

            <Button
              type="primary"
              htmlType="submit"
              size="large"
              icon={<SendOutlined />}
            >
              Provide Advance Product
            </Button>
          </div>
        </Form>
      </Card>

      {/* Advance Ledger Table */}
      <Card
        title={
          <span className="font-semibold text-slate-900">
            Supplier Advance Product Ledger ({state.advanceAllocations.length})
          </span>
        }
        className="border border-solid border-slate-200 shadow-sm"
        styles={{ body: { padding: 0 } }}
      >
        <Table
          rowKey="id"
          columns={columns}
          dataSource={state.advanceAllocations}
          pagination={{ pageSize: 8, hideOnSinglePage: true }}
          scroll={{ x: 820 }}
        />
      </Card>
    </div>
  );
};
