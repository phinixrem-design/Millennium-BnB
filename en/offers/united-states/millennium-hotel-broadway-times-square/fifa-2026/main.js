/**
 * Millennium Hotel Broadway — FIFA World Cup 2026 Offer Page
 */

document.addEventListener('DOMContentLoaded', () => {
  lucide.createIcons();
  initNavbar();
  initMobileNav();
  initScrollReveal();
  initCountUp();
  initCountdown();
  initTransitPlanner();
  initRoomCustomizer();
  initBookingForm();
  initAccordionEnhancement();
  setDefaultDates();
  initPaymentSystem();
  checkPostPaymentParams();
});

/* Navbar scroll behavior */
function initNavbar() {
  const navbar = document.getElementById('navbar');
  const hero = document.getElementById('hero');
  if (!navbar) return;

  const updateNavbar = () => {
    const scrollY = window.scrollY;
    const heroBottom = hero ? hero.offsetHeight * 0.15 : 80;

    navbar.classList.toggle('navbar--scrolled', scrollY > heroBottom);
    navbar.classList.toggle('navbar--transparent', scrollY <= heroBottom);
  };

  updateNavbar();
  window.addEventListener('scroll', updateNavbar, { passive: true });
}

/* Mobile hamburger menu */
function initMobileNav() {
  const toggle = document.getElementById('navToggle');
  const nav = document.getElementById('navMenu');
  if (!toggle || !nav) return;

  toggle.addEventListener('click', () => {
    const isOpen = nav.classList.toggle('is-open');
    toggle.setAttribute('aria-expanded', String(isOpen));
    toggle.innerHTML = isOpen
      ? '<i data-lucide="x"></i>'
      : '<i data-lucide="menu"></i>';
    lucide.createIcons();
  });

  nav.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      nav.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
      toggle.innerHTML = '<i data-lucide="menu"></i>';
      lucide.createIcons();
    });
  });
}

/* IntersectionObserver scroll reveals */
function initScrollReveal() {
  const reveals = document.querySelectorAll('.reveal');
  if (!reveals.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
  );

  reveals.forEach((el) => observer.observe(el));
}

/* Count-up animation for 20% stat */
function initCountUp() {
  const statEl = document.querySelector('[data-count]');
  if (!statEl) return;

  const target = parseInt(statEl.dataset.count, 10);
  const suffix = statEl.dataset.suffix || '% OFF';
  let animated = false;

  const animate = () => {
    if (animated) return;
    animated = true;

    const duration = 1200;
    const start = performance.now();

    const step = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const value = Math.round(eased * target);
      statEl.textContent = `${value}${suffix}`;
      if (progress < 1) requestAnimationFrame(step);
    };

    requestAnimationFrame(step);
  };

  const observer = new IntersectionObserver(
    (entries) => {
      if (entries[0].isIntersecting) {
        animate();
        observer.disconnect();
      }
    },
    { threshold: 0.5 }
  );

  observer.observe(statEl);
}

/* Booking form */
function initBookingForm() {
  const form = document.getElementById('bookingForm');
  const promo = document.getElementById('promo');
  if (!form) return;

  if (promo) {
    promo.classList.add('promo-highlight');
    promo.addEventListener('focus', () => promo.select());
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    openPaymentModal();
  });
}

