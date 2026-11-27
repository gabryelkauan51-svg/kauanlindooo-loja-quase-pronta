import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Header, { type View } from './components/Header';
import Hero from './components/Hero';
import GameCards from './components/GameCards';
import GameBanner from './components/GameBanner';
import SteamSection from './components/SteamSection';
import ValorantTypes, { type ValorantType } from './components/ValorantTypes';
import FiltersSidebar, { PRICE_RANGES } from './components/FiltersSidebar';
import AccountGrid from './components/AccountGrid';
import AccountPage from './components/AccountPage';
import CheckoutModal from './components/CheckoutModal';
import MyAccountPage from './components/MyAccountPage';
import LoginModal from './components/LoginModal';
import FaqSection from './components/FaqSection';
import FloatingLinks from './components/FloatingLinks';
import CursorGlow from './components/CursorGlow';
import Spinner from './components/Spinner';
import type { AccountTab } from './components/AccountMenu';
import { useAuth } from './auth/AuthContext';
import { useCatalog } from './hooks/useCatalog';
import { accountKey, metricNumber, searchableText } from './lib/account';
import { applyAdvanced, filtersFor, isAdvActive, type AdvValues } from './lib/filters';
import { addFavorite, listFavorites, listNfaTiers, listOrders, removeFavorite } from './lib/db';
import { checkoutPrice, formatBRL, getAccountMeta, pickPrice } from './lib/format';
import { gameInfo } from './lib/games';
import { displayStatus } from './lib/orders';
import { supabase } from './lib/supabase';
import { applyValorantFilters, isValorantFilterActive } from './lib/valorant';
import {
  EMPTY_INVENTORY,
  EMPTY_VALORANT,
  type Account,
  type CheckoutResponse,
  type DbFavorite,
  type DbOrder,
  type GameSlug,
  type InventoryFilters,
  type NfaTier,
  type Order,
  type ValorantFilters,
} from './types';

const PER_PAGE = 24;
const PER_PAGE_FILTERED = 48;

const toNum = (v: string): number | null => {
  const n = Number(v);
  return v.trim() !== '' && Number.isFinite(n) && n > 0 ? n : null;
};

/** Data de cadastro do anúncio, quando a lista traz (usada em "Mais recentes"). */
function createdAt(a: Account): number | null {
  for (const k of ['created_at', 'createdAt', 'created', 'added_at', 'addedAt', 'date']) {
    const v = (a as Record<string, unknown>)[k];
    const t = typeof v === 'string' || typeof v === 'number' ? new Date(v as string).getTime() : NaN;
    if (Number.isFinite(t)) return t;
  }
  return null;
}

