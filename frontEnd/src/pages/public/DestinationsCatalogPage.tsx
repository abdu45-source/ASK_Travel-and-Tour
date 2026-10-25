import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  Search,
  MapPin,
  Clock,
  ArrowRight,
  Sparkles,
  Plus,
  Edit2,
  Trash2,
  CheckCircle,
  Eye,
  Shield,
  Layers,
  Settings,
  X,
  Image as ImageIcon,
  Users,
} from 'lucide-react';
import { api } from '../../services/api';
import { Destination } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { getDestinationImageUrl, handleImageError } from '../../utils/imageUrl';

export const ETHIOPIAN_REGIONS = [
  { value: 'ALL', label: 'All Regions (All Ethiopia)' },
  { value: 'Amhara', label: 'Amhara (Lalibela, Gondar, Bahir Dar, Simien)' },
  { value: 'Addis Ababa', label: 'Addis Ababa (Capital & National Museum)' },
  { value: 'Sidama', label: 'Sidama (Hawassa & Coffee Origin)' },
  { value: 'South Ethiopia', label: 'South Ethiopia (Omo Valley, Wolaita)' },
  { value: 'Oromia', label: 'Oromia (Bale Mountains, Lakes)' },
  { value: 'Afar', label: 'Afar (Danakil Depression, Erta Ale)' },
  { value: 'Tigray', label: 'Tigray (Axum, Gheralta Pinnacles & Axum)' },
  { value: 'Harari', label: 'Harari (Historic Walled City of Harar)' },
];

const LOCAL_PRESET_IMAGES = [
  { label: 'Gondar Fasilides Castle', path: '/images/destinations/gondar-fasilides-castle-unesco.jpg' },
  { label: 'Addis Ababa Modern Skyline', path: '/images/destinations/addis-ababa-science-museum-skyline.jpg' },
  { label: 'Lake Hawassa Pelicans', path: '/images/destinations/lake-hawassa-pelicans-rift-valley.jpg' },
  { label: 'Wolaita Land of 50 Kings', path: '/images/destinations/wolaita-land-of-50-kings.jpg' },
  { label: 'Blue Nile Falls (Tis Abay)', path: '/images/destinations/blue-nile-falls-tis-abay-close.jpg' },
  { label: 'Bahir Dar Palm Avenue', path: '/images/destinations/bahir-dar-palm-avenue.jpg' },
  { label: 'Lake Tana Boat Tour Fleet', path: '/images/destinations/lake-tana-bahir-dar-boats.jpg' },
  { label: 'Lush Highlands & Escarpment', path: '/images/destinations/ethiopian-highlands-green.jpg' },
];

