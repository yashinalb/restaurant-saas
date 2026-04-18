import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Loader2, Minus, Plus, X, Scale, Sparkles, Check } from 'lucide-react';
import posItemOptionsService, { PosItemOptions } from '../../services/frontend-posItemOptionsService';

interface Props {
  itemId: number;
  orderId: number;
  storeId: number;
  currencyId: number;
  currencySymbol?: string;
  onClose: () => void;
  onAdded: () => void;
}

const num = (v: any) => {
  const n = typeof v === 'string' ? parseFloat(v) : Number(v);
  return isNaN(n) ? 0 : n;
};

export default function PosItemOptionsModal({ itemId, orderId, storeId, currencyId, currencySymbol, onClose, onAdded }: Props) {
  const { t, i18n } = useTranslation();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [options, setOptions] = useState<PosItemOptions | null>(null);

  const [quantity, setQuantity] = useState(1);
  const [weightGrams, setWeightGrams] = useState<string>('');
  const [notes, setNotes] = useState('');

  // portion: addon_type_id -> single selected addon id
  const [portionSelection, setPortionSelection] = useState<Record<number, number>>({});
  // multi addons: addon_id -> quantity
  const [addonQuantities, setAddonQuantities] = useState<Record<number, number>>({});
  // removed ingredient ids
  const [removedIngredients, setRemovedIngredients] = useState<Set<number>>(new Set());

  const translate = (
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
    (async () => {
      try {
        setLoading(true);
        const data = await posItemOptionsService.getOptions(itemId, { store_id: storeId, currency_id: currencyId });
        setOptions(data);

        // Initialise selections from defaults
        const initPortion: Record<number, number> = {};
        const initAddons: Record<number, number> = {};
        for (const group of data.addon_groups) {
          if (group.is_portion) {
            // Pick the default portion if present; otherwise the first
            const defaulted = group.addons.find(a => a.is_default) || group.addons[0];
            if (defaulted) initPortion[group.tenant_addon_type_id] = defaulted.id;
          } else {
            for (const a of group.addons) {
              if (a.is_default || a.is_required) initAddons[a.id] = 1;
            }
          }
        }
        setPortionSelection(initPortion);
        setAddonQuantities(initAddons);
      } catch (error: any) {
        toast.error(error.response?.data?.error || t('pos.options.fetchError', 'Failed to load item options'));
        onClose();
      } finally {
        setLoading(false);
      }
    })();
  }, [itemId]);

  const livePrice = useMemo(() => {
    if (!options) return { unit: 0, total: 0 };
    let unit = options.item.base_price;

    // Weighted pricing: override base with kg * (price/100g)
    if (options.item.is_weighted) {
      const grams = num(weightGrams);
      if (grams > 0 && options.item.weight_price_per_100g != null) {
        unit = Math.round(((grams / 100) * options.item.weight_price_per_100g) * 100) / 100;
      } else {
        unit = 0;
      }
    }

    // Portion selections (treated as "extra" pricing on top of base)
    for (const group of options.addon_groups) {
      if (group.is_portion) {
        const selectedId = portionSelection[group.tenant_addon_type_id];
        const selected = group.addons.find(a => a.id === selectedId);
        if (selected) unit += selected.price;
      }
    }

    // Multi-select addons
    for (const group of options.addon_groups) {
      if (group.is_portion) continue;
      for (const a of group.addons) {
        const q = addonQuantities[a.id] || 0;
        unit += a.price * q;
      }
    }

    unit = Math.round(unit * 100) / 100;
    const total = Math.round(unit * quantity * 100) / 100;
    return { unit, total };
  }, [options, quantity, weightGrams, portionSelection, addonQuantities]);

  const toggleAddon = (addonId: number, max: number) => {
    const current = addonQuantities[addonId] || 0;
    if (current > 0) {
      setAddonQuantities(prev => {
        const next = { ...prev };
        delete next[addonId];
        return next;
      });
    } else {
      setAddonQuantities(prev => ({ ...prev, [addonId]: Math.min(1, max) }));
    }
  };

  const stepAddon = (addonId: number, max: number, delta: number) => {
    setAddonQuantities(prev => {
      const current = prev[addonId] || 0;
      const next = Math.max(0, Math.min(current + delta, max));
      const copy = { ...prev };
      if (next === 0) delete copy[addonId];
      else copy[addonId] = next;
      return copy;
    });
  };

  const toggleIngredient = (id: number) => {
    setRemovedIngredients(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const validate = (): string | null => {
    if (!options) return null;
    if (options.item.is_weighted) {
      const grams = num(weightGrams);
      if (grams <= 0) return t('pos.options.weightRequired', 'Please enter a weight');
    }
    for (const group of options.addon_groups) {
      if (group.is_portion) {
        const required = group.addons.some(a => a.is_required);
        if (required && !portionSelection[group.tenant_addon_type_id]) {
          return t('pos.options.portionRequired', '{{group}} selection is required', { group: group.name });
        }
      } else {
        for (const a of group.addons) {
          if (a.is_required && !(addonQuantities[a.id] > 0)) {
            return t('pos.options.addonRequired', '{{name}} is required', { name: a.name });
          }
        }
      }
    }
    return null;
  };

  const handleConfirm = async () => {
    const err = validate();
    if (err) { toast.error(err); return; }
    if (!options) return;

    const selectedAddonsPayload = [
      ...Object.entries(portionSelection).map(([, addonId]) => ({ tenant_addon_id: addonId, quantity: 1 })),
      ...Object.entries(addonQuantities).map(([id, qty]) => ({ tenant_addon_id: Number(id), quantity: qty })),
    ];

    try {
      setSaving(true);
      await posItemOptionsService.addItem(orderId, {
        tenant_menu_item_id: itemId,
        quantity,
        weight_grams: options.item.is_weighted ? num(weightGrams) : null,
        selected_addons: selectedAddonsPayload,
        removed_ingredient_ids: Array.from(removedIngredients),
        notes: notes.trim() || null,
      });
      toast.success(t('pos.options.added', '{{name}} added', { name: options.item.name }));
      onAdded();
      onClose();
    } catch (error: any) {
      toast.error(error.response?.data?.error || t('pos.options.addError', 'Failed to add item'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden">
        {loading || !options ? (
          <div className="flex items-center justify-center p-16">
            <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b bg-slate-50">
              <div>
                <h2 className="text-xl font-bold text-gray-900">{options.item.name}</h2>
                <div className="text-sm text-gray-500 flex items-center gap-2">
                  {options.item.is_weighted && (
                    <span className="inline-flex items-center gap-1"><Scale className="w-3 h-3" /> {t('pos.options.weighted', 'Weighted')}</span>
                  )}
                  {options.item.is_combo && (
                    <span className="inline-flex items-center gap-1"><Sparkles className="w-3 h-3" /> {t('pos.options.combo', 'Combo')}</span>
                  )}
                  <span>{t('pos.options.basePrice', 'Base')}: {currencySymbol}{options.item.base_price.toFixed(2)}{options.item.is_weighted && options.item.weight_price_per_100g != null ? ` · ${currencySymbol}${options.item.weight_price_per_100g.toFixed(2)} / 100g` : ''}</span>
                </div>
              </div>
              <button onClick={onClose}><X className="w-5 h-5 text-gray-400 hover:text-gray-600" /></button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {/* Weight input */}
              {options.item.is_weighted && (
                <section>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    {t('pos.options.weightGrams', 'Weight (grams)')} *
                  </label>
                  <input type="number" step="1" min="0" value={weightGrams}
                    onChange={e => setWeightGrams(e.target.value)} autoFocus
                    placeholder="e.g. 250"
                    className="w-full px-3 py-3 border border-gray-300 rounded-lg text-xl font-semibold focus:ring-2 focus:ring-amber-500 focus:border-amber-500" />
                  {options.item.weight_price_per_100g != null && num(weightGrams) > 0 && (
                    <p className="text-xs text-gray-500 mt-1">
                      {(num(weightGrams) / 100).toFixed(2)} × {currencySymbol}{options.item.weight_price_per_100g.toFixed(2)}/100g = {currencySymbol}{livePrice.unit.toFixed(2)}
                    </p>
                  )}
                </section>
              )}

              {/* Addon groups */}
              {options.addon_groups.map(group => (
                <section key={group.tenant_addon_type_id}>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-gray-700 uppercase">{translate(group.translations, group.name)}</h3>
                    {group.is_portion && (
                      <span className="text-[10px] text-gray-500">{t('pos.options.selectOne', 'Select one')}</span>
                    )}
                  </div>
                  <div className={group.is_portion ? 'grid grid-cols-2 md:grid-cols-4 gap-2' : 'space-y-2'}>
                    {group.addons.map(addon => {
                      if (group.is_portion) {
                        const selected = portionSelection[group.tenant_addon_type_id] === addon.id;
                        return (
                          <button key={addon.id}
                            onClick={() => setPortionSelection(prev => ({ ...prev, [group.tenant_addon_type_id]: addon.id }))}
                            className={`p-3 rounded-lg border-2 text-left transition ${
                              selected ? 'border-amber-500 bg-amber-50' : 'border-gray-200 hover:border-gray-300'
                            }`}>
                            <div className="font-semibold text-sm">{translate(addon.translations, addon.name)}</div>
                            <div className="text-xs text-gray-500">
                              {addon.price > 0 ? `+${currencySymbol}${addon.price.toFixed(2)}` : t('pos.options.free', 'Free')}
                            </div>
                          </button>
                        );
                      }
                      const qty = addonQuantities[addon.id] || 0;
                      const checked = qty > 0;
                      const maxQty = addon.max_quantity || 1;
                      return (
                        <div key={addon.id}
                          className={`flex items-center justify-between p-2 rounded border transition ${
                            checked ? 'border-amber-400 bg-amber-50' : 'border-gray-200'
                          }`}>
                          <label className="flex items-center gap-2 flex-1 cursor-pointer" onClick={() => toggleAddon(addon.id, maxQty)}>
                            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${checked ? 'bg-amber-500 border-amber-500' : 'border-gray-300'}`}>
                              {checked && <Check className="w-3 h-3 text-white" />}
                            </div>
                            <span className="text-sm font-medium">{translate(addon.translations, addon.name)}</span>
                            {addon.is_required && <span className="text-[10px] text-red-500">*{t('pos.options.required', 'Required')}</span>}
                          </label>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-700">{addon.price > 0 ? `+${currencySymbol}${addon.price.toFixed(2)}` : '—'}</span>
                            {checked && maxQty > 1 && (
                              <div className="flex items-center gap-1">
                                <button onClick={() => stepAddon(addon.id, maxQty, -1)}
                                  className="w-6 h-6 rounded border border-gray-300 bg-white hover:bg-gray-100 flex items-center justify-center">
                                  <Minus className="w-3 h-3" />
                                </button>
                                <span className="w-5 text-center text-sm font-semibold">{qty}</span>
                                <button onClick={() => stepAddon(addon.id, maxQty, 1)} disabled={qty >= maxQty}
                                  className="w-6 h-6 rounded border border-gray-300 bg-white hover:bg-gray-100 flex items-center justify-center disabled:opacity-30">
                                  <Plus className="w-3 h-3" />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              ))}

              {/* Ingredients (removable) */}
              {options.ingredients.length > 0 && (
                <section>
                  <h3 className="text-sm font-semibold text-gray-700 uppercase mb-2">{t('pos.options.ingredients', 'Ingredients')}</h3>
                  <p className="text-xs text-gray-500 mb-2">{t('pos.options.ingredientsHelp', 'Uncheck to remove from this item')}</p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {options.ingredients.map(ing => {
                      const removed = removedIngredients.has(ing.id);
                      const disabled = !ing.is_removable;
                      return (
                        <button key={ing.id} disabled={disabled}
                          onClick={() => toggleIngredient(ing.id)}
                          className={`p-2 rounded border text-left text-sm transition ${
                            removed ? 'border-red-400 bg-red-50 line-through text-red-700'
                                    : 'border-gray-200 hover:border-gray-300'
                          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
                          {translate(ing.translations, ing.name)}
                          {disabled && (
                            <div className="text-[10px] text-gray-400">{t('pos.options.fixed', 'Fixed')}</div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* Combo items (informational) */}
              {options.combo_items.length > 0 && (
                <section>
                  <h3 className="text-sm font-semibold text-gray-700 uppercase mb-2">{t('pos.options.comboIncludes', 'Combo includes')}</h3>
                  <ul className="text-sm text-gray-700 space-y-1">
                    {options.combo_items.map((ci: any) => (
                      <li key={ci.id}>• {ci.quantity}× {ci.name || `Item #${ci.component_menu_item_id}`}</li>
                    ))}
                  </ul>
                </section>
              )}

              {/* Notes */}
              <section>
                <label className="block text-sm font-semibold text-gray-700 mb-1">{t('pos.options.notes', 'Notes')}</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
                  placeholder={t('pos.options.notesPlaceholder', 'Special instructions, allergies, etc.')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500" />
              </section>
            </div>

            {/* Footer */}
            <div className="border-t bg-slate-50 p-4 flex items-center gap-3">
              {/* Qty stepper */}
              <div className="flex items-center gap-1">
                <button onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-9 h-9 rounded-lg border border-gray-300 bg-white hover:bg-gray-100 flex items-center justify-center">
                  <Minus className="w-4 h-4" />
                </button>
                <span className="min-w-[3rem] text-center text-lg font-semibold">{quantity}</span>
                <button onClick={() => setQuantity(quantity + 1)}
                  className="w-9 h-9 rounded-lg border border-gray-300 bg-white hover:bg-gray-100 flex items-center justify-center">
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {/* Running total */}
              <div className="flex-1 text-right">
                <div className="text-xs text-gray-500">{t('pos.options.lineTotal', 'Line total')}</div>
                <div className="text-2xl font-bold text-amber-700">{currencySymbol}{livePrice.total.toFixed(2)}</div>
                {quantity > 1 && (
                  <div className="text-[10px] text-gray-400">{quantity} × {currencySymbol}{livePrice.unit.toFixed(2)}</div>
                )}
              </div>

              <button onClick={onClose}
                className="px-4 py-3 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-100 font-semibold">
                {t('common.cancel', 'Cancel')}
              </button>
              <button onClick={handleConfirm} disabled={saving}
                className="px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-semibold disabled:opacity-50 flex items-center gap-2">
                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <>
                  <Check className="w-5 h-5" />
                  {t('pos.options.addToOrder', 'Add to Order')}
                </>}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
