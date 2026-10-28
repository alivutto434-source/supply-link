import React, { useEffect, useMemo } from 'react';
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
  DeleteOutlined,
  PlusOutlined,
  SendOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useSearchParams } from 'react-router-dom';
import { OrderLineInput, useTrade } from '../../context/TradeContext';
import { AdvanceAllocation } from '../../types/trade';
import { formatBDT, formatNumberBD, formatPercent } from '../../utils/format';

interface AdvanceFormValues {
  supplierIds: string[];
  items: OrderLineInput[];
  note?: string;
}

export const DealerAdvancePage: React.FC = () => {
  const [form] = Form.useForm<AdvanceFormValues>();
  const [searchParams] = useSearchParams();
  const { state, issueAdvanceProduct, settleAdvanceAllocation } = useTrade();

  const dealerProducts = useMemo(
    () => state.products.filter((p) => p.source === 'dealer'),
    [state.products]
  );

  // Group dealer products by category so selecting multiple items across multiple categories is effortless
  const groupedProductOptions = useMemo(() => {
    const groups = new Map<string, { label: string; value: string }[]>();
    for (const product of dealerProducts) {
      const list = groups.get(product.category) ?? [];
      list.push({
        value: product.id,
        label: `${product.name} — ${formatBDT(product.unitPrice)} / ${product.unit}`,
      });
      groups.set(product.category, list);
    }
    return Array.from(groups.entries()).map(([category, options]) => ({
      label: category,
      options,
    }));
  }, [dealerProducts]);

  useEffect(() => {
    const preselectedSupplier = searchParams.get('supplierId');
    if (
      preselectedSupplier &&
      state.suppliers.some((s) => s.id === preselectedSupplier)
    ) {
      form.setFieldsValue({ supplierIds: [preselectedSupplier] });
    }
  }, [form, searchParams, state.suppliers]);

  const watchedSuppliers = Form.useWatch('supplierIds', form) || [];
  const watchedItems = Form.useWatch('items', form) || [];

  const perSupplierGross = useMemo(() => {
    return watchedItems.reduce((sum, row) => {
      if (!row?.productId || !row?.quantity) return sum;
      const prod = dealerProducts.find((p) => p.id === row.productId);
      return prod ? sum + prod.unitPrice * row.quantity : sum;
    }, 0);
  }, [dealerProducts, watchedItems]);

  const perSupplierUnits = useMemo(() => {
    return watchedItems.reduce((sum, row) => sum + (Number(row?.quantity) || 0), 0);
  }, [watchedItems]);

  const perSupplierNetDeferred = Math.round(
    perSupplierGross * ((100 - state.baseDiscountPercentage) / 100)
  );

  const supplierCount = Math.max(1, watchedSuppliers.length);
  const grandTotalNetDeferred = perSupplierNetDeferred * watchedSuppliers.length;

  const handleFinish = (values: AdvanceFormValues) => {
    const ok = issueAdvanceProduct({
      supplierIds: values.supplierIds,
      items: values.items,
      note: values.note,
    });
    if (ok) {
      message.success(
        `Advance product package (${values.items.length} item${values.items.length > 1 ? 's' : ''}) dispatched to ${values.supplierIds.length} supplier${values.supplierIds.length > 1 ? 's' : ''}.`
      );
      form.setFieldsValue({
        supplierIds: state.suppliers[0] ? [state.suppliers[0].id] : [],
        items: [{ productId: dealerProducts[0]?.id ?? '', quantity: 10 }],
        note: '',
      });
    }
  };

  const columns: ColumnsType<AdvanceAllocation> = [
    {
      title: 'Supplier',
      dataIndex: 'supplierName',
      key: 'supplierName',
      width: 190,
      render: (name: string) => (
        <span className="font-semibold text-slate-900">{name}</span>
      ),
    },
    {
      title: 'Advance Products',
      key: 'items',
      render: (_, record) => (
        <div className="space-y-1">
          {record.items.map((item) => (
            <div
              key={item.productId}
              className="flex flex-wrap items-center gap-1.5 text-sm"
            >
              <span className="font-medium text-slate-800">
                {item.productName}
              </span>
              <Tag color="blue" className="!m-0 text-[11px] font-semibold">
                × {formatNumberBD(item.quantity)} {item.unit}
              </Tag>
            </div>
          ))}
          <div className="text-xs text-slate-500">{record.note}</div>
        </div>
      ),
    },
    {
      title: 'Total Qty',
      dataIndex: 'totalQuantity',
      key: 'totalQuantity',
      align: 'right',
      width: 100,
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
      title: 'Pay Later (Net)',
      key: 'netPayableAmount',
      align: 'right',
      width: 175,
      render: (_, record) => (
        <div>
          <div className="font-bold text-slate-900">
            {formatBDT(record.netPayableAmount)}
          </div>
          <div className="text-[11px] text-slate-400">
            -{formatPercent(record.appliedDiscountPercentage)} base
          </div>
        </div>
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
          Provide one or multiple suppliers with multiple advance product items now and collect money later.
        </p>
      </div>

      {/* Advance Allocation Form — Supports Multiple Suppliers & Multiple Items */}
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
          initialValues={{
            supplierIds: state.suppliers[0] ? [state.suppliers[0].id] : [],
            items: [{ productId: dealerProducts[0]?.id ?? '', quantity: 10 }],
          }}
        >
          {/* Multi-Supplier Selector */}
          <Form.Item
            label="Select Supplier(s)"
            name="supplierIds"
            rules={[
              {
                required: true,
                type: 'array',
                min: 1,
                message: 'Select at least one supplier',
              },
            ]}
          >
            <Select
              mode="multiple"
              size="large"
              allowClear
              placeholder="Choose one or multiple suppliers"
              optionFilterProp="label"
              options={state.suppliers.map((s) => ({
                value: s.id,
                label: s.name,
              }))}
            />
          </Form.Item>

          {/* Multi-Item Product Lines */}
          <div className="mb-2 text-sm font-medium text-slate-700">
            Advance Product Items & Quantities
          </div>

          <Form.List name="items">
            {(fields, { add, remove }) => (
              <div className="space-y-3">
                {fields.map(({ key, name, ...restField }) => {
                  const rowItem = watchedItems[name];
                  const rowProduct = dealerProducts.find(
                    (p) => p.id === rowItem?.productId
                  );
                  const lineGross = rowProduct
                    ? rowProduct.unitPrice * (Number(rowItem?.quantity) || 0)
                    : 0;

                  return (
                    <div
                      key={key}
                      className="grid grid-cols-1 items-start gap-3 rounded-xl border border-solid border-slate-200 bg-slate-50/70 p-3 md:grid-cols-12"
                    >
                      <Form.Item
                        {...restField}
                        name={[name, 'productId']}
                        className="!m-0 md:col-span-7"
                        rules={[{ required: true, message: 'Select a product' }]}
                      >
                        <Select
                          size="large"
                          showSearch
                          optionFilterProp="label"
                          placeholder="Choose product from any category"
                          options={groupedProductOptions}
                        />
                      </Form.Item>

                      <Form.Item
                        {...restField}
                        name={[name, 'quantity']}
                        className="!m-0 md:col-span-3"
                        rules={[
                          { required: true, message: 'Qty' },
                          { type: 'number', min: 1, message: 'Min 1' },
                        ]}
                      >
                        <InputNumber
                          size="large"
                          min={1}
                          className="w-full"
                          addonAfter={rowProduct?.unit || 'Units'}
                        />
                      </Form.Item>

                      <div className="flex h-10 items-center justify-between gap-2 md:col-span-2 md:justify-end">
                        <span className="text-xs font-semibold text-slate-700">
                          {formatBDT(lineGross)}
                        </span>
                        {fields.length > 1 && (
                          <Button
                            type="text"
                            danger
                            icon={<DeleteOutlined />}
                            onClick={() => remove(name)}
                          />
                        )}
                      </div>
                    </div>
                  );
                })}

                <Button
                  type="dashed"
                  block
                  icon={<PlusOutlined />}
                  onClick={() =>
                    add({
                      productId:
                        dealerProducts[fields.length % Math.max(1, dealerProducts.length)]
                          ?.id ?? '',
                      quantity: 10,
                    })
                  }
                >
                  Add Another Product Item
                </Button>
              </div>
            )}
          </Form.List>

          <Form.Item
            label="Credit Term / Note (Optional)"
            name="note"
            className="mt-4 !mb-3"
          >
            <Input
              size="large"
              placeholder="e.g., 30-day supplier product loan — settle after retailer collection"
            />
          </Form.Item>

          <div className="mt-2 flex flex-col items-start justify-between gap-3 rounded-xl border border-solid border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center">
            <div className="space-y-0.5 text-sm">
              <div className="text-slate-600">
                Package per Supplier ({watchedItems.length} item
                {watchedItems.length === 1 ? '' : 's'},{' '}
                {formatNumberBD(perSupplierUnits)} units):{' '}
                <span className="font-semibold text-slate-900">
                  {formatBDT(perSupplierGross)} gross
                </span>{' '}
                →{' '}
                <span className="font-bold text-blue-700">
                  {formatBDT(perSupplierNetDeferred)} pay later
                </span>{' '}
                <span className="text-xs text-slate-500">
                  (-{formatPercent(state.baseDiscountPercentage)} base)
                </span>
              </div>
              {watchedSuppliers.length > 1 && (
                <div className="text-xs font-semibold text-emerald-700">
                  Dispatched across {supplierCount} suppliers — Combined Net Payable:{' '}
                  {formatBDT(grandTotalNetDeferred)}
                </div>
              )}
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
          scroll={{ x: 860 }}
        />
      </Card>
    </div>
  );
};
