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
    if (window.dataLayer && document.querySelector(`script[src*="googletagmanager.com/gtm.js"]`)) {
      // console.log('GTM already loaded, skipping initialization');
      return;
    }

    // Initialize dataLayer BEFORE GTM script
    window.dataLayer = window.dataLayer || [];
    
    // GTM initialization function
    window.dataLayer.push({
      'gtm.start': new Date().getTime(),
      event: 'gtm.js'
    });

    // Create and inject GTM script (proper GTM format)
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtm.js?id=${containerId}`;
    
    // Add script to head
    document.head.appendChild(script);

    // Add noscript iframe for users with JavaScript disabled
    const noscript = document.createElement('noscript');
    const iframe = document.createElement('iframe');
    iframe.src = `https://www.googletagmanager.com/ns.html?id=${containerId}`;
    iframe.height = '0';
    iframe.width = '0';
    iframe.style.display = 'none';
    iframe.style.visibility = 'hidden';
    noscript.appendChild(iframe);
    
    // Insert noscript as first child of body
    document.body.insertBefore(noscript, document.body.firstChild);

    // console.log(`Google Tag Manager loaded with container ID: ${containerId}`);
    // console.log('GTM dataLayer initialized:', window.dataLayer);

    // Send initial page view event
    window.dataLayer.push({
      event: 'page_view',
      page_title: document.title,
      page_location: window.location.href
    });

    // Cleanup function
    return () => {
      // Remove GTM script if component unmounts
      const existingScript = document.querySelector(`script[src*="googletagmanager.com/gtm.js"]`);
      if (existingScript) {
        existingScript.remove();
      }
      
      // Remove noscript iframe
      const existingNoscript = document.querySelector('noscript iframe[src*="googletagmanager.com/ns.html"]');
      if (existingNoscript?.parentElement) {
        existingNoscript.parentElement.remove();
      }
    };
  }, [settings]);

  // This component doesn't render anything visible
  return null;
}

// GTM Event Helper Functions
export const gtmEvent = (eventName: string, parameters: Record<string, any> = {}) => {
  if (typeof window !== 'undefined' && window.dataLayer) {
    window.dataLayer.push({
      event: eventName,
      ...parameters
    });
    // console.log('GTM Event sent:', eventName, parameters);
  }
};

// Common event helpers
export const gtmPageView = (pageName: string, additionalData: Record<string, any> = {}) => {
  gtmEvent('page_view', {
    page_title: pageName,
    page_location: window.location.href,
    ...additionalData
  });
};

export const gtmUserAction = (action: string, category: string, label?: string, value?: number) => {
  gtmEvent('user_action', {
    action,
    category,
    label,
    value
  });
};

export const gtmConversion = (conversionType: string, conversionValue: number, additionalData: Record<string, any> = {}) => {
  gtmEvent('conversion', {
    conversion_type: conversionType,
    conversion_value: conversionValue,
    currency: 'INR',
    ...additionalData
  });
};

// Extend the Window interface to include GTM globals
declare global {
  interface Window {
    dataLayer: any[];
  }
}