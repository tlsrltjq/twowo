import * as admin from 'firebase-admin';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';

const db = () => admin.firestore();

// BR-N3: 토큰 없으면 silent skip
async function sendExpoPush(token: string, title: string, body: string): Promise<void> {
  if (!token.startsWith('ExponentPushToken[')) return;
  await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ to: token, title, body, sound: 'default' }),
  });
}

async function getPartnerInfo(
  coupleId: string,
  senderId: string,
): Promise<{ token: string; senderName: string } | null> {
  const coupleDoc = await db().collection('couples').doc(coupleId).get();
  if (!coupleDoc.exists) return null;

  const memberIds: string[] = coupleDoc.data()?.memberIds ?? [];
  const recipientId = memberIds.find((id) => id !== senderId);
  if (!recipientId) return null;

  const [senderDoc, tokenDoc] = await Promise.all([
    db().collection('users').doc(senderId).get(),
    db().collection('userTokens').doc(recipientId).get(),
  ]);

  const token = tokenDoc.data()?.expoPushToken as string | undefined;
  if (!token) return null;

  const senderName = (senderDoc.data()?.displayName as string | undefined) ?? '상대방';
  return { token, senderName };
}

// BR-N1: 파트너 채팅 메시지 → 수신자 원격 푸시
export const onNewMessage = onDocumentCreated(
  'couples/{coupleId}/messages/{messageId}',
  async (event) => {
    const data = event.data?.data();
    if (!data) return;

    const coupleId = event.params.coupleId;
    const senderId = data.senderId as string;
    const text = (data.text as string | undefined) || '📷 사진';

    const info = await getPartnerInfo(coupleId, senderId);
    if (!info) return;

    const preview = text.length > 60 ? `${text.slice(0, 60)}…` : text;
    await sendExpoPush(info.token, info.senderName, preview);
  },
);

// BR-N2: 파트너 캘린더 일정 추가 → 수신자 원격 푸시
export const onNewCalendarEvent = onDocumentCreated(
  'calendarEvents/{eventId}',
  async (event) => {
    const data = event.data?.data();
    if (!data) return;

    const coupleId = data.coupleId as string;
    const createdBy = data.createdBy as string;
    const title = data.title as string;

    const info = await getPartnerInfo(coupleId, createdBy);
    if (!info) return;

    await sendExpoPush(info.token, info.senderName, `📅 새 일정: ${title}`);
  },
);