export default function App() {
  const { user, loading: authLoading } = useAuth();

  const [view, setView] = useState<View>('shop');
  const [accountTab, setAccountTab] = useState<AccountTab>('orders');
  const [game, setGame] = useState<GameSlug>('valorant');
  const [page, setPage] = useState(1);
  const [priceIndex, setPriceIndex] = useState(0);
  const [order, setOrder] = useState<Order>('price_asc');
  const [search, setSearch] = useState('');
  const [inventory, setInventory] = useState<InventoryFilters>(EMPTY_INVENTORY);
  const [valorant, setValorant] = useState<ValorantFilters>(EMPTY_VALORANT);
  const [adv, setAdv] = useState<AdvValues>({});
  const [vType, setVType] = useState<ValorantType>('full');
  const [tierId, setTierId] = useState<string | null>(null);
  const [tiers, setTiers] = useState<NfaTier[]>([]);
  const [reloadKey, setReloadKey] = useState(0);

  const [selected, setSelected] = useState<Account | null>(null);
  const [buying, setBuying] = useState<Account | null>(null);
  const [resuming, setResuming] = useState<DbOrder | null>(null);
  const [login, setLogin] = useState<{ open: boolean; reason?: string }>({ open: false });
  const [toast, setToast] = useState<string | null>(null);
  const scrollBefore = useRef(0);

  // Dados da conta (sempre vêm do Supabase, nunca do navegador)
  const [orders, setOrders] = useState<DbOrder[]>([]);
  const [favorites, setFavorites] = useState<DbFavorite[]>([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [dataKey, setDataKey] = useState(0);

  const say = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  }, []);

  /* ------------------------------ Dados da nuvem ------------------------------ */

  const reloadData = useCallback(async () => {
    if (!user) return;
    setDataLoading(true);
    try {
      const [o, f] = await Promise.all([listOrders(), listFavorites()]);
      setOrders(o);
      setFavorites(f);
      setDataKey((k) => k + 1);
    } catch (e) {
      say((e as Error).message || 'Não foi possível atualizar seus dados.');
    } finally {
      setDataLoading(false);
    }
  }, [user, say]);

  const userId = user?.id ?? null;
  useEffect(() => {
    if (!userId) {
      setOrders([]);
      setFavorites([]);
      return;
    }
    reloadData();

    // Tempo real: favoritos e pedidos mudam na tela assim que mudam no banco.
    const channel = supabase
      .channel(`kauan-${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_favorites', filter: `user_id=eq.${userId}` }, () => {
        listFavorites().then(setFavorites).catch(() => undefined);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_orders', filter: `user_id=eq.${userId}` }, () => {
        listOrders().then(setOrders).catch(() => undefined);
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  useEffect(() => {
    listNfaTiers().then(setTiers).catch(() => setTiers([]));
  }, []);

  /* ------------------------------ Favoritos ------------------------------ */

  const favSet = useMemo(() => new Set(favorites.map((f) => `${f.game}:${f.item_id}`)), [favorites]);
  const isFavorite = useCallback((a: Account) => favSet.has(`${game}:${accountKey(a)}`), [favSet, game]);

  const toggleFavorite = useCallback(
    async (a: Account) => {
      if (!user) {
        setLogin({ open: true, reason: 'para favoritar contas' });
        return;
      }
      const key = accountKey(a);
      const exists = favorites.find((f) => f.game === game && f.item_id === key);
      const before = favorites;

      if (exists) {
        setFavorites((p) => p.filter((f) => f.id !== exists.id));
        try {
          await removeFavorite(user.id, game, key);
        } catch (e) {
          setFavorites(before);
          say((e as Error).message);
        }
        return;
      }

      const meta = getAccountMeta(a);
      const snapshot = { title: meta.title, image: meta.image, price: pickPrice(a.price) };
      setFavorites((p) => [{ id: `tmp-${key}`, game, item_id: key, snapshot, created_at: new Date().toISOString() }, ...p]);
      try {
        await addFavorite(user.id, game, key, snapshot);
      } catch (e) {
        setFavorites(before);
        say((e as Error).message);
      }
    },
    [user, favorites, game, say],
  );

  /* ------------------------------ Catálogo ------------------------------ */

  const range = PRICE_RANGES[priceIndex];
  const advDefs = useMemo(() => filtersFor(game), [game]);
  const nfaTier = vType === 'nfa' && game === 'valorant' ? tiers.find((t) => t.id === tierId) ?? null : null;

  const invActive =
    game === 'valorant' &&
    (inventory.withSkins || inventory.withKnife || inventory.skinQuery.trim() !== '' || inventory.minSkins !== '' || inventory.minKnives !== '' || inventory.minVp !== '');
  const valActive = game === 'valorant' && isValorantFilterActive(valorant);
  const advActive = game !== 'valorant' && isAdvActive(adv);
  const anyClientFilter = invActive || valActive || advActive || search.trim() !== '' || Boolean(nfaTier);
  const perPage = anyClientFilter ? PER_PAGE_FILTERED : PER_PAGE;

  // O servidor só ordena por preço; "relevantes" e "recentes" usam a ordem da própria lista.
  const apiOrder = order === 'price_asc' || order === 'price_desc' ? order : undefined;

  const { items, pagination, loading, error } = useCatalog(
    { game, page, perPage, priceFrom: range.from || undefined, priceTo: range.to || undefined, order: apiOrder },
    reloadKey,
  );

  useEffect(() => setPage(1), [anyClientFilter]);

  const { visible, unavailable } = useMemo(() => {
    const from = toNum(range.from);
    const to = toNum(range.to);
    let list = items.filter((a) => {
      if (from === null && to === null) return true;
      const p = pickPrice(a.price);
      if (p === null) return false;
      return (from === null || p >= from) && (to === null || p <= to);
    });

    const q = search.trim().toLowerCase();
    if (q) list = list.filter((a) => searchableText(a).includes(q));

    const missing: string[] = [];

    if (game === 'valorant') {
      const metrics = new Map<Account, { skins: number | null; knives: number | null; vp: number | null }>();
      for (const a of list) metrics.set(a, { skins: metricNumber(a, 'skins'), knives: metricNumber(a, 'knives'), vp: metricNumber(a, 'vpSpent') });
      const has = (k: 'skins' | 'knives' | 'vp') => list.some((a) => metrics.get(a)![k] !== null);

      const needSkins = inventory.withSkins ? 1 : toNum(inventory.minSkins);
      const needKnives = inventory.withKnife ? Math.max(1, toNum(inventory.minKnives) ?? 1) : toNum(inventory.minKnives);
      const needVp = toNum(inventory.minVp);
      const skinsOk = needSkins === null || has('skins');
      const knivesOk = needKnives === null || has('knives');
      const vpOk = needVp === null || has('vp');
      if (!skinsOk) missing.push('skins');
      if (!knivesOk) missing.push('facas');
      if (!vpOk) missing.push('VP gasto');

      const sq = inventory.skinQuery.trim().toLowerCase();
      list = list.filter((a) => {
        const m = metrics.get(a)!;
        if (needSkins !== null && skinsOk && (m.skins ?? 0) < needSkins) return false;
        if (needKnives !== null && knivesOk && (m.knives ?? 0) < needKnives) return false;
        if (needVp !== null && vpOk && (m.vp ?? 0) < needVp) return false;
        if (sq && !searchableText(a).includes(sq)) return false;
        return true;
      });

      if (nfaTier) {
        if (list.some((a) => metricNumber(a, 'skins') !== null)) {
          list = list.filter((a) => {
            const n = metricNumber(a, 'skins');
            return n !== null && n >= nfaTier.min_skins && (nfaTier.max_skins === null || n <= nfaTier.max_skins);
          });
        } else missing.push('quantidade de skins');
      }

      const res = applyValorantFilters(list, valorant);
      list = res.list;
      missing.push(...res.unavailable);
    } else if (advDefs.length) {
      const res = applyAdvanced(list, advDefs, adv);
      list = res.list;
      missing.push(...res.unavailable);
    }

    if (order === 'newest' && list.some((a) => createdAt(a) !== null)) {
      list = [...list].sort((a, b) => (createdAt(b) ?? 0) - (createdAt(a) ?? 0));
    }
    return { visible: list, unavailable: missing };
  }, [items, range, search, inventory, valorant, adv, advDefs, game, nfaTier, order]);

  const clientFiltered = visible.length !== items.length;
  const total = typeof pagination.total === 'number' ? pagination.total : items.length;

  const scrollToId = (id: string) => setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }), 40);

  const clearFilters = () => {
    setPriceIndex(0);
    setSearch('');
    setInventory(EMPTY_INVENTORY);
    setValorant(EMPTY_VALORANT);
    setAdv({});
    setTierId(null);
    setPage(1);
  };

  const selectGame = (g: GameSlug) => {
    setGame(g);
    clearFilters();
    setVType('full');
    setView('shop');
    setSelected(null);
    scrollToId('catalogo');
  };

  /* ------------------------------ Navegação ------------------------------ */

  useEffect(() => {
    const onPop = () => {
      setSelected(null);
      setTimeout(() => window.scrollTo({ top: scrollBefore.current }), 30);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const openAccount = (a: Account) => {
    scrollBefore.current = window.scrollY;
    try {
      window.history.pushState({ view: 'account' }, '');
    } catch {
      /* ambientes sem History API: o botão Voltar do site continua funcionando */
    }
    setSelected(a);
  };

  const backFromAccount = () => {
    if (window.history.state?.view === 'account') window.history.back();
    else setSelected(null);
  };

  const goShop = () => {
    setView('shop');
    setSelected(null);
    window.scrollTo({ top: 0 });
  };

  const goAccount = (tab: AccountTab) => {
    setAccountTab(tab);
    setView('account');
    setSelected(null);
    window.scrollTo({ top: 0 });
  };

  const openFavorite = (f: DbFavorite) => {
    const s = f.snapshot ?? {};
    const acc = { ...s, id: f.item_id, item_id: f.item_id, price: typeof s.price === 'number' ? s.price : null } as Account;
    setGame(f.game);
    setView('shop');
    openAccount(acc);
  };

  /* ------------------------------ Compra ------------------------------ */

  const startBuy = (a: Account) => {
    if (!user) {
      setLogin({ open: true, reason: 'para comprar' });
      return;
    }
    setBuying(a);
  };

  const closeCheckout = useCallback(() => {
    setBuying(null);
    setResuming(null);
    reloadData();
  }, [reloadData]);

  const onCheckoutChange = useCallback(
    (_c: CheckoutResponse) => {
      listOrders().then(setOrders).catch(() => undefined);
    },
    [],
  );

  const active = orders.filter((o) => o.checkout && ['pending', 'paid'].includes(displayStatus(o)));
  const banner = active[0] ?? null;
  const checkoutOpen = buying !== null || resuming !== null;
  const info = gameInfo(game);

  /* ------------------------------ Render ------------------------------ */

  return (
    <>
      <CursorGlow />
      <div className="relative z-10 min-h-screen">
        <Header
          view={view}
          onShop={goShop}
          onAccount={goAccount}
          onLogin={() => setLogin({ open: true })}
          pendingCount={active.length}
        />

        {view === 'account' && !selected && (
          user ? (
            <MyAccountPage
              tab={accountTab}
              onTab={setAccountTab}
              orders={orders}
              favorites={favorites}
              loading={dataLoading}
              refreshKey={dataKey}
              onRefresh={reloadData}
              onOpenPix={setResuming}
              onOpenFavorite={openFavorite}
              onRemoveFavorite={(f) => {
                if (user) {
                  setFavorites((p) => p.filter((x) => x.id !== f.id));
                  removeFavorite(user.id, f.game, f.item_id).catch((e: Error) => {
                    say(e.message);
                    reloadData();
                  });
                }
              }}
            />
          ) : authLoading ? (
            <div className="flex items-center justify-center gap-3 py-32 text-zinc-400"><Spinner className="h-6 w-6" /> Carregando…</div>
          ) : (
            <div className="mx-auto max-w-md px-4 py-24 text-center">
              <h1 className="text-2xl font-bold">Entre para ver sua conta</h1>
              <p className="mt-2 text-sm text-zinc-400">Suas compras, favoritos e saldo ficam salvos na sua conta.</p>
              <button type="button" onClick={() => setLogin({ open: true })} className="mt-6 rounded-xl bg-brand px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-light hover:text-bg">
                Entrar
              </button>
            </div>
          )
        )}

        {view === 'shop' && selected && (
          <AccountPage
            account={selected}
            game={game}
            onBack={backFromAccount}
            onBuy={startBuy}
            favorite={isFavorite(selected)}
            onFavorite={toggleFavorite}
          />
        )}

        {view === 'shop' && !selected && (
          <>
            <Hero value={game} onSelect={selectGame} />
            <GameCards value={game} onSelect={selectGame} onClearFilters={clearFilters} />

            <main id="catalogo" className="mx-auto max-w-7xl scroll-mt-20 px-4 pb-20">
              <GameBanner game={game} title={game === 'valorant' ? (vType === 'nfa' ? 'Valorant NFA' : 'Valorant Full Acesso') : info.label} />

              <div className="mt-8">
                {game === 'steam' && <SteamSection onBrowse={() => scrollToId('lista')} />}
                {game === 'valorant' && <ValorantTypes type={vType} onType={setVType} tier={tierId} onTier={setTierId} tiers={tiers} />}
              </div>

              <div id="lista" className="mb-5 scroll-mt-24" aria-hidden="true" />

              <div className="flex flex-col gap-6 lg:flex-row">
                <FiltersSidebar
                  game={game}
                  priceIndex={priceIndex}
                  onPrice={(i) => {
                    setPriceIndex(i);
                    setPage(1);
                  }}
                  inventory={inventory}
                  onInventory={setInventory}
                  valorant={valorant}
                  onValorant={setValorant}
                  advDefs={advDefs}
                  adv={adv}
                  onAdv={setAdv}
                  onClear={clearFilters}
                  unavailable={unavailable}
                />

                <section className="min-w-0 flex-1" aria-live="polite">
                  <div className="mb-4 flex flex-wrap items-center gap-3">
                    <div className="relative min-w-[12rem] flex-1">
                      <label htmlFor="busca" className="sr-only">Pesquisar contas</label>
                      <svg className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                        <circle cx="11" cy="11" r="7" />
                        <path d="M20 20l-3.500-3.500" />
                      </svg>
                      <input
                        id="busca"
                        type="search"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Pesquisar por título, skin ou detalhe"
                        className="w-full rounded-lg border border-line bg-card py-2 pl-9 pr-3 text-sm text-white placeholder:text-zinc-600 focus:border-brand focus:outline-none"
                      />
                    </div>

                    <label htmlFor="order" className="sr-only">Ordenar por</label>
                    <select
                      id="order"
                      value={order}
                      onChange={(e) => {
                        setOrder(e.target.value as Order);
                        setPage(1);
                      }}
                      className="rounded-lg border border-line bg-card px-3 py-2 text-sm font-semibold text-white focus:border-brand focus:outline-none"
                    >
                      <option value="relevance">Mais relevantes</option>
                      <option value="price_asc">Menor preço</option>
                      <option value="price_desc">Maior preço</option>
                      <option value="newest">Mais recentes</option>
                    </select>

                    <button
                      type="button"
                      onClick={() => setReloadKey((k) => k + 1)}
                      disabled={loading}
                      className="inline-flex items-center gap-2 rounded-lg border border-line bg-card px-3 py-2 text-sm font-semibold text-zinc-200 transition hover:border-zinc-500 hover:text-white disabled:opacity-60"
                    >
                      {loading ? <Spinner className="h-4 w-4" /> : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.500" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 12a9 9 0 1 1-3-6.700M21 4v5h-5" /></svg>}
                      Atualizar
                    </button>
                  </div>

                  <p className="mb-4 text-sm text-zinc-400">
                    {loading && items.length === 0 ? (
                      'Buscando contas…'
                    ) : clientFiltered ? (
                      <><strong className="text-white">{visible.length}</strong> contas com esses filtros nesta página</>
                    ) : (
                      <><strong className="text-white">{total.toLocaleString('pt-BR')}</strong> contas disponíveis</>
                    )}
                  </p>

                  <AccountGrid
                    items={visible}
                    game={game}
                    loading={loading}
                    error={error}
                    pagination={pagination}
                    page={page}
                    perPage={perPage}
                    onPage={(p) => {
                      setPage(p);
                      scrollToId('lista');
                    }}
                    onOpen={openAccount}
                    isFavorite={isFavorite}
                    onFavorite={toggleFavorite}
                  />
                </section>
              </div>
            </main>

            <FaqSection />
          </>
        )}

        {buying && <CheckoutModal account={buying} game={game} onCreated={onCheckoutChange} onStatus={onCheckoutChange} onClose={closeCheckout} />}

        {resuming && resuming.checkout && (
          <CheckoutModal key={resuming.id} resume={resuming.checkout} game={resuming.game} onCreated={onCheckoutChange} onStatus={onCheckoutChange} onClose={closeCheckout} />
        )}

        {banner && !checkoutOpen && (
          <div className="fixed inset-x-0 bottom-0 z-40 border-t border-brand/40 bg-card/95 backdrop-blur">
            <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-3 px-4 py-3 sm:flex-row sm:items-center">
              <p className="text-sm text-zinc-200">
                Você tem um pedido PIX em andamento{banner.final_price ? ` de ${formatBRL(checkoutPrice(banner.checkout!, banner.final_price))}` : ''}.
              </p>
              <button type="button" onClick={() => setResuming(banner)} className="rounded-lg bg-pix px-4 py-2 text-sm font-bold text-white transition hover:bg-pix-dark">
                Retomar pedido
              </button>
            </div>
          </div>
        )}

        <FloatingLinks lifted={Boolean(banner) && !checkoutOpen} />

        {toast && (
          <div role="status" className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-xl border border-line bg-card px-4 py-2.5 text-sm text-zinc-200 shadow-xl">
            {toast}
          </div>
        )}
      </div>

      {login.open && <LoginModal reason={login.reason} onClose={() => setLogin({ open: false })} />}
    </>
  );
}
