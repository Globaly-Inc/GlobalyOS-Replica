import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
  Hr,
} from 'https://esm.sh/@react-email/components@0.0.22?deps=react@18.3.1';
import * as React from 'https://esm.sh/react@18.3.1';

// Stable logo URL from Supabase Storage
const GLOBALYOS_LOGO_URL = 'https://rygowmzkvxgnxagqlyxf.supabase.co/storage/v1/object/public/system-assets//GlobalyOS%20Blue%20BG%20Icon.png';

interface SuperAdminNotificationProps {
  organizationName: string;
  ownerName: string;
  ownerEmail: string;
  ownerPhone: string;
  plan: string;
  industry: string;
  companySize: string;
  country: string;
  businessAddress: string;
  reviewUrl: string;
}

export const SuperAdminNotificationEmail = ({
  organizationName,
  ownerName,
  ownerEmail,
  ownerPhone,
  plan,
  industry,
  companySize,
  country,
  businessAddress,
  reviewUrl,
}: SuperAdminNotificationProps) => (
  <Html>
    <Head />
    <Preview>New Signup: {organizationName} - Review Required</Preview>
    <Body style={main}>
      <Container style={container}>
        {/* Unified lighter blue header */}
        <Section style={headerSection}>
          <Img
            src={GLOBALYOS_LOGO_URL}
            width="56"
            height="56"
            alt="GlobalyOS"
            style={logoImage}
          />
          <Heading style={headerTitle}>New Organization Signup 🆕</Heading>
          <Text style={headerSubtitle}>Review required for approval</Text>
        </Section>

        {/* Main Content */}
        <Section style={contentSection}>
          <Text style={paragraph}>
            A new organization has signed up and requires your review.
          </Text>

          <Section style={infoBox}>
            <Text style={infoTitle}>Application Details</Text>
            <Text style={infoText}>
              <strong>Organization:</strong> {organizationName}
            </Text>
            <Text style={infoText}>
              <strong>Owner:</strong> {ownerName}
            </Text>
            <Text style={infoText}>
              <strong>Email:</strong> {ownerEmail}
            </Text>
            <Text style={infoText}>
              <strong>Phone:</strong> {ownerPhone}
            </Text>
            <Text style={infoText}>
              <strong>Plan:</strong> {plan.charAt(0).toUpperCase() + plan.slice(1)}
            </Text>
            <Text style={infoText}>
              <strong>Industry:</strong> {industry || 'Not specified'}
            </Text>
            <Text style={infoText}>
              <strong>Company Size:</strong> {companySize || 'Not specified'}
            </Text>
            <Text style={infoText}>
              <strong>Country:</strong> {country || 'Not specified'}
            </Text>
            <Text style={infoText}>
              <strong>Address:</strong> {businessAddress || 'Not specified'}
            </Text>
          </Section>

          <Text style={paragraph}>
            Please review this application and approve or reject it from the Super Admin dashboard.
          </Text>

          <Section style={buttonContainer}>
            <Button style={button} href={reviewUrl}>
              Review Application
            </Button>
          </Section>
        </Section>

        <Hr style={hr} />

        {/* Footer */}
        <Section style={footerSection}>
          <Text style={footer}>
            This is an automated notification from GlobalyOS.
          </Text>
          
          <Text style={footer}>
            © {new Date().getFullYear()} GlobalyOS. All rights reserved.
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
);

export default SuperAdminNotificationEmail;

const main = {
  backgroundColor: '#f6f9fc',
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Ubuntu, sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '0',
  maxWidth: '600px',
  borderRadius: '8px',
  overflow: 'hidden',
  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
};

const headerSection = {
  background: 'linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%)',
  padding: '32px 24px',
  textAlign: 'center' as const,
};

const logoImage = {
  borderRadius: '12px',
  marginBottom: '16px',
};

const headerTitle = {
  color: '#ffffff',
  fontSize: '24px',
  fontWeight: '700',
  margin: '0 0 8px 0',
  lineHeight: '1.3',
};

const headerSubtitle = {
  color: 'rgba(255, 255, 255, 0.9)',
  fontSize: '14px',
  margin: '0',
};

const contentSection = {
  padding: '32px',
};

const paragraph = {
  color: '#525252',
  fontSize: '16px',
  lineHeight: '26px',
  margin: '0 0 16px 0',
};

const infoBox = {
  backgroundColor: '#fef3c7',
  borderRadius: '8px',
  padding: '20px',
  margin: '24px 0',
  border: '1px solid #fcd34d',
};

const infoTitle = {
  color: '#92400e',
  fontSize: '14px',
  fontWeight: '600',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
  margin: '0 0 12px 0',
};

const infoText = {
  color: '#525252',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '4px 0',
};

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '32px 0',
};

const button = {
  backgroundColor: '#7c3aed',
  borderRadius: '8px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: '600',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '14px 32px',
};

const hr = {
  borderColor: '#e5e5e5',
  margin: '0 32px',
};

const footerSection = {
  padding: '24px 32px',
  backgroundColor: '#f8fafc',
};

const footer = {
  color: '#8898aa',
  fontSize: '12px',
  lineHeight: '16px',
  textAlign: 'center' as const,
  margin: '8px 0',
};