/* Smooth accordion max-height (enhance native details) */
function initAccordionEnhancement() {
  const accordion = document.getElementById('termsAccordion');
  if (!accordion) return;
  const summary = accordion.querySelector('summary');
  const content = accordion.querySelector('.accordion__content');
  if (!summary || !content) return;

  let isAnimating = false;

  summary.addEventListener('click', (e) => {
    e.preventDefault();
    if (isAnimating) return;

    if (!accordion.open) {
      isAnimating = true;
      accordion.open = true;
      content.style.maxHeight = '0';
      content.style.padding = '0 1.25rem';
      
      content.offsetHeight; // trigger reflow
      
      content.style.maxHeight = content.scrollHeight + 'px';
      content.style.padding = '1rem 1.25rem 1.25rem';
      
      const onTransitionEnd = (event) => {
        if (event.propertyName === 'max-height') {
          content.removeEventListener('transitionend', onTransitionEnd);
          content.style.maxHeight = 'none';
          isAnimating = false;
        }
      };
      content.addEventListener('transitionend', onTransitionEnd);
    } else {
      isAnimating = true;
      content.style.maxHeight = content.scrollHeight + 'px';
      content.style.padding = '1rem 1.25rem 1.25rem';
      
      content.offsetHeight; // trigger reflow
      
      content.style.maxHeight = '0';
      content.style.padding = '0 1.25rem';
      
      const onTransitionEnd = (event) => {
        if (event.propertyName === 'max-height') {
          content.removeEventListener('transitionend', onTransitionEnd);
          accordion.open = false;
          isAnimating = false;
        }
      };
      content.addEventListener('transitionend', onTransitionEnd);
    }
  });
}

/* Default check-in/out dates (14 days out, 3-night stay) */
function setDefaultDates() {
  const checkin = document.getElementById('checkin');
  const checkout = document.getElementById('checkout');
  if (!checkin || !checkout) return;

  const today = new Date();
  const inDate = new Date(today);
  inDate.setDate(inDate.getDate() + 14);

  const outDate = new Date(inDate);
  outDate.setDate(outDate.getDate() + 3);

  checkin.value = formatDate(inDate);
  checkout.value = formatDate(outDate);

  checkin.min = formatDate(today);
  const defaultMinCheckout = new Date(inDate);
  defaultMinCheckout.setDate(defaultMinCheckout.getDate() + 1);
  checkout.min = formatDate(defaultMinCheckout);

  const syncCheckoutMinimum = () => {
    const checkinDate = parseLocalDate(checkin.value);
    const minOut = new Date(checkinDate);
    minOut.setDate(minOut.getDate() + 1);
    checkout.min = formatDate(minOut);
    
    if (checkout.value <= checkin.value) {
      const adjusted = new Date(checkinDate);
      adjusted.setDate(adjusted.getDate() + 3);
      checkout.value = formatDate(adjusted);
    }
  };

  checkin.addEventListener('change', syncCheckoutMinimum);
  checkout.addEventListener('change', syncCheckoutMinimum);
}

