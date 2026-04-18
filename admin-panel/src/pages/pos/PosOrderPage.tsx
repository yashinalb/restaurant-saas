import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Loader2, ArrowLeft } from 'lucide-react';
import { usePosSessionStore } from '../../store/posSessionStore';
import orderService, { Order } from '../../services/orderService';
import posOrderService from '../../services/frontend-posOrderService';
import PosCartPanel from './PosCartPanel';

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

        {/* RIGHT: menu grid placeholder — wired up in 44.4 */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm flex items-center justify-center">
          <div className="text-center p-8 max-w-md">
            <div className="text-5xl mb-3">🍽️</div>
            <h3 className="font-semibold text-gray-700 mb-1">{t('pos.order.menuComingSoon', 'Menu grid')}</h3>
            <p className="text-sm text-gray-500">
              {t('pos.order.menuHelp', 'Category + item browsing to add items to this order will be wired up in the next POS sub-task (44.4).')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
