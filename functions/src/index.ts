import * as admin from 'firebase-admin';

admin.initializeApp();

export { onNewCalendarEvent, onNewMessage } from './push';
export { scheduledCleanup } from './cleanup';
