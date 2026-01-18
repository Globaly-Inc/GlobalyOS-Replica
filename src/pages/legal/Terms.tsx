import { Helmet } from 'react-helmet-async';
import { LegalDocumentLayout } from '@/components/legal/LegalDocumentLayout';
import { LegalSection, LegalSubSection, LegalList } from '@/components/legal/LegalSection';

const tableOfContents = [
  { id: 'agreement', title: '1. Agreement Overview', level: 1 },
  { id: 'services', title: '2. Services', level: 1 },
  { id: 'account', title: '3. Account & Organization', level: 1 },
  { id: 'subscription', title: '4. Subscription & Billing', level: 1 },
  { id: 'modifications', title: '5. Modifications to Service', level: 1 },
  { id: 'acceptable-use', title: '6. Acceptable Use', level: 1 },
  { id: 'intellectual-property', title: '7. Intellectual Property', level: 1 },
  { id: 'customer-data', title: '8. Customer Data', level: 1 },
  { id: 'confidentiality', title: '9. Confidentiality', level: 1 },
  { id: 'third-party', title: '10. Third-Party Services', level: 1 },
  { id: 'term-termination', title: '11. Term & Termination', level: 1 },
  { id: 'disclaimers', title: '12. Disclaimers', level: 1 },
  { id: 'liability', title: '13. Limitation of Liability', level: 1 },
  { id: 'indemnification', title: '14. Indemnification', level: 1 },
  { id: 'disputes', title: '15. Dispute Resolution', level: 1 },
  { id: 'general', title: '16. General Provisions', level: 1 },
];

