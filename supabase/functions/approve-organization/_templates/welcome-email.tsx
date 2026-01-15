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

interface WelcomeEmailProps {
  ownerName: string
  organizationName: string
  email: string
  trialDays: number
  loginUrl: string
}

export const WelcomeEmail = ({
  ownerName,
  organizationName,
  email,
  trialDays,
  loginUrl,
}: WelcomeEmailProps) => (
  <Html>
    <Head />
    <Preview>Welcome to GlobalyOS - Your organization has been approved!</Preview>
    <Body style={main}>
      <Container style={container}>
        {/* Logo */}
        <Section style={logoSection}>
          <Img
            src="https://globalyos.lovable.app/images/globalyos-logo-email.png"
            width="180"
            alt="GlobalyOS"
            style={logo}
          />
        </Section>

        {/* Header */}
        <Section style={headerSection}>
          <Heading style={h1}>Welcome to GlobalyOS! 🎉</Heading>
          <Text style={heroText}>
            Great news! Your organization has been approved.
          </Text>
        </Section>

        <Hr style={hr} />

        {/* Main Content */}
        <Section style={contentSection}>
          <Text style={text}>Hi {ownerName},</Text>
          
          <Text style={text}>
            We're thrilled to let you know that <strong>{organizationName}</strong> has been approved 
            and is now ready to use GlobalyOS!
          </Text>

          <Section style={infoBox}>
            <Text style={infoTitle}>Your Account Details</Text>
            <Text style={infoItem}>
              <strong>Organization:</strong> {organizationName}
            </Text>
            <Text style={infoItem}>
              <strong>Email:</strong> {email}
            </Text>
            <Text style={infoItem}>
              <strong>Trial Period:</strong> {trialDays} days free
            </Text>
          </Section>

          <Text style={text}>
            You can now sign in to your account and start setting up your workspace. 
            Here's what you can do next:
          </Text>

          <Section style={stepsSection}>
            <Text style={stepItem}>✅ Complete your organization profile</Text>
            <Text style={stepItem}>✅ Invite your team members</Text>
            <Text style={stepItem}>✅ Set up departments and offices</Text>
            <Text style={stepItem}>✅ Configure attendance and leave policies</Text>
          </Section>

          <Section style={ctaSection}>
            <Button style={ctaButton} href={loginUrl}>
              Sign In to GlobalyOS
            </Button>
          </Section>

          <Text style={smallText}>
            When you sign in, you'll receive a one-time code sent to your email for secure access.
          </Text>
        </Section>

        <Hr style={hr} />

        {/* Footer */}
        <Section style={footerSection}>
          <Text style={footerText}>
            Need help getting started? Check out our{' '}
            <Link href="https://www.globalyos.com/docs" style={link}>
              documentation
            </Link>{' '}
            or contact{' '}
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

export default WelcomeEmail

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
  backgroundColor: '#ffffff',
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

const infoBox = {
  backgroundColor: '#f1f5f9',
  borderRadius: '8px',
  padding: '20px',
  margin: '24px 0',
}

const infoTitle = {
  color: '#1a1a2e',
  fontSize: '14px',
  fontWeight: '600',
  margin: '0 0 12px',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
}

const infoItem = {
  color: '#475569',
  fontSize: '14px',
  margin: '0 0 8px',
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

const smallText = {
  color: '#94a3b8',
  fontSize: '13px',
  textAlign: 'center' as const,
  margin: '0',
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
