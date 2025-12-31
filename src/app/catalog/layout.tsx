"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function CatalogLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const navItems = [
    { href: '/catalog/products', label: 'Products' },
    { href: '/catalog/operations', label: 'Operations' },
    { href: '/catalog/work-centers', label: 'Work Centers' },
    { href: '/catalog/operators', label: 'Operators' },
  ];

  return (
    <div>
      <div className="mb-6 border-b">
        <nav className="flex gap-4">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`px-4 py-2 border-b-2 transition-colors ${
                  isActive ? 'border-blue-600 text-blue-600 font-medium' : 'border-transparent hover:border-slate-300'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
      {children}
    </div>
  );
}

