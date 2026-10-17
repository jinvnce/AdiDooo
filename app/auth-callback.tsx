import { Redirect } from 'expo-router';

// Google login returns here; the real work happens in login.tsx
export default function AuthCallback() {
  return <Redirect href="/" />;
}
