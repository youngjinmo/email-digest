import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import UpdatePrimaryEmail from '@/components/UpdatePrimaryEmail';
import DeactivateAccount from '@/components/DeactivateAccount';
import OAuthManagement from '@/components/OAuthManagement';
import { getUserInfo, logout } from '@/lib/api';
import type { UserInfo } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { OAuthProvider } from '@/lib/oauth-provider.enum';

const MyPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const info = await getUserInfo();
        setUserInfo(info);
      } catch (error) {
        console.error('Failed to fetch user info:', error);
        await logout();
        navigate('/login', { replace: true });
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserInfo();
  }, [navigate]);

  useEffect(() => {
    const linkedProvider = (location.state as { oauthLinked?: OAuthProvider } | null)?.oauthLinked;
    if (!linkedProvider) return;

    const providerLabel = linkedProvider === OAuthProvider.GITHUB ? 'GitHub' : 'Google';
    toast({
      title: `${providerLabel} linked`,
      description: 'Your OAuth account is now connected.',
    });
    navigate('/mypage', { replace: true });
  }, [location.state, navigate, toast]);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const handleUserInfoUpdate = async () => {
    // Will be redirected to home after email change
  };

  const handleOAuthUpdate = async () => {
    try {
      const info = await getUserInfo();
      setUserInfo(info);
    } catch (error) {
      console.error('Failed to refresh user info:', error);
    }
  };

  const formatJoinedDate = (dateString: string) => {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header isLoggedIn={true} onLogout={handleLogout} />
        <main className="flex-1 container mx-auto px-4 py-8">
          <div className="text-center">Loading...</div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!userInfo) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header isLoggedIn={true} onLogout={handleLogout} />
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold">My Page</h1>
            <p className="text-muted-foreground">Manage your account settings and preferences</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Account Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Joined Date ☺️</p>
                  <p className="text-base">{formatJoinedDate(userInfo.createdAt)}</p>
                </div>
                <div hidden>
                  <p className="text-sm text-muted-foreground">Subscription Tier</p>
                  <p className="text-base font-medium">{userInfo.subscriptionTier}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Primary Email Management</CardTitle>
            </CardHeader>
            <CardContent>
              <UpdatePrimaryEmail
                currentEmail={userInfo.username}
                onUpdate={handleUserInfoUpdate}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>OAuth Management</CardTitle>
            </CardHeader>
            <CardContent>
              <OAuthManagement userInfo={userInfo} onUpdate={handleOAuthUpdate} />
            </CardContent>
          </Card>

          <Card className="border-destructive">
            <CardHeader>
              <CardTitle className="text-destructive">Deactivate Account</CardTitle>
            </CardHeader>
            <CardContent>
              <DeactivateAccount />
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default MyPage;
