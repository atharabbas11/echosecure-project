import React, { useState, useEffect } from 'react';
import { axiosInstance } from '../lib/axios';
import { useNavigate, useLocation } from 'react-router-dom';

const SetPasswordPage = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showResend, setShowResend] = useState(false);
  const [email, setEmail] = useState('');
  const [linkResent, setLinkResent] = useState(false); // New state to track if the link has been resent
  const navigate = useNavigate();
  const location = useLocation();
  const token = new URLSearchParams(location.search).get('token'); // Extract token from URL

  useEffect(() => {
    const checkTokenValidity = async () => {
      const token = new URLSearchParams(location.search).get('token');
      // console.log('Token from URL:', token);

      try {
        const response = await axiosInstance.get(`/auth/validate-token?token=${token}`);
        setEmail(response.data.email);
        // console.log('Email from token:', response.data.email);
      } catch (err) {
        // console.error('Token validation failed:', err);
        setShowResend(true);
      }
    };

    if (token) {
      checkTokenValidity();
    }
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!password || !confirmPassword) {
      setError('Both fields are required');
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    try {
      // Set the new password using the token
      await axiosInstance.post(`/auth/set-password?token=${token}`, { password });
      navigate('/login');
    } catch (err) {
      if (err.response?.data?.message === 'Invalid or expired token') {
        setShowResend(true);
      }
      setError(err.response?.data?.message || 'Error setting password. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendLink = async () => {
    setLoading(true);
    setError('');

    try {
      // Resend the password setup link using the token
      await axiosInstance.post('/auth/resend-password-link', { token });
      setError('A new password setup link has been sent to your email.');
      setShowResend(false);
      setLinkResent(true); // Set linkResent to true after resending
    } catch (err) {
      setError(err.response?.data?.message || 'Error resending link. Try again.');
    } finally {
      setLoading(false);
    }
  };

  // Redirect to login page or show a message if the link has been resent
  if (linkResent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-full max-w-md p-8 bg-white shadow-lg rounded-lg text-center">
          <h2 className="text-2xl font-bold text-gray-700 mb-6">
            Link Resent Successfully
          </h2>
          <p className="text-gray-600 mb-6">
            A new password setup link has been sent to your email. Please check your inbox.
          </p>
          <button
            onClick={() => navigate('/login')}
            className="w-full bg-blue-500 text-white py-2 rounded-md hover:bg-blue-600"
          >
            Go to Login Page
          </button>
        </div>
      </div>
    );
  }

  // Show "Invalid Link" message if the token is invalid and no resend option is available
  if (showResend && !linkResent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-full max-w-md p-8 bg-white shadow-lg rounded-lg text-center">
          <h2 className="text-2xl font-bold text-gray-700 mb-6">
            Invalid or Expired Link
          </h2>
          <p className="text-gray-600 mb-6">
            The password setup link is no longer valid. Please request a new link.
          </p>
          <button
            onClick={handleResendLink}
            className="w-full bg-blue-500 text-white py-2 rounded-md hover:bg-blue-600"
            disabled={loading}
          >
            {loading ? 'Resending...' : 'Resend Password Setup Link'}
          </button>
        </div>
      </div>
    );
  }

  // Show the password setup form if the token is valid
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md p-8 bg-white shadow-lg rounded-lg">
        <h2 className="text-2xl font-bold text-center text-gray-700 mb-6">
          Set Your Password
        </h2>

        {error && <div className="mb-4 text-red-500">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
            <input
              type="password"
              className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            className="w-full bg-blue-500 text-white py-2 rounded-md hover:bg-blue-600"
            disabled={loading}
          >
            {loading ? 'Loading...' : 'Set Password'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default SetPasswordPage;