function formatDate(d) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseLocalDate(str) {
  if (!str) return new Date();
  const [year, month, day] = str.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/* Countdown to World Cup 2026 */
function initCountdown() {
  const daysEl = document.getElementById('cd-days');
  const hoursEl = document.getElementById('cd-hours');
  const minsEl = document.getElementById('cd-mins');
  const secsEl = document.getElementById('cd-secs');
  
  if (!daysEl || !hoursEl || !minsEl || !secsEl) return;
  
  // June 11, 2026 18:00:00 UTC
  const targetDate = new Date(Date.UTC(2026, 5, 11, 18, 0, 0)).getTime();
  
  const updateCountdown = () => {
    const now = new Date().getTime();
    const distance = targetDate - now;
    
    if (distance < 0) {
      daysEl.textContent = '00';
      hoursEl.textContent = '00';
      minsEl.textContent = '00';
      secsEl.textContent = '00';
      const titleEl = document.querySelector('.countdown-title');
      if (titleEl) titleEl.textContent = 'The FIFA World Cup 2026 is LIVE!';
      clearInterval(interval);
      return;
    }
    
    const days = Math.floor(distance / (1000 * 60 * 60 * 24));
    const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((distance % (1000 * 60)) / 1000);
    
    daysEl.textContent = String(days).padStart(2, '0');
    hoursEl.textContent = String(hours).padStart(2, '0');
    minsEl.textContent = String(minutes).padStart(2, '0');
    secsEl.textContent = String(seconds).padStart(2, '0');
  };
  
  updateCountdown();
  const interval = setInterval(updateCountdown, 1000);
}

/* Interactive Transit Planner */
function initTransitPlanner() {
  const tabs = document.querySelectorAll('.transit-tab');
  const panels = document.querySelectorAll('.transit-panel');
  const activePath = document.getElementById('activeRoutePath');
  const bgPath = document.querySelector('.route-path-bg');
  const tracker = document.getElementById('routeTracker');
  const trackerIcon = document.getElementById('trackerIcon');
  
  if (!tabs.length || !panels.length) return;
  
  const transitRoutes = {
    bus: {
      path: 'M 10 20 Q 50 5, 90 20',
      color: 'var(--gold)',
      icon: 'bus',
      trackerBg: 'var(--white)',
      trackerColor: 'var(--navy)'
    },
    rail: {
      path: 'M 10 20 Q 50 35, 90 20',
      color: '#3A86FF',
      icon: 'train-front',
      trackerBg: '#3A86FF',
      trackerColor: 'var(--white)'
    },
    car: {
      path: 'M 10 20 L 90 20',
      color: 'var(--fifa-green)',
      icon: 'car',
      trackerBg: 'var(--fifa-green)',
      trackerColor: 'var(--white)'
    }
  };

  const animatePath = (type) => {
    const route = transitRoutes[type];
    if (!route) return;
    
    if (activePath) {
      activePath.setAttribute('d', route.path);
      activePath.style.stroke = route.color;
      
      const length = activePath.getTotalLength();
      activePath.style.strokeDasharray = String(length);
      activePath.style.strokeDashoffset = String(length);
      activePath.getBoundingClientRect();
      activePath.style.strokeDashoffset = '0';
    }
    
    if (bgPath) {
      bgPath.setAttribute('d', route.path);
    }
    
    if (tracker) {
      tracker.style.offsetPath = `path('${route.path}')`;
      tracker.style.background = route.trackerBg;
      tracker.style.color = route.trackerColor;
      tracker.style.animation = 'none';
      tracker.offsetHeight;
      tracker.style.animation = 'moveTracker 4s infinite linear';
    }
    
    if (trackerIcon) {
      trackerIcon.setAttribute('data-lucide', route.icon);
      lucide.createIcons();
    }
  };

  setTimeout(() => animatePath('bus'), 100);

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const type = tab.dataset.transit;
      
      tabs.forEach(t => {
        t.classList.remove('active');
        t.setAttribute('aria-selected', 'false');
      });
      tab.classList.add('active');
      tab.setAttribute('aria-selected', 'true');
      
      panels.forEach(panel => {
        if (panel.id === `transit-${type}`) {
          panel.style.display = 'block';
        } else {
          panel.style.display = 'none';
        }
      });
      
      animatePath(type);
    });
  });
}

