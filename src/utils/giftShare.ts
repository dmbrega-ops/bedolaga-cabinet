import type { SentGift } from '../api/gift';

/**
 * Claim artifacts for a sent gift.
 *
 * The backend hands out canonical ones: the code is `GIFT_` + 59 characters, which is
 * exactly Telegram's 64-character `start_param` limit. `SentGift.token` is only a
 * 12-character display id — the bot rejects any claim input shorter than 48 characters,
 * so links built from it handed the recipient a deep link the bot refused to open.
 *
 * The token-derived values survive purely as a fallback for backends that predate the
 * canonical fields; they are still short, so prefer the API values whenever present.
 */
export interface GiftClaimArtifacts {
  code: string;
  botLink: string | null;
  cabinetLink: string;
}

export function buildGiftClaimArtifacts(
  gift: Pick<SentGift, 'token' | 'gift_code' | 'bot_claim_url' | 'cabinet_claim_url'>,
  { botUsername, origin }: { botUsername: string; origin: string },
): GiftClaimArtifacts {
  const shortCode = gift.token.slice(0, 12);

  return {
    code: gift.gift_code ?? `GIFT-${shortCode}`,
    botLink:
      gift.bot_claim_url ??
      (botUsername ? `https://t.me/${botUsername}?start=GIFT_${shortCode}` : null),
    cabinetLink:
      gift.cabinet_claim_url ?? `${origin}/gift?tab=activate&code=${encodeURIComponent(shortCode)}`,
  };
}

type Translate = (key: string, options?: Record<string, unknown>) => string;

export interface GiftShareDetails {
  appName: string;
  senderName: string | null;
  tariffName: string | null;
  periodDays: number | null;
  deviceLimit?: number | null;
  giftMessage: string | null;
}

/**
 * Имя дарителя для текста подарка: получатель должен понять, от кого VPN.
 * Email-only пользователи без имени и username остаются анонимными.
 */
export function giftSenderName(
  user: { first_name: string | null; last_name: string | null; username: string | null } | null,
): string | null {
  if (!user) return null;
  const fullName = [user.first_name, user.last_name]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(' ');
  if (fullName) return fullName;
  return user.username ? `@${user.username}` : null;
}

/**
 * Сообщение, которое даритель копирует и пересылает получателю.
 *
 * Раньше это была одна строка «У меня есть подарок для тебя!» и две ссылки —
 * получатель не понимал, что это VPN, от кого он и что с ним делать.
 */
export function buildGiftShareMessage(
  t: Translate,
  details: GiftShareDetails,
  artifacts: { botLink: string | null; cabinetLink: string | null },
): string {
  const { appName, senderName, tariffName, periodDays, deviceLimit, giftMessage } = details;

  const summary = [
    tariffName ? `«${tariffName}»` : null,
    periodDays ? t('gift.shareDays', { count: periodDays }) : null,
    deviceLimit ? t('gift.deviceCount', { count: deviceLimit }) : null,
  ]
    .filter(Boolean)
    .join(' · ');
  const personalMessage = giftMessage?.trim();
  const giftDetails = [
    summary ? `📦 ${summary}` : null,
    personalMessage ? t('gift.sharePersonalMessage', { message: personalMessage }) : null,
  ].filter((line) => line !== null);

  return [
    senderName
      ? t('gift.shareTitleFrom', { sender: senderName, appName })
      : t('gift.shareTitle', { appName }),
    '',
    t('gift.shareAbout'),
    ...(giftDetails.length ? ['', ...giftDetails] : []),
    '',
    t('gift.shareHowTo'),
    artifacts.botLink ? t('gift.shareViaBot', { link: artifacts.botLink }) : null,
    artifacts.cabinetLink
      ? t(artifacts.botLink ? 'gift.shareViaCabinet' : 'gift.shareViaCabinetOnly', {
          link: artifacts.cabinetLink,
        })
      : null,
    '',
    t('gift.shareOutro'),
  ]
    .filter((line) => line !== null)
    .join('\n');
}
