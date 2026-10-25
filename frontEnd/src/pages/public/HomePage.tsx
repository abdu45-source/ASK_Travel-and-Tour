import React, { useState } from 'react';
import { getDestinationImageUrl, handleImageError } from '../../utils/imageUrl';
import { Link, useNavigate } from 'react-router-dom';
import {
  Search,
  Calendar,
  Users,
  ShieldCheck,
  Award,
  Sparkles,
  ArrowRight,
  MapPin,
  Clock,
  CheckCircle,
  Heart,
  Globe,
  Compass,
  Star,
  Quote,
} from 'lucide-react';

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('ALL');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchTerm) params.append('search', searchTerm);
    if (selectedRegion !== 'ALL') params.append('region', selectedRegion);
    navigate(`/destinations?${params.toString()}`);
  };

  const featuredDestinations = [
    {
      title: 'Gondar: Royal Enclosure of Fasilides & Medieval Castles',
      slug: 'gondar-castles-fasil-ghebbi',
      region: 'Amhara',
      price: 19500,
      duration: '3 Days',
      image: '/images/destinations/gondar-fasilides-castle-unesco.jpg',
      badge: 'UNESCO Royal Castle',
      description: 'The "Camelot of Africa": 17th-century stone palaces, royal battlements, and the famed winged angel cherub ceiling.',
    },
    {
      title: 'Addis Ababa: Diplomatic Capital & Cultural Discovery',
      slug: 'addis-ababa-diplomatic-cultural-tour',
      region: 'Addis Ababa',
      price: 11500,
      duration: '2 Days',
      image: '/images/destinations/addis-ababa-science-museum-skyline.jpg',
      badge: 'Capital Heritage',
      description: 'Meet 3.2-million-year-old Lucy (Dinknesh), explore modern Science Museum, Entoto forest views, and vibrant cultural markets.',
    },
    {
      title: 'Lake Hawassa & Great Rift Valley Pelican Safari',
      slug: 'lake-hawassa-rift-valley-pelicans',
      region: 'Sidama',
      price: 14500,
      duration: '2 Days',
      image: '/images/destinations/lake-hawassa-pelicans-rift-valley.jpg',
      badge: 'Rift Valley Safari',
      description: 'Sunrise boat cruises surrounded by Great White Pelicans, lively fish markets, and organic Sidama coffee farm trails.',
    },
    {
      title: 'Wolaita: The Land of 50 Kings & Ajora Waterfalls',
      slug: 'wolaita-land-of-50-kings-ajora',
      region: 'South Ethiopia',
      price: 16800,
      duration: '3 Days',
      image: '/images/destinations/wolaita-land-of-50-kings.jpg',
      badge: 'Ancient Monarchy',
      description: 'Mount Damota hiking, King Tona historical defensive trenches, and twin Ajora waterfalls cascading into lush green gorges.',
    },
    {
      title: 'Lake Tana Islands & Blue Nile Falls',
      slug: 'lake-tana-blue-nile-bahir-dar',
      region: 'Amhara (Bahir Dar)',
      price: 12000,
      duration: '2 Days',
      image: '/images/destinations/blue-nile-falls-tis-abay-close.jpg',
      badge: 'Bahir Dar Circuit',
      description: 'Scenic Lake Tana islands adorned with ancient cultural heritage and the thundering majesty of Tis Abay waterfall in Bahir Dar.',
    },
    {
      title: 'Lalibela Rock-Hewn Monolithic Heritage',
      slug: 'lalibela-rock-hewn-churches',
      region: 'Amhara',
      price: 18500,
      duration: '3 Days',
      image: 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=800&q=80',
      badge: 'Eighth Wonder',
      description: '11 medieval underground monolithic sanctuaries carved from living red volcanic stone under the reign of King Lalibela.',
    },
    {
      title: 'Simien Mountains Escarpments & Geladas',
      slug: 'simien-mountains-trek',
      region: 'Amhara',
      price: 24000,
      duration: '4 Days',
      image: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=800&q=80',
      badge: 'Highland Trek',
      description: 'Towering 4,000m cliffs, dramatic gorges, and encounters with endemic Gelada bleeding-heart baboons.',
    },
    {
      title: 'Danakil Depression & Erta Ale Volcano',
      slug: 'danakil-depression-erta-ale',
      region: 'Afar',
      price: 35000,
      duration: '4 Days',
      image: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=800&q=80',
      badge: 'Extreme Nature',
      description: 'Bubbling molten lava lakes, vivid neon sulfur springs, and blinding white desert salt pans.',
    },
    {
      title: 'Omo Valley Cultural Safaris',
      slug: 'omo-valley-cultural-expedition',
      region: 'South Ethiopia',
      price: 42000,
      duration: '6 Days',
      image: 'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?auto=format&fit=crop&w=800&q=80',
      badge: 'Living Anthropology',
      description: 'A deeply respectful encounter with the ancient tribal communities of the Lower Omo Valley.',
    },
  ];

  return (
    <div className="space-y-20">
      {/* Hero Section */}
      <section className="relative min-h-[640px] flex items-center justify-center bg-stone-900 text-white overflow-hidden">
        {/* Background photo with overlay */}
        <div
          className="absolute inset-0 bg-cover bg-center opacity-45 scale-105 transition-transform duration-1000"
          style={{
            backgroundImage:
              'url("https://images.unsplash.com/photo-1516426122078-c23e76319801?auto=format&fit=crop&w=2000&q=85")',
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-900/60 to-transparent" />

        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center pt-24 pb-20 space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur-md px-4 py-1.5 text-xs font-semibold text-amber-300 border border-white/20">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Ethiopia’s Premier Tour & Travel Agency</span>
          </div>

          <h1 className="font-serif text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-white leading-[1.1]">
            Experience the Cradle of Humanity & Sacred Highlands
          </h1>

          <p className="max-w-2xl mx-auto text-base sm:text-lg text-stone-300 font-light leading-relaxed">
            From the 800-year-old rock-carved sanctuaries of Lalibela to the fiery otherworldly calderas of Danakil, explore timeless landscapes with certified master guides.
          </p>

          {/* Search Bar Widget */}
          <form
            onSubmit={handleSearch}
            className="max-w-3xl mx-auto bg-white/95 backdrop-blur-xl p-3 sm:p-4 rounded-3xl shadow-2xl border border-white/40 flex flex-col sm:flex-row gap-3 text-stone-800 text-left mt-8"
          >
            <div className="flex-1 flex items-center gap-3 px-3 py-2 border-b sm:border-b-0 sm:border-r border-stone-200">
              <Search className="w-5 h-5 text-primary-600 shrink-0" />
              <input
                type="text"
                placeholder="Where would you like to explore?"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-transparent text-xs sm:text-sm font-medium focus:outline-none placeholder:text-stone-400"
              />
            </div>

            <div className="w-full sm:w-56 flex items-center gap-3 px-3 py-2 border-b sm:border-b-0 sm:border-r border-stone-200">
              <MapPin className="w-5 h-5 text-primary-600 shrink-0" />
              <select
                value={selectedRegion}
                onChange={(e) => setSelectedRegion(e.target.value)}
                className="w-full bg-transparent text-xs sm:text-sm font-medium focus:outline-none text-stone-700"
              >
                <option value="ALL">All Regions (Ethiopia-wide)</option>
                <option value="Amhara">Amhara (Lalibela, Gondar, Bahir Dar)</option>
                <option value="Addis Ababa">Addis Ababa (Capital & Museums)</option>
                <option value="Sidama">Sidama (Hawassa & Coffee Origin)</option>
                <option value="South Ethiopia">South (Omo Valley & Wolaita)</option>
                <option value="Oromia">Oromia (Bale Mountains & Lakes)</option>
                <option value="Afar">Afar (Danakil & Erta Ale)</option>
                <option value="Tigray">Tigray (Axum & Gheralta)</option>
                <option value="Harari">Harari (Walled City of Harar)</option>
              </select>
            </div>

            <button
              type="submit"
              className="rounded-2xl bg-primary-600 px-6 py-3.5 text-xs sm:text-sm font-bold text-white shadow-lg shadow-primary-600/30 hover:bg-primary-700 active:scale-95 transition-all flex items-center justify-center gap-2 shrink-0"
            >
              <span>Explore Tours</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick trust highlights */}
          <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-10 pt-4 text-xs text-stone-300">
            <span className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              Transparent 2% Cancellation Policy
            </span>
            <span className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              100% Escrow & Price Guarantee
            </span>
            <span className="flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-400" />
              10% Agent Commission Program
            </span>
          </div>
        </div>
      </section>

      {/* Featured Destinations Catalog */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-primary-700">
              Curated Expeditions
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-stone-900 mt-1">
              Popular Journeys Across Ethiopia
            </h2>
          </div>
          <Link
            to="/destinations"
            className="inline-flex items-center gap-2 text-xs font-bold text-primary-700 hover:text-primary-800 transition-colors group"
          >
            <span>View all 50+ Destinations</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {featuredDestinations.map((d) => (
            <div
              key={d.slug}
              className="group flex flex-col rounded-3xl bg-white border border-stone-200 overflow-hidden shadow-sm hover:shadow-xl hover:border-primary-200 transition-all duration-300"
            >
              {/* Image Container */}
              <div className="relative h-60 w-full overflow-hidden">
                <img
                  src={getDestinationImageUrl(d.image)}
                  alt={d.title}
                  onError={handleImageError}
                  className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute top-4 left-4 rounded-full bg-stone-900/80 backdrop-blur-md px-3 py-1 text-[11px] font-semibold text-amber-300">
                  {d.badge}
                </div>
                <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-white text-xs drop-shadow-md">
                  <span className="flex items-center gap-1.5 font-medium">
                    <MapPin className="w-3.5 h-3.5 text-amber-400" />
                    {d.region}
                  </span>
                  <span className="flex items-center gap-1.5 font-medium">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    {d.duration}
                  </span>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 p-6 flex flex-col justify-between">
                <div>
                  <h3 className="font-serif font-bold text-lg text-stone-900 group-hover:text-primary-700 transition-colors line-clamp-1">
                    {d.title}
                  </h3>
                  <p className="mt-2 text-xs text-stone-600 line-clamp-2 leading-relaxed">
                    {d.description}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-stone-100 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-stone-400 uppercase font-semibold block">From</span>
                    <p className="text-base font-bold text-stone-900">
                      {d.price.toLocaleString()} <span className="text-xs font-normal text-stone-500">ETB</span>
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
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Our Story Section */}
      <section id="about" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 scroll-mt-28">
        <div className="bg-stone-900 rounded-3xl overflow-hidden border border-stone-800 shadow-xl text-white">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Story text */}
            <div className="p-8 sm:p-12 lg:p-16 lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full bg-primary-900/60 px-4 py-1.5 text-xs font-bold text-amber-400 border border-primary-500/30">
                <Compass className="w-4 h-4 text-amber-400" />
                <span>Our Heritage & Bahir Dar Roots</span>
              </div>

              <h2 className="font-serif text-3xl sm:text-4xl font-bold leading-tight">
                Pioneering Authentic Journeys from the Source of the Blue Nile
              </h2>

              <p className="text-stone-300 text-sm leading-relaxed">
                Founded on the palm-fringed shores of Lake Tana in Bahir Dar, ASK Tours was created with a heartfelt mission: to unveil the soul of Ethiopia to the world through genuine cultural immersion, master local storytelling, and unwavering integrity.
              </p>

              <p className="text-stone-400 text-xs sm:text-sm leading-relaxed">
                Ethiopia is unlike any other destination on Earth — it is the cradle of human origins, the sacred repository of ancient Christian and Islamic relics, and a mosaic of over 80 vibrant ethnic cultures living in harmony with dramatic alpine landscapes. From the medieval rock-hewn wonders of Lalibela and Gondar's royal palaces to the extraterrestrial salt calderas of Danakil, we operate with 100% certified native historians and scouts.
              </p>

              {/* Four pillars */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="flex items-start gap-3 bg-white/5 rounded-2xl p-4 border border-white/10">
                  <Award className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-white">100% Certified Native Guides</h4>
                    <p className="text-[11px] text-stone-400 mt-0.5">Born & raised local historians with deep community ties.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 bg-white/5 rounded-2xl p-4 border border-white/10">
                  <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-white">Escrow-Backed Protection</h4>
                    <p className="text-[11px] text-stone-400 mt-0.5">Automated 2% cancellation fee policy & full escrow ledger.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 bg-white/5 rounded-2xl p-4 border border-white/10">
                  <Heart className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-white">Community Reinvestment</h4>
                    <p className="text-[11px] text-stone-400 mt-0.5">10% of agency proceeds support village schools & conservation.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 bg-white/5 rounded-2xl p-4 border border-white/10">
                  <MapPin className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-white">Bahir Dar Operations HQ</h4>
                    <p className="text-[11px] text-stone-400 mt-0.5">24/7 dedicated dispatch and ground logistics support.</p>
                  </div>
                </div>
              </div>

              {/* Founder Quote */}
              <div className="pt-4 border-t border-stone-800 flex items-center gap-4">
                <div className="h-12 w-12 rounded-full overflow-hidden border-2 border-amber-400 shrink-0">
                  <img
                    src="/images/destinations/bahir-dar-promenade-palms.jpg"
                    alt="Bahir Dar Promenade"
                    className="h-full w-full object-cover"
                  />
                </div>
                <div>
                  <p className="text-xs italic text-stone-300">
                    "We don't merely guide tours — we open the gates to our living ancestors, sacred traditions, and timeless warmth."
                  </p>
                  <p className="text-[11px] font-bold text-amber-400 mt-0.5">
                    Abebe Bekele — Founder & Managing Director, ASK Tours Bahir Dar
                  </p>
                </div>
              </div>
            </div>

            {/* Visual Mosaic */}
            <div className="p-8 lg:p-12 lg:col-span-5 grid grid-cols-2 gap-3.5">
              <div className="space-y-3.5">
                <div className="rounded-2xl overflow-hidden shadow-lg h-44">
                  <img
                    src="/images/destinations/bahir-dar-palm-avenue.jpg"
                    alt="Bahir Dar Palm Avenue"
                    className="h-full w-full object-cover hover:scale-105 transition-transform duration-500"
                  />
                </div>
                <div className="rounded-2xl overflow-hidden shadow-lg h-60">
                  <img
                    src="/images/destinations/gondar-fasilides-castle-unesco.jpg"
                    alt="Gondar Fasilides Castle"
                    className="h-full w-full object-cover hover:scale-105 transition-transform duration-500"
                  />
                </div>
              </div>
              <div className="space-y-3.5 pt-6">
                <div className="rounded-2xl overflow-hidden shadow-lg h-60">
                  <img
                    src="/images/destinations/lake-tana-bahir-dar-boats.jpg"
                    alt="Lake Tana Tour Fleet"
                    className="h-full w-full object-cover hover:scale-105 transition-transform duration-500"
                  />
                </div>
                <div className="rounded-2xl overflow-hidden shadow-lg h-44">
                  <img
                    src="/images/destinations/wolaita-land-of-50-kings.jpg"
                    alt="Wolaita Heritage"
                    className="h-full w-full object-cover hover:scale-105 transition-transform duration-500"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Agent Referral Promo Banner */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative rounded-3xl bg-gradient-to-br from-stone-900 via-primary-900 to-stone-900 p-8 sm:p-12 text-white overflow-hidden shadow-2xl">
          <div className="relative z-10 max-w-2xl space-y-4">
            <span className="rounded-full bg-amber-400/20 px-3.5 py-1 text-xs font-bold text-amber-300 border border-amber-400/30">
              Travel Agent Partnership Program
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl font-bold leading-tight">
              Earn Automated 10% Commission on Every Client Booking
            </h2>
            <p className="text-xs sm:text-sm text-stone-300 leading-relaxed">
              Register as an ASK Travel Agent to receive your exclusive 8-character referral code. When your clients book an Ethiopian expedition, our automated ledger instantly credits 10% to your wallet upon booking approval with flexible bank payouts.
            </p>
            <div className="pt-4 flex flex-wrap gap-4">
              <Link
                to="/apply-agent"
                className="rounded-2xl bg-amber-500 px-6 py-3 text-xs font-bold text-stone-900 hover:bg-amber-400 transition-colors shadow-lg shadow-amber-500/20"
              >
                Join Agent Network
              </Link>
              <Link
                to="/login"
                className="rounded-2xl bg-white/10 backdrop-blur-md px-6 py-3 text-xs font-bold text-white hover:bg-white/20 transition-colors border border-white/20"
              >
                Agent Portal Login
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
