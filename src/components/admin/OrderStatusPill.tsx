import Pill from '@/components/admin/Pill';
import type { OrderStatus } from '@prisma/client';

const MAP: Record<OrderStatus, { color: 'green' | 'yellow' | 'red' | 'gray'; label: string }> = {
  PAID: { color: 'green', label: 'Paid' },
  PENDING: { color: 'yellow', label: 'Pending' },
  REFUNDED: { color: 'gray', label: 'Refunded' },
  FAILED: { color: 'red', label: 'Failed' },
};

export default function OrderStatusPill({ status }: { status: OrderStatus }) {
  const { color, label } = MAP[status];
  return <Pill color={color}>{label}</Pill>;
}
