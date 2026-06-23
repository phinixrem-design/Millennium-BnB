const fs = require('fs');
const path = require('path');

const DB_FILE = process.env.VERCEL
  ? path.join('/tmp', 'reservations.json')
  : path.join(__dirname, 'reservations.json');

// Initialize database file
if (!fs.existsSync(DB_FILE)) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify([], null, 2));
  } catch (err) {
    console.error('Error initializing DB file:', err);
  }
}

function getReservations() {
  try {
    const data = fs.readFileSync(DB_FILE, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Error reading reservation DB:', err);
    return [];
  }
}

function saveReservations(reservations) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(reservations, null, 2));
  } catch (err) {
    console.error('Error writing to reservation DB:', err);
  }
}

function createReservation(booking) {
  const reservations = getReservations();
  const newBooking = {
    id: booking.id || `book_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    guestName: booking.guestName || 'Guest',
    guestEmail: booking.guestEmail || '',
    checkin: booking.checkin,
    checkout: booking.checkout,
    roomId: booking.roomId,
    roomName: booking.roomName || 'Standard Room',
    addons: booking.addons || [],
    totalPrice: booking.totalPrice,
    currency: booking.currency || 'USD',
    status: 'pending', // pending, confirmed, cancelled
    paymentMethod: booking.paymentMethod || '',
    paymentId: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  reservations.push(newBooking);
  saveReservations(reservations);
  return newBooking;
}

function confirmReservation(bookingId, paymentId, paymentMethod, metadata = {}) {
  const reservations = getReservations();
  const idx = reservations.findIndex(r => r.id === bookingId);
  if (idx !== -1) {
    reservations[idx].status = 'confirmed';
    reservations[idx].paymentId = paymentId;
    reservations[idx].paymentMethod = paymentMethod;
    reservations[idx].updatedAt = new Date().toISOString();
    if (metadata.guestEmail) reservations[idx].guestEmail = metadata.guestEmail;
    if (metadata.guestName) reservations[idx].guestName = metadata.guestName;
    saveReservations(reservations);
    console.log(`Reservation ${bookingId} confirmed successfully via ${paymentMethod}.`);
    return reservations[idx];
  }
  
  // If not found, create a new confirmed reservation using metadata (useful for Stripe webhook checkout.session.completed)
  console.log(`Reservation ${bookingId} not found in DB. Creating a new confirmed reservation from payment metadata.`);
  const newBooking = {
    id: bookingId,
    guestName: metadata.guestName || 'Guest',
    guestEmail: metadata.guestEmail || '',
    checkin: metadata.checkin,
    checkout: metadata.checkout,
    roomId: metadata.roomId,
    roomName: metadata.roomName || 'Standard Room',
    addons: metadata.addons ? metadata.addons.split(',') : [],
    totalPrice: parseFloat(metadata.totalPrice || 0),
    currency: metadata.currency || 'USD',
    status: 'confirmed',
    paymentMethod: paymentMethod,
    paymentId: paymentId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  reservations.push(newBooking);
  saveReservations(reservations);
  return newBooking;
}

module.exports = {
  getReservations,
  createReservation,
  confirmReservation
};
