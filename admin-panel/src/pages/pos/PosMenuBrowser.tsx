import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Loader2, Search, Image as ImageIcon, Scale, Sparkles } from 'lucide-react';
import { usePermissions } from '../../hooks/usePermissions';
import posMenuService, { PosMenuCategory, PosMenuItem } from '../../services/frontend-posMenuService';
import PosItemOptionsModal from './PosItemOptionsModal';

interface Props {
  storeId: number;
  currencyId: number;
  currencySymbol?: string;
  orderId: number;
  isLocked: boolean;
  onItemAdded: () => void;
}

const num = (v: any) => {
  const n = typeof v === 'string' ? parseFloat(v) : Number(v);
  return isNaN(n) ? 0 : n;
};

export default function PosMenuBrowser({ storeId, currencyId, currencySymbol, orderId, isLocked, onItemAdded }: Props) {
  const { t, i18n } = useTranslation();
  const { hasPermission } = usePermissions();
  const canTakeOrder = hasPermission('pos.take_order');

  const [categories, setCategories] = useState<PosMenuCategory[]>([]);
  const [items, setItems] = useState<PosMenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [adding, setAdding] = useState<number | null>(null);
  const [customizeItemId, setCustomizeItemId] = useState<number | null>(null);

  const getTranslatedName = (
    translations: Array<{ language_code?: string; name: string }> | undefined,
    fallback = '-'
  ) => {
    if (!translations || translations.length === 0) return fallback;
    return translations.find(tr => tr.language_code === i18n.language)?.name
      || translations.find(tr => tr.language_code === 'en')?.name
      || translations[0].name
      || fallback;
  };

  useEffect(() => {
    if (!storeId) return;
    (async () => {
      try {
        const data = await posMenuService.getCategories(storeId);
        setCategories(data);
      } catch {
        toast.error(t('pos.menu.categoriesError', 'Failed to load categories'));
      }
    })();
  }, [storeId]);

  useEffect(() => {
    if (!storeId || !currencyId) return;
    const timer = setTimeout(async () => {
      try {
        setLoading(true);
        const data = await posMenuService.getItems({
          store_id: storeId,
          currency_id: currencyId,
          category_id: categoryId,
          search,
        });
        setItems(data);
      } catch {
        toast.error(t('pos.menu.itemsError', 'Failed to load items'));
      } finally {
        setLoading(false);
      }
    }, search ? 250 : 0); // debounce search typing
    return () => clearTimeout(timer);
  }, [storeId, currencyId, categoryId, search]);

  const handleItemTap = async (item: PosMenuItem) => {
    if (isLocked) {
      toast.message(t('pos.menu.orderLocked', 'Order is locked'));
      return;
    }
    if (!canTakeOrder) {
      toast.error(t('pos.menu.noTakeOrderPermission', 'You do not have permission to take orders'));
      return;
    }
    if (item.requires_customization) {
      setCustomizeItemId(item.id);
      return;
    }
    try {
      setAdding(item.id);
      await posMenuService.quickAdd(orderId, { tenant_menu_item_id: item.id });
      toast.success(t('pos.menu.added', '{{name}} added', { name: item.name }));
      onItemAdded();
    } catch (error: any) {
      toast.error(error.response?.data?.error || t('pos.menu.addError', 'Failed to add item'));
    } finally {
      setAdding(null);
    }
  };

  const formatPrice = (item: PosMenuItem): string => {
    if (item.is_weighted && item.weight_price_per_100g != null) {
      return `${currencySymbol ?? ''}${num(item.weight_price_per_100g).toFixed(2)} / 100g`;
    }
    if (item.price != null) return `${currencySymbol ?? ''}${num(item.price).toFixed(2)}`;
    return t('pos.menu.noPrice', 'No price');
  };

  const filteredCount = useMemo(() => items.length, [items]);

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm flex flex-col h-full overflow-hidden">
      {/* Search bar */}
      <div className="p-3 border-b">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder={t('pos.menu.searchPlaceholder', 'Search menu…')}
            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500" />
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Category sidebar */}
        <div className="w-40 border-r bg-slate-50 overflow-y-auto">
          <button onClick={() => setCategoryId(null)}
            className={`w-full text-left px-3 py-3 text-sm border-b transition ${
              categoryId === null ? 'bg-amber-500 text-white font-semibold' : 'hover:bg-white text-gray-700'
            }`}>
            {t('pos.menu.allCategories', 'All')}
            <div className="text-[10px] opacity-70">
              {categories.reduce((s, c) => s + (c.item_count || 0), 0)} {t('pos.menu.items', 'items')}
            </div>
          </button>
          {categories.map(cat => (
            <button key={cat.id} onClick={() => setCategoryId(cat.id)}
              className={`w-full text-left px-3 py-3 text-sm border-b transition ${
                categoryId === cat.id ? 'bg-amber-500 text-white font-semibold' : 'hover:bg-white text-gray-700'
              }`}>
              {getTranslatedName(cat.translations, cat.slug)}
              <div className="text-[10px] opacity-70">{cat.item_count} {t('pos.menu.items', 'items')}</div>
            </button>
          ))}
          {categories.length === 0 && (
            <div className="p-3 text-xs text-gray-500 italic">{t('pos.menu.noCategories', 'No categories')}</div>
          )}
        </div>

        {/* Items grid */}
        <div className="flex-1 overflow-y-auto p-3">
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-amber-600" /></div>
          ) : items.length === 0 ? (
            <div className="flex items-center justify-center h-full text-sm text-gray-400">
              {search
                ? t('pos.menu.noSearchResults', 'No items match your search')
                : t('pos.menu.empty', 'No items available')}
            </div>
          ) : (
            <>
              <div className="text-xs text-gray-500 mb-2">{filteredCount} {t('pos.menu.items', 'items')}</div>
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
                {items.map(item => {
                  const imageUrl = item.primary_image_url || item.image_url;
                  const isAdding = adding === item.id;
                  const priceLabel = formatPrice(item);
                  return (
                    <button key={item.id} onClick={() => handleItemTap(item)}
                      disabled={isAdding || isLocked || !canTakeOrder}
                      className={`text-left bg-white border border-gray-200 rounded-lg overflow-hidden hover:border-amber-400 hover:shadow transition disabled:opacity-50 disabled:cursor-not-allowed group`}>
                      <div className="aspect-square bg-gray-100 flex items-center justify-center overflow-hidden relative">
                        {imageUrl ? (
                          <img src={imageUrl} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition" />
                        ) : (
                          <ImageIcon className="w-8 h-8 text-gray-300" />
                        )}
                        {item.requires_customization && (
                          <span className="absolute top-1 right-1 bg-purple-600 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded flex items-center gap-0.5">
                            {item.is_weighted
                              ? <><Scale className="w-2.5 h-2.5" /> {t('pos.menu.weight', 'Weight')}</>
                              : item.is_combo
                                ? <><Sparkles className="w-2.5 h-2.5" /> {t('pos.menu.combo', 'Combo')}</>
                                : <>{t('pos.menu.customize', 'Customize')}</>}
                          </span>
                        )}
                        {isAdding && (
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                            <Loader2 className="w-6 h-6 text-white animate-spin" />
                          </div>
                        )}
                      </div>
                      <div className="p-2">
                        <div className="text-sm font-semibold text-gray-900 truncate">{item.name}</div>
                        <div className={`text-sm ${item.price == null ? 'text-gray-400 italic' : 'text-amber-700 font-semibold'}`}>
                          {priceLabel}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {customizeItemId != null && (
        <PosItemOptionsModal
          itemId={customizeItemId}
          orderId={orderId}
          storeId={storeId}
          currencyId={currencyId}
          currencySymbol={currencySymbol}
          onClose={() => setCustomizeItemId(null)}
          onAdded={onItemAdded}
        />
      )}
    </div>
  );
}
