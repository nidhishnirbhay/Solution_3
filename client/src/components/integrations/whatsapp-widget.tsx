import { useQuery } from '@tanstack/react-query';
import { FaWhatsapp } from 'react-icons/fa';
import { gtmEvent } from './gtm';
import { useAuth } from "@/contexts/auth-context";

interface WhatsAppSettings {
  enabled: boolean;
  phoneNumber: string;
  message: string;
  position: 'bottom-right' | 'bottom-left';
}

interface IntegrationSettings {
  gtm: any;
  whatsapp: WhatsAppSettings;
}

export function WhatsAppWidget() {
  const { data: settings } = useQuery<IntegrationSettings>({
    queryKey: ['/api/settings/integrations'],
    queryFn: async () => {
      const response = await fetch('/api/settings/integrations');
      return await response.json();
    }
  });

  // console.log('WhatsApp Widget - Settings:', settings);
  
  if (!settings?.whatsapp?.enabled || !settings.whatsapp.phoneNumber) {
    // console.log('WhatsApp Widget - Not rendered, enabled:', settings?.whatsapp?.enabled, 'phone:', settings?.whatsapp?.phoneNumber);
    return null;
  }
  
  // console.log('WhatsApp Widget - Rendering widget');

  const { phoneNumber, message, position } = settings.whatsapp;
  const { user } = useAuth();

  const handleOpenWhatsApp = () => {
    // Track WhatsApp widget click in GTM
    gtmEvent('whatsapp_widget_click', {
      phone_number: phoneNumber,
      message_preview: message.substring(0, 50),
      widget_position: position,
      click_source: 'whatsapp_widget',
      user_status: user ? `logged_in as ${user}` : 'guest',
    });
    
    // console.log('WhatsApp button clicked!');
    // console.log('Phone number:', phoneNumber);
    // console.log('Message:', message);
    
    const encodedMessage = encodeURIComponent(message);
    const cleanPhoneNumber = phoneNumber.replace(/\s+/g, '').replace(/^\+/, '');
    const whatsappUrl = `https://api.whatsapp.com/send/?phone=${cleanPhoneNumber}&text=${encodedMessage}&type=phone_number&app_absent=0`;
    
    // console.log('Generated WhatsApp URL:', whatsappUrl);
    window.open(whatsappUrl, '_blank');
  };

  const positionClasses = {
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4'
  };

  return (
    <div className={`fixed ${positionClasses[position]}`} style={{ zIndex: 9999 }}>
      {/* Direct WhatsApp Button */}
      <div className="relative">
        {/* Floating WhatsApp Button */}
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            // console.log('Button clicked!');
            handleOpenWhatsApp();
          }}
          className="bg-[#25D366] hover:bg-[#20b358] text-white p-4 rounded-full shadow-lg transition-all duration-200 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-offset-2 cursor-pointer"
          aria-label="Open WhatsApp Chat"
          style={{ zIndex: 9999 }}
        >
          <FaWhatsapp className="w-6 h-6" />
        </button>

        {/* Pulse animation */}
        <div className="absolute inset-0 bg-[#25D366] rounded-full animate-ping opacity-20 pointer-events-none"></div>
      </div>
    </div>
  );
}