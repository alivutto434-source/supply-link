import React from 'react';
import {
  Alert,
  Button,
  Card,
  Form,
  InputNumber,
  Popconfirm,
  Table,
  Tag,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  CheckCircleFilled,
  DeleteOutlined,
  PercentageOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import { useTrade } from '../../context/TradeContext';
import { BonusSlab } from '../../types/trade';
import { formatBDT, formatNumberBD, formatPercent } from '../../utils/format';

interface SlabFormValues {
  plusPercentage: number;
  min: number;
  max: number;
}

export const DealerBonusSlabsPage: React.FC = () => {
  const [form] = Form.useForm<SlabFormValues>();
  const {
    state,
    totalSellAmount,
    bonusEligibility,
    addBonusSlab,
    deleteBonusSlab,
  } = useTrade();

  const sortedSlabs = [...state.bonusSlabs].sort(
    (a, b) => a.range.min - b.range.min
  );

  const handleAddSlab = (values: SlabFormValues) => {
    if (values.min >= values.max) {
      message.error('Maximum range BDT must be greater than minimum range BDT.');
      return;
    }

    const overlaps = state.bonusSlabs.some(
      (s) => values.min <= s.range.max && values.max >= s.range.min
    );
    if (overlaps) {
      message.warning(
        'Range overlaps with an existing bonus slab. Delete the overlapping slab or adjust the BDT range.'
      );
      return;
    }

    const ok = addBonusSlab(values);
    if (ok) {
      message.success(
        `Added monthly bonus slab: +${formatPercent(values.plusPercentage)} for ${formatNumberBD(values.min)} – ${formatNumberBD(values.max)} BDT.`
      );
      form.resetFields();
    }
  };

  const handleDelete = (slab: BonusSlab) => {
    const ok = deleteBonusSlab(slab.id);
    if (ok) {
      message.success(
        `Removed +${formatPercent(slab.plusPercentage)} bonus slab.`
      );
    }
  };

  const columns: ColumnsType<BonusSlab> = [
    {
      title: 'Monthly Quota Range (BDT)',
      key: 'range',
      render: (_, record) => (
        <div className="font-semibold text-slate-900">
          {formatNumberBD(record.range.min)} – {formatNumberBD(record.range.max)} BDT
        </div>
      ),
    },
    {
      title: 'Percentage to Plus',
      dataIndex: 'plusPercentage',
      key: 'plusPercentage',
      width: 180,
      render: (pct: number) => (
        <Tag color="green" className="px-2.5 py-0.5 text-sm font-bold">
          +{formatPercent(pct)}
        </Tag>
      ),
    },
    {
      title: 'Effective Discount (Base + Bonus)',
      key: 'effective',
      width: 240,
      render: (_, record) => {
        const total = state.baseDiscountPercentage + record.plusPercentage;
        return (
          <span className="font-semibold text-slate-800">
            {formatPercent(state.baseDiscountPercentage)} +{' '}
            {formatPercent(record.plusPercentage)} ={' '}
            <span className="text-emerald-700">{formatPercent(total)}</span>
          </span>
        );
      },
    },
    {
      title: 'Current Supplier Status',
      key: 'status',
      width: 190,
      render: (_, record) => {
        const isCurrent = bonusEligibility.eligibleSlab?.id === record.id;
        return isCurrent ? (
          <Tag color="success" icon={<CheckCircleFilled />}>
            Currently Eligible
          </Tag>
        ) : (
          <span className="text-xs text-slate-400">Inactive tier</span>
        );
      },
    },
    {
      title: 'Action',
      key: 'action',
      align: 'right',
      width: 120,
      render: (_, record) => (
        <Popconfirm
          title="Delete this bonus slab?"
          description="Supplier eligibility will recalculate immediately."
          onConfirm={() => handleDelete(record)}
          okText="Delete"
          cancelText="Cancel"
          okButtonProps={{ danger: true }}
        >
          <Button danger size="small" icon={<DeleteOutlined />}>
            Delete
          </Button>
        </Popconfirm>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="m-0 text-2xl font-bold tracking-tight text-slate-900">
              Manage Monthly Bonus Slabs
            </h1>
            <Tag color="blue" className="!m-0 font-medium">
              Monthly Focus
            </Tag>
          </div>
          <p className="mt-1 mb-0 text-sm text-slate-500">
            Configure target ranges in BDT and extra discount percentages added on top of the 22% base supplier discount.
          </p>
        </div>
      </div>

      <Alert
        type="info"
        showIcon
        message={`Base Supplier Discount: ${formatPercent(state.baseDiscountPercentage)} (Applied automatically below first quota threshold)`}
        description={`Current supplier monthly sales stand at ${formatBDT(totalSellAmount)}, qualifying for ${formatPercent(bonusEligibility.baseDiscount)} base + ${formatPercent(bonusEligibility.plusPercentage)} bonus = ${formatPercent(bonusEligibility.totalDiscount)} total discount.`}
      />

      {/* Add Slab Form (Add & Delete only, no Edit needed) */}
      <Card
        title={
          <div className="flex items-center gap-2">
            <PercentageOutlined className="text-blue-600" />
            <span>Add New Monthly Bonus Slab</span>
          </div>
        }
        className="border border-solid border-slate-200 shadow-sm"
      >
        <Form form={form} layout="vertical" onFinish={handleAddSlab}>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
            <Form.Item
              label="Percentage to Plus (+%)"
              name="plusPercentage"
              className="md:col-span-3"
              rules={[
                { required: true, message: 'Enter bonus %' },
                { type: 'number', min: 0.1, max: 70, message: '0.1% – 70%' },
              ]}
            >
              <InputNumber
                size="large"
                className="w-full"
                step={0.5}
                min={0.1}
                placeholder="e.g., 6"
                addonBefore="+"
                addonAfter="%"
              />
            </Form.Item>

            <Form.Item
              label="Range Minimum (BDT)"
              name="min"
              className="md:col-span-4"
              rules={[
                { required: true, message: 'Enter minimum BDT' },
                { type: 'number', min: 1, message: 'Must be > 0' },
              ]}
            >
              <InputNumber
                size="large"
                className="w-full"
                min={1}
                step={50000}
                placeholder="e.g., 1400001"
                prefix="৳"
              />
            </Form.Item>

            <Form.Item
              label="Range Maximum (BDT)"
              name="max"
              className="md:col-span-4"
              rules={[
                { required: true, message: 'Enter maximum BDT' },
                { type: 'number', min: 1, message: 'Must be > 0' },
              ]}
            >
              <InputNumber
                size="large"
                className="w-full"
                min={1}
                step={50000}
                placeholder="e.g., 2000000"
                prefix="৳"
              />
            </Form.Item>

            <div className="flex items-end md:col-span-1">
              <Form.Item className="w-full">
                <Button
                  type="primary"
                  htmlType="submit"
                  size="large"
                  icon={<PlusOutlined />}
                  block
                >
                  Add
                </Button>
              </Form.Item>
            </div>
          </div>
        </Form>
      </Card>

      {/* Slabs Table */}
      <Card
        title={
          <span className="font-semibold text-slate-900">
            Configured Monthly Bonus Slabs ({sortedSlabs.length})
          </span>
        }
        extra={
          <span className="text-xs text-slate-500">
            Base {formatPercent(state.baseDiscountPercentage)} applies below{' '}
            {sortedSlabs.length > 0
              ? `${formatNumberBD(sortedSlabs[0].range.min)} BDT`
              : 'all slabs'}
          </span>
        }
        className="border border-solid border-slate-200 shadow-sm"
        styles={{ body: { padding: 0 } }}
      >
        <Table
          rowKey="id"
          columns={columns}
          dataSource={sortedSlabs}
          pagination={false}
          scroll={{ x: 680 }}
        />
      </Card>
    </div>
  );
};
