// ============================================================
//  Firebase settings for the live chat.
//  Fill these in from: Firebase console -> Project settings ->
//  Your apps -> Web app -> "firebaseConfig".
//  These values are safe to publish; the security rules protect the data.
//  While apiKey is empty, the chat bubble is hidden.
// ============================================================
export const firebaseConfig = {
  apiKey: 'AIzaSyBl5PzpYJgXfVh4NGHiSq_DYXYd_9DVCKc',
  authDomain: 'dynamite-d6601.firebaseapp.com',
  projectId: 'dynamite-d6601',
  appId: '1:500239757346:web:b4f45ef228306c628eda7b',
}

// Google accounts allowed to open admin.html and reply to customers.
// Must match the list inside firestore.rules.
export const adminEmails = ['quangthong3005@gmail.com']
