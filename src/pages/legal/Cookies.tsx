import { LegalDocumentLayout } from '@/components/legal/LegalDocumentLayout';
import { LegalSection, LegalSubSection, LegalList } from '@/components/legal/LegalSection';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const tableOfContents = [
  { id: 'introduction', title: '1. Introduction', level: 1 },
  { id: 'what-are-cookies', title: '2. What Are Cookies', level: 1 },
  { id: 'how-we-use', title: '3. How We Use Cookies', level: 1 },
  { id: 'types-of-cookies', title: '4. Types of Cookies', level: 1 },
  { id: 'cookie-list', title: '5. Cookie List', level: 1 },
  { id: 'third-party', title: '6. Third-Party Cookies', level: 1 },
  { id: 'managing-cookies', title: '7. Managing Cookies', level: 1 },
  { id: 'consent', title: '8. Cookie Consent', level: 1 },
  { id: 'do-not-track', title: '9. Do Not Track', level: 1 },
  { id: 'updates', title: '10. Updates to This Policy', level: 1 },
  { id: 'contact', title: '11. Contact Us', level: 1 },
];

const essentialCookies = [
  { name: 'sb-auth-token', provider: 'GlobalyOS', purpose: 'User authentication and session management', type: 'Strictly Necessary', duration: 'Session' },
  { name: 'sb-refresh-token', provider: 'GlobalyOS', purpose: 'Secure token refresh for authentication', type: 'Strictly Necessary', duration: '7 days' },
  { name: 'csrf-token', provider: 'GlobalyOS', purpose: 'Cross-site request forgery protection', type: 'Strictly Necessary', duration: 'Session' },
  { name: 'org-context', provider: 'GlobalyOS', purpose: 'Current organization context for multi-tenant access', type: 'Strictly Necessary', duration: 'Session' },
];

const functionalCookies = [
  { name: 'theme', provider: 'GlobalyOS', purpose: 'User interface theme preference (light/dark)', type: 'Functional', duration: '1 year' },
  { name: 'locale', provider: 'GlobalyOS', purpose: 'Language and regional format preferences', type: 'Functional', duration: '1 year' },
  { name: 'timezone', provider: 'GlobalyOS', purpose: 'User timezone for accurate time display', type: 'Functional', duration: '1 year' },
  { name: 'sidebar-state', provider: 'GlobalyOS', purpose: 'Navigation sidebar collapse/expand state', type: 'Functional', duration: '1 year' },
  { name: 'table-preferences', provider: 'GlobalyOS', purpose: 'Table column visibility and sorting preferences', type: 'Functional', duration: '1 year' },
];

const analyticsCookies = [
  { name: '_ga', provider: 'Google Analytics', purpose: 'Distinguish unique users for usage analytics', type: 'Analytics', duration: '2 years' },
  { name: '_gid', provider: 'Google Analytics', purpose: 'Distinguish users for session analytics', type: 'Analytics', duration: '24 hours' },
  { name: '_gat', provider: 'Google Analytics', purpose: 'Throttle request rate for analytics', type: 'Analytics', duration: '1 minute' },
];

