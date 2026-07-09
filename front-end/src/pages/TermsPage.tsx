import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { checkAuth } from '@/lib/api';

const TermsPage = () => {
  const appName = import.meta.env.APP_NAME || 'Mailhub';
  const appDomain = import.meta.env.APP_DOMAIN || 'private-mailhub.com';
  const isLoggedIn = checkAuth();

  return (
    <div className="flex min-h-screen flex-col">
      <Header isLoggedIn={isLoggedIn} />

      <main className="flex flex-1 flex-col px-4 py-16">
        <div className="container mx-auto max-w-3xl space-y-10">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-3">Terms of Service</h1>
            <p className="text-sm text-muted-foreground">Last updated: February 2026</p>
          </div>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">1. Acceptance of Terms</h2>
            <p className="text-sm text-muted-foreground">
              By accessing or using {appName} ("the Service"), you agree to be bound by these Terms
              of Service. If you do not agree to these terms, please do not use the Service.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">2. Description of Service</h2>
            <p className="text-sm text-muted-foreground">
              {appName} is an email relay and privacy service that allows you to create masked email
              addresses to protect your real email from unwanted exposure. The Service forwards
              incoming emails from masked addresses to your real email address.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">3. Account Registration</h2>
            <p className="text-sm text-muted-foreground">
              To use the Service, you must create an account by providing a valid email address or
              by authenticating through a supported OAuth provider (GitHub or Google). You are
              responsible for maintaining the confidentiality of your account credentials and for
              all activities that occur under your account.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">4. Acceptable Use</h2>
            <p className="text-sm text-muted-foreground">You agree not to use the Service to:</p>
            <ul className="list-disc pl-6 text-sm text-muted-foreground space-y-1">
              <li>Send or facilitate spam, phishing, or other unsolicited messages.</li>
              <li>Engage in any illegal activity or violate any applicable laws.</li>
              <li>Impersonate any person or entity.</li>
              <li>Interfere with or disrupt the Service or its infrastructure.</li>
              <li>Attempt to gain unauthorized access to any part of the Service.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">5. Intellectual Property</h2>
            <p className="text-sm text-muted-foreground">
              {appName} is open-source software licensed under the{' '}
              <strong>GNU Affero General Public License v3.0 (AGPL-3.0)</strong>. The source code is
              available on{' '}
              <a
                href="https://github.com/private-mailhub/mailhub"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-foreground"
              >
                GitHub
              </a>
              . Use of the source code is subject to the terms of the AGPL-3.0 license.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">6. Disclaimer of Warranties</h2>
            <p className="text-sm text-muted-foreground">
              THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND,
              WHETHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF
              MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT. WE DO NOT
              WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, SECURE, OR ERROR-FREE.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">7. Limitation of Liability</h2>
            <p className="text-sm text-muted-foreground">
              TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT SHALL{' '}
              {appName.toUpperCase()} OR ITS OPERATORS BE LIABLE FOR ANY INDIRECT, INCIDENTAL,
              SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS OR REVENUES,
              WHETHER INCURRED DIRECTLY OR INDIRECTLY, OR ANY LOSS OF DATA, USE, GOODWILL, OR OTHER
              INTANGIBLE LOSSES RESULTING FROM YOUR USE OF THE SERVICE.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">8. Termination</h2>
            <p className="text-sm text-muted-foreground">
              We reserve the right to suspend or terminate your account at any time if you violate
              these Terms or engage in conduct that we determine to be harmful to the Service or
              other users. You may also delete your account at any time through your account
              settings. Upon termination, all associated data will be permanently deleted.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">9. Governing Law</h2>
            <p className="text-sm text-muted-foreground">
              These Terms shall be governed by and construed in accordance with the laws of the
              Commonwealth of Virginia, United States, without regard to its conflict of law
              provisions. Any disputes arising under these Terms shall be subject to the exclusive
              jurisdiction of the courts located in the Commonwealth of Virginia.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">10. Changes to Terms</h2>
            <p className="text-sm text-muted-foreground">
              We may revise these Terms from time to time. Changes will be posted on this page with
              an updated revision date. Your continued use of the Service after changes are posted
              constitutes acceptance of the revised Terms.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">11. Contact Us</h2>
            <p className="text-sm text-muted-foreground">
              If you have any questions about these Terms, please contact us at{' '}
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

export default TermsPage;