export const DestinationsCatalogPage: React.FC = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [loading, setLoading] = useState(true);

  // Owner & Manager privilege checks
  const isOwner = Boolean(user?.roles?.includes('OWNER'));
  const isManager = Boolean(user?.roles?.includes('MANAGER'));
  const isStaff = isOwner || isManager;

  // Filters
  const search = searchParams.get('search') || '';
  const region = searchParams.get('region') || 'ALL';
  const sort = (searchParams.get('sort') || 'newest') as any;
  const maxPrice = searchParams.get('maxPrice') || '';
  const statusFilter = searchParams.get('status') || 'ALL';

  // Management Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingDest, setEditingDest] = useState<Destination | null>(null);
  const [saving, setSaving] = useState(false);

  // Form State
  const [formTitle, setFormTitle] = useState('');
  const [formRegion, setFormRegion] = useState('Amhara');
  const [formPrice, setFormPrice] = useState('18000');
  const [formDuration, setFormDuration] = useState('3');
  const [formCapacity, setFormCapacity] = useState('20');
  const [formStatus, setFormStatus] = useState('ACTIVE');
  const [formShortDesc, setFormShortDesc] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formImage, setFormImage] = useState('/images/destinations/gondar-fasilides-castle-unesco.jpg');

  const fetchDestinations = async () => {
    setLoading(true);
    try {
      if (isStaff) {
        // Staff can fetch all destinations including drafts
        const res = await api.get('/destinations/admin');
        let items: Destination[] = res.data || [];

        // Apply client-side filters for admin view
        if (search) {
          const s = search.toLowerCase();
          items = items.filter(
            (d) =>
              d.title.toLowerCase().includes(s) ||
              d.region.toLowerCase().includes(s) ||
              d.description?.toLowerCase().includes(s),
          );
        }
        if (region && region !== 'ALL') {
          items = items.filter((d) => d.region === region);
        }
        if (statusFilter && statusFilter !== 'ALL') {
          items = items.filter((d) => d.status === statusFilter);
        }
        if (maxPrice) {
          items = items.filter((d) => Number(d.base_price) <= parseFloat(maxPrice));
        }

        if (sort === 'price_asc') items.sort((a, b) => Number(a.base_price) - Number(b.base_price));
        if (sort === 'price_desc') items.sort((a, b) => Number(b.base_price) - Number(a.base_price));
        if (sort === 'popularity') items.sort((a, b) => (b.popularity_score || 0) - (a.popularity_score || 0));

        setDestinations(items);
      } else {
        const params = new URLSearchParams();
        if (search) params.append('search', search);
        if (region && region !== 'ALL') params.append('region', region);
        if (sort) params.append('sort', sort);
        if (maxPrice) params.append('maxPrice', maxPrice);

        const res = await api.get(`/destinations?${params.toString()}`);
        setDestinations(res.data.items || []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDestinations();
  }, [searchParams, isStaff, statusFilter]);

  const updateFilter = (key: string, val: string) => {
    const next = new URLSearchParams(searchParams);
    if (!val || val === 'ALL') {
      next.delete(key);
    } else {
      next.set(key, val);
    }
    setSearchParams(next);
  };

  const handleOpenCreateModal = () => {
    setEditingDest(null);
    setFormTitle('');
    setFormRegion('Amhara');
    setFormPrice('18500');
    setFormDuration('3');
    setFormCapacity('20');
    setFormStatus('ACTIVE');
    setFormShortDesc('');
    setFormDesc('');
    setFormImage('/images/destinations/gondar-fasilides-castle-unesco.jpg');
    setModalOpen(true);
  };

  const handleOpenEditModal = (d: Destination) => {
    setEditingDest(d);
    setFormTitle(d.title);
    setFormRegion(d.region);
    setFormPrice(String(d.base_price));
    setFormDuration(String(d.duration_days));
    setFormCapacity(String(d.capacity || 20));
    setFormStatus(d.status);
    setFormShortDesc(d.short_description || '');
    setFormDesc(d.description || '');
    setFormImage(d.gallery_images?.[0] || '/images/destinations/gondar-fasilides-castle-unesco.jpg');
    setModalOpen(true);
  };

  const handleSaveDestination = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle) return alert('Title is required');
    setSaving(true);
    try {
      const payload: any = {
        title: formTitle,
        region: formRegion,
        base_price: parseFloat(formPrice),
        duration_days: parseInt(formDuration, 10),
        capacity: parseInt(formCapacity, 10),
        status: formStatus,
        short_description: formShortDesc,
        description: formDesc,
        gallery_images: [formImage],
      };

      if (editingDest) {
        await api.patch(`/destinations/${editingDest.id}`, payload);
      } else {
        await api.post('/destinations', payload);
      }
      setModalOpen(false);
      fetchDestinations();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to save destination');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (d: Destination) => {
    const nextStatus = d.status === 'ACTIVE' ? 'DRAFT' : 'ACTIVE';
    try {
      await api.patch(`/destinations/${d.id}`, { status: nextStatus });
      fetchDestinations();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update status');
    }
  };

  const handleDeleteDestination = async (d: Destination) => {
    if (!confirm(`Are you sure you want to archive "${d.title}"?`)) return;
    try {
      await api.delete(`/destinations/${d.id}`);
      fetchDestinations();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete');
    }
  };

  const activeCount = destinations.filter((d) => d.status === 'ACTIVE').length;
  const draftCount = destinations.filter((d) => d.status !== 'ACTIVE').length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Staff Executive Control Bar */}
      {isStaff && (
        <div className="rounded-3xl bg-gradient-to-r from-stone-900 via-stone-850 to-stone-900 border border-amber-500/30 p-6 text-white shadow-xl">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-amber-400 text-stone-900 px-3 py-0.5 text-[11px] font-bold uppercase tracking-wider">
                  {isOwner ? 'System Owner Control Mode' : 'Agency Manager Operations'}
                </span>
                <span className="text-xs text-stone-400">| Live Catalog Management</span>
              </div>
              <h2 className="font-serif text-2xl font-bold text-white">
                Tour Packages & Destinations Control Hub
              </h2>
              <p className="text-xs text-stone-300">
                You have executive authorization to publish new expeditions, modify pricing rules, toggle package availability, and edit itineraries.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-4 bg-stone-800/80 px-4 py-2 rounded-2xl border border-stone-700 text-xs">
                <div>
                  <span className="text-stone-400 block text-[10px] uppercase font-bold">Total Tours</span>
                  <span className="text-lg font-bold text-white">{destinations.length}</span>
                </div>
                <div className="h-6 w-px bg-stone-700" />
                <div>
                  <span className="text-emerald-400 block text-[10px] uppercase font-bold">Active</span>
                  <span className="text-lg font-bold text-emerald-400">{activeCount}</span>
                </div>
                {draftCount > 0 && (
                  <>
                    <div className="h-6 w-px bg-stone-700" />
                    <div>
                      <span className="text-amber-400 block text-[10px] uppercase font-bold">Drafts</span>
                      <span className="text-lg font-bold text-amber-400">{draftCount}</span>
                    </div>
                  </>
                )}
              </div>

              <button
                onClick={handleOpenCreateModal}
                className="flex items-center gap-2 rounded-2xl bg-primary-600 px-5 py-3 text-xs font-bold text-white shadow-lg shadow-primary-600/30 hover:bg-primary-500 active:scale-95 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>+ Create Tour Package</span>
              </button>
            </div>
          </div>

          {/* Quick status filter pills for staff */}
          <div className="mt-4 pt-4 border-t border-stone-800 flex items-center gap-2 text-xs">
            <span className="text-stone-400 text-[11px] font-bold uppercase tracking-wider mr-2">
              Status Filter:
            </span>
            {['ALL', 'ACTIVE', 'DRAFT'].map((st) => (
              <button
                key={st}
                onClick={() => updateFilter('status', st)}
                className={`px-3 py-1 rounded-xl font-bold transition-all ${
                  statusFilter === st
                    ? 'bg-amber-400 text-stone-900 shadow-sm'
                    : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
                }`}
              >
                {st === 'ALL' ? 'All Packages' : st}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Public Catalog Header */}
      <div className="text-center max-w-3xl mx-auto space-y-2">
        <span className="text-xs font-bold uppercase tracking-widest text-primary-700">
          Ethiopian Expeditions & Sacred Heritage
        </span>
        <h1 className="font-serif text-3xl sm:text-5xl font-bold text-stone-900">
          Explore Our Travel Catalog
        </h1>
        <p className="text-xs sm:text-sm text-stone-600">
          Discover Ethiopia’s monolithic rock sanctuaries, dramatic Simien & Bale peaks, Rift Valley wildlife, and colorful tribal heritages with certified master guides.
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-stone-200 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {/* Search text */}
          <div className="relative">
            <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-3.5" />
            <input
              type="text"
              placeholder="Search destination, city, or keyword..."
              value={search}
              onChange={(e) => updateFilter('search', e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-stone-200 text-xs focus:ring-2 focus:ring-primary-500 focus:outline-none"
            />
          </div>

          {/* Region filter */}
          <div>
            <select
              value={region}
              onChange={(e) => updateFilter('region', e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs focus:ring-2 focus:ring-primary-500 focus:outline-none text-stone-700 bg-white"
            >
              {ETHIOPIAN_REGIONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          {/* Max Price filter */}
          <div>
            <select
              value={maxPrice}
              onChange={(e) => updateFilter('maxPrice', e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs focus:ring-2 focus:ring-primary-500 focus:outline-none text-stone-700 bg-white"
            >
              <option value="">Any Budget</option>
              <option value="15000">Up to 15,000 ETB</option>
              <option value="20000">Up to 20,000 ETB</option>
              <option value="30000">Up to 30,000 ETB</option>
              <option value="45000">Up to 45,000 ETB</option>
            </select>
          </div>

          {/* Sort */}
          <div>
            <select
              value={sort}
              onChange={(e) => updateFilter('sort', e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs focus:ring-2 focus:ring-primary-500 focus:outline-none text-stone-700 bg-white"
            >
              <option value="newest">Sort by: Newest</option>
              <option value="popularity">Sort by: Most Popular</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
            </select>
          </div>
        </div>
      </div>

      {/* Destinations Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-96 rounded-3xl bg-stone-200 animate-pulse" />
          ))}
        </div>
      ) : destinations.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-stone-200 p-8 space-y-4">
          <p className="text-sm font-semibold text-stone-700">No destinations match your filters.</p>
          <button
            onClick={() => setSearchParams({})}
            className="text-xs text-primary-700 font-bold hover:underline"
          >
            Clear all filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {destinations.map((d) => {
            const isCardActive = d.status === 'ACTIVE';

            return (
              <div
                key={d.id}
                className={`group flex flex-col rounded-3xl bg-white border overflow-hidden transition-all duration-300 ${
                  isStaff && !isCardActive
                    ? 'border-amber-300 ring-1 ring-amber-200 bg-amber-50/20 opacity-85'
                    : 'border-stone-200 hover:shadow-xl hover:border-primary-200'
                }`}
              >
                {/* Image */}
                <div className="relative h-60 w-full overflow-hidden">
                  <img
                    src={getDestinationImageUrl(d.gallery_images?.[0])}
                    alt={d.title}
                    onError={handleImageError}
                    className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-4 left-4 rounded-full bg-stone-900/80 backdrop-blur-md px-3 py-1 text-[11px] font-semibold text-amber-300">
                    {d.region}
                  </div>

                  {/* Staff Status Badge */}
                  {isStaff ? (
                    <div
                      className={`absolute top-4 right-4 rounded-full px-3 py-1 text-[10px] font-bold shadow-md ${
                        isCardActive
                          ? 'bg-emerald-600 text-white'
                          : 'bg-amber-500 text-stone-900'
                      }`}
                    >
                      {d.status}
                    </div>
                  ) : (
                    d.popularity_score > 85 && (
                      <div className="absolute top-4 right-4 rounded-full bg-amber-500 px-2.5 py-0.5 text-[10px] font-bold text-stone-900 flex items-center gap-1">
                        <Sparkles className="w-3 h-3" />
                        Popular
                      </div>
                    )
                  )}

                  <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-white text-xs drop-shadow-md">
                    <span className="flex items-center gap-1.5 font-medium">
                      <MapPin className="w-3.5 h-3.5 text-amber-400" />
                      {d.region}
                    </span>
                    <span className="flex items-center gap-1.5 font-medium">
                      <Clock className="w-3.5 h-3.5 text-amber-400" />
                      {d.duration_days} Days
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 p-6 flex flex-col justify-between space-y-4">
                  <div>
                    <h3 className="font-serif font-bold text-lg text-stone-900 group-hover:text-primary-700 transition-colors line-clamp-1">
                      {d.title}
                    </h3>
                    <p className="mt-2 text-xs text-stone-600 line-clamp-2 leading-relaxed">
                      {d.short_description || d.description}
                    </p>

                    {/* Capacity badge */}
                    <div className="mt-3 flex items-center gap-2 text-[11px] text-stone-500 font-medium">
                      <Users className="w-3.5 h-3.5 text-stone-400" />
                      <span>Capacity: {d.capacity || 20} travelers</span>
                    </div>
                  </div>

                  {/* Pricing & Client Action */}
                  <div className="pt-4 border-t border-stone-100 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-stone-400 uppercase font-semibold block">From</span>
                      <p className="text-base font-bold text-stone-900">
                        {Number(d.base_price).toLocaleString()} <span className="text-xs font-normal text-stone-500">ETB</span>
                      </p>
                    </div>

                    <Link
                      to={`/destinations/${d.slug}`}
                      className="rounded-xl bg-stone-900 px-4 py-2 text-xs font-semibold text-white group-hover:bg-primary-600 transition-colors flex items-center gap-1.5"
                    >
                      <span>View Itinerary</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>

                  {/* Staff Management Action Bar */}
                  {isStaff && (
                    <div className="pt-3 border-t border-amber-100 bg-amber-50/50 -mx-6 -mb-6 p-4 rounded-b-3xl flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleOpenEditModal(d)}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white border border-stone-200 text-stone-700 hover:text-primary-700 hover:border-primary-300 font-bold transition-colors shadow-2xs"
                        >
                          <Edit2 className="w-3 h-3 text-primary-600" />
                          <span>Edit</span>
                        </button>

                        <button
                          onClick={() => handleToggleStatus(d)}
                          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg font-bold transition-colors border ${
                            isCardActive
                              ? 'bg-amber-100 border-amber-200 text-amber-900 hover:bg-amber-200'
                              : 'bg-emerald-100 border-emerald-200 text-emerald-900 hover:bg-emerald-200'
                          }`}
                        >
                          <span>{isCardActive ? 'Set Draft' : 'Publish'}</span>
                        </button>
                      </div>

                      {isOwner && (
                        <button
                          onClick={() => handleDeleteDestination(d)}
                          className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-100 transition-colors"
                          title="Archive Tour"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Destination Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-stone-200 p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between border-b border-stone-100 pb-4">
              <div>
                <h3 className="font-serif text-xl font-bold text-stone-900">
                  {editingDest ? 'Edit Tour Package' : 'Create New Ethiopian Tour Package'}
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  Executive management of tour catalog data, pricing, and authentic gallery media.
                </p>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="p-2 text-stone-400 hover:text-stone-700 rounded-xl hover:bg-stone-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveDestination} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-stone-700 mb-1">Tour Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Gondar: Royal Enclosure & Fasilides Castles"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 focus:ring-2 focus:ring-primary-500 focus:outline-none font-medium"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Region</label>
                  <select
                    value={formRegion}
                    onChange={(e) => setFormRegion(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 bg-white focus:ring-2 focus:ring-primary-500 focus:outline-none"
                  >
                    {ETHIOPIAN_REGIONS.filter((r) => r.value !== 'ALL').map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">Status</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 bg-white focus:ring-2 focus:ring-primary-500 focus:outline-none"
                  >
                    <option value="ACTIVE">ACTIVE (Visible in Public Catalog)</option>
                    <option value="DRAFT">DRAFT (Hidden from Public)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Base Price (ETB)</label>
                  <input
                    type="number"
                    required
                    min="1000"
                    step="100"
                    value={formPrice}
                    onChange={(e) => setFormPrice(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 focus:ring-2 focus:ring-primary-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">Duration (Days)</label>
                  <input
                    type="number"
                    required
                    min="1"
                    max="30"
                    value={formDuration}
                    onChange={(e) => setFormDuration(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 focus:ring-2 focus:ring-primary-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">Max Capacity</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={formCapacity}
                    onChange={(e) => setFormCapacity(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 focus:ring-2 focus:ring-primary-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">Short Description (Summary Card)</label>
                <input
                  type="text"
                  placeholder="One sentence summary of the tour highlights..."
                  value={formShortDesc}
                  onChange={(e) => setFormShortDesc(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 focus:ring-2 focus:ring-primary-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">Detailed Description</label>
                <textarea
                  rows={3}
                  placeholder="Comprehensive description of the history, geography, and guided tour details..."
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 focus:ring-2 focus:ring-primary-500 focus:outline-none"
                />
              </div>

              {/* Photo selection presets */}
              <div>
                <label className="block font-bold text-stone-700 mb-1">
                  Primary Gallery Image (Choose Preset or Enter URL)
                </label>
                <input
                  type="text"
                  required
                  value={formImage}
                  onChange={(e) => setFormImage(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 focus:ring-2 focus:ring-primary-500 focus:outline-none font-mono text-[11px]"
                />

                <p className="text-[11px] text-stone-500 mt-2 font-semibold">
                  Select from Authentic Ethiopian Tour Photos:
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-1.5">
                  {LOCAL_PRESET_IMAGES.map((p) => (
                    <button
                      type="button"
                      key={p.path}
                      onClick={() => setFormImage(p.path)}
                      className={`text-left p-2 rounded-xl border text-[10px] transition-all flex flex-col justify-between h-16 ${
                        formImage === p.path
                          ? 'border-primary-600 bg-primary-50 text-primary-800 font-bold'
                          : 'border-stone-200 hover:bg-stone-50 text-stone-700'
                      }`}
                    >
                      <span className="line-clamp-2">{p.label}</span>
                      <span className="text-[9px] text-stone-400">Local Photo</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-stone-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-50 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 rounded-xl bg-primary-600 text-white font-bold hover:bg-primary-700 transition-colors shadow-md disabled:opacity-50"
                >
                  {saving ? 'Saving...' : editingDest ? 'Update Package' : 'Create Package'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
