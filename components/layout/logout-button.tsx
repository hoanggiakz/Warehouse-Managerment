'use client';

import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function LogoutButton() {
  const router = useRouter();

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  };

  return (
    <Button variant="outline" onClick={handleLogout} className="gap-2">
      <LogOut className="size-4" />
      <span className="hidden md:inline">Log out</span>
    </Button>
  );
}
