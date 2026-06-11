'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, _hasHydrated } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (isAuthenticated) {
      const { user } = useAuthStore.getState();
      router.push(user?.role === 'admin' ? '/admin' : '/feed');
    }
  }, [isAuthenticated, router]);

  return (
    <div className="min-h-screen bg-gradient-to-tr from-[#9bb1ff] via-[#cbd6ff] to-[#f0f3ff] flex items-center justify-center p-0 sm:p-6 md:p-10 relative overflow-hidden font-sans">
      {/* Soft background glow elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-blue-300/30 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-indigo-300/30 blur-[120px] pointer-events-none" />

      {/* Realistic Mobile Viewport Device Frame */}
      <div className="w-full h-screen sm:h-[840px] sm:max-w-[400px] sm:rounded-[42px] bg-[#001254] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.4)] relative overflow-hidden border-0 sm:border-[8px] border-slate-900/10 flex flex-col">
        {/* Mobile Status Bar Simulation */}
        <div className="absolute top-0 inset-x-0 h-8 flex items-center justify-between px-6 z-50 pointer-events-none select-none text-white/40 text-xs font-semibold">
          <span>9:41</span>
          <div className="flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
              <path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9-4.03-9-9-9zm0 15c-3.31 0-6-2.69-6-6s2.69-6 6-6 6 2.69 6 6-2.69 6-6 6z"/>
            </svg>
            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
              <path d="M17 5H3a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2zm0 12H3V7h14v10z"/>
            </svg>
          </div>
        </div>

        {/* Content Viewport */}
        <div className="flex-1 flex flex-col overflow-y-auto scrollbar-hide relative">
          {children}
        </div>
      </div>
    </div>
  );
}

