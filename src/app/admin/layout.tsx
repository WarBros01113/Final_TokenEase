
"use client";
import type React from 'react';
import { AuthenticatedLayout } from '@/components/shared/AuthenticatedLayout';
import { LayoutDashboard, Users, CalendarPlus, ListChecks, ShieldAlert, Settings, UserCircle, CalendarClock } from 'lucide-react';

const adminNavItems = [
  { href: "/admin/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/admin/appointments", icon: CalendarClock, label: "Appointments" },
  { href: "/admin/doctors", icon: Users, label: "Manage Doctors" },
  { href: "/admin/slots", icon: CalendarPlus, label: "Manage Slots" },
  { href: "/admin/tests", icon: ListChecks, label: "Manage Tests" },
  { href: "/admin/penalties", icon: ShieldAlert, label: "Manage Penalties" },
  { href: "/admin/profile", icon: UserCircle, label: "Profile" },
  { href: "/admin/settings", icon: Settings, label: "Settings" },
];

export default function AdminAppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthenticatedLayout navItems={adminNavItems} userRole="admin">
      {children}
    </AuthenticatedLayout>
  );
}
