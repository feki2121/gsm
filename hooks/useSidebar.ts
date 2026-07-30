import { useEffect, useState } from 'react';

export function useSidebar() {
  const [sidebarClasses, setSidebarClasses] = useState('ml-64');

  useEffect(() => {
    const updateSidebarClasses = () => {
      const sidebarState = document.getElementById('sidebar-state');
      if (sidebarState) {
        const classes = sidebarState.getAttribute('data-sidebar-classes');
        if (classes) {
          setSidebarClasses(classes);
        }
      }
    };

    // Observer les changements de la sidebar
    const observer = new MutationObserver(updateSidebarClasses);
    const sidebarState = document.getElementById('sidebar-state');
    if (sidebarState) {
      observer.observe(sidebarState, { attributes: true });
    }

    updateSidebarClasses();

    return () => observer.disconnect();
  }, []);

  return { sidebarClasses };
}