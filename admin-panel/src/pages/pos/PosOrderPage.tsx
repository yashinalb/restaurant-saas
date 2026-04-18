import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Loader2, ArrowLeft } from 'lucide-react';
import { usePosSessionStore } from '../../store/posSessionStore';
import orderService, { Order } from '../../services/orderService';
import posOrderService from '../../services/frontend-posOrderService';
import PosCartPanel from './PosCartPanel';
import PosMenuBrowser from './PosMenuBrowser';

export default function PosOrderPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const params = useParams<{ id?: string }>();
  const [search] = useSearchParams();
  const { session } = usePosSessionStore();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  const isNew = !params.id;

  const loadOrder = async (id: number) => {
    try {
      setLoading(true);
      const data = await orderService.getById(id);
      setOrder(data);
    } catch (error: any) {
      toast.error(error.response?.data?.error || t('pos.order.loadError', 'Failed to load order'));
      navigate('/pos/floor');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!session) {
      navigate('/pos/login', { replace: true });
      return;
    }
    if (!isNew && params.id) {
      loadOrder(Number(params.id));
      return;
    }

    // New order: create an empty one from POS session context
    const tableIdParam = search.get('table_id');
    const walkin = search.get('walkin') === '1';
    const tableId = tableIdParam && !walkin ? Number(tableIdParam) : null;

    (async () => {
      try {
        setLoading(true);
        const created = await posOrderService.start({
          session_id: session.id,
          table_id: tableId,
          order_type_code: tableId ? 'dine_in' : 'takeaway',
        });
        navigate(`/pos/orders/${created.id}`, { replace: true });
      } catch (error: any) {
        toast.error(error.response?.data?.error || t('pos.order.startError', 'Failed to start order'));
        navigate('/pos/floor');
      }
    })();
  }, [params.id, session?.id]);

  const handleNewOrder = () => {
    navigate('/pos/orders/new?walkin=1');
  };

  if (!session) return null;

  if (loading || !order) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
      </div>
    );
  }

  return (
    <div className="p-4">
      <button onClick={() => navigate('/pos/floor')}
        className="mb-3 flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900">
        <ArrowLeft className="w-4 h-4" /> {t('pos.order.backToFloor', 'Back to Floor')}
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-4 h-[calc(100vh-150px)]">
        {/* LEFT: cart panel */}
        <PosCartPanel order={order} onChanged={() => loadOrder(order.id)} onNewOrder={handleNewOrder} />

        {/* RIGHT: menu browser */}
        <PosMenuBrowser
          storeId={order.store_id}
          currencyId={order.currency_id}
          currencySymbol={order.currency_symbol}
          orderId={order.id}
          isLocked={order.order_status !== 'open'}
          onItemAdded={() => loadOrder(order.id)}
        />
      </div>
    </div>
  );
}