/* Room Customizer & Pricing Calculator */
function initRoomCustomizer() {
  const cards = document.querySelectorAll('.room-select-card');
  const checkboxes = document.querySelectorAll('.addon-checkbox');
  const checkinInput = document.getElementById('checkin');
  const checkoutInput = document.getElementById('checkout');
  const adultsSelect = document.getElementById('adults');
  const roomsSelect = document.getElementById('rooms');
  
  const baseEl = document.getElementById('summary-base');
  const addonsEl = document.getElementById('summary-addons');
  const discountEl = document.getElementById('summary-discount');
  const origTotalEl = document.getElementById('summary-orig-total');
  const totalEl = document.getElementById('summary-total');
  const bookBtn = document.querySelector('.customizer-book-btn');
  
  if (!cards.length) return;

  const getDaysDifference = (start, end) => {
    if (!start || !end) return 3;
    const sDate = new Date(start);
    const eDate = new Date(end);
    const timeDiff = eDate.getTime() - sDate.getTime();
    if (isNaN(timeDiff) || timeDiff <= 0) return 3;
    return Math.ceil(timeDiff / (1000 * 3600 * 24));
  };

  const calculateRates = () => {
    const activeCard = document.querySelector('.room-select-card.active');
    if (!activeCard) return;

    const basePrice = parseFloat(activeCard.dataset.basePrice);
    const checkin = checkinInput?.value;
    const checkout = checkoutInput?.value;
    const nights = getDaysDifference(checkin, checkout);
    const guests = parseInt(adultsSelect?.value || '2', 10);
    const roomsCount = parseInt(roomsSelect?.value || '1', 10);

    let addonsPrice = 0;
    checkboxes.forEach(cb => {
      if (cb.checked) {
        const price = parseFloat(cb.dataset.price);
        const calc = cb.dataset.calc;
        if (calc === 'flat') {
          addonsPrice += price;
        } else if (calc === 'guest') {
          addonsPrice += price * guests;
        } else if (calc === 'day') {
          addonsPrice += price * guests * nights;
        }
      }
    });

    const roomTotal = basePrice * nights * roomsCount;
    const promoDiscount = roomTotal * 0.20;
    const originalTotal = roomTotal + addonsPrice;
    const finalTotal = originalTotal - promoDiscount;

    if (baseEl) baseEl.textContent = `$${basePrice.toFixed(2)} / night`;
    if (addonsEl) addonsEl.textContent = `$${addonsPrice.toFixed(2)}`;
    if (discountEl) discountEl.textContent = `-$${promoDiscount.toFixed(2)} / night`;
    if (origTotalEl) origTotalEl.textContent = `$${originalTotal.toFixed(2)}`;
    if (totalEl) totalEl.textContent = `$${finalTotal.toFixed(2)}`;

    if (bookBtn) {
      const roomType = activeCard.dataset.room;
      const selectedAddons = Array.from(checkboxes)
        .filter(cb => cb.checked)
        .map(cb => cb.dataset.addon)
        .join(',');

      const params = new URLSearchParams({
        hotel: 'millennium-hotel-broadway-times-square',
        hotelcode: '13507',
        checkin: checkin || '',
        checkout: checkout || '',
        adults: String(guests),
        rooms: String(roomsCount),
        offercode: 'FIFA',
        promocode: 'FIFA',
        roomtype: roomType,
        addons: selectedAddons
      });

      bookBtn.href = `https://www.millenniumhotels.com/en/bookings/?${params.toString()}`;
    }
  };

  cards.forEach(card => {
    card.addEventListener('click', () => {
      cards.forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      calculateRates();
    });
  });

  checkboxes.forEach(cb => {
    cb.addEventListener('change', calculateRates);
  });

  checkinInput?.addEventListener('change', calculateRates);
  checkoutInput?.addEventListener('change', calculateRates);
  adultsSelect?.addEventListener('change', calculateRates);
  roomsSelect?.addEventListener('change', calculateRates);

  calculateRates();
}

/* ==========================================================================
   Checkout & Payment Integration Logic
   ========================================================================== */

let paypalButtonsRendered = false;
let currentPaymentBreakdown = null;

const CHECKOUT_FEES = {
  facilityFeePerNight: 40,
  salesTaxRate: 0.08875,
  occupancyTaxRate: 0.05875,
  localRoomFeePerRoomNight: 3.50,
  incidentalHoldPerNight: 100
};

