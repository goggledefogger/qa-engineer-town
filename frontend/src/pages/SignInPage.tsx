import React, { useState } from 'react';
// import { useNavigate } from 'react-router-dom'; // No longer needed here
import { sendSignInLink } from '../authService';
import { Card } from '../components/ui'; // Assuming you have a Card component

const SignInPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [message, setMessage] = useState('');
  // const navigate = useNavigate(); // Removed as it's not used

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    if (!email) {
      setMessage('Please enter your email address.');
      return;
    }
    setIsSending(true);
    try {
      await sendSignInLink(email);
      // Message is set by sendSignInLink on success via alert
      setMessage('Sign-in link sent! Check your email. You can close this page.');
    } catch (error) {
      // Error message is handled by alert in sendSignInLink
      // setMessage('Failed to send sign-in link. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center items-center p-4 font-sans">
      <Card title="Sign In" className="w-full max-w-md shadow-xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">
              Email address
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              disabled={isSending}
              required
            />
          </div>
          <button
            type="submit"
            disabled={isSending}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {isSending ? 'Sending Link...' : 'Send Sign-In Link'}
          </button>
          {message && (
            <p className={`text-sm ${message.startsWith('Failed') || message.startsWith('Please enter') ? 'text-red-600' : 'text-green-600'}`}>
              {message}
            </p>
          )}
        </form>
      </Card>
    </div>
  );
};

export default SignInPage;
