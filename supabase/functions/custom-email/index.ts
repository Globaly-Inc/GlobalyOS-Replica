import React from 'https://esm.sh/react@18.3.1'
import { Webhook } from 'https://esm.sh/standardwebhooks@1.0.0'
import { Resend } from 'https://esm.sh/resend@4.0.0'
import { render } from 'https://esm.sh/@react-email/render@0.0.12'
import { OTPEmail } from './_templates/otp-email.tsx'

const resend = new Resend(Deno.env.get('RESEND_API_KEY') as string)
const hookSecret = Deno.env.get('SEND_EMAIL_HOOK_SECRET') as string

Deno.serve(async (req) => {
  console.log('Custom email hook received request')
  
  if (req.method !== 'POST') {
    console.log('Invalid method:', req.method)
    return new Response('Method not allowed', { status: 405 })
  }

  const payload = await req.text()
  const headers = Object.fromEntries(req.headers)
  
  console.log('Verifying webhook signature')
  const wh = new Webhook(hookSecret)
  
  try {
    const {
      user,
      email_data: { token, token_hash, redirect_to, email_action_type },
    } = wh.verify(payload, headers) as {
      user: {
        email: string
        user_metadata?: {
          full_name?: string
        }
      }
      email_data: {
        token: string
        token_hash: string
        redirect_to: string
        email_action_type: string
        site_url: string
        token_new: string
        token_hash_new: string
      }
    }

    console.log('Webhook verified for user:', user.email)
    console.log('Email action type:', email_action_type)

    const userName = user.user_metadata?.full_name || user.email.split('@')[0]

    const html = render(
      React.createElement(OTPEmail, {
        userName,
        otpCode: token,
        supabaseUrl: Deno.env.get('SUPABASE_URL') ?? '',
        tokenHash: token_hash,
        redirectTo: redirect_to,
        emailActionType: email_action_type,
      })
    )

    console.log('Sending email via Resend')
    
    const { data, error } = await resend.emails.send({
      from: 'TeamHub <onboarding@resend.dev>',
      to: [user.email],
      subject: `Your TeamHub verification code: ${token}`,
      html,
    })

    if (error) {
      console.error('Resend error:', error)
      throw error
    }

    console.log('Email sent successfully:', data)

    return new Response(JSON.stringify({}), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    const error = err as { code?: number; message?: string }
    console.error('Error in custom-email function:', error)
    return new Response(
      JSON.stringify({
        error: {
          http_code: error.code || 500,
          message: error.message || 'Unknown error',
        },
      }),
      {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
})