function initPaymentSystem() {
  // Customizer Booking Button click
  const customizerBookBtn = document.querySelector('.customizer-book-btn');
  if (customizerBookBtn) {
    customizerBookBtn.addEventListener('click', (e) => {
      e.preventDefault();
      openPaymentModal();
    });
  }

  // Close modals
  const closePaymentModalBtn = document.getElementById('closePaymentModal');
  if (closePaymentModalBtn) {
    closePaymentModalBtn.addEventListener('click', () => {
      closeModal('paymentModal');
    });
  }

  const closeSuccessBtn = document.getElementById('closeSuccessBtn');
  if (closeSuccessBtn) {
    closeSuccessBtn.addEventListener('click', () => {
      closeModal('successModal');
    });
  }

  // Close modals on clicking backdrop
  document.querySelectorAll('.modal-overlay').forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeModal(modal.id);
      }
    });
  });

  // Stripe checkout button click handler
  const payWithStripeBtn = document.getElementById('payWithStripeBtn');
  if (payWithStripeBtn) {
    payWithStripeBtn.addEventListener('click', async () => {
      const form = document.getElementById('paymentDetailsForm');
      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }

      if (!areCheckoutPoliciesAccepted()) {
        showStatusMessage('Please accept the booking policies before continuing.', 'error');
        return;
      }
      
      payWithStripeBtn.disabled = true;
      showStatusMessage('Redirecting to secure credit card checkout...', 'info');
      
      const bookingData = getBookingData();
      try {
        const response = await fetch('/api/stripe/create-checkout-session', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(bookingData)
        });
        
        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.error || 'Failed to initiate card checkout');
        }
        
        const session = await response.json();
        window.location.href = session.url;
      } catch (err) {
        console.error('Stripe Redirect Error:', err);
        showStatusMessage(err.message, 'error');
        payWithStripeBtn.disabled = false;
      }
    });
  }

  const termsCheckbox = document.getElementById('accept-terms');
  if (termsCheckbox) {
    termsCheckbox.addEventListener('change', updatePaymentGateState);
  }
}

function openPaymentModal() {
  const bookingData = getBookingData();
  const breakdown = calculateCheckoutBreakdown(bookingData);
  currentPaymentBreakdown = breakdown;
  
  // Fill summary details
  document.getElementById('modal-room-name').textContent = bookingData.roomName;
  document.getElementById('modal-room-size').textContent = bookingData.roomSize;
  document.getElementById('modal-room-occupancy').textContent = `Max Occupancy: ${bookingData.maxOccupancy}`;
  document.getElementById('modal-booking-dates').textContent = `${bookingData.checkin} to ${bookingData.checkout}`;
  document.getElementById('modal-nights').textContent = String(breakdown.nights);
  
  // Format add-ons
  const addonsText = bookingData.addons.length > 0 
    ? bookingData.addons.map(a => a.charAt(0).toUpperCase() + a.slice(1)).join(', ')
    : 'None';
  document.getElementById('modal-addons').textContent = addonsText;
  
  document.getElementById('modal-package-subtotal').textContent = formatCurrency(breakdown.packageSubtotal);
  document.getElementById('modal-facility-fee').textContent = formatCurrency(breakdown.facilityFee);
  document.getElementById('modal-taxes').textContent = formatCurrency(breakdown.estimatedTaxes);
  document.getElementById('modal-local-fees').textContent = formatCurrency(breakdown.localRoomFees);
  document.getElementById('modal-total-price').textContent = formatCurrency(breakdown.totalDueToday);
  document.getElementById('modal-incidental-hold').textContent = `A temporary hold of ${formatCurrency(breakdown.incidentalHold)} (${formatCurrency(CHECKOUT_FEES.incidentalHoldPerNight)}/night) will be placed on your card at check-in for incidentals, released within 3-5 business days after checkout.`;
  
  // Open modal
  const modal = document.getElementById('paymentModal');
  if (modal) {
    modal.classList.add('is-active');
    document.body.style.overflow = 'hidden';
  }
  
  // Reset payment status alert
  const alertEl = document.getElementById('payment-status-message');
  if (alertEl) alertEl.style.display = 'none';
  
  const termsCheckbox = document.getElementById('accept-terms');
  if (termsCheckbox) termsCheckbox.checked = false;
  updatePaymentGateState();

  // Initialize/refresh PayPal buttons
  initPayPalButtons(breakdown.totalDueToday, getBookingData);
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('is-active');
    document.body.style.overflow = '';
  }
}

