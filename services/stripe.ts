import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string)

export async function createCheckoutSession(opts: {
  registrationId: string
  eventTitle: string
  price: number      // SGD
  participantEmail: string
  deadlineHours: number
}): Promise<string> {
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [{
      price_data: {
        currency: 'sgd',
        product_data: { name: opts.eventTitle },
        unit_amount: Math.round(opts.price * 100),
      },
      quantity: 1,
    }],
    mode: 'payment',
    customer_email: opts.participantEmail,
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/my-registrations?payment=success`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/my-registrations?payment=cancelled`,
    metadata: { registrationId: opts.registrationId },
    expires_at: Math.floor(Date.now() / 1000) + Math.min(opts.deadlineHours, 24) * 3600,
  })
  return session.url as string
}

export { stripe }
