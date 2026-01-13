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
} from 'https://esm.sh/@react-email/components@0.0.22'
import * as React from 'https://esm.sh/react@18.3.1'

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
        {/* Logo */}
        <Section style={logoSection}>
          <Img
            src="https://rygowmzkvxgnxagqlyxf.supabase.co/storage/v1/object/public/system-assets/globalyos-logo.png"
            width="180"
            height="40"
            alt="GlobalyOS"
            style={logo}
          />
        </Section>

        {/* Header */}
        <Section style={headerSection}>
          <Heading style={h1}>Application Update</Heading>
          <Text style={heroText}>
            Regarding your organization registration
          </Text>
        </Section>

        <Hr style={hr} />

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

const logoSection = {
  backgroundColor: '#1a1a2e',
  padding: '24px 32px',
  textAlign: 'center' as const,
}

const logo = {
  margin: '0 auto',
}

const headerSection = {
  padding: '32px 32px 16px',
  textAlign: 'center' as const,
}

const h1 = {
  color: '#1a1a2e',
  fontSize: '28px',
  fontWeight: '700',
  margin: '0 0 12px',
  lineHeight: '1.3',
}

const heroText = {
  color: '#64748b',
  fontSize: '16px',
  margin: '0',
}

const hr = {
  borderColor: '#e2e8f0',
  margin: '0 32px',
}

const contentSection = {
  padding: '24px 32px',
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
  backgroundColor: '#6366f1',
  borderRadius: '8px',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: '600',
  textDecoration: 'none',
  padding: '14px 32px',
  display: 'inline-block',
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
  color: '#6366f1',
  textDecoration: 'underline',
}
