import React from 'react';
import { Button, Card, Progress, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  ArrowRightOutlined,
  CheckCircleFilled,
  CrownFilled,
  GiftOutlined,
  RiseOutlined,
  ShopOutlined,
  ShoppingCartOutlined,
  WalletOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { BusinessmanSpendSummary, useTrade } from '../context/TradeContext';
import { formatBDT, formatNumberBD, formatPercent } from '../utils/format';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    state,
    totalSellAmount,
    bonusEligibility,
    businessmanLeaderboard,
    pendingAdvanceTotal,
  } = useTrade();

  const sortedSlabs = [...state.bonusSlabs].sort((a, b) => a.range.min - b.range.min);
  const lowestSlabMin = sortedSlabs.length > 0 ? sortedSlabs[0].range.min : 500000;

  const progressToNext = (() => {
    if (!bonusEligibility.nextSlab) return 100;
    const prevFloor = bonusEligibility.eligibleSlab
      ? bonusEligibility.eligibleSlab.range.min
      : 0;
    const span = bonusEligibility.nextSlab.range.min - prevFloor;
    if (span <= 0) return 100;
    return Math.min(
      99,
      Math.max(4, Math.round(((totalSellAmount - prevFloor) / span) * 100))
    );
  })();

  const columns: ColumnsType<BusinessmanSpendSummary> = [
    {
      title: 'Rank',
      key: 'rank',
      width: 84,
      render: (_, __, index) => {
        const rank = index + 1;
        if (rank === 1) {
          return (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800">
              <CrownFilled className="text-amber-500" /> #{rank}
            </span>
          );
        }
        if (rank === 2) {
          return (
            <span className="inline-flex items-center rounded-full bg-slate-200 px-2.5 py-0.5 text-xs font-bold text-slate-700">
              #{rank}
            </span>
          );
        }
        if (rank === 3) {
          return (
            <span className="inline-flex items-center rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-bold text-orange-800">
              #{rank}
            </span>
          );
        }
        return (
          <span className="px-2.5 text-xs font-semibold text-slate-500">
            #{rank}
          </span>
        );
      },
    },
    {
      title: 'Businessman / Shop',
      key: 'shop',
      render: (_, record) => (
        <div>
          <div className="font-semibold text-slate-900">
            {record.businessman.shopName}
          </div>
          <div className="text-xs text-slate-500">{record.businessman.area}</div>
        </div>
      ),
    },
    {
      title: 'Orders',
      dataIndex: 'orderCount',
      key: 'orderCount',
      width: 100,
      render: (count: number) => (
        <span className="font-medium text-slate-700">{count}</span>
      ),
    },
    {
      title: 'Units Sold',
      dataIndex: 'totalUnits',
      key: 'totalUnits',
      width: 110,
      render: (units: number) => (
        <span className="text-slate-600">{formatNumberBD(units)}</span>
      ),
    },
    {
      title: 'Recent Item Purchased',
      dataIndex: 'lastProductName',
      key: 'lastProductName',
      responsive: ['md'],
      render: (name: string | null) =>
        name ? (
          <span className="text-xs text-slate-600">{name}</span>
        ) : (
          <span className="text-xs italic text-slate-400">No orders yet</span>
        ),
    },
    {
      title: 'Spend Share',
      key: 'share',
      width: 150,
      responsive: ['lg'],
      render: (_, record) => {
        const share =
          totalSellAmount > 0
            ? Math.round((record.totalSpend / totalSellAmount) * 100)
            : 0;
        return (
          <div className="flex items-center gap-2">
            <Progress
              percent={share}
              size="small"
              showInfo={false}
              strokeColor="#2563eb"
            />
            <span className="w-9 text-right text-xs text-slate-500">{share}%</span>
          </div>
        );
      },
    },
    {
      title: 'Total Spend (BDT)',
      dataIndex: 'totalSpend',
      key: 'totalSpend',
      align: 'right',
      width: 170,
      render: (spend: number) => (
        <span className="text-sm font-bold text-slate-900">
          {formatBDT(spend)}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="m-0 text-2xl font-bold tracking-tight text-slate-900">
              Supplier Dashboard
            </h1>
            <Tag color="blue" className="!m-0 font-medium">
              Monthly Cycle
            </Tag>
          </div>
          <p className="mt-1 mb-0 text-sm text-slate-500">
            Track monthly sales to businessmen, active dealer discount eligibility, and shop spending rankings.
          </p>
        </div>

        <Button
          type="primary"
          size="large"
          icon={<ShoppingCartOutlined />}
          onClick={() => navigate('/supplier/orders')}
          className="font-medium shadow-sm"
        >
          Sell / Order for Businessman
        </Button>
      </div>

      {/* Primary KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {/* Card 1: Sell Amount */}
        <Card className="border border-solid border-slate-200 shadow-sm" styles={{ body: { padding: 20 } }}>
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Monthly Sell Amount
              </div>
              <div className="mt-2 text-2xl font-bold text-slate-900">
                {formatBDT(totalSellAmount)}
              </div>
              <div className="mt-2 text-xs text-slate-500">
                Across{' '}
                <span className="font-semibold text-slate-700">
                  {state.salesOrders.length}
                </span>{' '}
                shop orders
              </div>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-lg text-blue-600">
              <RiseOutlined />
            </div>
          </div>
        </Card>

        {/* Card 2: Eligible Bonus */}
        <Card className="border border-solid border-emerald-200 bg-gradient-to-br from-white to-emerald-50/40 shadow-sm" styles={{ body: { padding: 20 } }}>
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Eligible Discount Benefit
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-emerald-700">
                  {formatPercent(bonusEligibility.totalDiscount)}
                </span>
                {bonusEligibility.plusPercentage > 0 ? (
                  <Tag color="success" className="!m-0 font-semibold">
                    +{formatPercent(bonusEligibility.plusPercentage)} Bonus
                  </Tag>
                ) : (
                  <Tag color="default" className="!m-0">
                    Base Rate
                  </Tag>
                )}
              </div>
              <div className="mt-2 text-xs text-slate-600">
                Base {formatPercent(bonusEligibility.baseDiscount)}
                {bonusEligibility.eligibleSlab
                  ? ` + ${formatPercent(bonusEligibility.plusPercentage)} (${formatNumberBD(bonusEligibility.eligibleSlab.range.min)}–${formatNumberBD(bonusEligibility.eligibleSlab.range.max)} BDT)`
                  : ` (Below ${formatNumberBD(lowestSlabMin)} BDT)`}
              </div>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-lg text-emerald-700">
              <GiftOutlined />
            </div>
          </div>
        </Card>

        {/* Card 3: Next Bonus Quota Progress */}
        <Card className="border border-solid border-slate-200 shadow-sm" styles={{ body: { padding: 20 } }}>
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Monthly Quota Progress
          </div>
          {bonusEligibility.nextSlab ? (
            <>
              <div className="mt-2 text-base font-bold text-slate-900">
                {formatBDT(bonusEligibility.amountToNextSlab)} to next bonus
              </div>
              <div className="mt-1.5">
                <Progress
                  percent={progressToNext}
                  size="small"
                  strokeColor="#1677ff"
                />
              </div>
              <div className="mt-1 text-xs text-slate-500">
                Reach {formatBDT(bonusEligibility.nextSlab.range.min)} for{' '}
                <span className="font-semibold text-blue-600">
                  +{formatPercent(bonusEligibility.nextSlab.plusPercentage)} (
                  {formatPercent(
                    bonusEligibility.baseDiscount +
                      bonusEligibility.nextSlab.plusPercentage
                  )}{' '}
                  total)
                </span>
              </div>
            </>
          ) : (
            <>
              <div className="mt-2 text-base font-bold text-emerald-700">
                Top Monthly Quota Reached
              </div>
              <div className="mt-1.5">
                <Progress percent={100} size="small" status="success" />
              </div>
              <div className="mt-1 text-xs text-slate-500">
                Maximum configured bonus slab unlocked
              </div>
            </>
          )}
        </Card>

        {/* Card 4: Advance Product Credit */}
        <Card className="border border-solid border-slate-200 shadow-sm" styles={{ body: { padding: 20 } }}>
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Pending Advance Payable
              </div>
              <div className="mt-2 text-2xl font-bold text-slate-900">
                {formatBDT(pendingAdvanceTotal)}
              </div>
              <button
                type="button"
                onClick={() => navigate('/supplier/advances')}
                className="mt-2 inline-flex cursor-pointer items-center gap-1 border-0 bg-transparent p-0 text-xs font-medium text-blue-600 hover:text-blue-700"
              >
                View advance stock credit <ArrowRightOutlined />
              </button>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-lg text-amber-600">
              <WalletOutlined />
            </div>
          </div>
        </Card>
      </div>

      {/* Monthly Bonus Tiers Visual Strip */}
      <Card
        title={
          <span className="text-sm font-semibold text-slate-800">
            Monthly Discount & Target Slabs (Set by Dealer)
          </span>
        }
        extra={
          <Button
            type="link"
            size="small"
            onClick={() => navigate('/dealer/bonus-slabs')}
          >
            Manage Slabs
          </Button>
        }
        className="border border-solid border-slate-200 shadow-sm"
        styles={{ body: { padding: 16 } }}
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {/* Base Slab */}
          <div
            className={`rounded-xl border border-solid p-3.5 transition ${
              !bonusEligibility.eligibleSlab
                ? 'border-blue-500 bg-blue-50/60 ring-1 ring-blue-500'
                : 'border-slate-200 bg-slate-50/60'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase text-slate-500">
                Base Discount
              </span>
              {!bonusEligibility.eligibleSlab && (
                <Tag color="blue" className="!m-0 text-[11px] font-semibold">
                  ELIGIBLE
                </Tag>
              )}
            </div>
            <div className="mt-1 text-xl font-bold text-slate-900">
              {formatPercent(state.baseDiscountPercentage)}
            </div>
            <div className="mt-1 text-xs text-slate-500">
              Below {formatBDT(lowestSlabMin)}
            </div>
          </div>

          {/* Dynamic Monthly Bonus Slabs */}
          {sortedSlabs.map((slab) => {
            const isEligible = bonusEligibility.eligibleSlab?.id === slab.id;
            const totalPct = state.baseDiscountPercentage + slab.plusPercentage;
            return (
              <div
                key={slab.id}
                className={`rounded-xl border border-solid p-3.5 transition ${
                  isEligible
                    ? 'border-emerald-500 bg-emerald-50/70 ring-1 ring-emerald-500'
                    : 'border-slate-200 bg-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-emerald-700">
                    +{formatPercent(slab.plusPercentage)} Extra
                  </span>
                  {isEligible && (
                    <Tag
                      color="success"
                      icon={<CheckCircleFilled />}
                      className="!m-0 text-[11px] font-semibold"
                    >
                      ELIGIBLE
                    </Tag>
                  )}
                </div>
                <div className="mt-1 text-xl font-bold text-slate-900">
                  {formatPercent(totalPct)}{' '}
                  <span className="text-xs font-normal text-slate-500">total</span>
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  {formatNumberBD(slab.range.min)} – {formatNumberBD(slab.range.max)} BDT
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Businessman Spend Ranking Table */}
      <Card
        title={
          <div className="flex items-center gap-2">
            <ShopOutlined className="text-blue-600" />
            <span className="text-base font-semibold text-slate-900">
              Businessman (Shop) List — Most Spend to Least Spend
            </span>
          </div>
        }
        extra={
          <span className="text-xs text-slate-500">
            Sorted highest spend first ({businessmanLeaderboard.length} shops)
          </span>
        }
        className="border border-solid border-slate-200 shadow-sm"
        styles={{ body: { padding: 0 } }}
      >
        <Table
          rowKey={(record) => record.businessman.id}
          columns={columns}
          dataSource={businessmanLeaderboard}
          pagination={false}
          scroll={{ x: 640 }}
        />
      </Card>
    </div>
  );
};
