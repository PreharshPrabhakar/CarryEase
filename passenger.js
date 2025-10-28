// passenger.js
import { auth, db, onAuthStateChanged, signOut, doc, getDoc, updateDoc, collection, query, where, onSnapshot, addDoc, serverTimestamp, deleteDoc } from './app.js';

let BAG_PRICES = {}; // This will be loaded from Firestore

const TRAIN_PICKUP_CHARGE = 20;

async function loadPricing() {
    try {
        const pricesDoc = await getDoc(doc(db, 'config', 'prices'));
        if (pricesDoc.exists()) {
            BAG_PRICES = pricesDoc.data();
            // This loop updates the text of each price tag using its unique ID
            for (const type in BAG_PRICES) {
                const priceTag = document.getElementById(`${type}-price-tag`); // Targets the specific ID
                if (priceTag) {
                    priceTag.textContent = `(₹${BAG_PRICES[type]} each)`;
                }
            }
        } else {
            console.error("Pricing configuration not found! Using default prices.");
            BAG_PRICES = { trolley: 60, suitcase: 50, backpack: 30, handbag: 20, carton: 35 };
        }
    } catch (error) {
        console.error("Error loading prices: ", error);
        BAG_PRICES = { trolley: 60, suitcase: 50, backpack: 30, handbag: 20, carton: 35 };
    }
}


onAuthStateChanged(auth, async (user) => {
    if (user) {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists() && userDoc.data().role === 'passenger') {
            // This is the key change: wait for prices to load first
            await loadPricing(); 
            initializePassengerDashboard(user, userDoc.data());
        } else {
            alert('Access Denied. This account is not for a passenger.');
            window.location.replace('index.html');
        }
    } else {
        window.location.replace('index.html');
    }
});


// --- PRICE CALCULATION ---
function calculatePrice() {
    let totalPrice = 0;
    // This loop now uses the dynamically loaded prices
    for (const type in BAG_PRICES) {
        const input = document.getElementById(`${type}-bags`);
        if (input) {
            totalPrice += (parseInt(input.value) || 0) * BAG_PRICES[type];
        }
    }
    // Add any other service charges
    if (document.getElementById('train-pickup').checked) {
        totalPrice += 20; 
    }
    return totalPrice;
}


function updatePriceDisplay() {
    const priceDisplay = document.getElementById('price-display');
    if (priceDisplay) {
        priceDisplay.textContent = `₹${calculatePrice()}`;
    }
}