export default function Terms() {
  return (
    <>
      <Helmet>
        <title>Terms of Service | GlobalyOS</title>
        <meta name="description" content="GlobalyOS Terms of Service - Read our terms and conditions for using the GlobalyOS platform." />
        <link rel="canonical" href="https://www.globalyos.com/terms" />
      </Helmet>

      <LegalDocumentLayout
        title="Terms of Service"
        lastUpdated="January 18, 2026"
        effectiveDate="January 18, 2026"
        tableOfContents={tableOfContents}
      >
        <p className="text-lg mb-8">
          Welcome to GlobalyOS. These Terms of Service ("Terms") govern your access to and use of the GlobalyOS platform 
          and services. By accessing or using our Services, you agree to be bound by these Terms.
        </p>

        <LegalSection id="agreement" title="1. Agreement Overview">
          <LegalSubSection title="1.1 Parties">
            <p>
              These Terms constitute a binding agreement between you (either an individual or an entity you represent) 
              and GlobalyOS ("we," "us," or "our"). If you are using the Services on behalf of an organization, 
              you represent and warrant that you have the authority to bind that organization to these Terms.
            </p>
          </LegalSubSection>

          <LegalSubSection title="1.2 Acceptance">
            <p>
              By creating an account, accessing our website at www.globalyos.com, or using any part of the Services, 
              you acknowledge that you have read, understood, and agree to be bound by these Terms, our Privacy Policy, 
              and our Acceptable Use Policy, all of which are incorporated herein by reference.
            </p>
          </LegalSubSection>

          <LegalSubSection title="1.3 Eligibility">
            <p>You must be at least 18 years of age to use our Services. By using the Services, you represent and warrant that you:</p>
            <LegalList items={[
              'Are at least 18 years of age',
              'Have the legal capacity to enter into a binding agreement',
              'Are not prohibited from using the Services under applicable law',
              'If acting on behalf of an organization, have full authority to bind that organization to these Terms',
            ]} />
          </LegalSubSection>
        </LegalSection>

        <LegalSection id="services" title="2. Services">
          <LegalSubSection title="2.1 Service Description">
            <p>
              GlobalyOS provides a cloud-based business operating system that includes productivity, collaboration, 
              and management tools ("Services"). The specific features and functionality available to you depend on 
              your subscription plan and may change over time as we improve and evolve our platform.
            </p>
          </LegalSubSection>

          <LegalSubSection title="2.2 Service Availability">
            <p>
              We strive to make the Services available at all times but do not guarantee uninterrupted access. 
              The Services may be temporarily unavailable due to scheduled maintenance, updates, or circumstances 
              beyond our control.
            </p>
          </LegalSubSection>
        </LegalSection>

        <LegalSection id="account" title="3. Account and Organization">
          <LegalSubSection title="3.1 Account Registration">
            <p>To use certain features of the Services, you must register for an account. You agree to:</p>
            <LegalList items={[
              'Provide accurate, current, and complete information during registration',
              'Maintain and promptly update your account information',
              'Maintain the security of your password and account credentials',
              'Notify us immediately of any unauthorized access to your account',
              'Accept responsibility for all activities that occur under your account',
            ]} />
          </LegalSubSection>

          <LegalSubSection title="3.2 Organization Structure">
            <p>
              GlobalyOS operates on a multi-tenant architecture where each organization maintains separate and 
              isolated data. Organization Administrators are responsible for managing user access, permissions, 
              and organizational settings. Each organization is responsible for ensuring that its users comply 
              with these Terms.
            </p>
          </LegalSubSection>

          <LegalSubSection title="3.3 Administrator Responsibilities">
            <p>If you are designated as an Organization Administrator, you have additional responsibilities including:</p>
            <LegalList items={[
              'Managing user accounts and access permissions within your organization',
              'Ensuring your organization\'s compliance with these Terms',
              'Configuring organizational settings and policies',
              'Serving as the primary point of contact between your organization and GlobalyOS',
            ]} />
          </LegalSubSection>
        </LegalSection>

        <LegalSection id="subscription" title="4. Subscription and Billing">
          <LegalSubSection title="4.1 Subscription Plans">
            <p>
              We offer various subscription plans with different features and pricing. Current plans and pricing 
              are available at www.globalyos.com/pricing. We reserve the right to modify our plans and pricing 
              at any time with reasonable notice.
            </p>
          </LegalSubSection>

          <LegalSubSection title="4.2 Free Trial">
            <p>
              We may offer a free trial period for new customers. During the trial, you will have access to 
              certain features of the Services. At the end of the trial period, you must subscribe to a paid 
              plan to continue using the Services. Trial terms may vary and are specified during signup.
            </p>
          </LegalSubSection>

          <LegalSubSection title="4.3 Billing and Payment">
            <p>
              By subscribing to a paid plan, you agree to pay the applicable fees. Fees are billed in advance 
              on a monthly or annual basis depending on your selected billing cycle. All payments are non-refundable 
              except as required by law or as explicitly stated in these Terms.
            </p>
          </LegalSubSection>

          <LegalSubSection title="4.4 Automatic Renewal">
            <p>
              Your subscription will automatically renew at the end of each billing period unless you cancel 
              before the renewal date. You may cancel your subscription at any time through your account settings, 
              and your access will continue until the end of the current billing period.
            </p>
          </LegalSubSection>

          <LegalSubSection title="4.5 Usage-Based Charges">
            <p>
              Certain features may include usage-based charges that exceed your plan's included allocation. 
              These charges, if applicable, will be billed at the rates specified in your plan details. 
              You can monitor your usage through your account dashboard.
            </p>
          </LegalSubSection>

          <LegalSubSection title="4.6 Taxes">
            <p>
              All fees are exclusive of taxes unless otherwise stated. You are responsible for paying all 
              applicable taxes, including VAT, GST, sales tax, or other similar taxes imposed by any jurisdiction.
            </p>
          </LegalSubSection>
        </LegalSection>

        <LegalSection id="modifications" title="5. Modifications to Service">
          <LegalSubSection title="5.1 Service Changes">
            <p>
              We continuously improve and evolve our Services. We reserve the right to modify, update, add, 
              or remove features at any time. For material changes that negatively affect your use of the 
              Services, we will provide reasonable advance notice.
            </p>
          </LegalSubSection>

          <LegalSubSection title="5.2 Beta Features">
            <p>
              We may offer beta or preview features for testing purposes. These features are provided "as-is" 
              without warranty and may be modified or discontinued at any time without notice.
            </p>
          </LegalSubSection>
        </LegalSection>

        <LegalSection id="acceptable-use" title="6. Acceptable Use">
          <p>
            Your use of the Services is subject to our <a href="/acceptable-use" className="text-primary hover:underline">Acceptable Use Policy</a>, 
            which is incorporated into these Terms by reference. You agree not to:
          </p>
          <LegalList items={[
            'Use the Services for any unlawful purpose or in violation of any applicable laws',
            'Share your account credentials or allow unauthorized access to your account',
            'Attempt to access data belonging to other organizations',
            'Upload or transmit malicious code, viruses, or harmful content',
            'Interfere with or disrupt the integrity or performance of the Services',
            'Attempt to circumvent any usage limits, security features, or billing mechanisms',
            'Use the Services to harass, abuse, or harm others',
          ]} />
        </LegalSection>

        <LegalSection id="intellectual-property" title="7. Intellectual Property">
          <LegalSubSection title="7.1 GlobalyOS Ownership">
            <p>
              The Services, including all software, designs, documentation, and other materials, are owned by 
              GlobalyOS or our licensors and are protected by intellectual property laws. You are granted a 
              limited, non-exclusive, non-transferable license to use the Services in accordance with these Terms.
            </p>
          </LegalSubSection>

          <LegalSubSection title="7.2 Customer Content">
            <p>
              You retain all ownership rights in the content, data, and materials you upload to or create 
              using the Services ("Customer Content"). You grant us a limited license to use, store, and 
              process your Customer Content solely as necessary to provide the Services.
            </p>
          </LegalSubSection>

          <LegalSubSection title="7.3 AI-Generated Content">
            <p>
              The Services may include artificial intelligence features that generate or assist in creating 
              content. You are solely responsible for reviewing, verifying, and approving any AI-generated 
              content before use. We make no warranties regarding the accuracy or appropriateness of 
              AI-generated content.
            </p>
          </LegalSubSection>

          <LegalSubSection title="7.4 Feedback">
            <p>
              If you provide feedback, suggestions, or ideas about the Services, you grant us a perpetual, 
              irrevocable, royalty-free license to use and incorporate such feedback into the Services 
              without any obligation to you.
            </p>
          </LegalSubSection>
        </LegalSection>

        <LegalSection id="customer-data" title="8. Customer Data">
          <LegalSubSection title="8.1 Data Ownership">
            <p>
              You retain full ownership of all data you submit to the Services. We act as a data processor 
              on your behalf and will only process your data in accordance with our <a href="/privacy" className="text-primary hover:underline">Privacy Policy</a> and, 
              where applicable, our <a href="/dpa" className="text-primary hover:underline">Data Processing Agreement</a>.
            </p>
          </LegalSubSection>

          <LegalSubSection title="8.2 Data Security">
            <p>
              We implement industry-standard security measures to protect your data, including encryption 
              in transit and at rest, access controls, and regular security assessments. For more information, 
              please review our Privacy Policy.
            </p>
          </LegalSubSection>

          <LegalSubSection title="8.3 Data Portability">
            <p>
              You may export your data at any time using the export features available in the Services. 
              Upon termination of your subscription, you will have a reasonable period to export your data 
              before it is deleted.
            </p>
          </LegalSubSection>
        </LegalSection>

        <LegalSection id="confidentiality" title="9. Confidentiality">
          <p>
            Each party agrees to maintain the confidentiality of the other party's confidential information 
            and to use such information only for the purposes of fulfilling obligations under these Terms. 
            Confidential information does not include information that is publicly known, independently 
            developed, or lawfully obtained from a third party.
          </p>
        </LegalSection>

        <LegalSection id="third-party" title="10. Third-Party Services">
          <p>
            The Services may integrate with or provide access to third-party applications, services, or 
            content. Your use of such third-party services is subject to their respective terms and privacy 
            policies. We are not responsible for the availability, accuracy, or content of third-party 
            services, and we do not endorse any third-party services.
          </p>
        </LegalSection>

        <LegalSection id="term-termination" title="11. Term and Termination">
          <LegalSubSection title="11.1 Term">
            <p>
              These Terms are effective from the date you first access or use the Services and continue 
              until terminated in accordance with this section.
            </p>
          </LegalSubSection>

          <LegalSubSection title="11.2 Termination by You">
            <p>
              You may terminate your account and these Terms at any time by canceling your subscription 
              through your account settings. Your access will continue until the end of your current 
              billing period, after which your account will be deactivated.
            </p>
          </LegalSubSection>

          <LegalSubSection title="11.3 Termination by GlobalyOS">
            <p>We may suspend or terminate your access to the Services if:</p>
            <LegalList items={[
              'You breach these Terms or any incorporated policies',
              'Your payment is past due for more than 14 days',
              'Required by law or court order',
              'Your use poses a security risk or may cause harm to other users',
              'We discontinue the Services with reasonable notice',
            ]} />
          </LegalSubSection>

          <LegalSubSection title="11.4 Effect of Termination">
            <p>
              Upon termination, you will have 30 days to export your data. After this period, your data 
              will be deleted in accordance with our data retention policies. Certain provisions of these 
              Terms will survive termination, including intellectual property rights, disclaimers, 
              limitation of liability, and dispute resolution.
            </p>
          </LegalSubSection>
        </LegalSection>

        <LegalSection id="disclaimers" title="12. Disclaimers">
          <p>
            THE SERVICES ARE PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, 
            EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, 
            FITNESS FOR A PARTICULAR PURPOSE, TITLE, AND NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE 
            SERVICES WILL BE UNINTERRUPTED, ERROR-FREE, OR COMPLETELY SECURE.
          </p>
          <p className="mt-4">
            Some jurisdictions do not allow the exclusion of certain warranties, so some of the above 
            exclusions may not apply to you.
          </p>
        </LegalSection>

        <LegalSection id="liability" title="13. Limitation of Liability">
          <LegalSubSection title="13.1 Limitation">
            <p>
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, IN NO EVENT WILL GLOBALYOS BE LIABLE FOR ANY 
              INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS, 
              DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES, RESULTING FROM YOUR ACCESS TO OR USE OF 
              OR INABILITY TO ACCESS OR USE THE SERVICES.
            </p>
          </LegalSubSection>

          <LegalSubSection title="13.2 Cap on Liability">
            <p>
              OUR TOTAL LIABILITY FOR ANY CLAIMS ARISING UNDER THESE TERMS WILL NOT EXCEED THE GREATER 
              OF (A) THE AMOUNTS YOU PAID TO US IN THE TWELVE (12) MONTHS PRECEDING THE CLAIM, OR 
              (B) ONE HUNDRED US DOLLARS ($100).
            </p>
          </LegalSubSection>

          <LegalSubSection title="13.3 Exceptions">
            <p>
              These limitations do not apply to liability arising from our gross negligence, willful 
              misconduct, or any liability that cannot be excluded or limited under applicable law.
            </p>
          </LegalSubSection>
        </LegalSection>

        <LegalSection id="indemnification" title="14. Indemnification">
          <LegalSubSection title="14.1 Your Indemnification">
            <p>
              You agree to indemnify, defend, and hold harmless GlobalyOS and our officers, directors, 
              employees, and agents from any claims, liabilities, damages, losses, and expenses arising 
              from: (a) your use of the Services; (b) your violation of these Terms; (c) your violation 
              of any third-party rights; or (d) your Customer Content.
            </p>
          </LegalSubSection>

          <LegalSubSection title="14.2 Our Indemnification">
            <p>
              We will indemnify you against any third-party claim that the Services infringe that party's 
              intellectual property rights, subject to your prompt notification of the claim, your 
              cooperation in the defense, and our control of the defense and settlement.
            </p>
          </LegalSubSection>
        </LegalSection>

        <LegalSection id="disputes" title="15. Dispute Resolution">
          <LegalSubSection title="15.1 Governing Law">
            <p>
              These Terms are governed by the laws of the State of Delaware, United States, without 
              regard to its conflict of law principles.
            </p>
          </LegalSubSection>

          <LegalSubSection title="15.2 Informal Resolution">
            <p>
              Before initiating any formal dispute resolution, you agree to first contact us at 
              legal@globalyos.com to attempt to resolve the dispute informally. We will attempt to 
              resolve the dispute within 30 days.
            </p>
          </LegalSubSection>

          <LegalSubSection title="15.3 Arbitration">
            <p>
              If we cannot resolve a dispute informally, any dispute arising under these Terms will 
              be resolved through binding arbitration conducted in accordance with the rules of the 
              American Arbitration Association. The arbitration will be conducted in the English language.
            </p>
          </LegalSubSection>

          <LegalSubSection title="15.4 Class Action Waiver">
            <p>
              You agree that any dispute resolution proceedings will be conducted only on an individual 
              basis and not in a class, consolidated, or representative action.
            </p>
          </LegalSubSection>
        </LegalSection>

        <LegalSection id="general" title="16. General Provisions">
          <LegalSubSection title="16.1 Entire Agreement">
            <p>
              These Terms, together with our Privacy Policy, Acceptable Use Policy, and Data Processing 
              Agreement where applicable, constitute the entire agreement between you and GlobalyOS 
              regarding the Services.
            </p>
          </LegalSubSection>

          <LegalSubSection title="16.2 Amendments">
            <p>
              We may modify these Terms from time to time. We will notify you of material changes at 
              least 30 days before they take effect. Your continued use of the Services after the 
              effective date constitutes your acceptance of the modified Terms.
            </p>
          </LegalSubSection>

          <LegalSubSection title="16.3 Severability">
            <p>
              If any provision of these Terms is found to be unenforceable, that provision will be 
              modified to the minimum extent necessary to make it enforceable, and the remaining 
              provisions will continue in full force and effect.
            </p>
          </LegalSubSection>

          <LegalSubSection title="16.4 No Waiver">
            <p>
              Our failure to enforce any right or provision of these Terms will not be considered a 
              waiver of that right or provision.
            </p>
          </LegalSubSection>

          <LegalSubSection title="16.5 Assignment">
            <p>
              You may not assign these Terms without our prior written consent. We may assign these 
              Terms to a successor in interest without your consent.
            </p>
          </LegalSubSection>

          <LegalSubSection title="16.6 Force Majeure">
            <p>
              Neither party will be liable for any failure or delay in performance due to circumstances 
              beyond its reasonable control, including natural disasters, war, terrorism, labor disputes, 
              government actions, or internet or infrastructure failures.
            </p>
          </LegalSubSection>

          <LegalSubSection title="16.7 Contact">
            <p>
              For questions about these Terms, please contact us at:
            </p>
            <p className="mt-2">
              <strong>GlobalyOS</strong><br />
              Email: legal@globalyos.com<br />
              Website: www.globalyos.com
            </p>
          </LegalSubSection>
        </LegalSection>
      </LegalDocumentLayout>
    </>
  );
}
