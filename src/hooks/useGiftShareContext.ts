import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth';
import { brandingApi, type TelegramWidgetConfig } from '@/api/branding';
import { giftSenderName } from '@/utils/giftShare';

/** Всё, что нужно для текста подарка помимо самого подарка: бот, бренд и даритель. */
export function useGiftShareContext() {
  const user = useAuthStore((state) => state.user);

  // Bot username comes from the runtime branding config; the build-time env var
  // is only a fallback. Otherwise the "activate via bot" line silently vanishes
  // on deployments that don't set VITE_TELEGRAM_BOT_USERNAME at build time.
  const { data: widgetConfig } = useQuery<TelegramWidgetConfig>({
    queryKey: ['telegram-widget-config'],
    queryFn: brandingApi.getTelegramWidgetConfig,
    staleTime: 60000,
  });

  const { data: branding } = useQuery({
    queryKey: ['branding'],
    queryFn: brandingApi.getBranding,
    staleTime: 60000,
  });

  return {
    botUsername: widgetConfig?.bot_username || import.meta.env.VITE_TELEGRAM_BOT_USERNAME || '',
    appName: branding?.name || import.meta.env.VITE_APP_NAME || 'VPN',
    senderName: giftSenderName(user),
  };
}
