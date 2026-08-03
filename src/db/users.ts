import { db } from '../lib/firebase-admin';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

export async function getOrCreateUser(uid: string, email: string) {
  const userRef = doc(db, 'users', uid);
  const userDoc = await getDoc(userRef);
  
  if (!userDoc.exists()) {
    const newUser = {
      id: uid,
      uid,
      email,
      createdAt: new Date(),
    };
    await setDoc(userRef, newUser);
    return newUser;
  }
  
  // Update email if it changed
  const userData = userDoc.data() as any;
  if (userData.email !== email) {
    await updateDoc(userRef, { email });
    return { ...userData, email };
  }
  
  return userData;
}

