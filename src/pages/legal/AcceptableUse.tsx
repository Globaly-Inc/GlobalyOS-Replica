import { Helmet } from 'react-helmet-async';
import { LegalDocumentLayout } from '@/components/legal/LegalDocumentLayout';
import { LegalSection, LegalSubSection, LegalList } from '@/components/legal/LegalSection';

const tableOfContents = [
  { id: 'overview', title: '1. Overview', level: 1 },
  { id: 'permitted-use', title: '2. Permitted Use', level: 1 },
  { id: 'prohibited-activities', title: '3. Prohibited Activities', level: 1 },
  { id: 'content-standards', title: '4. Content Standards', level: 1 },
  { id: 'ai-usage', title: '5. AI Usage Guidelines', level: 1 },
  { id: 'security', title: '6. Security Requirements', level: 1 },
  { id: 'enforcement', title: '7. Enforcement', level: 1 },
  { id: 'reporting', title: '8. Reporting Violations', level: 1 },
];

export default function AcceptableUse() {
  return (
    <>
      <Helmet>
        <title>Acceptable Use Policy | GlobalyOS</title>
        <meta name="description" content="GlobalyOS Acceptable Use Policy - Guidelines for appropriate use of our platform and services." />
        <link rel="canonical" href="https://www.globalyos.com/acceptable-use" />
      </Helmet>

      <LegalDocumentLayout
        title="Acceptable Use Policy"
        lastUpdated="January 18, 2026"
        effectiveDate="January 18, 2026"
        tableOfContents={tableOfContents}
      >
        <p className="text-lg mb-8">
          This Acceptable Use Policy ("AUP") outlines the rules and guidelines for using GlobalyOS services. 
          This policy is incorporated into and forms part of our Terms of Service. By using our Services, 
          you agree to comply with this policy.
        </p>

        <LegalSection id="overview" title="1. Overview">
          <LegalSubSection title="1.1 Purpose">
            <p>
              This policy ensures that all users can enjoy a safe, secure, and productive experience 
              with GlobalyOS. It protects our users, our infrastructure, and the broader internet community 
              from harmful or inappropriate use.
            </p>
          </LegalSubSection>

          <LegalSubSection title="1.2 Scope">
            <p>
              This policy applies to all users of GlobalyOS services, including employees, administrators, 
              and any other individuals who access the platform through your organization's account.
            </p>
          </LegalSubSection>

          <LegalSubSection title="1.3 Responsibility">
            <p>
              Organization Administrators are responsible for ensuring that all users within their 
              organization understand and comply with this policy. Each user is individually responsible 
              for their own conduct.
            </p>
          </LegalSubSection>
        </LegalSection>

        <LegalSection id="permitted-use" title="2. Permitted Use">
          <p>GlobalyOS is designed for legitimate business purposes. Permitted uses include:</p>

          <LegalSubSection title="2.1 Business Operations">
            <LegalList items={[
              'Managing human resources operations (attendance, leave, performance)',
              'Team collaboration and communication',
              'Document creation and knowledge management',
              'Project tracking and task management',
              'AI-assisted content creation and queries',
            ]} />
          </LegalSubSection>

          <LegalSubSection title="2.2 Organizational Administration">
            <LegalList items={[
              'Managing user accounts and permissions',
              'Configuring organizational settings',
              'Generating reports and analytics',
              'Integrating with approved third-party services',
            ]} />
          </LegalSubSection>
        </LegalSection>

        <LegalSection id="prohibited-activities" title="3. Prohibited Activities">
          <p>
            The following activities are strictly prohibited when using GlobalyOS services:
          </p>

          <LegalSubSection title="3.1 Illegal Activities">
            <LegalList items={[
              'Using the Services for any purpose that violates applicable laws or regulations',
              'Facilitating or promoting illegal activities',
              'Storing or transmitting content that infringes intellectual property rights',
              'Engaging in activities that violate privacy or data protection laws',
            ]} />
          </LegalSubSection>

          <LegalSubSection title="3.2 Harmful Conduct">
            <LegalList items={[
              'Harassing, threatening, or abusing other users',
              'Engaging in discriminatory behavior based on race, gender, religion, or other protected characteristics',
              'Bullying or intimidating colleagues or team members',
              'Creating a hostile or unsafe work environment through platform use',
            ]} />
          </LegalSubSection>

          <LegalSubSection title="3.3 Security Violations">
            <LegalList items={[
              'Sharing login credentials with unauthorized individuals',
              'Attempting to access accounts or data belonging to other users or organizations',
              'Circumventing or attempting to bypass security controls or access restrictions',
              'Uploading malware, viruses, or other malicious code',
              'Probing, scanning, or testing the vulnerability of our systems without authorization',
              'Interfering with or disrupting the integrity or performance of the Services',
            ]} />
          </LegalSubSection>

          <LegalSubSection title="3.4 System Abuse">
            <LegalList items={[
              'Attempting to circumvent usage limits or billing mechanisms',
              'Using automated tools (bots, scrapers) without explicit permission',
              'Consuming excessive resources that impact other users',
              'Reverse engineering or attempting to extract source code',
              'Reselling or redistributing access to the Services without authorization',
            ]} />
          </LegalSubSection>

          <LegalSubSection title="3.5 Data Misuse">
            <LegalList items={[
              'Exporting data for unauthorized purposes',
              'Using data obtained through the Services for competitive purposes',
              'Sharing confidential organizational data without authorization',
              'Using personal data in violation of applicable privacy laws',
            ]} />
          </LegalSubSection>
        </LegalSection>

        <LegalSection id="content-standards" title="4. Content Standards">
          <LegalSubSection title="4.1 User-Generated Content">
            <p>All content you create, upload, or share through the Services must:</p>
            <LegalList items={[
              'Be accurate and not misleading',
              'Respect the privacy and rights of others',
              'Comply with applicable laws and regulations',
              'Be appropriate for a professional workplace environment',
            ]} />
          </LegalSubSection>

          <LegalSubSection title="4.2 Prohibited Content">
            <p>You may not upload, create, or share content that:</p>
            <LegalList items={[
              'Is illegal, defamatory, or libelous',
              'Contains hate speech or promotes violence',
              'Is obscene, pornographic, or sexually explicit',
              'Infringes on intellectual property rights',
              'Contains personal information without proper consent',
              'Promotes illegal drugs, weapons, or harmful activities',
              'Is spam or unsolicited commercial content',
            ]} />
          </LegalSubSection>

          <LegalSubSection title="4.3 File Uploads">
            <p>
              Uploaded files must be legitimate business documents. Do not upload files that contain 
              malware, exceed storage limits, or violate content standards.
            </p>
          </LegalSubSection>
        </LegalSection>

        <LegalSection id="ai-usage" title="5. AI Usage Guidelines">
          <LegalSubSection title="5.1 Responsible AI Use">
            <p>When using AI features within GlobalyOS, you agree to:</p>
            <LegalList items={[
              'Use AI tools for legitimate business purposes only',
              'Review and verify all AI-generated content before use',
              'Not rely solely on AI outputs for critical decisions',
              'Maintain human oversight of AI-assisted processes',
            ]} />
          </LegalSubSection>

          <LegalSubSection title="5.2 Prohibited AI Uses">
            <p>You may not use AI features to:</p>
            <LegalList items={[
              'Generate content that is harmful, misleading, or discriminatory',
              'Create content that impersonates individuals or organizations',
              'Produce content that violates laws or regulations',
              'Attempt to extract or replicate AI model behavior',
              'Submit queries designed to produce inappropriate outputs',
              'Generate content for purposes outside your organization',
            ]} />
          </LegalSubSection>

          <LegalSubSection title="5.3 AI Accuracy">
            <p>
              AI-generated content may contain errors or inaccuracies. Users are responsible for 
              reviewing and correcting AI outputs. GlobalyOS is not responsible for decisions made 
              based on AI-generated content without proper human review.
            </p>
          </LegalSubSection>
        </LegalSection>

        <LegalSection id="security" title="6. Security Requirements">
          <LegalSubSection title="6.1 Account Security">
            <p>You must:</p>
            <LegalList items={[
              'Use strong, unique passwords for your account',
              'Enable multi-factor authentication when available',
              'Keep your login credentials confidential',
              'Log out when using shared or public devices',
              'Report any suspected security breaches immediately',
            ]} />
          </LegalSubSection>

          <LegalSubSection title="6.2 Data Protection">
            <p>You must:</p>
            <LegalList items={[
              'Handle personal and confidential data appropriately',
              'Follow your organization\'s data protection policies',
              'Only access data you are authorized to view',
              'Report any data breaches or suspicious activity',
            ]} />
          </LegalSubSection>
        </LegalSection>

        <LegalSection id="enforcement" title="7. Enforcement">
          <LegalSubSection title="7.1 Violation Detection">
            <p>
              We may monitor use of the Services to detect violations of this policy. We use both 
              automated systems and manual review to identify potential violations.
            </p>
          </LegalSubSection>

          <LegalSubSection title="7.2 Consequences">
            <p>Violations of this policy may result in:</p>
            <LegalList items={[
              'Warning notices',
              'Temporary suspension of access',
              'Removal of violating content',
              'Permanent termination of accounts',
              'Legal action where appropriate',
            ]} />
          </LegalSubSection>

          <LegalSubSection title="7.3 Organization Responsibility">
            <p>
              Organizations may be held responsible for repeated or severe violations by their users. 
              This may result in suspension or termination of the organization's subscription.
            </p>
          </LegalSubSection>

          <LegalSubSection title="7.4 Appeals">
            <p>
              If you believe enforcement action was taken in error, you may appeal by contacting 
              us at support@globalyos.com. We will review appeals and respond within a reasonable 
              timeframe.
            </p>
          </LegalSubSection>
        </LegalSection>

        <LegalSection id="reporting" title="8. Reporting Violations">
          <LegalSubSection title="8.1 How to Report">
            <p>
              If you become aware of a violation of this policy, please report it to:
            </p>
            <LegalList items={[
              'Your Organization Administrator (for internal matters)',
              'GlobalyOS Support at support@globalyos.com',
              'For urgent security issues: security@globalyos.com',
            ]} />
          </LegalSubSection>

          <LegalSubSection title="8.2 Information to Include">
            <p>When reporting a violation, please provide:</p>
            <LegalList items={[
              'Description of the violation',
              'Date and time of the incident',
              'Users or content involved (if known)',
              'Any supporting evidence or screenshots',
            ]} />
          </LegalSubSection>

          <LegalSubSection title="8.3 No Retaliation">
            <p>
              We prohibit retaliation against anyone who reports a violation in good faith. If you 
              experience retaliation, please report it immediately.
            </p>
          </LegalSubSection>
        </LegalSection>

        <div className="mt-10 p-6 bg-muted rounded-lg">
          <h3 className="font-semibold mb-2">Questions?</h3>
          <p className="text-muted-foreground">
            If you have questions about this Acceptable Use Policy, please contact us at{' '}
            <a href="mailto:support@globalyos.com" className="text-primary hover:underline">
              support@globalyos.com
            </a>.
          </p>
        </div>
      </LegalDocumentLayout>
    </>
  );
}
