import { Helmet } from 'react-helmet-async';
import { LegalDocumentLayout } from '@/components/legal/LegalDocumentLayout';
import { LegalSection, LegalSubSection, LegalList } from '@/components/legal/LegalSection';

const tableOfContents = [
  { id: 'introduction', title: '1. Introduction', level: 1 },
  { id: 'information-collected', title: '2. Information We Collect', level: 1 },
  { id: 'how-we-use', title: '3. How We Use Information', level: 1 },
  { id: 'legal-bases', title: '4. Legal Bases for Processing', level: 1 },
  { id: 'information-sharing', title: '5. Information Sharing', level: 1 },
  { id: 'data-retention', title: '6. Data Retention', level: 1 },
  { id: 'data-security', title: '7. Data Security', level: 1 },
  { id: 'your-rights', title: '8. Your Rights', level: 1 },
  { id: 'international-transfers', title: '9. International Transfers', level: 1 },
  { id: 'cookies', title: '10. Cookies and Tracking', level: 1 },
  { id: 'ai-processing', title: '11. AI and Automated Processing', level: 1 },
  { id: 'children', title: '12. Children\'s Privacy', level: 1 },
  { id: 'changes', title: '13. Changes to Policy', level: 1 },
  { id: 'contact', title: '14. Contact Us', level: 1 },
];