function openSuccessModal(bookingId) {
  const bookingIdEl = document.getElementById('success-booking-id');
  if (bookingIdEl) bookingIdEl.textContent = bookingId;
  
  const modal = document.getElementById('successModal');
  if (modal) {
    modal.classList.add('is-active');
    document.body.style.overflow = 'hidden';
  }
}

function showStatusMessage(text, type) {
  const alertEl = document.getElementById('payment-status-message');
  if (!alertEl) return;
  
  alertEl.style.display = 'flex';
  alertEl.className = `payment-status-alert payment-status-alert--${type}`;
  alertEl.innerHTML = `<span>${text}</span>`;
}

function getBookingData() {
  const checkinVal = document.getElementById('checkin')?.value || '';
  const checkoutVal = document.getElementById('checkout')?.value || '';
  
  // Find selected room
  const activeRoomCard = document.querySelector('.room-select-card.active');
  const roomId = activeRoomCard?.dataset.room || 'standard';
  const roomName = activeRoomCard?.querySelector('h3')?.textContent || 'Standard Room, 1 King Bed';
  const roomSize = activeRoomCard?.dataset.size || '237 sq ft';
  const maxOccupancy = activeRoomCard?.dataset.occupancy || '2';
  
  // Find selected add-ons
  const checkboxes = document.querySelectorAll('.addon-checkbox');
  const addons = Array.from(checkboxes)
    .filter(cb => cb.checked)
    .map(cb => cb.dataset.addon);
  
  // Package subtotal before checkout taxes and facility/local fees
  const totalEl = document.getElementById('summary-total');
  const totalText = totalEl?.textContent || '0';
  const packageSubtotal = parseFloat(totalText.replace(/[^0-9.]/g, '')) || 0;
  
  // Guest details form inputs
  const guestName = document.getElementById('guest-name')?.value || '';
  const guestEmail = document.getElementById('guest-email')?.value || '';
  
  return {
    guestName,
    guestEmail,
    checkin: checkinVal,
    checkout: checkoutVal,
    roomId,
    roomName,
    roomSize,
    maxOccupancy,
    addons,
    packageSubtotal,
    totalPrice: currentPaymentBreakdown?.totalDueToday || packageSubtotal
  };
}

function calculateCheckoutBreakdown(bookingData) {
  const nights = getStayNights(bookingData.checkin, bookingData.checkout);
  const roomsCount = parseInt(document.getElementById('rooms')?.value || '1', 10);
  const packageSubtotal = bookingData.packageSubtotal || bookingData.totalPrice || 0;
  const facilityFee = CHECKOUT_FEES.facilityFeePerNight * nights * roomsCount;
  const taxableSubtotal = packageSubtotal + facilityFee;
  const estimatedTaxes = taxableSubtotal * (CHECKOUT_FEES.salesTaxRate + CHECKOUT_FEES.occupancyTaxRate);
  const localRoomFees = CHECKOUT_FEES.localRoomFeePerRoomNight * nights * roomsCount;
  const totalDueToday = packageSubtotal + facilityFee + estimatedTaxes + localRoomFees;
  const incidentalHold = CHECKOUT_FEES.incidentalHoldPerNight * nights * roomsCount;

  return {
    nights,
    packageSubtotal,
    facilityFee,
    estimatedTaxes,
    localRoomFees,
    totalDueToday,
    incidentalHold
  };
}

