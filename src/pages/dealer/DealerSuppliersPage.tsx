import React from 'react';
import { Alert, Button, Card, Form, Input, Table, Tag, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  CreditCardOutlined,
  PlusOutlined,
  TeamOutlined,
  UserAddOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import { useTrade } from '../../context/TradeContext';
import { SupplierRecord } from '../../types/trade';
import { formatBDT } from '../../utils/format';

export const DealerSuppliersPage: React.FC = () => {
  const [form] = Form.useForm<{ name: string }>();
  const navigate = useNavigate();
  const { state, addSupplier } = useTrade();

  const handleFinish = (values: { name: string }) => {
    const ok = addSupplier(values.name);
    if (ok) {
      message.success(`Supplier "${values.name.trim()}" registered under ${state.dealerName}.`);
      form.resetFields();
    }
  };

  const columns: ColumnsType<SupplierRecord> = [
    {
      title: 'Supplier Name',
      dataIndex: 'name',
      key: 'name',
      render: (name: string) => (
        <span className="font-semibold text-slate-900">{name}</span>
      ),
    },
    {
      title: 'Distribution Role',
      key: 'role',
      width: 190,
      render: () => <Tag color="blue">Authorized Supplier</Tag>,
    },
    {
      title: 'Pending Advance Credit',
      key: 'advance',
      width: 200,
      render: (_, record) => {
        const pending = state.advanceAllocations
          .filter((a) => a.supplierId === record.id && a.status === 'pending')
          .reduce((sum, a) => sum + a.netPayableAmount, 0);
        return pending > 0 ? (
          <span className="font-semibold text-amber-700">{formatBDT(pending)}</span>
        ) : (
          <span className="text-xs text-slate-400">No pending due</span>
        );
      },
    },
    {
      title: 'Added On',
      dataIndex: 'addedAt',
      key: 'addedAt',
      width: 160,
      render: (iso: string) => (
        <span className="text-xs text-slate-500">
          {dayjs(iso).format('DD MMM YYYY')}
        </span>
      ),
    },
    {
      title: 'Advance Stock',
      key: 'action',
      align: 'right',
      width: 180,
      render: (_, record) => (
        <Button
          size="small"
          icon={<CreditCardOutlined />}
          onClick={() =>
            navigate(`/dealer/advance-products?supplierId=${record.id}`)
          }
        >
          Give Advance
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="m-0 text-2xl font-bold tracking-tight text-slate-900">
          Manage Suppliers
        </h1>
        <p className="mt-1 mb-0 text-sm text-slate-500">
          Register distribution suppliers under {state.dealerName}.
        </p>
      </div>

      <Alert
        type="info"
        showIcon
        message="Supply Chain Policy: Dealer → Supplier → Businessman"
        description="Dealers supply exclusively to registered Suppliers and cannot sell directly to Businessmen (Shops). Suppliers handle all downstream sales to Businessmen."
      />

      {/* Add Supplier — Just Take Names */}
      <Card
        title={
          <div className="flex items-center gap-2">
            <UserAddOutlined className="text-blue-600" />
            <span>Add New Supplier</span>
          </div>
        }
        className="border border-solid border-slate-200 shadow-sm"
      >
        <Form
          form={form}
          layout="inline"
          onFinish={handleFinish}
          className="flex flex-col gap-3 sm:flex-row sm:items-start"
        >
          <Form.Item
            name="name"
            className="!m-0 flex-1"
            rules={[
              { required: true, message: 'Please enter the supplier name' },
              {
                validator: (_, val) =>
                  val && val.trim().length >= 2
                    ? Promise.resolve()
                    : Promise.reject(new Error('Enter at least 2 characters')),
              },
            ]}
          >
            <Input
              size="large"
              placeholder="Enter supplier name (e.g., Meghna Metro Distributors)"
              allowClear
            />
          </Form.Item>
          <Form.Item className="!m-0">
            <Button
              type="primary"
              htmlType="submit"
              size="large"
              icon={<PlusOutlined />}
            >
              Add Supplier
            </Button>
          </Form.Item>
        </Form>
      </Card>

      {/* Supplier Directory */}
      <Card
        title={
          <div className="flex items-center gap-2">
            <TeamOutlined className="text-blue-600" />
            <span>Registered Suppliers ({state.suppliers.length})</span>
          </div>
        }
        className="border border-solid border-slate-200 shadow-sm"
        styles={{ body: { padding: 0 } }}
      >
        <Table
          rowKey="id"
          columns={columns}
          dataSource={state.suppliers}
          pagination={{ pageSize: 8, hideOnSinglePage: true }}
          scroll={{ x: 640 }}
        />
      </Card>
    </div>
  );
};
