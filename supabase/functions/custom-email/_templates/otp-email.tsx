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
} from 'https://esm.sh/@react-email/components@0.0.12'
import * as React from 'https://esm.sh/react@18.3.1'

interface OTPEmailProps {
  userName: string
  otpCode: string
  supabaseUrl: string
  tokenHash: string
  redirectTo: string
  emailActionType: string
}

// Stable logo URL from Supabase Storage
const GLOBALYOS_LOGO_URL = 'https://rygowmzkvxgnxagqlyxf.supabase.co/storage/v1/object/public/system-assets//GlobalyOS%20Blue%20BG%20Icon.png';

export const OTPEmail = ({
  userName,
  otpCode,
  supabaseUrl,
  tokenHash,
  redirectTo,
  emailActionType,
}: OTPEmailProps) => {
  return (
    <Html>
      <Head />
      <Preview>Your GlobalyOS verification code is {otpCode}</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Unified lighter blue header */}
          <Section style={headerSection}>
            <Img
              src={GLOBALYOS_LOGO_URL}
              alt="GlobalyOS"
              width="56"
              height="56"
              style={logoImage}
            />
            <Heading style={headerTitle}>Sign In to GlobalyOS</Heading>
            <Text style={headerSubtitle}>Hi {userName}!</Text>
          </Section>

          {/* Main Content */}
          <Section style={contentSection}>
            <Text style={text}>
              Use the following 6-digit code to sign in:
            </Text>

            <Section style={codeContainer}>
              <Text style={codeText}>{otpCode}</Text>
            </Section>

            <Text style={subText}>
              This code will expire in 10 minutes.
            </Text>

            <Section style={divider} />

            <Text style={alternativeText}>
              Or click the button below to sign in directly:
            </Text>

            <Section style={buttonContainer}>
              <Link
                href={`${supabaseUrl}/auth/v1/verify?token=${tokenHash}&type=${emailActionType}&redirect_to=${redirectTo}`}
                style={button}
              >
                Sign in to GlobalyOS
              </Link>
            </Section>

            <Text style={warningText}>
              If you didn't request this code, you can safely ignore this email.
            </Text>
          </Section>

          {/* Footer */}
          <Section style={footerSection}>
            <Text style={footer}>
              © {new Date().getFullYear()} GlobalyOS - HRMS & Social Intranet
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

export default OTPEmail

const main = {
  backgroundColor: '#f6f9fc',
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif",
}

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '0',
  maxWidth: '480px',
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
  fontSize: '16px',
  margin: '0',
}

const contentSection = {
  padding: '32px 24px',
}

const text = {
  color: '#4b5563',
  fontSize: '16px',
  lineHeight: '24px',
  textAlign: 'center' as const,
  margin: '0 0 24px',
}

const codeContainer = {
  background: 'linear-gradient(135deg, #f3f4f6, #e5e7eb)',
  borderRadius: '12px',
  padding: '24px',
  margin: '0 0 16px',
}

const codeText = {
  color: '#1f2937',
  fontSize: '36px',
  fontWeight: 'bold' as const,
  letterSpacing: '8px',
  textAlign: 'center' as const,
  margin: '0',
  fontFamily: 'monospace',
}

const subText = {
  color: '#9ca3af',
  fontSize: '14px',
  textAlign: 'center' as const,
  margin: '0 0 32px',
}

const divider = {
  borderTop: '1px solid #e5e7eb',
  margin: '0 0 24px',
}

const alternativeText = {
  color: '#6b7280',
  fontSize: '14px',
  textAlign: 'center' as const,
  margin: '0 0 16px',
}

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '0 0 24px',
}

const button = {
  backgroundColor: '#3b82f6',
  borderRadius: '8px',
  color: '#ffffff',
  display: 'inline-block',
  fontSize: '14px',
  fontWeight: '600' as const,
  padding: '12px 24px',
  textDecoration: 'none',
}

const warningText = {
  color: '#9ca3af',
  fontSize: '12px',
  textAlign: 'center' as const,
  margin: '0',
}

const footerSection = {
  padding: '16px 24px',
  backgroundColor: '#f8fafc',
  textAlign: 'center' as const,
}

const footer = {
  color: '#d1d5db',
  fontSize: '12px',
  margin: '0',
}
