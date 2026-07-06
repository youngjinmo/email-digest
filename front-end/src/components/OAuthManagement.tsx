import { useState, type ReactNode } from 'react';
import { Github, Link2, Unlink2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Card, CardContent } from '@/components/ui/card';
import {
  clearOAuthIntent,
  getOAuthGithubUrl,
  getOAuthGoogleUrl,
  setOAuthIntent,
  unlinkOAuth,
} from '@/lib/api';
import type { UserInfo } from '@/lib/api';
import { OAuthProvider } from '@/lib/oauth-provider.enum';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface OAuthManagementProps {
  userInfo: UserInfo;
  onUpdate: () => void;
}

type ProviderState = {
  provider: OAuthProvider.GITHUB | OAuthProvider.GOOGLE;
  linked: boolean;
};

type ProviderMeta = {
  label: string;
  icon: () => ReactNode;
  brandClassName: string;
  connectedBadgeClassName: string;
  disconnectedBadgeClassName: string;
};

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
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

const providerMeta: Record<ProviderState['provider'], ProviderMeta> = {
  [OAuthProvider.GITHUB]: {
    label: 'GitHub',
    icon: () => <Github className="h-5 w-5" />,
    brandClassName: 'bg-slate-950 text-white',
    connectedBadgeClassName: 'border-sky-200 bg-sky-100 text-sky-800',
    disconnectedBadgeClassName: 'opacity-50',
  },
  [OAuthProvider.GOOGLE]: {
    label: 'Google',
    icon: () => <GoogleIcon />,
    brandClassName: 'bg-white text-slate-900 border border-slate-200',
    connectedBadgeClassName: 'border-emerald-200 bg-emerald-100 text-emerald-800',
    disconnectedBadgeClassName: 'opacity-50',
  },
};

const OAuthManagement = ({ userInfo, onUpdate }: OAuthManagementProps) => {
  const [unlinkProvider, setUnlinkProvider] = useState<ProviderState['provider'] | null>(null);
  const [loadingProvider, setLoadingProvider] = useState<ProviderState['provider'] | null>(null);
  const { toast } = useToast();

  const providers: ProviderState[] = [
    { provider: OAuthProvider.GITHUB, linked: userInfo.ghOauth },
    { provider: OAuthProvider.GOOGLE, linked: userInfo.googOauth },
  ];

  const startLink = async (provider: ProviderState['provider']) => {
    const origin = window.location.origin;
    const callbackUri = `${origin}/login/oauth/${provider}/callback`;

    setLoadingProvider(provider);
    setOAuthIntent('link');

    try {
      const url =
        provider === OAuthProvider.GITHUB
          ? await getOAuthGithubUrl(callbackUri)
          : await getOAuthGoogleUrl(callbackUri);

      window.location.href = url;
    } catch (error) {
      clearOAuthIntent();
      toast({
        variant: 'destructive',
        title: 'Link failed',
        description: error instanceof Error ? error.message : 'Failed to start OAuth linking',
      });
      setLoadingProvider(null);
    }
  };

  const handleUnlink = async () => {
    if (!unlinkProvider) return;

    setLoadingProvider(unlinkProvider);
    try {
      await unlinkOAuth(unlinkProvider);
      toast({
        title: `${providerMeta[unlinkProvider].label} unlinked`,
        description: 'The provider has been disconnected from your account.',
      });
      onUpdate();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to unlink OAuth';
      toast({
        variant: 'destructive',
        title: 'Unlink failed',
        description: message,
      });
    } finally {
      setLoadingProvider(null);
      setUnlinkProvider(null);
    }
  };

  return (
    <>
      <div className="flex flex-col gap-4">
        {providers.map(({ provider, linked }) => {
          const meta = providerMeta[provider];
          const isLoading = loadingProvider === provider;

          return (
            <Card key={provider} className="overflow-hidden border-border/70 shadow-sm">
              <CardContent className="flex items-center justify-between gap-4 py-4">
                <div className="flex min-w-0 items-center gap-3">
                  <div
                    className={cn(
                      'flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
                      meta.brandClassName,
                    )}
                  >
                    {meta.icon()}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-base font-medium">{meta.label} Login</p>
                  </div>
                  <Badge
                    variant="default"
                    className={
                      linked ? meta.connectedBadgeClassName : meta.disconnectedBadgeClassName
                    }
                  >
                    {linked ? 'Connected' : 'Not connected'}
                  </Badge>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {linked ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setUnlinkProvider(provider)}
                      disabled={isLoading}
                    >
                      <Unlink2 className="h-4 w-4" />
                      Unlink
                    </Button>
                  ) : (
                    <Button size="sm" onClick={() => startLink(provider)} disabled={isLoading}>
                      <Link2 className="h-4 w-4" />
                      {isLoading ? 'Linking...' : 'Link'}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <AlertDialog open={!!unlinkProvider} onOpenChange={() => setUnlinkProvider(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unlink OAuth Account</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to unlink{' '}
              {unlinkProvider ? providerMeta[unlinkProvider].label : ''} from your account? You can
              link it again later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loadingProvider !== null}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleUnlink} disabled={loadingProvider !== null}>
              {loadingProvider !== null ? 'Unlinking...' : 'Unlink'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default OAuthManagement;
