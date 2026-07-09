import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { checkAuth } from '@/lib/api';

const PrivacyPage = () => {
  const appName = import.meta.env.APP_NAME || 'Mailhub';
  const appDomain = import.meta.env.APP_DOMAIN || 'private-mailhub.com';
  const isLoggedIn = checkAuth();

  return (
    <div className="flex min-h-screen flex-col">
      <Header isLoggedIn={isLoggedIn} />

      <main className="flex flex-1 flex-col px-4 py-16">
        <div className="container mx-auto max-w-3xl space-y-10">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-3">Privacy Policy</h1>
            <p className="text-sm text-muted-foreground">Last updated: February 2026</p>
          </div>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">1. Information We Collect</h2>
            <p className="text-sm text-muted-foreground">
              When you use {appName}, we may collect the following information:
            </p>
            <ul className="list-disc pl-6 text-sm text-muted-foreground space-y-1">
              <li>
                <strong>Email address</strong> — provided during registration, stored with
                AES-256-GCM encryption.
              </li>
              <li>
                <strong>OAuth identifiers</strong> — if you sign in via GitHub or Google, we receive
                your account ID from the respective provider.
              </li>
              <li>
                <strong>Usage data</strong> — pages visited, features used, and interactions within
                the service.
              </li>
              <li>
                <strong>Analytics data</strong> — collected via Google Analytics (e.g., device type,
                browser, approximate location).
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">2. How We Use Your Information</h2>
            <ul className="list-disc pl-6 text-sm text-muted-foreground space-y-1">
              <li>To provide and operate the email relay service.</li>
              <li>To authenticate your identity and secure your account.</li>
              <li>To send verification codes and service-related notifications.</li>
              <li>To improve the service based on aggregated usage patterns.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">3. Data Security</h2>
            <p className="text-sm text-muted-foreground">
              Your email address is encrypted at rest using <strong>AES-256-GCM</strong> encryption.
              Access tokens are stored in localStorage and refresh tokens are stored in HTTP-only
              cookies. We follow industry-standard practices to protect your data, but no method of
              transmission or storage is 100% secure.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">4. Third-Party Services</h2>
            <p className="text-sm text-muted-foreground">
              We integrate with the following third-party services:
            </p>
            <ul className="list-disc pl-6 text-sm text-muted-foreground space-y-1">
              <li>
                <strong>GitHub OAuth</strong> — for authentication. Subject to{' '}
                <a
                  href="https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-foreground"
                >
                  GitHub's Privacy Statement
                </a>
                .
              </li>
              <li>
                <strong>Google OAuth</strong> — for authentication. Subject to{' '}
                <a
                  href="https://policies.google.com/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-foreground"
                >
                  Google's Privacy Policy
                </a>
                .
              </li>
              <li>
                <strong>Google Analytics</strong> — for aggregated usage analytics. Subject to{' '}
                <a
                  href="https://policies.google.com/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-foreground"
                >
                  Google's Privacy Policy
                </a>
                .
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">5. Cookies and Local Storage</h2>
            <p className="text-sm text-muted-foreground">
              We use <strong>HTTP-only cookies</strong> to store refresh tokens for secure
              authentication. We also use <strong>localStorage</strong> to store access tokens.
              Google Analytics may set additional cookies to collect anonymized usage data.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">6. Data Retention</h2>
            <p className="text-sm text-muted-foreground">
              We retain your account data for as long as your account is active. When you delete
              your account, all associated data — including your encrypted email address and OAuth
              identifiers — is permanently removed from our systems.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">7. Your Rights</h2>
            <p className="text-sm text-muted-foreground">You have the right to:</p>
            <ul className="list-disc pl-6 text-sm text-muted-foreground space-y-1">
              <li>Access the personal data we hold about you.</li>
              <li>Request correction of inaccurate data.</li>
              <li>Delete your account and all associated data.</li>
              <li>Revoke OAuth connections at any time from your account settings.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">8. Open Source</h2>
            <p className="text-sm text-muted-foreground">
              {appName} is open-source software licensed under <strong>AGPL-3.0</strong>. You can
              read the license on{' '}
              <a
                href="https://github.com/private-mailhub/mailhub?tab=AGPL-3.0-1-ov-file"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-foreground"
              >
                GitHub
              </a>
              .
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">9. Changes to This Policy</h2>
            <p className="text-sm text-muted-foreground">
              We may update this Privacy Policy from time to time. Changes will be posted on this
              page with an updated revision date. Continued use of the service after changes
              constitutes acceptance of the revised policy.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">10. Contact Us</h2>
            <p className="text-sm text-muted-foreground">
              If you have any questions about this Privacy Policy, please contact us at{' '}
              <a href={`mailto:contact@${appDomain}`} className="underline hover:text-foreground">
                contact@{appDomain}
              </a>
              .
            </p>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default PrivacyPage;
