import React from 'react';
import { Button, Card, Popconfirm, Table, Tag, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  WalletOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useTrade } from '../../context/TradeContext';
import { AdvanceAllocation } from '../../types/trade';
import { formatBDT, formatNumberBD, formatPercent } from '../../utils/format';

export const SupplierAdvancesPage: React.FC = () => {
  const { state, pendingAdvanceTotal, settleAdvanceAllocation } = useTrade();

  const settledTotal = state.advanceAllocations
    .filter((a) => a.status === 'settled')
    .reduce((sum, a) => sum + a.netPayableAmount, 0);

  const columns: ColumnsType<AdvanceAllocation> = [
    {
      title: 'Supplier Recipient',
      dataIndex: 'supplierName',
      key: 'supplierName',
      width: 190,
      render: (name: string) => (
        <span className="font-semibold text-slate-900">{name}</span>
      ),
    },
    {
      title: 'Advance Products Received',
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
      title: 'Deferred Payable',
      key: 'netPayableAmount',
      align: 'right',
      width: 185,
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
      width: 155,
      render: (status: AdvanceAllocation['status']) =>
        status === 'pending' ? (
          <Tag color="warning" icon={<ClockCircleOutlined />}>
            Money Due Later
          </Tag>
        ) : (
          <Tag color="success" icon={<CheckCircleOutlined />}>
            Paid & Settled
          </Tag>
        ),
    },
    {
      title: 'Received Date',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 130,
      render: (iso: string) => (
        <span className="text-xs text-slate-500">
          {dayjs(iso).format('DD MMM YYYY')}
        </span>
      ),
    },
    {
      title: 'Action',
      key: 'action',
      align: 'right',
      width: 145,
      render: (_, record) =>
        record.status === 'pending' ? (
          <Popconfirm
            title="Settle deferred payment with dealer?"
            onConfirm={() => {
              if (settleAdvanceAllocation(record.id)) {
                message.success('Deferred product payment settled with dealer.');
              }
            }}
            okText="Settle Now"
            cancelText="Cancel"
          >
            <Button size="small" type="primary">
              Pay Dealer
            </Button>
          </Popconfirm>
        ) : (
          <span className="text-xs text-emerald-600">Completed</span>
        ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="m-0 text-2xl font-bold tracking-tight text-slate-900">
          Advance Stock Credit (Money Later)
        </h1>
        <p className="mt-1 mb-0 text-sm text-slate-500">
          Products provided in advance by {state.dealerName} on deferred payment terms.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card className="border border-solid border-amber-200 bg-amber-50/40 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Total Pending Payable to Dealer
              </div>
              <div className="mt-1.5 text-2xl font-bold text-amber-800">
                {formatBDT(pendingAdvanceTotal)}
              </div>
            </div>
            <WalletOutlined className="text-2xl text-amber-600" />
          </div>
        </Card>

        <Card className="border border-solid border-emerald-200 bg-emerald-50/40 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Total Settled Advances
              </div>
              <div className="mt-1.5 text-2xl font-bold text-emerald-800">
                {formatBDT(settledTotal)}
              </div>
            </div>
            <CheckCircleOutlined className="text-2xl text-emerald-600" />
          </div>
        </Card>
      </div>

      <Card
        title={
          <span className="font-semibold text-slate-900">
            Advance Stock Allocations ({state.advanceAllocations.length})
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
          scroll={{ x: 780 }}
        />
      </Card>
    </div>
  );
};
