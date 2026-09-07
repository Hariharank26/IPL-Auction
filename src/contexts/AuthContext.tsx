import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import {
  auth,
  signInWithGoogle,
  signOutUser,
  syncUserProfile,
  updateManagerUsername,
  saveCompletedAuction,
  fetchUserAuctionHistory,
  UserProfile,
  SavedAuctionResult
} from '../services/firebase';

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  error: string | null;
  signIn: () => Promise<User | null>;
  logout: () => Promise<void>;
  updateManagerName: (name: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
  auctionHistory: SavedAuctionResult[];
  loadHistory: () => Promise<void>;
  saveAuctionResultToCloud: (data: Omit<SavedAuctionResult, 'completedAt'>) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [auctionHistory, setAuctionHistory] = useState<SavedAuctionResult[]>([]);

  // Listen to Firebase Auth state
  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const profile = await syncUserProfile(currentUser);
          setUserProfile(profile);
          // Preload recent history
          const hist = await fetchUserAuctionHistory(currentUser.uid);
          setAuctionHistory(hist);
        } catch (err: any) {
          console.error('Error syncing user profile:', err);
          setError(err?.message || 'Failed to sync user profile');
        }
      } else {
        setUserProfile(null);
        setAuctionHistory([]);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signIn = async (): Promise<User | null> => {
    setError(null);
    try {
      const loggedUser = await signInWithGoogle();
      if (loggedUser) {
        const profile = await syncUserProfile(loggedUser);
        setUserProfile(profile);
        const hist = await fetchUserAuctionHistory(loggedUser.uid);
        setAuctionHistory(hist);
      }
      return loggedUser;
    } catch (err: any) {
      console.error('Google Sign-in failed:', err);
      // Suppress user-closed popup error
      if (err?.code !== 'auth/popup-closed-by-user') {
        setError(err?.message || 'Sign in failed');
      }
      return null;
    }
  };

  const logout = async () => {
    try {
      await signOutUser();
      setUser(null);
      setUserProfile(null);
      setAuctionHistory([]);
    } catch (err: any) {
      console.error('Sign out error:', err);
      setError(err?.message || 'Sign out failed');
    }
  };

  const updateManagerName = async (name: string) => {
    if (!user) return;
    try {
      await updateManagerUsername(user.uid, name);
      setUserProfile((prev) => (prev ? { ...prev, managerUsername: name } : null));
    } catch (err: any) {
      console.error('Failed to update manager name:', err);
      setError(err?.message || 'Update failed');
    }
  };

  const refreshProfile = async () => {
    if (!user) return;
    try {
      const profile = await syncUserProfile(user);
      setUserProfile(profile);
      const hist = await fetchUserAuctionHistory(user.uid);
      setAuctionHistory(hist);
    } catch (err: any) {
      console.error('Refresh profile error:', err);
    }
  };

  const loadHistory = async () => {
    if (!user) return;
    try {
      const hist = await fetchUserAuctionHistory(user.uid);
      setAuctionHistory(hist);
    } catch (err: any) {
      console.error('Load history error:', err);
    }
  };

  const saveAuctionResultToCloud = async (data: Omit<SavedAuctionResult, 'completedAt'>): Promise<boolean> => {
    if (!user) return false;
    try {
      await saveCompletedAuction(user.uid, data);
      await refreshProfile();
      return true;
    } catch (err: any) {
      console.error('Failed to save auction result to cloud:', err);
      return false;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        userProfile,
        loading,
        error,
        signIn,
        logout,
        updateManagerName,
        refreshProfile,
        auctionHistory,
        loadHistory,
        saveAuctionResultToCloud
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
