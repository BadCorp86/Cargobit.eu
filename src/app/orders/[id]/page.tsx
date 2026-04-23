'use client';

import { useParams } from 'next/navigation';
import OrderDetailPage from '@/components/pages/order-detail-page';

export default function OrderDetailRoute() {
  const params = useParams();
  const orderId = params.id as string;

  return <OrderDetailPage orderId={orderId} />;
}
