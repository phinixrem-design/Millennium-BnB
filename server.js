require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const Stripe = require('stripe');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 8080;

// Initialize Stripe (gracefully handle placeholder keys)
let stripe;
try {
  stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');
} catch (err) {
  console.warn('Warning: Stripe failed to initialize. Check STRIPE_SECRET_KEY in .env file.');
}

// Enable CORS
app.use(cors());

/**
 * 1. STRIPE WEBHOOK LISTENER
 * This route must be declared BEFORE app.use(express.json())
 * because it requires the raw request body to verify the signature.
 */
app.post('/api/webhooks/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripe) {
    console.error('Webhook error: Stripe is not initialized.');
    return res.status(500).send('Stripe is not configured');
  }

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error(`Webhook Error: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the completed checkout session event
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    
    console.log(`Stripe checkout session completed: ${session.id}`);

    // Retrieve booking details from metadata
    const metadata = session.metadata || {};
    const bookingId = metadata.bookingId || `stripe_${session.id}`;
    const paymentId = session.payment_intent || session.id;

    // Confirm reservation in the database
    try {
      db.confirmReservation(bookingId, paymentId, 'Stripe', {
        guestName: metadata.guestName,
        guestEmail: session.customer_details?.email || metadata.guestEmail,
        checkin: metadata.checkin,
        checkout: metadata.checkout,
        roomId: metadata.roomId,
        roomName: metadata.roomName,
        addons: metadata.addons,
        totalPrice: metadata.totalPrice
      });
    } catch (err) {
      console.error('Failed to confirm reservation in DB:', err);
    }
  }

  res.json({ received: true });
});

// For all other routes, parse JSON and urlencoded requests
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from the repository root (e.g. for /en/offers/...)
app.use(express.static(path.join(__dirname)));

/**
 * 2. CONFIG ENDPOINT
 * Exposes public client IDs for payment SDKs to the frontend dynamically.
 */
app.get('/api/config', (req, res) => {
  res.json({
    paypalClientId: process.env.PAYPAL_CLIENT_ID || '',
    paypalMode: process.env.PAYPAL_MODE || 'sandbox'
  });
});

/**
 * 3. STRIPE CREATE CHECKOUT SESSION
 */
app.post('/api/stripe/create-checkout-session', async (req, res) => {
  const {
    guestName,
    guestEmail,
    checkin,
    checkout,
    roomId,
    roomName,
    addons,
    totalPrice
  } = req.body;

  // Simple validation
  if (!checkin || !checkout || !totalPrice || !roomId) {
    return res.status(400).json({ error: 'Missing required booking parameters.' });
  }

  if (!stripe || process.env.STRIPE_SECRET_KEY === 'placeholder_stripe_secret_key') {
    return res.status(500).json({
      error: 'Stripe is not configured. Please supply a valid STRIPE_SECRET_KEY in the backend .env.'
    });
  }

  try {
    // 1. Create a pending reservation in our database to generate a unique bookingId
    const booking = db.createReservation({
      guestName,
      guestEmail,
      checkin,
      checkout,
      roomId,
      roomName,
      addons,
      totalPrice: parseFloat(totalPrice),
      paymentMethod: 'Stripe'
    });

    const host = `${req.protocol}://${req.get('host')}`;
    const successUrl = `${host}/en/offers/united-states/millennium-hotel-broadway-times-square/fifa-2026/index.html?payment=success&bookingId=${booking.id}`;
    const cancelUrl = `${host}/en/offers/united-states/millennium-hotel-broadway-times-square/fifa-2026/index.html?payment=cancel`;

    // 2. Create the Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      customer_email: guestEmail || undefined,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `FIFA 2026 Room Booking: ${roomName}`,
              description: `Stay: ${checkin} to ${checkout}. Add-ons: ${addons?.join(', ') || 'None'}.`,
            },
            unit_amount: Math.round(parseFloat(totalPrice) * 100), // amount in cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        bookingId: booking.id,
        guestName: guestName || 'Guest',
        guestEmail: guestEmail || '',
        checkin,
        checkout,
        roomId,
        roomName,
        addons: addons?.join(',') || '',
        totalPrice: String(totalPrice)
      }
    });

    res.json({ url: session.url, sessionId: session.id, bookingId: booking.id });
  } catch (err) {
    console.error('Error creating Stripe Checkout session:', err);
    res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
});

