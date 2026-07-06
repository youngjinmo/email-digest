import { getOAuthGithubUrl, getOAuthGoogleUrl, setOAuthIntent } from '@/lib/api';

// TODO
// const APPLE_CLIENT_ID = import.meta.env.VITE_APPLE_CLIENT_ID as string;

declare global {
  interface Window {
    AppleID?: {
      auth: {
        init: (config: {
          clientId: string;
          scope: string;
          redirectURI: string;
          usePopup: boolean;
        }) => void;
        signIn: () => Promise<{
          authorization: {
            id_token: string;
            code: string;
          };
        }>;
      };
    };
  }
}

interface OAuthButtonsProps {
  onAppleLogin: (idToken: string) => void;
  isLoading: boolean;
}

const GitHubIcon = () => (
  <svg viewBox="0 0 24 24" width="60" height="60" fill="currentColor">
    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
  </svg>
);

// TODO
// const AppleIcon = () => (
//   <svg viewBox="0 0 24 24" width="60" height="60" fill="currentColor">
//     <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
//   </svg>
// );

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" width="60" height="60">
    <path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
      fill="#4285F4"
    />
    <path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    />
    <path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      fill="#FBBC05"
    />
    <path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      fill="#EA4335"
    />
  </svg>
);

// TODO
// function loadAppleScript(): Promise<void> {
//   return new Promise((resolve, reject) => {
//     if (window.AppleID) {
//       resolve();
//       return;
//     }
//     const script = document.createElement('script');
//     script.src =
//       'https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js';
//     script.onload = () => resolve();
//     script.onerror = () => reject(new Error('Failed to load Apple JS SDK'));
//     document.head.appendChild(script);
//   });
// }

const OAuthButtons = (props: OAuthButtonsProps) => {
  const origin = window.location.origin;

  const handleGithubLogin = async () => {
    try {
      setOAuthIntent('login');
      const url = await getOAuthGithubUrl(`${origin}/login/oauth/github/callback`);
      window.location.href = url;
    } catch (error) {
      console.error('Failed to get GitHub OAuth URL:', error);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setOAuthIntent('login');
      const url = await getOAuthGoogleUrl(`${origin}/login/oauth/google/callback`);
      window.location.href = url;
    } catch (error) {
      console.error('Failed to get Google OAuth URL:', error);
    }
  };

  // TODO
  // const handleAppleLogin = async () => {
  //   try {
  //     await loadAppleScript();
  //     if (!window.AppleID) throw new Error('Apple JS SDK not available');
  //     window.AppleID.auth.init({
  //       clientId: APPLE_CLIENT_ID,
  //       scope: 'email',
  //       redirectURI: `${origin}/login/oauth/apple/callback`,
  //       usePopup: true,
  //     });
  //     const response = await window.AppleID.auth.signIn();
  //     onAppleLogin(response.authorization.id_token);
  //   } catch (error) {
  //     // User cancelled or error occurred
  //     console.error('Apple Sign In failed:', error);
  //   }
  // };

  return (
    <div className="space-y-4">
      <div className="flex justify-center gap-4">
        <button
          onClick={handleGithubLogin}
          disabled={props.isLoading}
          title="Sign in with GitHub"
          className="cursor-pointer disabled:opacity-50"
        >
          <GitHubIcon />
        </button>
        {/* TODO: Enable Apple Login */}
        {/* <button
          onClick={handleAppleLogin}
          disabled={isLoading}
          title="Sign in with Apple"
          className="cursor-pointer disabled:opacity-50"
        >
          <AppleIcon />
        </button> */}
        <button
          onClick={handleGoogleLogin}
          disabled={props.isLoading}
          title="Sign in with Google"
          className="cursor-pointer disabled:opacity-50"
        >
          <GoogleIcon />
        </button>
      </div>
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">or</span>
        </div>
      </div>
    </div>
  );
};

export default OAuthButtons;
