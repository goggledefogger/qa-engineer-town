import React, { useState, useEffect } from 'react';
import { auth } from './firebaseConfig'; // Import auth instance
import { onAuthStateChanged, signInAnonymously, User } from 'firebase/auth';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Listen for authentication state changes
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        // User is signed in
        setUser(currentUser);
        setLoading(false);
      } else {
        // No user is signed in, try to sign in anonymously
        try {
          const userCredential = await signInAnonymously(auth);
          setUser(userCredential.user);
          console.log('Signed in anonymously:', userCredential.user.uid);
        } catch (error) {
          console.error("Error signing in anonymously:", error);
          // Handle error appropriately, maybe show an error message
        }
        setLoading(false);
      }
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []); // Empty dependency array ensures this runs only once on mount

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <p className="text-xl text-gray-600">Loading...</p>
        {/* Or add a spinner component */}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
      <h1 className="text-3xl font-bold text-blue-600 mb-4">
        AI QA Engineer Assistant
      </h1>
      {user && (
        <p className="text-sm text-gray-500 mb-6">User ID: {user.uid} (Anonymous)</p>
      )}
      {/* TODO: Add URL Input Component */}
      <div className="w-full max-w-md bg-white p-6 rounded shadow">
          <p className="text-center">URL Input Area</p>
      </div>

    </div>
  );
}

export default App;
