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

interface SuperAdminNotificationProps {
  organizationName: string;
  ownerName: string;
  ownerEmail: string;
  ownerPhone: string;
  plan: string;
  industry: string;
  companySize: string;
  country: string;
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
  reviewUrl,
}: SuperAdminNotificationProps) => (
  <Html>
    <Head />
    <Preview>New Signup: {organizationName} - Review Required</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img
          src="https://globalyos.lovable.app/images/globalyos-logo-email.png"
          width="180"
          alt="GlobalyOS"
          style={logo}
        />
        
        <Heading style={heading}>New Organization Signup 🆕</Heading>
        
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
        </Section>

        <Text style={paragraph}>
          Please review this application and approve or reject it from the Super Admin dashboard.
        </Text>

        <Section style={buttonContainer}>
          <Button style={button} href={reviewUrl}>
            Review Application
          </Button>
        </Section>

        <Hr style={hr} />

        <Text style={footer}>
          This is an automated notification from GlobalyOS.
        </Text>
        
        <Text style={footer}>
          © {new Date().getFullYear()} GlobalyOS. All rights reserved.
        </Text>
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
  padding: '40px 20px',
  marginBottom: '64px',
  borderRadius: '8px',
  maxWidth: '600px',
};

const logo = {
  margin: '0 auto 24px',
  display: 'block',
};

const heading = {
  color: '#1a1a1a',
  fontSize: '28px',
  fontWeight: '700',
  textAlign: 'center' as const,
  margin: '30px 0',
};

const paragraph = {
  color: '#525252',
  fontSize: '16px',
  lineHeight: '26px',
  margin: '16px 0',
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
  borderRadius: '6px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: '600',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '12px 24px',
};

const hr = {
  borderColor: '#e5e5e5',
  margin: '32px 0',
};

const footer = {
  color: '#8898aa',
  fontSize: '12px',
  lineHeight: '16px',
  textAlign: 'center' as const,
  margin: '8px 0',
};
