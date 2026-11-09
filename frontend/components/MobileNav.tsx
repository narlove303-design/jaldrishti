'use client';

import React from 'react';
import { Home, Megaphone, MessageSquareWarning, LifeBuoy } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';

interface MobileNavProps {
  currentRoute: string;
  onNavigate: (route: string) => void;
  unreadCount?: number;
}

export default function MobileNav({ currentRoute, onNavigate, unreadCount = 0 }: MobileNavProps) {
  const { t } = useLanguage();

  const navItems = [
    { id: 'home', label: t('nav_home'), icon: Home },
    { id: 'notices', label: t('nav_notices'), icon: Megaphone, count: unreadCount },
    { id: 'complaints', label: t('nav_complaints'), icon: MessageSquareWarning },
    { id: 'advice', label: t('nav_advice'), icon: LifeBuoy },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-navy-900 border-t border-slate-200 dark:border-navy-800 shadow-lg px-2 py-1">
      <div className="flex justify-around items-center">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentRoute === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`flex flex-col items-center justify-center py-1.5 px-3 rounded-lg text-[10px] font-semibold transition ${
                isActive
                  ? 'text-teal-600 dark:text-teal-400 font-bold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <div className="relative">
                <Icon className="w-5 h-5 mb-0.5" />
                {item.count !== undefined && item.count > 0 && (
                  <span className="absolute -top-1 -right-2 px-1 text-[8px] font-bold rounded-full bg-rose-500 text-white">
                    {item.count}
                  </span>
                )}
              </div>
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
