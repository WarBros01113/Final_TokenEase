
"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function AdminLoginPageRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to the main login page
    router.replace('/login');
  }, [router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background">
      <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
      <p className="text-muted-foreground">Redirecting to login...</p>
    </div>
  );
}
