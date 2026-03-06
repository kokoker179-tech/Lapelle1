/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  MapPin, 
  Plus, 
  TrendingUp, 
  Users, 
  ChevronRight,
  Search,
  ArrowUpRight,
  ArrowDownRight,
  Box,
  Store,
  Languages
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area as RechartsArea
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Product, Area, Sale, Stats } from './types';
import { translations, Language } from './translations';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type Page = 'dashboard' | 'products' | 'sales' | 'areas';

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [lang, setLang] = useState<Language>('en');
  const [stats, setStats] = useState<Stats | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const t = (key: keyof typeof translations['en']) => translations[lang][key] || key;

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsRes, productsRes, areasRes, salesRes] = await Promise.all([
        fetch('/api/stats'),
        fetch('/api/products'),
        fetch('/api/areas'),
        fetch('/api/sales')
      ]);
      
      setStats(await statsRes.json());
      setProducts(await productsRes.json());
      setAreas(await areasRes.json());
      setSales(await salesRes.json());
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddProduct = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get('name'),
      category: formData.get('category'),
      price: Number(formData.get('price')),
      stock: Number(formData.get('stock')),
    };

    await fetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    fetchData();
    e.currentTarget.reset();
  };

  const handleAddArea = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get('name'),
      company_name: formData.get('company_name'),
      location: formData.get('location'),
    };

    await fetch('/api/areas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    fetchData();
    e.currentTarget.reset();
  };

  const handleAddSale = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      product_id: Number(formData.get('product_id')),
      area_id: Number(formData.get('area_id')),
      quantity: Number(formData.get('quantity')),
    };

    const res = await fetch('/api/sales', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (res.ok) {
      fetchData();
      e.currentTarget.reset();
    } else {
      const err = await res.json();
      alert(err.error);
    }
  };

  const SidebarItem = ({ id, icon: Icon, label }: { id: Page, icon: any, label: string }) => (
    <button
      onClick={() => {
        setCurrentPage(id);
        setIsSidebarOpen(false);
      }}
      className={cn(
        "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group",
        currentPage === id 
          ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200" 
          : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
      )}
    >
      <Icon className={cn("w-5 h-5", currentPage === id ? "text-white" : "text-slate-400 group-hover:text-slate-600")} />
      <span className="font-medium lg:block hidden">{label}</span>
      <span className="font-medium lg:hidden block">{label}</span>
      {currentPage === id && (
        <motion.div layoutId="active-pill" className={cn("w-1.5 h-1.5 rounded-full bg-white", lang === 'ar' ? "mr-auto" : "ml-auto")} />
      )}
    </button>
  );

  return (
    <div className="flex min-h-screen bg-slate-50" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      {/* Mobile Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={cn(
        "fixed lg:sticky top-0 h-screen bg-white p-6 flex flex-col gap-8 transition-all duration-300 z-50",
        lang === 'ar' ? "border-l border-slate-200" : "border-r border-slate-200",
        isSidebarOpen ? "translate-x-0 w-72" : cn(
          lang === 'ar' ? "translate-x-full lg:translate-x-0" : "-translate-x-full lg:translate-x-0",
          "lg:w-24 xl:w-72"
        )
      )}>
        <div className="flex items-center gap-3 px-2">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-100 shrink-0">
            <Box className="text-white w-6 h-6" />
          </div>
          <h1 className={cn("text-2xl font-display font-bold tracking-tight text-slate-900 xl:block hidden", isSidebarOpen && "block")}>Lapelle</h1>
        </div>

        <nav className="flex flex-col gap-2">
          <SidebarItem id="dashboard" icon={LayoutDashboard} label={t('dashboard')} />
          <SidebarItem id="products" icon={Package} label={t('products')} />
          <SidebarItem id="sales" icon={ShoppingCart} label={t('sales')} />
          <SidebarItem id="areas" icon={MapPin} label={t('areas')} />
        </nav>

        <div className="mt-auto space-y-4">
          <button 
            onClick={() => setLang(lang === 'en' ? 'ar' : 'en')}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-all"
          >
            <Languages className="w-5 h-5 text-slate-400 shrink-0" />
            <span className={cn("font-medium xl:block hidden", isSidebarOpen && "block")}>{lang === 'en' ? 'العربية' : 'English'}</span>
          </button>

          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 overflow-hidden">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold shrink-0">
                AD
              </div>
              <div className={cn("xl:block hidden", isSidebarOpen && "block")}>
                <p className="text-sm font-semibold text-slate-900 truncate">{t('admin')}</p>
                <p className="text-xs text-slate-500 truncate">{t('manager')}</p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 lg:p-10 overflow-auto w-full">
        <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-10 gap-4">
          <div className="flex items-center gap-4 w-full sm:w-auto">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-2 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50"
            >
              <LayoutDashboard className="w-6 h-6" />
            </button>
            <div>
              <h2 className="text-2xl lg:text-3xl font-display font-bold text-slate-900">{t(currentPage as any)}</h2>
              <p className="text-slate-500 mt-1 text-sm lg:text-base">{t('welcome')}</p>
            </div>
          </div>
          <div className="flex gap-4 w-full sm:w-auto">
            <div className="relative w-full sm:w-auto">
              <Search className={cn("absolute top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400", lang === 'ar' ? "right-3" : "left-3")} />
              <input 
                type="text" 
                placeholder={t('search')} 
                className={cn(
                  "py-2.5 bg-white border border-slate-200 rounded-xl w-full sm:w-64 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all",
                  lang === 'ar' ? "pr-10 pl-4" : "pl-10 pr-4"
                )}
              />
            </div>
          </div>
        </header>

        <AnimatePresence mode="wait">
          {currentPage === 'dashboard' && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard 
                  label={t('revenue')} 
                  value={`$${stats?.revenue.toLocaleString()}`} 
                  trend="+12.5%" 
                  icon={TrendingUp}
                  color="indigo"
                  lang={lang}
                />
                <StatCard 
                  label={t('activeProducts')} 
                  value={stats?.productsCount.toString() || '0'} 
                  trend="+3 new" 
                  icon={Package}
                  color="emerald"
                  lang={lang}
                />
                <StatCard 
                  label={t('distAreas')} 
                  value={stats?.areasCount.toString() || '0'} 
                  trend="+1 this week" 
                  icon={MapPin}
                  color="amber"
                  lang={lang}
                />
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
                  <div className="flex items-center justify-between mb-8">
                    <h3 className="text-xl font-display font-bold">{t('revenueOverview')}</h3>
                    <select className="bg-slate-50 border-none text-sm font-medium rounded-lg px-3 py-1.5 focus:ring-0">
                      <option>{t('last30')}</option>
                      <option>{t('last7')}</option>
                    </select>
                  </div>
                  <div className="h-[350px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={stats?.salesOverTime}>
                        <defs>
                          <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.1}/>
                            <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis 
                          dataKey="date" 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fill: '#94a3b8', fontSize: 12 }}
                          dy={10}
                        />
                        <YAxis 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fill: '#94a3b8', fontSize: 12 }}
                          orientation={lang === 'ar' ? 'right' : 'left'}
                        />
                        <Tooltip 
                          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                        />
                        <RechartsArea 
                          type="monotone" 
                          dataKey="total" 
                          stroke="#4f46e5" 
                          strokeWidth={3}
                          fillOpacity={1} 
                          fill="url(#colorTotal)" 
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
                  <h3 className="text-xl font-display font-bold mb-6">{t('recentSales')}</h3>
                  <div className="space-y-6">
                    {sales.slice(0, 5).map((sale) => (
                      <div key={sale.id} className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400">
                          <ShoppingCart className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-slate-900">{sale.product_name}</p>
                          <p className="text-xs text-slate-500">{sale.area_name}</p>
                        </div>
                        <div className={cn("text-right", lang === 'ar' && "text-left")}>
                          <p className="text-sm font-bold text-slate-900">${sale.total_price}</p>
                          <p className="text-xs text-emerald-600">+{sale.quantity} {t('qty')}</p>
                        </div>
                      </div>
                    ))}
                    {sales.length === 0 && (
                      <div className="text-center py-10">
                        <p className="text-slate-400 text-sm italic">{t('noSales')}</p>
                      </div>
                    )}
                  </div>
                  <button 
                    onClick={() => setCurrentPage('sales')}
                    className="w-full mt-8 py-3 text-sm font-semibold text-indigo-600 bg-indigo-50 rounded-xl hover:bg-indigo-100 transition-colors"
                  >
                    {t('viewAllSales')}
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {currentPage === 'products' && (
            <motion.div
              key="products"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="grid grid-cols-1 lg:grid-cols-3 gap-8"
            >
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 border-bottom border-slate-200">
                      <tr>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">{t('products')}</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">{t('category')}</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">{t('price')}</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">{t('stock')}</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">{t('status')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {products.map((product) => (
                        <tr key={product.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                                <Package className="w-4 h-4" />
                              </div>
                              <span className="font-semibold text-slate-900">{product.name}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-600">{product.category}</td>
                          <td className="px-6 py-4 font-bold text-slate-900">${product.price}</td>
                          <td className="px-6 py-4 text-sm text-slate-600">{product.stock} {t('qty')}</td>
                          <td className="px-6 py-4">
                            <span className={cn(
                              "px-2.5 py-1 rounded-full text-xs font-bold",
                              product.stock > 10 ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
                            )}>
                              {product.stock > 10 ? t('inStock') : t('lowStock')}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm h-fit sticky top-10">
                <h3 className="text-xl font-display font-bold mb-6">{t('addProduct')}</h3>
                <form onSubmit={handleAddProduct} className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">{t('productName')}</label>
                    <input name="name" required className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none" placeholder="e.g. Laptop Pro" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">{t('category')}</label>
                    <input name="category" required className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none" placeholder="e.g. Electronics" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">{t('price')}</label>
                      <input name="price" type="number" step="0.01" required className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none" placeholder="0.00" />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">{t('stock')}</label>
                      <input name="stock" type="number" required className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none" placeholder="0" />
                    </div>
                  </div>
                  <button type="submit" className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2">
                    <Plus className="w-5 h-5" /> {t('addBtn')}
                  </button>
                </form>
              </div>
            </motion.div>
          )}

          {currentPage === 'sales' && (
            <motion.div
              key="sales"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="grid grid-cols-1 lg:grid-cols-3 gap-8"
            >
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 border-bottom border-slate-200">
                      <tr>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">{t('date')}</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">{t('products')}</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">{t('areas')}</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">{t('qty')}</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">{t('total')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {sales.map((sale) => (
                        <tr key={sale.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4 text-sm text-slate-500">
                            {new Date(sale.sale_date).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 font-semibold text-slate-900">{sale.product_name}</td>
                          <td className="px-6 py-4 text-sm text-slate-600">{sale.area_name}</td>
                          <td className="px-6 py-4 font-bold text-slate-900">{sale.quantity}</td>
                          <td className="px-6 py-4 font-bold text-indigo-600">${sale.total_price}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm h-fit sticky top-10">
                <h3 className="text-xl font-display font-bold mb-6">{t('processSale')}</h3>
                <form onSubmit={handleAddSale} className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">{t('selectProduct')}</label>
                    <select name="product_id" required className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none appearance-none">
                      <option value="">{t('chooseProduct')}</option>
                      {products.map(p => (
                        <option key={p.id} value={p.id}>{p.name} (${p.price}) - {p.stock} {t('qty')}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">{t('selectArea')}</label>
                    <select name="area_id" required className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none appearance-none">
                      <option value="">{t('chooseArea')}</option>
                      {areas.map(a => (
                        <option key={a.id} value={a.id}>{a.name} ({a.company_name})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">{t('quantity')}</label>
                    <input name="quantity" type="number" required min="1" className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none" placeholder="0" />
                  </div>
                  <button type="submit" className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2">
                    <ShoppingCart className="w-5 h-5" /> {t('completeSale')}
                  </button>
                </form>
              </div>
            </motion.div>
          )}

          {currentPage === 'areas' && (
            <motion.div
              key="areas"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="grid grid-cols-1 lg:grid-cols-3 gap-8"
            >
              <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                {areas.map((area) => (
                  <div key={area.id} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                        <Store className="w-6 h-6" />
                      </div>
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t('id')}: #{area.id}</span>
                    </div>
                    <h4 className="text-lg font-bold text-slate-900">{area.name}</h4>
                    <p className="text-sm text-slate-500 mb-4">{area.company_name}</p>
                    <div className="flex items-center gap-2 text-sm text-slate-600 bg-slate-50 p-3 rounded-xl">
                      <MapPin className="w-4 h-4 text-slate-400" />
                      {area.location}
                    </div>
                  </div>
                ))}
                {areas.length === 0 && (
                  <div className="col-span-full text-center py-20 bg-white rounded-3xl border border-dashed border-slate-300">
                    <MapPin className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                    <p className="text-slate-400 font-medium">{t('noAreas')}</p>
                  </div>
                )}
              </div>

              <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm h-fit sticky top-10">
                <h3 className="text-xl font-display font-bold mb-6">{t('addArea')}</h3>
                <form onSubmit={handleAddArea} className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">{t('areaName')}</label>
                    <input name="name" required className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none" placeholder="e.g. Downtown Hub" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">{t('companyName')}</label>
                    <input name="company_name" required className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none" placeholder="e.g. Global Logistics Ltd" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">{t('location')}</label>
                    <input name="location" required className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none" placeholder="e.g. 123 Main St, New York" />
                  </div>
                  <button type="submit" className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2">
                    <Plus className="w-5 h-5" /> {t('addArea')}
                  </button>
                </form>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

function StatCard({ label, value, trend, icon: Icon, color, lang }: { label: string, value: string, trend: string, icon: any, color: 'indigo' | 'emerald' | 'amber', lang: Language }) {
  const colors = {
    indigo: "bg-indigo-50 text-indigo-600 border-indigo-100",
    emerald: "bg-emerald-50 text-emerald-600 border-emerald-100",
    amber: "bg-amber-50 text-amber-600 border-amber-100"
  };

  return (
    <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all group">
      <div className="flex items-start justify-between mb-6">
        <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110", colors[color])}>
          <Icon className="w-7 h-7" />
        </div>
        <div className={cn(
          "flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold",
          trend.startsWith('+') ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
        )}>
          {trend.startsWith('+') ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
          {trend}
        </div>
      </div>
      <p className="text-slate-500 font-medium text-sm">{label}</p>
      <h4 className="text-3xl font-display font-bold text-slate-900 mt-1">{value}</h4>
    </div>
  );
}
