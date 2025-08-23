import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MessageCircle, X } from 'lucide-react';

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
  const [isOpen, setIsOpen] = useState(false);

  const { data: settings } = useQuery<IntegrationSettings>({
    queryKey: ['/api/settings/integrations'],
    queryFn: async () => {
      const response = await fetch('/api/settings/integrations');
      return await response.json();
    }
  });

  if (!settings?.whatsapp?.enabled || !settings.whatsapp.phoneNumber) {
    return null;
  }

  const { phoneNumber, message, position } = settings.whatsapp;

  const handleOpenWhatsApp = () => {
    const encodedMessage = encodeURIComponent(message);
    const cleanPhoneNumber = phoneNumber.replace(/\s+/g, '').replace(/^\+/, '');
    const whatsappUrl = `https://wa.me/${cleanPhoneNumber}?text=${encodedMessage}`;
    
    window.open(whatsappUrl, '_blank');
    setIsOpen(false);
  };

  const positionClasses = {
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4'
  };

  return (
    <div className={`fixed ${positionClasses[position]} z-50`}>
      {/* Main WhatsApp Button */}
      <div
        className={`relative ${isOpen ? 'mb-2' : ''}`}
      >
        {/* Chat preview (when opened) */}
        {isOpen && (
          <div className="bg-white rounded-lg shadow-lg border mb-2 p-4 w-72 animate-in slide-in-from-bottom-2">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                  <MessageCircle className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="font-medium text-sm">WhatsApp Support</p>
                  <p className="text-xs text-green-600">Online</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 mb-3">
              <p className="text-sm text-gray-700">{message}</p>
            </div>
            <button
              onClick={handleOpenWhatsApp}
              className="w-full bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <MessageCircle className="w-4 h-4" />
              Start Chat
            </button>
          </div>
        )}

        {/* Floating WhatsApp Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="bg-green-500 hover:bg-green-600 text-white p-4 rounded-full shadow-lg transition-all duration-200 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-offset-2"
          aria-label="Open WhatsApp Chat"
        >
          {isOpen ? (
            <X className="w-6 h-6" />
          ) : (
            <MessageCircle className="w-6 h-6" />
          )}
        </button>

        {/* Pulse animation when closed */}
        {!isOpen && (
          <div className="absolute inset-0 bg-green-500 rounded-full animate-ping opacity-20"></div>
        )}
      </div>
    </div>
  );
}