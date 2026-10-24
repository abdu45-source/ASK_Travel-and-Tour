import React from 'react';
import { Compass, Mail, Phone, MapPin, ShieldCheck, Award } from 'lucide-react';
import { Link } from 'react-router-dom';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-stone-900 text-stone-300 pt-16 pb-12 border-t border-stone-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 pb-12 border-b border-stone-800">
          {/* Column 1: Brand & Philosophy */}
          <div className="space-y-4 md:col-span-1">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-primary-600 to-amber-500 flex items-center justify-center text-white">
                <Compass className="w-5 h-5" />
              </div>
              <span className="font-serif font-bold text-xl text-white tracking-tight">
                ASK <span className="text-primary-500">TOURS</span>
              </span>
            </div>
            <p className="text-xs text-stone-400 leading-relaxed">
              Pioneering authentic, immersive, and sustainable journeys across the cradle of humanity. Licensed tour operator in Bahir Dar, Ethiopia.
            </p>
            <div className="flex items-center gap-3 text-xs text-amber-400/90 font-medium pt-2">
              <Award className="w-4 h-4 text-amber-400" />
              <span>Certified Ethiopian Tourism Board Partner</span>
            </div>
          </div>

          {/* Column 2: Popular Expeditions */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-white mb-4">
              Featured Circuits
            </h4>
            <ul className="space-y-2.5 text-xs">
              <li>
                <Link to="/destinations/lalibela-rock-hewn-churches" className="hover:text-primary-400 transition-colors">
                  Lalibela Rock-Hewn Churches
                </Link>
              </li>
              <li>
                <Link to="/destinations/simien-mountains-trek" className="hover:text-primary-400 transition-colors">
                  Simien Mountains Escarpments
                </Link>
              </li>
              <li>
                <Link to="/destinations/danakil-depression-erta-ale" className="hover:text-primary-400 transition-colors">
                  Danakil Depression & Erta Ale
                </Link>
              </li>
              <li>
                <Link to="/destinations/lake-tana-blue-nile-bahir-dar" className="hover:text-primary-400 transition-colors">
                  Lake Tana & Blue Nile Falls
                </Link>
              </li>
              <li>
                <Link to="/destinations/omo-valley-cultural-expedition" className="hover:text-primary-400 transition-colors">
                  Omo Valley Cultural Safaris
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Partner & Legal */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-white mb-4">
              Partner Programs
            </h4>
            <ul className="space-y-2.5 text-xs">
              <li>
                <Link to="/register" className="hover:text-primary-400 transition-colors">
                  Become a Travel Agent (10% Commission)
                </Link>
              </li>
              <li>
                <span className="text-stone-400">Referral Code Onboarding</span>
              </li>
              <li>
                <span className="text-stone-400">Transparent Tiered Cancellation Policy (2% / 4% / 8%)</span>
              </li>
              <li>
                <span className="text-stone-400">Audit-Verified Escrow Ledger & Telebirr/CBE Payouts</span>
              </li>
            </ul>
          </div>

          {/* Column 4: Contact & Office */}
          <div id="contact" className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white mb-4">
              Bahir Dar Operations Office
            </h4>
            <div className="flex items-start gap-2.5 text-xs text-stone-400">
              <MapPin className="w-4 h-4 text-primary-500 shrink-0 mt-0.5" />
              <span>ASK Digital Technologies Bldg, Kebele 04, Bahir Dar, Amhara Region, Ethiopia</span>
            </div>
            <div className="flex items-center gap-2.5 text-xs text-stone-400">
              <Phone className="w-4 h-4 text-primary-500 shrink-0" />
              <span>0900572995 / +251 58 220 1234</span>
            </div>
            <div className="flex items-center gap-2.5 text-xs text-stone-400">
              <Mail className="w-4 h-4 text-primary-500 shrink-0" />
              <a href="mailto:abduselamibrahim85@gmail.com" className="hover:text-primary-400 transition-colors">
                abduselamibrahim85@gmail.com
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Credits */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-stone-500 gap-4">
          <div>
            <p>© 2026 ASK Digital Technologies. All rights reserved. Tour & Travel Agency Management System v2.0.</p>
            <p className="text-[11px] text-stone-400 mt-1">
              Lead Architect & Full-Stack Engineer: <span className="text-stone-300 font-semibold">Abduselam Ibrahim</span> (<a href="mailto:abduselamibrahim85@gmail.com" className="text-primary-400 hover:underline">abduselamibrahim85@gmail.com</a> • <span className="text-amber-400 font-mono">0900572995</span>)
            </p>
          </div>
          <div className="flex items-center gap-6">
            <span className="flex items-center gap-1.5 text-stone-400">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              256-Bit TLS Bank-Grade Security
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};
