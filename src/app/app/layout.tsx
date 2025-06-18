
"use client";
import type React from 'react';
import { AuthenticatedLayout } from '@/components/shared/AuthenticatedLayout';
import { LayoutDashboard, CalendarDays, UserCircle, Settings } from 'lucide-react'; // Removed CreditCard

const patientNavItems = [
  { href: "/app/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/app/appointments", icon: CalendarDays, label: "Appointments" },
  // { href: "/app/chat", icon: MessageSquare, label: "Chat" }, // Chat link removed
  // { href: "/app/billing", icon: CreditCard, label: "Billing" }, // Billing link removed
  { href: "/app/profile", icon: UserCircle, label: "Profile" },
  { href: "/app/settings", icon: Settings, label: "Settings" },
];

export default function PatientAppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthenticatedLayout navItems={patientNavItems} userRole="patient">
      {children}
    </AuthenticatedLayout>
  );
}