/**
 * 4. PAYPAL ACCESS TOKEN HELPER
 */
async function getPayPalAccessToken() {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

  if (!clientId || !clientSecret || 
      clientId === 'placeholder_paypal_client_id' || 
      clientSecret === 'placeholder_paypal_client_secret') {
    throw new Error('PayPal API credentials are not configured in .env');
  }

  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const paypalUrl = process.env.PAYPAL_MODE === 'live'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';

  const response = await fetch(`${paypalUrl}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: 'grant_type=client_credentials'
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to retrieve PayPal Access Token: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return data.access_token;
}

/**
 * 5. PAYPAL CREATE ORDER
 */
app.post('/api/paypal/create-order', async (req, res) => {
  const {
    guestName,
    guestEmail,
    checkin,
    checkout,
    roomId,
    roomName,
    addons,
    totalPrice
  } = req.body;

  if (!checkin || !checkout || !totalPrice || !roomId) {
    return res.status(400).json({ error: 'Missing required booking parameters.' });
  }

  try {
    // 1. Create a pending reservation in our database
    const booking = db.createReservation({
      guestName,
      guestEmail,
      checkin,
      checkout,
      roomId,
      roomName,
      addons,
      totalPrice: parseFloat(totalPrice),
      paymentMethod: 'PayPal'
    });

    // 2. Fetch PayPal access token
    const accessToken = await getPayPalAccessToken();
    const paypalUrl = process.env.PAYPAL_MODE === 'live'
      ? 'https://api-m.paypal.com'
      : 'https://api-m.sandbox.paypal.com';

    // 3. Make create-order API call to PayPal
    const response = await fetch(`${paypalUrl}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [
          {
            reference_id: booking.id,
            amount: {
              currency_code: 'USD',
              value: parseFloat(totalPrice).toFixed(2)
            },
            description: `FIFA World Cup 2026 Room Stay - ${roomName} (${checkin} to ${checkout})`
          }
        ]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`PayPal Create Order Error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    res.json({ id: data.id, bookingId: booking.id });
  } catch (err) {
    console.error('Error creating PayPal order:', err);
    res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
});

/**
 * 6. PAYPAL CAPTURE ORDER
 */
app.post('/api/paypal/capture-order', async (req, res) => {
  const { orderId, bookingId } = req.body;

  if (!orderId || !bookingId) {
    return res.status(400).json({ error: 'Missing orderId or bookingId parameter.' });
  }

  try {
    // 1. Get PayPal access token
    const accessToken = await getPayPalAccessToken();
    const paypalUrl = process.env.PAYPAL_MODE === 'live'
      ? 'https://api-m.paypal.com'
      : 'https://api-m.sandbox.paypal.com';

    // 2. Capture PayPal payment
    const response = await fetch(`${paypalUrl}/v2/checkout/orders/${orderId}/capture`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`PayPal Capture Order Error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();

    // Check capture status
    const purchaseUnit = data.purchase_units?.[0];
    const capture = purchaseUnit?.payments?.captures?.[0];

    if (data.status === 'COMPLETED' || capture?.status === 'COMPLETED') {
      const captureId = capture?.id || orderId;
      
      // Update database status to confirmed
      const confirmedBooking = db.confirmReservation(bookingId, captureId, 'PayPal', {
        guestEmail: data.payer?.email_address,
        guestName: `${data.payer?.name?.given_name || ''} ${data.payer?.name?.surname || ''}`.trim()
      });

      return res.json({ status: 'COMPLETED', booking: confirmedBooking });
    } else {
      return res.status(400).json({ error: `PayPal Capture Status: ${data.status}` });
    }
  } catch (err) {
    console.error('Error capturing PayPal order:', err);
    res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
});

// Start server (only if not running on Vercel as a Serverless Function)
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

module.exports = app;