// --- MAIN DASHBOARD INITIALIZATION ---
function initializePassengerDashboard(user, userData) {
    const userNameElement = document.getElementById('user-name');
    if (userNameElement) { userNameElement.textContent = userData.name || user.email.split('@')[0]; }

    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) { logoutBtn.addEventListener('click', () => signOut(auth)); }

    // --- Booking Form Submission ---
    const bookingForm = document.getElementById('booking-form');
    if (bookingForm) {
        bookingForm.addEventListener('submit', async (e) => {
            e.preventDefault();


            const passengerName = document.getElementById('passenger-name').value;
            const passengerPhone = document.getElementById('passenger-phone').value;
            const pnrNumber = document.getElementById('pnr-number').value;
            const trainNumber = document.getElementById('train-number').value;
            const platformNumber = document.getElementById('platform-number').value;
            const coachNumber = document.getElementById('coach-number').value;


            const trolleyBags = parseInt(document.getElementById('trolley-bags').value) || 0;
            const suitcaseBags = parseInt(document.getElementById('suitcase-bags').value) || 0;
            const backpackBags = parseInt(document.getElementById('backpack-bags').value) || 0;
            const handbagBags = parseInt(document.getElementById('handbag-bags').value) || 0;
            const cartonBags = parseInt(document.getElementById('carton-bags').value) || 0;


            const totalBags = trolleyBags + suitcaseBags + backpackBags + handbagBags + cartonBags;


            if (totalBags === 0) {
                alert('Please select at least one luggage item.');
                return;
            }


            const serviceType = document.querySelector('input[name="service-type"]:checked').value;
            const price = calculatePrice();


            const luggageDetails = {
                trolleyBags,
                suitcaseBags,
                backpackBags,
                handbagBags,
                cartonBags,
                totalBags
            };


            try {
                await addDoc(collection(db, 'bookings'), {
                    passengerId: user.uid,
                    passengerName,
                    passengerPhone,
                    pnrNumber,
                    trainNumber,
                    platformNumber,
                    coachNumber,
                    luggageDetails,
                    serviceType,
                    price,
                    bookingStatus: 'pending',
                    porterId: null,
                    createdAt: serverTimestamp()
                });
                alert('Booking successful! A porter will be assigned soon.');
                bookingForm.reset();
                updatePriceDisplay();
            } catch (error) {
                alert('Booking failed: ' + error.message);
            }
        });
    }


    // Attach event listeners for real-time price updates
    Object.keys(BAG_PRICES).forEach(type => {
        const input = document.getElementById(`${type}-bags`);
        if (input) input.addEventListener('input', updatePriceDisplay);
    });
    const platformPickup = document.getElementById('platform-pickup');
    if (platformPickup) platformPickup.addEventListener('change', updatePriceDisplay);
    const trainPickup = document.getElementById('train-pickup');
    if (trainPickup) trainPickup.addEventListener('change', updatePriceDisplay);
    updatePriceDisplay();

    // --- REAL-TIME BOOKING LIST DISPLAY ---
    const bookingsList = document.getElementById('bookings-list');
    const bookingsQuery = query(collection(db, 'bookings'), where('passengerId', '==', user.uid));

    onSnapshot(bookingsQuery, (querySnapshot) => {
        if (!bookingsList) return;
        bookingsList.innerHTML = '';
        if (querySnapshot.empty) {
            bookingsList.innerHTML = '<p style="color: #9ca3af; text-align: center; width: 100%;">You have no bookings.</p>';
            return;
        }

        querySnapshot.docs.sort((a, b) => b.data().createdAt - a.data().createdAt).forEach(async (docSnapshot) => {
            const booking = docSnapshot.data();
            const bookingId = docSnapshot.id;
            const bookingDiv = document.createElement('div');
            bookingDiv.className = 'booking-item';

            // Fetch and display porter details
            let porterInfoHTML = '';
            if (booking.porterId) {
                const porterDoc = await getDoc(doc(db, 'users', booking.porterId));
                if (porterDoc.exists()) {
                    const porterData = porterDoc.data();
                    porterInfoHTML = `<div class="porter-info"><p><strong>Porter:</strong> ${porterData.name}</p><p><strong>Contact:</strong> ${porterData.phone || 'N/A'}</p></div>`;
                }
            }

            // Display "Mark as Completed" button
            let completeButtonHTML = '';
            if (booking.porterId && booking.bookingStatus !== 'completed') {
                completeButtonHTML = `<button class="complete-btn" data-booking-id="${bookingId}">Mark as Completed</button>`;
            }

            let deleteButtonHTML = '';
// Only allow deletion if the booking is pending and no porter is assigned
if (booking.bookingStatus === 'pending' && !booking.porterId) {
    deleteButtonHTML = `<button class="delete-btn" data-booking-id="${bookingId}">Cancel Booking</button>`;
}

            // Display rating section
            let ratingHTML = '';
            if (booking.bookingStatus === 'completed') {
                if (booking.rating) {
                    ratingHTML = `<div class="rating-section"><p>Your Rating: ${'★'.repeat(booking.rating)}${'☆'.repeat(5 - booking.rating)}</p></div>`;
                } else {
                    ratingHTML = `<div class="rating-section"><p>Rate your porter:</p><div class="rating-stars" data-booking-id="${bookingId}"><span data-value="5">★</span><span data-value="4">★</span><span data-value="3">★</span><span data-value="2">★</span><span data-value="1">★</span></div></div>`;
                }
            }

            // Construct luggage details string
            const luggageList = Object.keys(BAG_PRICES).map(type => {
                const count = booking.luggageDetails[`${type}Bags`];
                return count > 0 ? `${count} ${type.charAt(0).toUpperCase() + type.slice(1)}` : null;
            }).filter(item => item).join(', ');

            // --- UPDATED INNERHTML WITH ALL DETAILS ---
            bookingDiv.innerHTML = `
    <div>
        <p><strong>Status:</strong> <span class="status-badge status-${booking.bookingStatus}">${booking.bookingStatus}</span></p>
        <p><strong>Passenger:</strong> ${booking.passengerName}</p>
        <p><strong>PNR:</strong> ${booking.pnrNumber} | <strong>Train:</strong> ${booking.trainNumber}</p>
        <p><strong>Location:</strong> Platform ${booking.platformNumber}, Coach ${booking.coachNumber}</p>
        <p><strong>Luggage:</strong> ${luggageList || 'None'}</p>
        <h4 style="color:#374151; font-weight:700; margin-top:10px; margin-bottom:5px; border-top: 1px solid #eee; padding-top: 8px;">Service Details</h4>
        <p><strong>Type:</strong> ${booking.serviceType === 'train' ? 'Inside Train Pickup' : 'Platform Pickup'}</p>
        <p><strong>Price:</strong> ₹${booking.price}</p>
        <p><strong>Booked on:</strong> ${new Date(booking.createdAt.toDate()).toLocaleString()}</p>
        ${porterInfoHTML}
        ${ratingHTML}
    </div>
    <div style="display: flex; justify-content: space-between; align-items: center; margin-top: auto;">
        ${completeButtonHTML}
        ${deleteButtonHTML}
    </div>
`;
            bookingsList.appendChild(bookingDiv);
        });
    });

    // --- EVENT DELEGATION FOR DYNAMIC ELEMENTS ---
    if (bookingsList) {
        bookingsList.addEventListener('click', async (event) => {
            if (event.target.matches('.delete-btn')) {
    const bookingId = event.target.getAttribute('data-booking-id');
    if (bookingId && confirm('Are you sure you want to cancel this booking?')) {
        try {
            await deleteDoc(doc(db, 'bookings', bookingId));
            alert('Your booking has been successfully canceled.');
        } catch (error) {
            console.error("Error canceling booking: ", error);
            alert('There was an error canceling your booking. Please try again.');
        }
    }
}
            if (event.target.matches('.complete-btn')) {
                const bookingId = event.target.getAttribute('data-booking-id');
                if (bookingId) await markBookingCompleted(bookingId);
            }
            if (event.target.matches('.rating-stars span')) {
                const star = event.target;
                const ratingContainer = star.closest('.rating-stars');
                const bookingId = ratingContainer.getAttribute('data-booking-id');
                const ratingValue = parseInt(star.getAttribute('data-value'));
                if (bookingId) {
                    try {
                        await updateDoc(doc(db, 'bookings', bookingId), { rating: ratingValue });
                        alert(`Thank you for your ${ratingValue}-star rating!`);
                    } catch (error) {
                        console.error("Error submitting rating: ", error);
                    }
                }
            }
        });
    }
}

// --- GLOBAL HELPER FUNCTION ---
async function markBookingCompleted(bookingId) {
    try {
        await updateDoc(doc(db, 'bookings', bookingId), { bookingStatus: 'completed' });
        alert('Booking marked as completed. Thank you!');
    } catch (error) {
        console.error("Error marking booking as completed: ", error);
    }
}
