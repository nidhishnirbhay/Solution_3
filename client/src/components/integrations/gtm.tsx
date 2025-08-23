import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';

interface GTMSettings {
  enabled: boolean;
  containerId: string;
}

interface IntegrationSettings {
  gtm: GTMSettings;
  whatsapp: any;
}

export function GTMIntegration() {
  const { data: settings } = useQuery<IntegrationSettings>({
    queryKey: ['/api/settings/integrations'],
    queryFn: async () => {
      const response = await fetch('/api/settings/integrations');
      return await response.json();
    }
  });

  useEffect(() => {
    if (!settings?.gtm?.enabled || !settings.gtm.containerId) {
      return;
    }

    const containerId = settings.gtm.containerId;

    // Check if GTM is already loaded
    if (window.dataLayer && document.querySelector(`script[src*="${containerId}"]`)) {
      return;
    }

    // Initialize dataLayer
    window.dataLayer = window.dataLayer || [];
    window.gtag = function() {
      window.dataLayer.push(arguments);
    };

    // Set initial config
    window.gtag('js', new Date());
    window.gtag('config', containerId);

    // Create and inject GTM script
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${containerId}`;
    
    // Add script to head
    document.head.appendChild(script);

    // Also inject the noscript iframe for users with JavaScript disabled
    const noscript = document.createElement('noscript');
    noscript.innerHTML = `<iframe src="https://www.googletagmanager.com/ns.html?id=${containerId}" height="0" width="0" style="display:none;visibility:hidden"></iframe>`;
    document.body.insertBefore(noscript, document.body.firstChild);

    console.log(`Google Tag Manager loaded with container ID: ${containerId}`);

    // Cleanup function
    return () => {
      // Remove script if component unmounts
      const existingScript = document.querySelector(`script[src*="${containerId}"]`);
      if (existingScript) {
        existingScript.remove();
      }
      
      // Remove noscript iframe
      const existingNoscript = document.querySelector('noscript iframe[src*="googletagmanager"]');
      if (existingNoscript?.parentElement) {
        existingNoscript.parentElement.remove();
      }
    };
  }, [settings]);

  // This component doesn't render anything visible
  return null;
}

// Extend the Window interface to include GTM globals
declare global {
  interface Window {
    dataLayer: any[];
    gtag: (...args: any[]) => void;
  }
}