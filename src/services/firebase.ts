import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User,
  Auth
} from 'firebase/auth';
import {
  getFirestore,
  Firestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  serverTimestamp,
  addDoc
} from 'firebase/firestore';
import firebaseConfigRaw from '../../firebase-applet-config.json';
import { TeamId, PurchasedPlayer } from '../types/auction';

// Safe extraction of firebase config
export interface FirebaseAppletConfig {
  projectId: string;
  appId: string;
  apiKey: string;
  authDomain: string;
  firestoreDatabaseId?: string;
  storageBucket?: string;
  messagingSenderId?: string;
  measurementId?: string;
  oAuthClientId?: string;
  recaptchaSiteKey?: string;
}

const firebaseConfig = firebaseConfigRaw as FirebaseAppletConfig;

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;

try {
  app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  auth = getAuth(app);
  
  // Custom firestore database ID support
  if (firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)') {
    db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
  } else {
    db = getFirestore(app);
  }
} catch (error) {
  console.error('Failed to initialize Firebase:', error);
}

export { app, auth, db };

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

export interface UserCareerStats {
  auctionsPlayed: number;
  auctionsWon: number;
  bestTop5Score: number;
  totalSpentCr: number;
  totalPlayersBought: number;
}

export interface UserProfile {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  managerUsername: string;
  favoriteTeamId?: TeamId;
  stats: UserCareerStats;
  createdAt?: any;
  updatedAt?: any;
}

export interface SavedAuctionResult {
  id?: string;
  auctionId: string;
  completedAt: any;
  gameMode: 'SINGLE_PLAYER' | 'MULTIPLAYER';
  userTeamId: TeamId;
  userRank: number;
  isChampion: boolean;
  userTop5Score: number;
  userPurseRemaining: number;
  championTeamId: TeamId;
  championManager: string;
  championTop5Score: number;
  top5Picks: Array<{
    name: string;
    role: string;
    overallRating: number;
    price: number;
    isIndian: boolean;
  }>;
  allStandings: Array<{
    teamId: TeamId;
    teamName: string;
    managerName: string;
    rank: number;
    top5Score: number;
    squadCount: number;
    remainingPurse: number;
    isChampion: boolean;
  }>;
}

/** Authenticate with Google popup */
export async function signInWithGoogle(): Promise<User | null> {
  if (!auth) throw new Error('Firebase Auth is not initialized');
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
}

/** Sign out */
export async function signOutUser(): Promise<void> {
  if (!auth) return;
  await firebaseSignOut(auth);
}

/** Fetch or initialize user profile in Firestore */
export async function syncUserProfile(user: User, customManagerName?: string): Promise<UserProfile> {
  if (!db) throw new Error('Firestore is not initialized');
  
  const userRef = doc(db, 'users', user.uid);
  const userSnap = await getDoc(userRef);

  if (userSnap.exists()) {
    const data = userSnap.data() as UserProfile;
    // If user provided a new valid custom manager name, update it
    if (customManagerName && customManagerName.trim().length >= 5 && customManagerName !== data.managerUsername) {
      const updatedUsername = customManagerName.trim();
      await updateDoc(userRef, {
        managerUsername: updatedUsername,
        updatedAt: serverTimestamp()
      });
      return { ...data, managerUsername: updatedUsername };
    }
    return data;
  }

  // Generate initial manager username from Google display name or fallback
  let initialManagerName = customManagerName?.trim() || '';
  if (initialManagerName.length < 5) {
    const rawName = user.displayName?.split(' ')[0] || user.email?.split('@')[0] || 'Manager';
    initialManagerName = rawName.length >= 5 ? rawName : `${rawName}_2026`;
  }

  const newProfile: UserProfile = {
    uid: user.uid,
    displayName: user.displayName,
    email: user.email,
    photoURL: user.photoURL,
    managerUsername: initialManagerName,
    favoriteTeamId: 'MI',
    stats: {
      auctionsPlayed: 0,
      auctionsWon: 0,
      bestTop5Score: 0,
      totalSpentCr: 0,
      totalPlayersBought: 0
    },
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };

  await setDoc(userRef, newProfile);
  return newProfile;
}

