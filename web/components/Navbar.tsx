'use client';

import { useState } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Menu, X, Bot, PlusCircle, LayoutDashboard } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  const navItems = [
    { name: 'Arena', href: '/', icon: LayoutDashboard },
    { name: 'Agents', href: '/agents', icon: Bot },
  ];

  const isActive = (path: string) => pathname === path;

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-white/5 bg-slate-950/80 backdrop-blur-xl supports-[backdrop-filter]:bg-slate-950/60">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          
          {/* Logo */}
          <div className="flex items-center gap-2">
            <Link href="/" className="flex items-center gap-2 group">
                <div className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-purple-600 to-blue-600 shadow-lg shadow-purple-500/20 transition-all group-hover:shadow-purple-500/40">
                    <span className="text-lg font-bold text-white">P</span>
                </div>
                <span className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/70 group-hover:to-white transition-all">
                    PredArena
                </span>
            </Link>
          </div>

          {/* Desktop Nav */}
          <div className="hidden md:flex md:items-center md:gap-6">
            <div className="flex items-center gap-1 bg-white/5 p-1 rounded-full border border-white/5">
                {navItems.map((item) => (
                <Link
                    key={item.name}
                    href={item.href}
                    className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                    isActive(item.href)
                        ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20'
                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                >
                    <item.icon size={16} />
                    {item.name}
                </Link>
                ))}
            </div>

            <div className="h-6 w-px bg-white/10 mx-2" />

            <Link 
                href="/deploy"
                className="flex items-center gap-2 text-sm font-bold text-white bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 px-4 py-2 rounded-full shadow-lg shadow-purple-900/20 transition-all hover:scale-105"
            >
                <PlusCircle size={16} />
                <span>Deploy</span>
            </Link>

            <ConnectButton showBalance={false} chainStatus="icon" accountStatus="avatar" />
          </div>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="inline-flex items-center justify-center rounded-lg p-2 text-slate-400 hover:bg-white/5 hover:text-white focus:outline-none"
            >
              {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden border-t border-white/5 bg-slate-950/95 backdrop-blur-xl">
          <div className="space-y-1 px-4 py-6">
            {navItems.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className={`flex items-center gap-3 px-3 py-3 rounded-xl text-base font-medium transition-colors ${
                  isActive(item.href)
                    ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                    : 'text-slate-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                <item.icon size={20} />
                {item.name}
              </Link>
            ))}
            <Link
                href="/deploy"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 px-3 py-3 rounded-xl text-base font-medium text-white bg-gradient-to-r from-purple-600/20 to-pink-600/20 border border-purple-500/30 mt-4"
            >
                <PlusCircle size={20} className="text-purple-400" />
                Deploy New Agent
            </Link>
            
            <div className="pt-4 mt-4 border-t border-white/5 flex justify-center">
                <ConnectButton />
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
