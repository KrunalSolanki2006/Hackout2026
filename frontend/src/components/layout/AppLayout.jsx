import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopNav from './TopNav';
import Toast from '../Toast';

export default function AppLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem('carbotrack_sidebar_collapsed') === 'true';
    } catch (e) {
      return false;
    }
  });

  const toggleSidebar = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('carbotrack_sidebar_collapsed', String(next));
      } catch (e) {}
      return next;
    });
  };

  const location = useLocation();

  // Scroll to top on dashboard route change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [location.pathname]);

  // Global Dashboard Scroll & Entrance Reveal Animations
  useEffect(() => {
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) return;

    const intersectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-revealed');
            intersectionObserver.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.08,
        rootMargin: '0px 0px -40px 0px',
      }
    );

    const registerScrollElements = () => {
      const elements = document.querySelectorAll(
        'main .panel-card, main .panel-card-interactive, main [data-scroll-reveal], main .reveal-on-scroll'
      );

      elements.forEach((el, index) => {
        if (!el.classList.contains('reveal-on-scroll')) {
          el.classList.add('reveal-on-scroll');
          // Staggered reveal for sibling cards
          const staggerIndex = index % 4;
          if (!el.style.transitionDelay) {
            el.style.transitionDelay = `${staggerIndex * 70}ms`;
          }
          intersectionObserver.observe(el);
        }
      });
    };

    // Initial scan on mount/route transition
    registerScrollElements();

    // Listen for DOM changes when loading skeletons finish rendering real cards
    const mutationObserver = new MutationObserver(() => {
      registerScrollElements();
    });

    const mainEl = document.querySelector('main');
    if (mainEl) {
      mutationObserver.observe(mainEl, { childList: true, subtree: true });
    }

    return () => {
      intersectionObserver.disconnect();
      mutationObserver.disconnect();
    };
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-[#F7F8FC] text-gray-900 flex">
      {/* Navigation Sidebar */}
      <Sidebar
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
        collapsed={sidebarCollapsed}
        onToggleCollapse={toggleSidebar}
      />

      {/* Main Content Area - Expands and shifts left when sidebar shrinks */}
      <div className="flex-1 flex flex-col min-w-0 transition-all duration-300 ease-in-out">
        <TopNav
          onToggleMobileMenu={() => setMobileMenuOpen(true)}
          sidebarCollapsed={sidebarCollapsed}
          onToggleSidebar={toggleSidebar}
        />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto transition-all duration-300 ease-in-out">
          <Outlet />
        </main>
      </div>

      {/* Global Toast Stack */}
      <Toast />
    </div>
  );
}