/** Update user's manager username */
export async function updateManagerUsername(uid: string, newName: string): Promise<void> {
  if (!db) return;
  const userRef = doc(db, 'users', uid);
  await updateDoc(userRef, {
    managerUsername: newName.trim(),
    updatedAt: serverTimestamp()
  });
}

/** Save completed auction to user's history and update career stats */
export async function saveCompletedAuction(
  uid: string,
  auctionData: Omit<SavedAuctionResult, 'completedAt'>
): Promise<void> {
  if (!db) return;

  const historyCollection = collection(db, 'users', uid, 'auctionHistory');
  const userDocRef = doc(db, 'users', uid);

  // 1. Add record to subcollection
  await addDoc(historyCollection, {
    ...auctionData,
    completedAt: serverTimestamp()
  });

  // 2. Also record in global auctions feed
  try {
    const globalAuctionsRef = collection(db, 'auctions');
    await addDoc(globalAuctionsRef, {
      auctionId: auctionData.auctionId,
      gameMode: auctionData.gameMode,
      championTeamId: auctionData.championTeamId,
      championManager: auctionData.championManager,
      championScore: auctionData.championTop5Score,
      createdByUid: uid,
      createdAt: serverTimestamp(),
      standings: auctionData.allStandings
    });
  } catch (err) {
    console.warn('Could not post to global auctions feed:', err);
  }

  // 3. Update User's Aggregated Career Stats
  try {
    const userSnap = await getDoc(userDocRef);
    if (userSnap.exists()) {
      const currentData = userSnap.data() as UserProfile;
      const currentStats = currentData.stats || {
        auctionsPlayed: 0,
        auctionsWon: 0,
        bestTop5Score: 0,
        totalSpentCr: 0,
        totalPlayersBought: 0
      };

      const userSpent = 5000 - auctionData.userPurseRemaining;
      const userSpentCr = Number((userSpent / 100).toFixed(2));
      const isWon = auctionData.isChampion ? 1 : 0;

      const updatedStats: UserCareerStats = {
        auctionsPlayed: (currentStats.auctionsPlayed || 0) + 1,
        auctionsWon: (currentStats.auctionsWon || 0) + isWon,
        bestTop5Score: Math.max(currentStats.bestTop5Score || 0, auctionData.userTop5Score || 0),
        totalSpentCr: Number(((currentStats.totalSpentCr || 0) + userSpentCr).toFixed(2)),
        totalPlayersBought: (currentStats.totalPlayersBought || 0) + (auctionData.top5Picks?.length || 5)
      };

      await updateDoc(userDocRef, {
        stats: updatedStats,
        updatedAt: serverTimestamp()
      });
    }
  } catch (err) {
    console.error('Error updating user career stats:', err);
  }
}

/** Get list of past auctions for a user */
export async function fetchUserAuctionHistory(uid: string): Promise<SavedAuctionResult[]> {
  if (!db) return [];
  try {
    const historyCollection = collection(db, 'users', uid, 'auctionHistory');
    const q = query(historyCollection, orderBy('completedAt', 'desc'), limit(20));
    const snap = await getDocs(q);

    return snap.docs.map((docSnap) => ({
      id: docSnap.id,
      ...(docSnap.data() as any)
    }));
  } catch (err) {
    console.error('Error fetching auction history:', err);
    return [];
  }
}

/** Get global hall of fame / top scores */
export async function fetchGlobalLeaderboard(): Promise<any[]> {
  if (!db) return [];
  try {
    const globalRef = collection(db, 'auctions');
    const q = query(globalRef, orderBy('createdAt', 'desc'), limit(15));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.error('Error fetching global leaderboard:', err);
    return [];
  }
}
