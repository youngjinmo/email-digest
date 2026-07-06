import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  checkAuth,
  consumeOAuthIntent,
  oauthLinkGithub,
  oauthLinkGoogle,
  oauthLoginGithub,
  oauthLoginGoogle,
  setAccessToken,
  type OAuthIntent,
} from '@/lib/api';
import { OAuthProvider } from '@/lib/oauth-provider.enum';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const OAuthCallbackPage = () => {
  const navigate = useNavigate();
  const { provider } = useParams<{ provider: string }>();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [oauthIntent] = useState<OAuthIntent>(() => consumeOAuthIntent());

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get('code');

      if (!code) {
        setError('Invalid OAuth callback: missing code');
        return;
      }

      if (!provider || !Object.values(OAuthProvider).includes(provider as OAuthProvider)) {
        setError(`Invalid OAuth provider: ${provider ?? 'missing'}`);
        return;
      }

      const oauthProvider = provider as OAuthProvider;
      const redirectUri = `${window.location.origin}/login/oauth/${oauthProvider}/callback`;

      try {
        if (oauthIntent === 'link') {
          if (oauthProvider === OAuthProvider.GITHUB) {
            await oauthLinkGithub(code, redirectUri);
          } else if (oauthProvider === OAuthProvider.GOOGLE) {
            await oauthLinkGoogle(code, redirectUri);
          } else {
            setError(`Unsupported OAuth provider: ${oauthProvider}`);
            return;
          }

          navigate('/mypage', {
            replace: true,
            state: { oauthLinked: oauthProvider },
          });
        } else {
          let result: { accessToken: string };

          if (oauthProvider === OAuthProvider.GITHUB) {
            result = await oauthLoginGithub(code, redirectUri);
          } else if (oauthProvider === OAuthProvider.GOOGLE) {
            result = await oauthLoginGoogle(code, redirectUri);
          } else {
            setError(`Unsupported OAuth provider: ${oauthProvider}`);
            return;
          }

          setAccessToken(result.accessToken);
          navigate('/dashboard', { replace: true });
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'OAuth login failed');
      }
    };

    handleCallback();
  }, [searchParams, provider, navigate, oauthIntent]);

  const handleErrorClose = () => {
    navigate(oauthIntent === 'link' && checkAuth() ? '/mypage' : '/login', { replace: true });
  };

  return (
    <div className="flex min-h-screen flex-col">
      <Header isLoggedIn={false} />
      <main className="flex flex-1 flex-col items-center justify-center px-4 py-16">
        {!error && (
          <div className="text-center space-y-4">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
            <p className="text-muted-foreground">Signing you in...</p>
          </div>
        )}
      </main>
      <Footer />

      <AlertDialog open={!!error} onOpenChange={() => handleErrorClose()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {oauthIntent === 'link' ? 'Link Failed' : 'Login Failed'}
            </AlertDialogTitle>
            <AlertDialogDescription>{error}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={handleErrorClose}>OK</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default OAuthCallbackPage;