function getStayNights(checkin, checkout) {
  if (!checkin || !checkout) return 3;
  const start = parseLocalDate(checkin);
  const end = parseLocalDate(checkout);
  const diff = end.getTime() - start.getTime();
  if (isNaN(diff) || diff <= 0) return 1;
  return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

function formatCurrency(value) {
  return `$${Number(value || 0).toFixed(2)}`;
}

function areCheckoutPoliciesAccepted() {
  return Boolean(document.getElementById('accept-terms')?.checked);
}

function updatePaymentGateState() {
  const accepted = areCheckoutPoliciesAccepted();
  const stripeBtn = document.getElementById('payWithStripeBtn');
  const paypalContainer = document.querySelector('.paypal-method-container');

  if (stripeBtn) {
    stripeBtn.disabled = !accepted;
    stripeBtn.setAttribute('aria-disabled', String(!accepted));
  }

  if (paypalContainer) {
    paypalContainer.classList.toggle('is-disabled', !accepted);
    paypalContainer.setAttribute('aria-disabled', String(!accepted));
  }
}

async function initPayPalButtons(totalPrice, getBookingData) {
  const container = document.getElementById('paypal-button-container');
  if (container) {
    container.innerHTML = '';
  }

  try {
    const configResp = await fetch('/api/config');
    const config = await configResp.json();
    
    if (!config.paypalClientId) {
      console.warn('PayPal client ID not configured. PayPal buttons will not be rendered.');
      container.innerHTML = '<p style="color: var(--text-muted); font-size: 0.8125rem;">PayPal setup pending</p>';
      return;
    }

    if (!window.paypal) {
      await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = `https://www.paypal.com/sdk/js?client-id=${config.paypalClientId}&currency=USD`;
        script.async = true;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
      });
    }

    renderPayPalButtons(totalPrice, getBookingData);
    paypalButtonsRendered = true;
  } catch (err) {
    console.error('Error loading PayPal SDK:', err);
    showStatusMessage('Error loading payment systems. Please try again.', 'error');
  }
}

function renderPayPalButtons(totalPrice, getBookingData) {
  window.paypal.Buttons({
    style: {
      layout: 'vertical',
      color:  'gold',
      shape:  'rect',
      label:  'paypal',
      height: 48
    },
    onClick: function(data, actions) {
      const form = document.getElementById('paymentDetailsForm');
      if (!form.checkValidity()) {
        form.reportValidity();
        return actions.reject();
      }
      if (!areCheckoutPoliciesAccepted()) {
        showStatusMessage('Please accept the booking policies before continuing.', 'error');
        return actions.reject();
      }
      return actions.resolve();
    },
    createOrder: async function(data, actions) {
      const bookingData = getBookingData();
      try {
        const response = await fetch('/api/paypal/create-order', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(bookingData)
        });
        
        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.error || 'Failed to create order');
        }
        
        const order = await response.json();
        window.currentBookingId = order.bookingId;
        return order.id;
      } catch (err) {
        console.error('Error creating PayPal order:', err);
        showStatusMessage(err.message, 'error');
        throw err;
      }
    },
    onApprove: async function(data, actions) {
      showStatusMessage('Processing payment confirmation...', 'info');
      try {
        const response = await fetch('/api/paypal/capture-order', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            orderId: data.orderID,
            bookingId: window.currentBookingId
          })
        });
        
        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.error || 'Failed to capture payment');
        }
        
        const captureResult = await response.json();
        if (captureResult.status === 'COMPLETED') {
          closeModal('paymentModal');
          openSuccessModal(window.currentBookingId);
        } else {
          showStatusMessage('Payment was not completed successfully. Please check your account.', 'error');
        }
      } catch (err) {
        console.error('Error capturing PayPal payment:', err);
        showStatusMessage(err.message, 'error');
      }
    },
    onError: function(err) {
      console.error('PayPal Smart Button Error:', err);
      showStatusMessage('An error occurred during the PayPal transaction.', 'error');
    }
  }).render('#paypal-button-container');
}

function checkPostPaymentParams() {
  const urlParams = new URLSearchParams(window.location.search);
  const paymentState = urlParams.get('payment');
  const bookingId = urlParams.get('bookingId');
  
  if (paymentState === 'success' && bookingId) {
    openSuccessModal(bookingId);
    window.history.replaceState({}, document.title, window.location.pathname);
  } else if (paymentState === 'cancel') {
    window.history.replaceState({}, document.title, window.location.pathname);
    setTimeout(() => {
      openPaymentModal();
      showStatusMessage('Stripe card checkout was cancelled.', 'info');
    }, 500);
  }
}
