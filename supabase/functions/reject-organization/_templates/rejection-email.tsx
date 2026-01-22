import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
  Button,
  Hr,
} from 'https://esm.sh/@react-email/components@0.0.22?deps=react@18.3.1'
import * as React from 'https://esm.sh/react@18.3.1'

// Stable logo URL from Supabase Storage
const GLOBALYOS_LOGO_URL = 'https://rygowmzkvxgnxagqlyxf.supabase.co/storage/v1/object/public/system-assets//GlobalyOS%20Blue%20BG%20Icon.png';

interface RejectionEmailProps {
  ownerName: string
  organizationName: string
  reason: string
  signupUrl: string
}

export const RejectionEmail = ({
  ownerName,
  organizationName,
  reason,
  signupUrl,
}: RejectionEmailProps) => (
  <Html>
    <Head />
    <Preview>Update on your GlobalyOS application</Preview>
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
          <Heading style={headerTitle}>Application Update</Heading>
          <Text style={headerSubtitle}>Regarding your organization registration</Text>
        </Section>

        {/* Main Content */}
        <Section style={contentSection}>
          <Text style={text}>Hi {ownerName},</Text>
          
          <Text style={text}>
            Thank you for your interest in GlobalyOS. After reviewing your application for{' '}
            <strong>{organizationName}</strong>, we regret to inform you that we are unable 
            to approve your registration at this time.
          </Text>

          <Section style={reasonBox}>
            <Text style={reasonTitle}>Reason for this decision:</Text>
            <Text style={reasonText}>{reason}</Text>
          </Section>

          <Text style={text}>
            <strong>What you can do:</strong>
          </Text>

          <Section style={stepsSection}>
            <Text style={stepItem}>• Review and update your organization details</Text>
            <Text style={stepItem}>• Ensure all required information is accurate</Text>
            <Text style={stepItem}>• Submit a new application with corrections</Text>
          </Section>

          <Text style={text}>
            If you believe this decision was made in error or have questions, please 
            don't hesitate to reach out to our support team.
          </Text>

          <Section style={ctaSection}>
            <Button style={ctaButton} href={signupUrl}>
              Apply Again
            </Button>
          </Section>
        </Section>

        <Hr style={hr} />

        {/* Footer */}
        <Section style={footerSection}>
          <Text style={footerText}>
            Questions? Contact us at{' '}
            <Link href="mailto:support@globalyos.com" style={link}>
              support@globalyos.com
            </Link>
          </Text>
          <Text style={footerText}>
            © {new Date().getFullYear()} GlobalyOS. All rights reserved.
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export default RejectionEmail

const main = {
  backgroundColor: '#f6f9fc',
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif",
}

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '0',
  maxWidth: '600px',
  borderRadius: '8px',
  overflow: 'hidden',
  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
}

const headerSection = {
  background: 'linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%)',
  padding: '32px 24px',
  textAlign: 'center' as const,
}

const logoImage = {
  borderRadius: '12px',
  marginBottom: '16px',
}

const headerTitle = {
  color: '#ffffff',
  fontSize: '24px',
  fontWeight: '700',
  margin: '0 0 8px 0',
  lineHeight: '1.3',
}

const headerSubtitle = {
  color: 'rgba(255, 255, 255, 0.9)',
  fontSize: '14px',
  margin: '0',
}

const contentSection = {
  padding: '32px',
}

const text = {
  color: '#334155',
  fontSize: '15px',
  lineHeight: '1.6',
  margin: '0 0 16px',
}

const reasonBox = {
  backgroundColor: '#fef2f2',
  borderRadius: '8px',
  padding: '20px',
  margin: '24px 0',
  borderLeft: '4px solid #ef4444',
}

const reasonTitle = {
  color: '#991b1b',
  fontSize: '14px',
  fontWeight: '600',
  margin: '0 0 8px',
}

const reasonText = {
  color: '#7f1d1d',
  fontSize: '14px',
  margin: '0',
  lineHeight: '1.5',
}

const stepsSection = {
  margin: '16px 0 24px',
  padding: '0 16px',
}

const stepItem = {
  color: '#334155',
  fontSize: '14px',
  margin: '0 0 8px',
  lineHeight: '1.5',
}

const ctaSection = {
  textAlign: 'center' as const,
  margin: '32px 0 24px',
}

const ctaButton = {
  backgroundColor: '#3b82f6',
  borderRadius: '8px',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: '600',
  textDecoration: 'none',
  padding: '14px 32px',
  display: 'inline-block',
}

const hr = {
  borderColor: '#e2e8f0',
  margin: '0 32px',
}

const footerSection = {
  padding: '24px 32px',
  backgroundColor: '#f8fafc',
}

const footerText = {
  color: '#94a3b8',
  fontSize: '12px',
  textAlign: 'center' as const,
  margin: '0 0 8px',
  lineHeight: '1.5',
}

const link = {
  color: '#3b82f6',
  textDecoration: 'underline',
}
