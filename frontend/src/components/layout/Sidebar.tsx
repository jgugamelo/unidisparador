'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Users, Megaphone, Smartphone,
  MessageSquare, ShieldOff, LogOut, Zap,
} from 'lucide-react';
import clsx from 'clsx';

const navItems = [
  { href: '/dashboard',  label: 'Dashboard',     icon: LayoutDashboard },
  { href: '/campaigns',  label: 'Campanhas',      icon: Megaphone },
  { href: '/contacts',   label: 'Contatos',       icon: Users },
  { href: '/sessions',   label: 'Sessões WAHA',   icon: Smartphone },
  { href: '/attendance', label: 'Atendimento',    icon: MessageSquare },
  { href: '/blacklist',  label: 'Blacklist',      icon: ShieldOff },
];

export function Sidebar() {
  const pathname = usePathname();

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    window.location.href = '/auth/login';
  };

  return (
    <aside className="w-64 flex-shrink-0 bg-[#0b1120] text-white flex flex-col h-screen sticky top-0 border-r border-white/5">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-white/5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center shadow-lg shadow-emerald-500/30">
            <Zap size={16} className="text-white" fill="white" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white tracking-tight">WhatsSmart</h1>
            <p className="text-[10px] text-slate-500 font-medium uppercase tracking-widest">Disparo IA</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        <p className="px-3 mb-3 text-[10px] font-semibold uppercase tracking-widest text-slate-600">Menu</p>
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
                active
                  ? 'bg-emerald-500/10 text-emerald-400 shadow-sm'
                  : 'text-slate-400 hover:bg-white/5 hover:text-slate-200',
              )}
            >
              <Icon
                size={17}
                className={clsx(active ? 'text-emerald-400' : 'text-slate-500')}
              />
              {label}
              {active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-400" />}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 py-4 border-t border-white/5">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-slate-500 hover:bg-white/5 hover:text-slate-300 transition-all"
        >
          <LogOut size={16} />
          Sair da conta
        </button>
      </div>
    </aside>
  );
}
