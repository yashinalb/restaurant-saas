import { useEffect, useRef, useState } from 'react';
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
  const previousStatusesRef = useRef<Record<number, string>>({});

  const isNew = !params.id;

  const detectReadyTransitions = (fresh: Order) => {
    const previous = previousStatusesRef.current;
    const freshItems = fresh.items || [];
    const nextMap: Record<number, string> = {};
    const newlyReady: string[] = [];
    for (const it of freshItems) {
      const code = (it as any).status_code || 'pending';
      nextMap[it.id] = code;
      const prev = previous[it.id];
      if (prev && prev !== 'ready' && code === 'ready') {
        newlyReady.push((it as any).menu_item_name || `Item #${it.tenant_menu_item_id}`);
      }
    }
    if (Object.keys(previous).length > 0 && newlyReady.length > 0) {
      toast.success(
        t('pos.order.ready', 'Ready: {{items}}', { items: newlyReady.join(', ') }),
        { duration: 6000 }
      );
    }
    previousStatusesRef.current = nextMap;
  };

  const loadOrder = async (id: number, silent = false) => {
    try {
      if (!silent) setLoading(true);
      const data = await orderService.getById(id);
      detectReadyTransitions(data);
      setOrder(data);
    } catch (error: any) {
      if (!silent) {
        toast.error(error.response?.data?.error || t('pos.order.loadError', 'Failed to load order'));
        navigate('/pos/floor');
      }
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    if (!session) {
      navigate('/pos/login', { replace: true });
      return;
    }
    if (!isNew && params.id) {
      loadOrder(Number(params.id));
      // Poll every 8s to surface KDS-driven status changes (e.g. item → ready)
      const interval = window.setInterval(() => {
        if (document.visibilityState === 'visible' && params.id) {
          loadOrder(Number(params.id), true);
        }
      }, 8000);
      return () => window.clearInterval(interval);
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