export default function Cookies() {
  return (
    <LegalDocumentLayout
      title="Cookie Policy"
      lastUpdated="January 15, 2026"
      effectiveDate="January 15, 2026"
      tableOfContents={tableOfContents}
    >
      <LegalSection id="introduction" title="1. Introduction">
        <p>
          This Cookie Policy explains how GlobalyOS ("we," "us," or "our") uses cookies and similar 
          technologies when you visit our website at www.globalyos.com or use our Services. This policy 
          should be read alongside our <a href="/privacy" className="text-primary hover:underline">Privacy Policy</a>, 
          which provides more information about how we handle your personal data.
        </p>
        <p>
          By continuing to use our website and Services, you consent to the use of cookies as described 
          in this policy. You can manage your cookie preferences at any time using the methods described 
          in Section 7.
        </p>
      </LegalSection>

      <LegalSection id="what-are-cookies" title="2. What Are Cookies">
        <p>
          Cookies are small text files that are placed on your device (computer, smartphone, or tablet) 
          when you visit a website. They are widely used to make websites work more efficiently, provide 
          a better user experience, and give website owners information about how their site is being used.
        </p>

        <LegalSubSection title="2.1 Types of Storage Technologies">
          <LegalList items={[
            '<strong>Cookies:</strong> Small text files stored in your browser that can be "session" (deleted when you close your browser) or "persistent" (remain until they expire or you delete them)',
            '<strong>Local Storage:</strong> A web storage mechanism that allows websites to store data locally in your browser with no expiration date',
            '<strong>Session Storage:</strong> Similar to local storage but data is cleared when you close your browser tab or window',
            '<strong>Pixels/Web Beacons:</strong> Tiny invisible images embedded in web pages or emails that help track user behavior and conversions',
          ]} />
        </LegalSubSection>

        <LegalSubSection title="2.2 First-Party vs Third-Party Cookies">
          <LegalList items={[
            '<strong>First-Party Cookies:</strong> Set by GlobalyOS directly. These are essential for our Services to function properly',
            '<strong>Third-Party Cookies:</strong> Set by external services we use, such as analytics providers or payment processors. These are subject to the third party\'s own privacy policies',
          ]} />
        </LegalSubSection>
      </LegalSection>

      <LegalSection id="how-we-use" title="3. How We Use Cookies">
        <p>We use cookies and similar technologies for the following purposes:</p>

        <LegalSubSection title="3.1 Essential Operations">
          <LegalList items={[
            'Authenticating users and maintaining secure sessions',
            'Remembering your organization context in our multi-tenant system',
            'Protecting against cross-site request forgery (CSRF) attacks',
            'Load balancing and routing requests to appropriate servers',
            'Detecting and preventing fraudulent activity',
          ]} />
        </LegalSubSection>

        <LegalSubSection title="3.2 Functionality and Preferences">
          <LegalList items={[
            'Remembering your language and timezone preferences',
            'Storing your interface preferences (theme, sidebar state, table layouts)',
            'Pre-filling forms with previously entered information',
            'Customizing your experience based on your role and permissions',
          ]} />
        </LegalSubSection>

        <LegalSubSection title="3.3 Analytics and Performance">
          <LegalList items={[
            'Understanding how users interact with our Services',
            'Identifying popular features and areas for improvement',
            'Measuring the effectiveness of our communications',
            'Diagnosing technical issues and improving performance',
          ]} />
        </LegalSubSection>
      </LegalSection>

      <LegalSection id="types-of-cookies" title="4. Types of Cookies We Use">
        <LegalSubSection title="4.1 Strictly Necessary Cookies">
          <p>
            These cookies are essential for our Services to function properly. They enable core 
            functionality such as security, authentication, and accessibility. You cannot opt out 
            of these cookies as the Services would not work without them.
          </p>
          <p className="mt-2">
            <strong>Examples:</strong> Authentication tokens, security tokens, session identifiers, 
            organization context cookies.
          </p>
        </LegalSubSection>

        <LegalSubSection title="4.2 Functional Cookies">
          <p>
            These cookies enable enhanced functionality and personalization. They remember your 
            preferences and settings to provide a more tailored experience. While not strictly 
            necessary, disabling them may result in reduced functionality.
          </p>
          <p className="mt-2">
            <strong>Examples:</strong> Theme preference, language selection, timezone settings, 
            UI state preferences.
          </p>
        </LegalSubSection>

        <LegalSubSection title="4.3 Analytics Cookies">
          <p>
            These cookies help us understand how visitors interact with our Services by collecting 
            and reporting information anonymously. This helps us improve our Services and identify 
            issues.
          </p>
          <p className="mt-2">
            <strong>Examples:</strong> Page view tracking, feature usage analytics, error monitoring.
          </p>
        </LegalSubSection>
      </LegalSection>

      <LegalSection id="cookie-list" title="5. Cookie List">
        <p className="mb-4">
          Below is a detailed list of the cookies we use, organized by category. This list is updated 
          periodically and may not reflect the most current cookies in use at any given time.
        </p>

        <LegalSubSection title="5.1 Strictly Necessary Cookies">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cookie Name</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead>Purpose</TableHead>
                  <TableHead>Duration</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {essentialCookies.map((cookie) => (
                  <TableRow key={cookie.name}>
                    <TableCell className="font-mono text-sm">{cookie.name}</TableCell>
                    <TableCell>{cookie.provider}</TableCell>
                    <TableCell>{cookie.purpose}</TableCell>
                    <TableCell>{cookie.duration}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </LegalSubSection>

        <LegalSubSection title="5.2 Functional Cookies">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cookie Name</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead>Purpose</TableHead>
                  <TableHead>Duration</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {functionalCookies.map((cookie) => (
                  <TableRow key={cookie.name}>
                    <TableCell className="font-mono text-sm">{cookie.name}</TableCell>
                    <TableCell>{cookie.provider}</TableCell>
                    <TableCell>{cookie.purpose}</TableCell>
                    <TableCell>{cookie.duration}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </LegalSubSection>

        <LegalSubSection title="5.3 Analytics Cookies">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cookie Name</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead>Purpose</TableHead>
                  <TableHead>Duration</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {analyticsCookies.map((cookie) => (
                  <TableRow key={cookie.name}>
                    <TableCell className="font-mono text-sm">{cookie.name}</TableCell>
                    <TableCell>{cookie.provider}</TableCell>
                    <TableCell>{cookie.purpose}</TableCell>
                    <TableCell>{cookie.duration}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </LegalSubSection>
      </LegalSection>

      <LegalSection id="third-party" title="6. Third-Party Cookies">
        <p>
          We use services from third parties that may set their own cookies on your device. These 
          third-party cookies are governed by the respective third party's privacy policy, not this 
          Cookie Policy.
        </p>

        <LegalSubSection title="6.1 Analytics Providers">
          <p>
            We use Google Analytics to understand how users interact with our Services. Google Analytics 
            uses cookies to collect information about your use of our website, which is transmitted to 
            and stored by Google.
          </p>
          <p className="mt-2">
            You can opt out of Google Analytics by installing the{' '}
            <a 
              href="https://tools.google.com/dlpage/gaoptout" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Google Analytics Opt-out Browser Add-on
            </a>.
          </p>
        </LegalSubSection>

        <LegalSubSection title="6.2 Payment Processors">
          <p>
            When you make payments through our Services, our payment processor (Stripe) may set cookies 
            to process your transaction securely and prevent fraud. These cookies are essential for 
            payment processing and cannot be disabled.
          </p>
        </LegalSubSection>

        <LegalSubSection title="6.3 Cloud Infrastructure">
          <p>
            Our Services are hosted on cloud infrastructure that may use cookies for load balancing, 
            security, and performance optimization. These are essential for service delivery.
          </p>
        </LegalSubSection>
      </LegalSection>

      <LegalSection id="managing-cookies" title="7. Managing Cookies">
        <p>
          You have several options for managing cookies. Please note that disabling certain cookies 
          may affect the functionality of our Services.
        </p>

        <LegalSubSection title="7.1 Browser Settings">
          <p>
            Most web browsers allow you to control cookies through their settings. You can typically 
            find these settings in the "Options," "Settings," or "Preferences" menu of your browser.
          </p>
          <LegalList items={[
            '<strong>Chrome:</strong> Settings → Privacy and Security → Cookies and other site data',
            '<strong>Firefox:</strong> Settings → Privacy & Security → Cookies and Site Data',
            '<strong>Safari:</strong> Preferences → Privacy → Cookies and website data',
            '<strong>Edge:</strong> Settings → Cookies and site permissions → Cookies and site data',
          ]} />
        </LegalSubSection>

        <LegalSubSection title="7.2 Opt-Out Links">
          <p>For analytics and advertising cookies, you can use these opt-out mechanisms:</p>
          <LegalList items={[
            '<a href="https://tools.google.com/dlpage/gaoptout" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline">Google Analytics Opt-out</a>',
            '<a href="https://youradchoices.com/" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline">Digital Advertising Alliance Opt-out</a>',
            '<a href="https://www.youronlinechoices.eu/" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline">European Interactive Digital Advertising Alliance</a>',
          ]} />
        </LegalSubSection>

        <LegalSubSection title="7.3 Mobile Devices">
          <p>
            On mobile devices, you can manage cookies and similar technologies through your device 
            settings. Both iOS and Android provide options to limit ad tracking and manage website data.
          </p>
        </LegalSubSection>

        <LegalSubSection title="7.4 Consequences of Disabling Cookies">
          <p>If you choose to disable cookies, please be aware that:</p>
          <LegalList items={[
            'You may not be able to sign in to our Services',
            'Your preferences and settings will not be remembered',
            'Some features may not function correctly or at all',
            'You may need to re-enter information on each visit',
          ]} />
        </LegalSubSection>
      </LegalSection>

      <LegalSection id="consent" title="8. Cookie Consent">
        <LegalSubSection title="8.1 How We Obtain Consent">
          <p>
            When you first visit our website, we display a cookie banner that informs you about our use 
            of cookies and allows you to accept or customize your cookie preferences. Your consent is 
            recorded and remembered for future visits.
          </p>
        </LegalSubSection>

        <LegalSubSection title="8.2 Withdrawing Consent">
          <p>
            You can withdraw your consent at any time by:
          </p>
          <LegalList items={[
            'Clearing cookies from your browser',
            'Using the cookie settings link in our website footer',
            'Contacting us at privacy@globalyos.com',
          ]} />
        </LegalSubSection>

        <LegalSubSection title="8.3 Strictly Necessary Cookies">
          <p>
            Strictly necessary cookies do not require consent as they are essential for the operation 
            of our Services. These cookies will be set regardless of your preferences.
          </p>
        </LegalSubSection>
      </LegalSection>

      <LegalSection id="do-not-track" title="9. Do Not Track">
        <p>
          Some browsers include a "Do Not Track" (DNT) feature that signals to websites that you do 
          not want your online activity tracked. There is currently no uniform standard for how websites 
          should respond to DNT signals.
        </p>
        <p>
          We currently do not respond to DNT signals. However, you can manage your tracking preferences 
          using the methods described in Section 7 of this policy.
        </p>
      </LegalSection>

      <LegalSection id="updates" title="10. Updates to This Policy">
        <p>
          We may update this Cookie Policy from time to time to reflect changes in our practices, 
          technologies, legal requirements, or other factors. When we make material changes, we will:
        </p>
        <LegalList items={[
          'Update the "Last Updated" date at the top of this policy',
          'Display a notice on our website for significant changes',
          'Send an email notification for material changes affecting your privacy (where required)',
        ]} />
        <p>
          We encourage you to review this policy periodically to stay informed about our use of cookies.
        </p>
      </LegalSection>

      <LegalSection id="contact" title="11. Contact Us">
        <p>
          If you have questions about this Cookie Policy or our use of cookies, please contact us:
        </p>
        <div className="mt-4 space-y-2">
          <p><strong>Email:</strong> privacy@globalyos.com</p>
          <p><strong>Website:</strong> www.globalyos.com/support</p>
        </div>
        <p className="mt-4">
          For more information about how we handle your personal data, please see our{' '}
          <a href="/privacy" className="text-primary hover:underline">Privacy Policy</a>.
        </p>
      </LegalSection>
    </LegalDocumentLayout>
  );
}
