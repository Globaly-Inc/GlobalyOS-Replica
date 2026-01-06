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

const getLogoUrl = (redirectTo: string) => {
  try {
    const origin = new URL(redirectTo).origin
    return `${origin}/images/globalyos-icon.png`
  } catch {
    const base =
      Deno.env.get('APP_URL') ||
      Deno.env.get('PUBLIC_URL') ||
      Deno.env.get('APP_BASE_URL') ||
      'https://people.globalyhub.com'

    return `${base.replace(/\/$/, '')}/images/globalyos-icon.png`
  }
}

export const OTPEmail = ({
  userName,
  otpCode,
  supabaseUrl,
  tokenHash,
  redirectTo,
  emailActionType,
}: OTPEmailProps) => {
  const logoUrl = getLogoUrl(redirectTo)

  return (
    <Html>
      <Head />
      <Preview>Your GlobalyOS verification code is {otpCode}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={logoSection}>
            <Img
              src={logoUrl}
              alt="GlobalyOS"
              width="64"
              height="64"
              style={logoImage}
            />
          </Section>

          <Heading style={h1}>Hi {userName}!</Heading>

          <Text style={text}>
            Use the following 6-digit code to sign in to GlobalyOS:
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

          <Text style={footer}>
            If you didn't request this code, you can safely ignore this email.
          </Text>

          <Text style={footerBrand}>
            © {new Date().getFullYear()} GlobalyOS - HRMS & Social Intranet
          </Text>
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
  padding: '40px 20px',
  borderRadius: '12px',
  maxWidth: '480px',
}

const logoSection = {
  textAlign: 'center' as const,
  marginBottom: '24px',
}

const logoImage = {
  borderRadius: '16px',
}

const h1 = {
  color: '#1f2937',
  fontSize: '24px',
  fontWeight: 'bold' as const,
  textAlign: 'center' as const,
  margin: '0 0 16px',
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
  margin: '0 0 32px',
}

const button = {
  backgroundColor: '#4f46e5',
  borderRadius: '8px',
  color: '#ffffff',
  display: 'inline-block',
  fontSize: '14px',
  fontWeight: '600' as const,
  padding: '12px 24px',
  textDecoration: 'none',
}

const footer = {
  color: '#9ca3af',
  fontSize: '12px',
  textAlign: 'center' as const,
  margin: '0 0 8px',
}

const footerBrand = {
  color: '#d1d5db',
  fontSize: '12px',
  textAlign: 'center' as const,
  margin: '0',
}
