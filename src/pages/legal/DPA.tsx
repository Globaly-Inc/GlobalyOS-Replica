import { Helmet } from 'react-helmet-async';
import { LegalDocumentLayout } from '@/components/legal/LegalDocumentLayout';
import { LegalSection, LegalSubSection, LegalList } from '@/components/legal/LegalSection';

const tableOfContents = [
  { id: 'definitions', title: '1. Definitions', level: 1 },
  { id: 'scope', title: '2. Scope of Processing', level: 1 },
  { id: 'roles', title: '3. Controller and Processor', level: 1 },
  { id: 'obligations', title: '4. Processor Obligations', level: 1 },
  { id: 'security', title: '5. Security Measures', level: 1 },
  { id: 'subprocessors', title: '6. Sub-processors', level: 1 },
  { id: 'data-subject-rights', title: '7. Data Subject Rights', level: 1 },
  { id: 'breach-notification', title: '8. Breach Notification', level: 1 },
  { id: 'audits', title: '9. Audits and Assessments', level: 1 },
  { id: 'international-transfers', title: '10. International Transfers', level: 1 },
  { id: 'termination', title: '11. Term and Termination', level: 1 },
  { id: 'annexes', title: 'Annexes', level: 1 },
];

export default function DPA() {
  return (
    <>
      <Helmet>
        <title>Data Processing Agreement | GlobalyOS</title>
        <meta name="description" content="GlobalyOS Data Processing Agreement (DPA) - GDPR-compliant terms for data processing." />
        <link rel="canonical" href="https://www.globalyos.com/dpa" />
      </Helmet>

      <LegalDocumentLayout
        title="Data Processing Agreement"
        lastUpdated="January 18, 2026"
        effectiveDate="January 18, 2026"
        tableOfContents={tableOfContents}
      >
        <p className="text-lg mb-8">
          This Data Processing Agreement ("DPA") forms part of the Terms of Service between GlobalyOS 
          ("Processor") and the Customer ("Controller") and governs the processing of personal data 
          by GlobalyOS on behalf of the Customer.
        </p>

        <div className="p-4 bg-primary/10 rounded-lg mb-8">
          <p className="text-sm">
            <strong>Note:</strong> This DPA applies when GlobalyOS processes personal data on behalf of 
            your organization under applicable data protection laws, including the EU General Data 
            Protection Regulation (GDPR), UK GDPR, and similar laws.
          </p>
        </div>

        <LegalSection id="definitions" title="1. Definitions">
          <p>In this DPA, the following terms have the meanings set out below:</p>
          
          <LegalSubSection title="1.1 Key Terms">
            <LegalList items={[
              '"Controller" means the entity that determines the purposes and means of processing personal data (i.e., the Customer organization)',
              '"Processor" means the entity that processes personal data on behalf of the Controller (i.e., GlobalyOS)',
              '"Sub-processor" means any third party engaged by GlobalyOS to process personal data',
              '"Data Subject" means an identified or identifiable natural person whose personal data is processed',
              '"Personal Data" means any information relating to a Data Subject',
              '"Processing" means any operation performed on personal data, including collection, storage, use, and deletion',
              '"Data Protection Laws" means GDPR, UK GDPR, and other applicable data protection legislation',
            ]} />
          </LegalSubSection>

          <LegalSubSection title="1.2 Interpretation">
            <p>
              Terms not defined in this DPA have the meanings given in the Terms of Service or applicable 
              Data Protection Laws. References to legislation include amendments and successor legislation.
            </p>
          </LegalSubSection>
        </LegalSection>

        <LegalSection id="scope" title="2. Scope of Processing">
          <LegalSubSection title="2.1 Subject Matter">
            <p>
              GlobalyOS will process personal data to provide the Services as described in the Terms of 
              Service. The processing is necessary for the performance of the contract between the parties.
            </p>
          </LegalSubSection>

          <LegalSubSection title="2.2 Nature and Purpose">
            <p>GlobalyOS processes personal data for the following purposes:</p>
            <LegalList items={[
              'Providing and maintaining the GlobalyOS platform',
              'User authentication and access management',
              'Storing and organizing employee and HR data',
              'Enabling collaboration and communication features',
              'Processing AI queries and generating responses',
              'Providing customer support',
              'Generating analytics and reports',
            ]} />
          </LegalSubSection>

          <LegalSubSection title="2.3 Types of Personal Data">
            <p>The types of personal data processed may include:</p>
            <LegalList items={[
              'Identity data (names, employee IDs)',
              'Contact data (email addresses, phone numbers)',
              'Employment data (job titles, departments, employment history)',
              'Attendance and leave data',
              'Performance and review data',
              'Communication content (messages, posts, comments)',
              'Document and file content',
            ]} />
          </LegalSubSection>

          <LegalSubSection title="2.4 Categories of Data Subjects">
            <p>Data Subjects include:</p>
            <LegalList items={[
              'Employees of the Customer organization',
              'Contractors and temporary workers',
              'Organization administrators and managers',
              'Other individuals whose data is uploaded to the Services',
            ]} />
          </LegalSubSection>

          <LegalSubSection title="2.5 Duration">
            <p>
              Processing will continue for the duration of the Terms of Service, plus any retention 
              period specified therein or required by law.
            </p>
          </LegalSubSection>
        </LegalSection>

        <LegalSection id="roles" title="3. Controller and Processor Roles">
          <LegalSubSection title="3.1 Controller Responsibilities">
            <p>The Controller (Customer) is responsible for:</p>
            <LegalList items={[
              'Determining the purposes and means of processing',
              'Ensuring a legal basis exists for processing',
              'Providing appropriate notices to Data Subjects',
              'Obtaining necessary consents where required',
              'Ensuring data accuracy and relevance',
              'Responding to Data Subject requests (with Processor assistance)',
              'Complying with applicable Data Protection Laws',
            ]} />
          </LegalSubSection>

          <LegalSubSection title="3.2 Processor Responsibilities">
            <p>The Processor (GlobalyOS) is responsible for:</p>
            <LegalList items={[
              'Processing personal data only on documented Controller instructions',
              'Ensuring personnel are bound by confidentiality obligations',
              'Implementing appropriate technical and organizational security measures',
              'Engaging Sub-processors only with Controller authorization',
              'Assisting the Controller with Data Subject requests',
              'Assisting with data protection impact assessments',
              'Notifying the Controller of personal data breaches',
              'Deleting or returning data upon termination',
            ]} />
          </LegalSubSection>
        </LegalSection>

        <LegalSection id="obligations" title="4. Processor Obligations">
          <LegalSubSection title="4.1 Processing Instructions">
            <p>
              GlobalyOS will process personal data only in accordance with documented instructions from 
              the Controller. The Terms of Service and this DPA constitute the Controller's complete 
              instructions. GlobalyOS will inform the Controller if additional instructions are required.
            </p>
          </LegalSubSection>

          <LegalSubSection title="4.2 Confidentiality">
            <p>
              GlobalyOS ensures that personnel authorized to process personal data are subject to 
              appropriate confidentiality obligations, whether contractual or statutory.
            </p>
          </LegalSubSection>

          <LegalSubSection title="4.3 Legal Requirements">
            <p>
              If GlobalyOS is required by law to process personal data beyond the Controller's 
              instructions, GlobalyOS will inform the Controller before processing (unless legally 
              prohibited from doing so).
            </p>
          </LegalSubSection>
        </LegalSection>

        <LegalSection id="security" title="5. Security Measures">
          <LegalSubSection title="5.1 Technical Measures">
            <p>GlobalyOS implements the following technical security measures:</p>
            <LegalList items={[
              'Encryption of personal data in transit using TLS 1.2+',
              'Encryption of personal data at rest using AES-256',
              'Multi-tenant data isolation with row-level security',
              'Regular vulnerability assessments and penetration testing',
              'Intrusion detection and prevention systems',
              'Secure authentication mechanisms including MFA support',
              'Regular backups with encryption',
            ]} />
          </LegalSubSection>

          <LegalSubSection title="5.2 Organizational Measures">
            <p>GlobalyOS implements the following organizational security measures:</p>
            <LegalList items={[
              'Access controls based on the principle of least privilege',
              'Employee security awareness training',
              'Background checks for personnel with data access',
              'Documented security policies and procedures',
              'Incident response and business continuity plans',
              'Regular security audits and reviews',
            ]} />
          </LegalSubSection>

          <LegalSubSection title="5.3 Security Assessment">
            <p>
              GlobalyOS regularly assesses the effectiveness of security measures and updates them as 
              necessary to address evolving threats and vulnerabilities.
            </p>
          </LegalSubSection>
        </LegalSection>

        <LegalSection id="subprocessors" title="6. Sub-processors">
          <LegalSubSection title="6.1 Authorization">
            <p>
              The Controller authorizes GlobalyOS to engage Sub-processors to assist in providing the 
              Services. A list of current Sub-processors is available upon request.
            </p>
          </LegalSubSection>

          <LegalSubSection title="6.2 Requirements">
            <p>GlobalyOS will:</p>
            <LegalList items={[
              'Enter into written agreements with Sub-processors imposing equivalent data protection obligations',
              'Remain liable for Sub-processor compliance',
              'Provide notice of new Sub-processors at least 30 days before engagement',
              'Allow the Controller to object to new Sub-processors on reasonable grounds',
            ]} />
          </LegalSubSection>

          <LegalSubSection title="6.3 Objection Process">
            <p>
              If the Controller objects to a new Sub-processor on reasonable data protection grounds, 
              the parties will work in good faith to find a resolution. If no resolution is possible, 
              the Controller may terminate the affected Services.
            </p>
          </LegalSubSection>
        </LegalSection>

        <LegalSection id="data-subject-rights" title="7. Data Subject Rights">
          <LegalSubSection title="7.1 Assistance">
            <p>
              GlobalyOS will assist the Controller in responding to Data Subject requests to exercise 
              their rights under Data Protection Laws, including:
            </p>
            <LegalList items={[
              'Right of access',
              'Right to rectification',
              'Right to erasure ("right to be forgotten")',
              'Right to restriction of processing',
              'Right to data portability',
              'Right to object',
              'Rights related to automated decision-making',
            ]} />
          </LegalSubSection>

          <LegalSubSection title="7.2 Request Handling">
            <p>
              If GlobalyOS receives a request directly from a Data Subject, GlobalyOS will promptly 
              notify the Controller (unless prohibited by law) and will not respond directly unless 
              instructed to do so by the Controller.
            </p>
          </LegalSubSection>

          <LegalSubSection title="7.3 Self-Service Features">
            <p>
              The Services include features that allow Data Subjects to access and export their data 
              directly, facilitating the Controller's compliance with access and portability requests.
            </p>
          </LegalSubSection>
        </LegalSection>

        <LegalSection id="breach-notification" title="8. Breach Notification">
          <LegalSubSection title="8.1 Notification Timing">
            <p>
              GlobalyOS will notify the Controller without undue delay (and in any event within 72 hours) 
              after becoming aware of a personal data breach affecting Controller data.
            </p>
          </LegalSubSection>

          <LegalSubSection title="8.2 Notification Content">
            <p>The notification will include, to the extent known:</p>
            <LegalList items={[
              'Nature of the breach, including categories and approximate numbers of Data Subjects and records affected',
              'Name and contact details of GlobalyOS\'s data protection contact',
              'Likely consequences of the breach',
              'Measures taken or proposed to address the breach',
            ]} />
          </LegalSubSection>

          <LegalSubSection title="8.3 Cooperation">
            <p>
              GlobalyOS will cooperate with the Controller to investigate the breach and fulfill the 
              Controller's obligations to notify supervisory authorities and Data Subjects.
            </p>
          </LegalSubSection>
        </LegalSection>

        <LegalSection id="audits" title="9. Audits and Assessments">
          <LegalSubSection title="9.1 Information">
            <p>
              GlobalyOS will make available to the Controller information necessary to demonstrate 
              compliance with this DPA and applicable Data Protection Laws.
            </p>
          </LegalSubSection>

          <LegalSubSection title="9.2 Audit Rights">
            <p>
              The Controller may conduct audits (directly or through an independent auditor) to verify 
              GlobalyOS's compliance with this DPA, subject to reasonable notice and confidentiality 
              requirements.
            </p>
          </LegalSubSection>

          <LegalSubSection title="9.3 Third-Party Certifications">
            <p>
              GlobalyOS may provide third-party audit reports, certifications, or assessments as 
              evidence of compliance with security and data protection requirements.
            </p>
          </LegalSubSection>

          <LegalSubSection title="9.4 DPIA Assistance">
            <p>
              GlobalyOS will provide reasonable assistance to the Controller in conducting data 
              protection impact assessments and prior consultations with supervisory authorities, 
              where required under Data Protection Laws.
            </p>
          </LegalSubSection>
        </LegalSection>

        <LegalSection id="international-transfers" title="10. International Data Transfers">
          <LegalSubSection title="10.1 Transfer Mechanisms">
            <p>
              Personal data may be transferred to countries outside the European Economic Area (EEA) 
              or the United Kingdom. GlobalyOS will ensure such transfers comply with Data Protection 
              Laws using appropriate safeguards, including:
            </p>
            <LegalList items={[
              'Standard Contractual Clauses (SCCs) approved by the European Commission',
              'UK International Data Transfer Agreement where applicable',
              'Adequacy decisions recognizing the destination country as providing adequate protection',
            ]} />
          </LegalSubSection>

          <LegalSubSection title="10.2 SCCs Incorporation">
            <p>
              Where transfers are made to countries without an adequacy decision, the EU Standard 
              Contractual Clauses (Module Two: Controller to Processor) are incorporated into this 
              DPA by reference. The parties agree to execute the SCCs upon Controller request.
            </p>
          </LegalSubSection>

          <LegalSubSection title="10.3 Supplementary Measures">
            <p>
              GlobalyOS implements supplementary technical and organizational measures to ensure 
              the protection of personal data during international transfers.
            </p>
          </LegalSubSection>
        </LegalSection>

        <LegalSection id="termination" title="11. Term and Termination">
          <LegalSubSection title="11.1 Duration">
            <p>
              This DPA remains in effect for as long as GlobalyOS processes personal data on behalf 
              of the Controller under the Terms of Service.
            </p>
          </LegalSubSection>

          <LegalSubSection title="11.2 Data Return and Deletion">
            <p>
              Upon termination of the Terms of Service, GlobalyOS will, at the Controller's choice:
            </p>
            <LegalList items={[
              'Return all personal data to the Controller in a commonly used format',
              'Delete all personal data (except as required by law)',
            ]} />
            <p className="mt-2">
              The Controller has 30 days after termination to request data return. After this period, 
              data will be deleted within 90 days, except for backup copies which will be deleted 
              according to standard backup rotation schedules.
            </p>
          </LegalSubSection>

          <LegalSubSection title="11.3 Certification">
            <p>
              Upon request, GlobalyOS will provide written certification that personal data has been 
              deleted in accordance with this DPA.
            </p>
          </LegalSubSection>
        </LegalSection>

        <LegalSection id="annexes" title="Annexes">
          <LegalSubSection title="Annex I: Processing Details">
            <div className="overflow-x-auto">
              <table className="min-w-full border border-border">
                <tbody>
                  <tr className="border-b border-border">
                    <td className="p-3 font-medium bg-muted">Subject Matter</td>
                    <td className="p-3">Provision of the GlobalyOS business operating system</td>
                  </tr>
                  <tr className="border-b border-border">
                    <td className="p-3 font-medium bg-muted">Duration</td>
                    <td className="p-3">For the term of the Terms of Service</td>
                  </tr>
                  <tr className="border-b border-border">
                    <td className="p-3 font-medium bg-muted">Nature</td>
                    <td className="p-3">Storage, organization, retrieval, and transmission of data</td>
                  </tr>
                  <tr className="border-b border-border">
                    <td className="p-3 font-medium bg-muted">Purpose</td>
                    <td className="p-3">HR management, collaboration, and business operations</td>
                  </tr>
                  <tr className="border-b border-border">
                    <td className="p-3 font-medium bg-muted">Data Types</td>
                    <td className="p-3">Identity, contact, employment, attendance, performance, and communication data</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-medium bg-muted">Data Subjects</td>
                    <td className="p-3">Customer employees, contractors, and authorized users</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </LegalSubSection>

          <LegalSubSection title="Annex II: Technical and Organizational Measures">
            <p>See Section 5 (Security Measures) for detailed technical and organizational measures.</p>
          </LegalSubSection>

          <LegalSubSection title="Annex III: Sub-processors">
            <p>
              A current list of Sub-processors is available upon request by contacting{' '}
              <a href="mailto:privacy@globalyos.com" className="text-primary hover:underline">
                privacy@globalyos.com
              </a>.
            </p>
          </LegalSubSection>
        </LegalSection>

        <div className="mt-10 p-6 bg-muted rounded-lg">
          <h3 className="font-semibold mb-2">Contact</h3>
          <p className="text-muted-foreground">
            For questions about this Data Processing Agreement, please contact us at{' '}
            <a href="mailto:privacy@globalyos.com" className="text-primary hover:underline">
              privacy@globalyos.com
            </a>.
          </p>
        </div>
      </LegalDocumentLayout>
    </>
  );
}
