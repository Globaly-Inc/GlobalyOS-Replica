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

interface ConfirmationEmailProps {
  ownerName: string
  organizationName: string
  email: string
  statusUrl: string
  plan: string
}

export const ConfirmationEmail = ({
  ownerName,
  organizationName,
  email,
  statusUrl,
  plan,
}: ConfirmationEmailProps) => (
  <Html>
    <Head />
    <Preview>Your GlobalyOS application has been received - {organizationName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img
          src="https://globalyos.lovable.app/images/globalyos-logo-email.png"
          width="120"
          alt="GlobalyOS"
          style={logo}
        />
        
        <Heading style={heading}>Application Received! 🎉</Heading>
        
        <Text style={paragraph}>
          Hi {ownerName},
        </Text>
        
        <Text style={paragraph}>
          Thank you for applying to join GlobalyOS! We've received your application for <strong>{organizationName}</strong> and our team is reviewing it now.
        </Text>

        <Section style={infoBox}>
          <Text style={infoTitle}>Application Details</Text>
          <Text style={infoText}>
            <strong>Organization:</strong> {organizationName}
          </Text>
          <Text style={infoText}>
            <strong>Email:</strong> {email}
          </Text>
          <Text style={infoText}>
            <strong>Plan:</strong> {plan.charAt(0).toUpperCase() + plan.slice(1)}
          </Text>
        </Section>

        <Section style={timelineSection}>
          <Text style={timelineTitle}>What happens next?</Text>
          
          <Section style={timelineItem}>
            <Text style={timelineStep}>
              <span style={stepComplete}>✓</span> Application Submitted
            </Text>
            <Text style={timelineDesc}>Your details have been received</Text>
          </Section>
          
          <Section style={timelineItem}>
            <Text style={timelineStep}>
              <span style={stepInProgress}>●</span> Under Review
            </Text>
            <Text style={timelineDesc}>Our team is reviewing your application</Text>
          </Section>
          
          <Section style={timelineItem}>
            <Text style={timelineStep}>
              <span style={stepPending}>○</span> Welcome Email
            </Text>
            <Text style={timelineDesc}>You'll receive login credentials upon approval</Text>
          </Section>
        </Section>

        <Text style={paragraph}>
          Most applications are reviewed within <strong>24 hours</strong>. You'll receive an email notification once your application has been processed.
        </Text>

        <Section style={buttonContainer}>
          <Button style={button} href={statusUrl}>
            Check Application Status
          </Button>
        </Section>

        <Hr style={hr} />

        <Text style={footer}>
          If you have any questions, please contact our support team at{' '}
          <Link href="mailto:support@globalyos.com" style={link}>
            support@globalyos.com
          </Link>
        </Text>
        
        <Text style={footer}>
          © {new Date().getFullYear()} GlobalyOS. All rights reserved.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default ConfirmationEmail

const main = {
  backgroundColor: '#f6f9fc',
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Ubuntu, sans-serif',
}

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '40px 20px',
  marginBottom: '64px',
  borderRadius: '8px',
  maxWidth: '600px',
}

const logo = {
  margin: '0 auto 24px',
  display: 'block',
}

const heading = {
  color: '#1a1a1a',
  fontSize: '28px',
  fontWeight: '700',
  textAlign: 'center' as const,
  margin: '30px 0',
}

const paragraph = {
  color: '#525252',
  fontSize: '16px',
  lineHeight: '26px',
  margin: '16px 0',
}

const infoBox = {
  backgroundColor: '#f0f9ff',
  borderRadius: '8px',
  padding: '20px',
  margin: '24px 0',
  border: '1px solid #bae6fd',
}

const infoTitle = {
  color: '#0369a1',
  fontSize: '14px',
  fontWeight: '600',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
  margin: '0 0 12px 0',
}

const infoText = {
  color: '#525252',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '4px 0',
}

const timelineSection = {
  margin: '32px 0',
  padding: '0 20px',
}

const timelineTitle = {
  color: '#1a1a1a',
  fontSize: '16px',
  fontWeight: '600',
  margin: '0 0 16px 0',
}

const timelineItem = {
  marginBottom: '16px',
}

const timelineStep = {
  color: '#1a1a1a',
  fontSize: '14px',
  fontWeight: '500',
  margin: '0',
}

const timelineDesc = {
  color: '#737373',
  fontSize: '13px',
  margin: '2px 0 0 20px',
}

const stepComplete = {
  color: '#16a34a',
  marginRight: '8px',
}

const stepInProgress = {
  color: '#2563eb',
  marginRight: '8px',
}

const stepPending = {
  color: '#d4d4d4',
  marginRight: '8px',
}

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '32px 0',
}

const button = {
  backgroundColor: '#2563eb',
  borderRadius: '6px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: '600',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '12px 24px',
}

const hr = {
  borderColor: '#e5e5e5',
  margin: '32px 0',
}

const footer = {
  color: '#8898aa',
  fontSize: '12px',
  lineHeight: '16px',
  textAlign: 'center' as const,
  margin: '8px 0',
}

const link = {
  color: '#2563eb',
  textDecoration: 'underline',
}