export default function Privacy() {
  return (
    <>
      <Helmet>
        <title>Privacy Policy | GlobalyOS</title>
        <meta name="description" content="GlobalyOS Privacy Policy - Learn how we collect, use, and protect your personal information." />
        <link rel="canonical" href="https://www.globalyos.com/privacy" />
      </Helmet>

      <LegalDocumentLayout
        title="Privacy Policy"
        lastUpdated="January 18, 2026"
        effectiveDate="January 18, 2026"
        tableOfContents={tableOfContents}
      >
        <p className="text-lg mb-8">
          At GlobalyOS, we are committed to protecting your privacy and ensuring the security of your personal 
          information. This Privacy Policy explains how we collect, use, disclose, and safeguard your information 
          when you use our platform and services.
        </p>

        <LegalSection id="introduction" title="1. Introduction">
          <LegalSubSection title="1.1 About This Policy">
            <p>
              This Privacy Policy applies to all users of GlobalyOS services accessible through www.globalyos.com 
              and related applications. By using our Services, you consent to the collection, use, and disclosure 
              of your information as described in this policy.
            </p>
          </LegalSubSection>

          <LegalSubSection title="1.2 Controller and Processor Roles">
            <p>
              GlobalyOS operates in two capacities depending on the context:
            </p>
            <LegalList items={[
              'Data Controller: For data we collect directly from you about your use of our platform (e.g., account information, usage data)',
              'Data Processor: For data you or your organization store within the Services (e.g., employee records, documents). In this case, your organization is the Data Controller',
            ]} />
          </LegalSubSection>

          <LegalSubSection title="1.3 Contact Information">
            <p>
              <strong>GlobalyOS</strong><br />
              Email: privacy@globalyos.com<br />
              Website: www.globalyos.com
            </p>
          </LegalSubSection>
        </LegalSection>

        <LegalSection id="information-collected" title="2. Information We Collect">
          <LegalSubSection title="2.1 Account Information">
            <p>When you create an account or organization, we collect:</p>
            <LegalList items={[
              'Full name and email address',
              'Phone number (required for organization registration)',
              'Organization name, industry, size, and country',
              'Job title and department',
              'Profile photo (optional)',
              'Timezone and language preferences',
            ]} />
          </LegalSubSection>

          <LegalSubSection title="2.2 Employment and HR Data">
            <p>
              Your organization may use GlobalyOS to store and manage employee data. This data is processed 
              by GlobalyOS on behalf of your organization (the Data Controller) and may include:
            </p>
            <LegalList items={[
              'Personal details (date of birth, emergency contacts, address)',
              'Employment information (start date, position history, employment type)',
              'Compensation data (salary, benefits)',
              'Performance data (reviews, KPIs, OKRs)',
              'Attendance and leave records',
              'Documents (ID copies, contracts, certificates)',
            ]} />
          </LegalSubSection>

          <LegalSubSection title="2.3 Usage Data">
            <p>We automatically collect information about how you interact with our Services:</p>
            <LegalList items={[
              'Pages visited and features used',
              'Actions taken within the platform',
              'Device type, browser, and operating system',
              'IP address and approximate geographic location',
              'Session duration and interaction patterns',
              'Error logs and performance data',
            ]} />
          </LegalSubSection>

          <LegalSubSection title="2.4 Content Data">
            <p>We store content you create or upload to the Services:</p>
            <LegalList items={[
              'Posts, comments, and reactions in team feeds',
              'Wiki pages and knowledge base articles',
              'Chat messages and attachments',
              'Files and documents',
              'AI queries and generated content',
            ]} />
          </LegalSubSection>

          <LegalSubSection title="2.5 Attendance and Location Data">
            <p>If your organization enables attendance features:</p>
            <LegalList items={[
              'Check-in and check-out timestamps',
              'Location data when QR code scanning is enabled (as configured by your organization)',
              'Office assignment and work schedule information',
            ]} />
          </LegalSubSection>

          <LegalSubSection title="2.6 Payment Information">
            <p>
              Payment information (credit card numbers, billing addresses) is collected and processed 
              by our third-party payment processors. We do not store complete payment card information 
              on our servers.
            </p>
          </LegalSubSection>
        </LegalSection>

        <LegalSection id="how-we-use" title="3. How We Use Information">
          <LegalSubSection title="3.1 Providing Services">
            <LegalList items={[
              'Creating and managing your account',
              'Authenticating users and controlling access',
              'Delivering the features and functionality of the Services',
              'Processing attendance, leave, and HR operations',
              'Generating reports and analytics for your organization',
            ]} />
          </LegalSubSection>

          <LegalSubSection title="3.2 Improving Services">
            <LegalList items={[
              'Analyzing usage patterns to enhance features',
              'Identifying and fixing bugs and errors',
              'Developing new features and improvements',
              'Conducting research and analysis',
            ]} />
          </LegalSubSection>

          <LegalSubSection title="3.3 Communications">
            <LegalList items={[
              'Sending system notifications and alerts',
              'Responding to support requests',
              'Providing product updates and announcements',
              'Sending transactional emails (invoices, confirmations)',
            ]} />
          </LegalSubSection>

          <LegalSubSection title="3.4 Business Operations">
            <LegalList items={[
              'Processing subscription payments and billing',
              'Preventing fraud and unauthorized access',
              'Enforcing our Terms of Service',
              'Complying with legal obligations',
            ]} />
          </LegalSubSection>
        </LegalSection>

        <LegalSection id="legal-bases" title="4. Legal Bases for Processing">
          <p>We process personal data based on the following legal grounds under GDPR and similar laws:</p>

          <LegalSubSection title="4.1 Performance of Contract">
            <p>
              Processing necessary to provide the Services you or your organization have requested, 
              including account management, feature access, and customer support.
            </p>
          </LegalSubSection>

          <LegalSubSection title="4.2 Legitimate Interests">
            <p>
              Processing for our legitimate business interests, including service improvement, security, 
              fraud prevention, and analytics, where these interests are not overridden by your rights.
            </p>
          </LegalSubSection>

          <LegalSubSection title="4.3 Legal Obligation">
            <p>
              Processing required to comply with applicable laws, regulations, or legal processes.
            </p>
          </LegalSubSection>

          <LegalSubSection title="4.4 Consent">
            <p>
              Where required by law, we obtain your consent before processing certain types of data, 
              such as for push notifications or marketing communications. You may withdraw consent at 
              any time.
            </p>
          </LegalSubSection>
        </LegalSection>

        <LegalSection id="information-sharing" title="5. Information Sharing">
          <LegalSubSection title="5.1 Within Your Organization">
            <p>
              Your data is shared within your organization according to the access controls and permissions 
              configured by your Organization Administrator. Managers, HR personnel, and administrators 
              may have access to different levels of information based on their roles.
            </p>
          </LegalSubSection>

          <LegalSubSection title="5.2 Service Providers">
            <p>We share data with third-party service providers who assist in operating our Services:</p>
            <LegalList items={[
              'Cloud infrastructure and hosting providers',
              'Payment processors',
              'Email and communication services',
              'Analytics providers',
              'AI model providers (for AI features)',
            ]} />
            <p className="mt-2">
              These providers are bound by contractual obligations to protect your data and use it only 
              for the purposes we specify.
            </p>
          </LegalSubSection>

          <LegalSubSection title="5.3 Legal Requirements">
            <p>We may disclose information when required by law or to:</p>
            <LegalList items={[
              'Comply with court orders, subpoenas, or legal processes',
              'Protect our rights, property, or safety',
              'Prevent fraud or criminal activity',
              'Enforce our Terms of Service',
            ]} />
          </LegalSubSection>

          <LegalSubSection title="5.4 Business Transfers">
            <p>
              In the event of a merger, acquisition, or sale of assets, your information may be transferred 
              to the acquiring entity. We will provide notice before your data is transferred and becomes 
              subject to a different privacy policy.
            </p>
          </LegalSubSection>

          <LegalSubSection title="5.5 No Sale of Personal Data">
            <p>
              <strong>We do not sell your personal data to third parties.</strong> We do not share your 
              data for third-party advertising purposes.
            </p>
          </LegalSubSection>
        </LegalSection>

        <LegalSection id="data-retention" title="6. Data Retention">
          <LegalSubSection title="6.1 Active Accounts">
            <p>
              We retain your data for as long as your account is active and as needed to provide the 
              Services. Historical data (such as position history, attendance records) is retained for 
              compliance and reporting purposes as required by applicable laws.
            </p>
          </LegalSubSection>

          <LegalSubSection title="6.2 After Termination">
            <p>
              Upon termination of your subscription:
            </p>
            <LegalList items={[
              '30-day data export window to download your data',
              'Data retained for 90 days post-termination for recovery purposes',
              'Permanent deletion after the retention period',
            ]} />
          </LegalSubSection>

          <LegalSubSection title="6.3 Backup Data">
            <p>
              Backup copies of data are retained on a rolling 30-day basis and are deleted automatically 
              as part of our standard backup rotation.
            </p>
          </LegalSubSection>

          <LegalSubSection title="6.4 Legal Holds">
            <p>
              Data may be retained longer if required for legal proceedings, regulatory requirements, 
              or ongoing disputes.
            </p>
          </LegalSubSection>
        </LegalSection>

        <LegalSection id="data-security" title="7. Data Security">
          <LegalSubSection title="7.1 Technical Measures">
            <LegalList items={[
              'TLS 1.2+ encryption for all data in transit',
              'AES-256 encryption for data at rest',
              'Regular security assessments and penetration testing',
              'Intrusion detection and monitoring systems',
              'Automated vulnerability scanning',
            ]} />
          </LegalSubSection>

          <LegalSubSection title="7.2 Organizational Measures">
            <LegalList items={[
              'Employee background checks and security training',
              'Access limited to authorized personnel on a need-to-know basis',
              'Incident response procedures and breach notification protocols',
              'Regular security policy reviews and updates',
            ]} />
          </LegalSubSection>

          <LegalSubSection title="7.3 Multi-Tenant Isolation">
            <p>
              GlobalyOS uses a multi-tenant architecture with complete data isolation between organizations. 
              Row-level security (RLS) is enforced at the database level to ensure that each organization's 
              data is accessible only to authorized users within that organization.
            </p>
          </LegalSubSection>
        </LegalSection>

        <LegalSection id="your-rights" title="8. Your Rights">
          <p>Depending on your location, you may have the following rights regarding your personal data:</p>

          <LegalSubSection title="8.1 Access">
            <p>
              You have the right to request access to the personal data we hold about you and receive 
              a copy in a commonly used format.
            </p>
          </LegalSubSection>

          <LegalSubSection title="8.2 Correction">
            <p>
              You have the right to request correction of inaccurate or incomplete personal data. 
              You can update most information directly through your account settings.
            </p>
          </LegalSubSection>

          <LegalSubSection title="8.3 Deletion">
            <p>
              You have the right to request deletion of your personal data, subject to legal retention 
              requirements and our legitimate business interests.
            </p>
          </LegalSubSection>

          <LegalSubSection title="8.4 Restriction">
            <p>
              You have the right to request restriction of processing in certain circumstances, such 
              as while we verify the accuracy of your data.
            </p>
          </LegalSubSection>

          <LegalSubSection title="8.5 Portability">
            <p>
              You have the right to receive your data in a structured, commonly used, machine-readable 
              format. Data export features are available in your account settings.
            </p>
          </LegalSubSection>

          <LegalSubSection title="8.6 Objection">
            <p>
              You have the right to object to processing based on legitimate interests or for direct 
              marketing purposes.
            </p>
          </LegalSubSection>

          <LegalSubSection title="8.7 Automated Decision-Making">
            <p>
              You have the right not to be subject to decisions based solely on automated processing 
              that produce legal or similarly significant effects.
            </p>
          </LegalSubSection>

          <LegalSubSection title="8.8 Exercising Your Rights">
            <p>
              To exercise these rights:
            </p>
            <LegalList items={[
              'For data controlled by your organization: Contact your Organization Administrator',
              'For data controlled by GlobalyOS: Contact us at privacy@globalyos.com',
            ]} />
            <p className="mt-2">
              We will respond to requests within 30 days. You may also lodge a complaint with your 
              local data protection authority.
            </p>
          </LegalSubSection>
        </LegalSection>

        <LegalSection id="international-transfers" title="9. International Data Transfers">
          <LegalSubSection title="9.1 Transfer Mechanisms">
            <p>
              Your data may be transferred to and processed in countries outside your country of residence. 
              When we transfer data internationally, we use appropriate safeguards including:
            </p>
            <LegalList items={[
              'Standard Contractual Clauses (SCCs) approved by the European Commission',
              'Adequacy decisions where the destination country provides adequate protection',
              'Other lawful transfer mechanisms as appropriate',
            ]} />
          </LegalSubSection>

          <LegalSubSection title="9.2 Data Location">
            <p>
              Our primary data centers are located in secure cloud infrastructure. Information about 
              specific data locations and sub-processors is available upon request.
            </p>
          </LegalSubSection>
        </LegalSection>

        <LegalSection id="cookies" title="10. Cookies and Tracking">
          <LegalSubSection title="10.1 Essential Cookies">
            <p>
              We use essential cookies for authentication, session management, security, and basic 
              functionality. These cookies are necessary for the Services to function properly.
            </p>
          </LegalSubSection>

          <LegalSubSection title="10.2 Functional Cookies">
            <p>
              Functional cookies remember your preferences such as language, timezone, and theme 
              (light/dark mode) to enhance your experience.
            </p>
          </LegalSubSection>

          <LegalSubSection title="10.3 Analytics Cookies">
            <p>
              With your consent, we use analytics cookies to understand how users interact with our 
              Services, identify errors, and improve performance.
            </p>
          </LegalSubSection>

          <LegalSubSection title="10.4 Managing Cookies">
            <p>
              You can manage cookie preferences through your browser settings. Note that disabling 
              essential cookies may affect the functionality of the Services.
            </p>
          </LegalSubSection>
        </LegalSection>

        <LegalSection id="ai-processing" title="11. AI and Automated Processing">
          <LegalSubSection title="11.1 AI Features">
            <p>
              GlobalyOS includes AI-powered features that analyze data and generate content. These 
              features process data in real-time to provide responses and suggestions. AI outputs 
              are provided as drafts for human review.
            </p>
          </LegalSubSection>

          <LegalSubSection title="11.2 Data Usage for AI">
            <p>
              AI features process your organization's data to provide contextual responses. We do not 
              use your data to train AI models without your explicit consent. AI conversations are 
              retained per user session for continuity.
            </p>
          </LegalSubSection>

          <LegalSubSection title="11.3 Accuracy and Responsibility">
            <p>
              AI-generated content may contain inaccuracies. Users are responsible for reviewing and 
              verifying all AI outputs before use. We provide feedback mechanisms to improve AI accuracy.
            </p>
          </LegalSubSection>
        </LegalSection>

        <LegalSection id="children" title="12. Children's Privacy">
          <p>
            GlobalyOS is not intended for use by individuals under 18 years of age. We do not knowingly 
            collect personal information from children. If we become aware that a child has provided us 
            with personal information, we will take steps to delete that information. If you believe a 
            child has provided us with their data, please contact us at privacy@globalyos.com.
          </p>
        </LegalSection>

        <LegalSection id="changes" title="13. Changes to This Policy">
          <LegalSubSection title="13.1 Updates">
            <p>
              We may update this Privacy Policy from time to time to reflect changes in our practices, 
              technologies, legal requirements, or other factors. We will notify you of material changes 
              at least 30 days before they take effect.
            </p>
          </LegalSubSection>

          <LegalSubSection title="13.2 Version History">
            <p>
              Previous versions of this Privacy Policy are available upon request. The effective date 
              at the top of this policy indicates when it was last updated.
            </p>
          </LegalSubSection>
        </LegalSection>

        <LegalSection id="contact" title="14. Contact Us">
          <p>If you have questions about this Privacy Policy or our privacy practices, please contact us:</p>
          <p className="mt-4">
            <strong>GlobalyOS</strong><br />
            Email: privacy@globalyos.com<br />
            Support: www.globalyos.com/support
          </p>
          <p className="mt-4">
            For EU residents, you have the right to lodge a complaint with your local supervisory authority 
            if you believe we have not adequately addressed your concerns.
          </p>
        </LegalSection>
      </LegalDocumentLayout>
    </>
  );
}
