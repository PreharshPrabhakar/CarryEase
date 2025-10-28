// porter.js
import { auth, db, onAuthStateChanged, signOut, doc, getDoc, updateDoc, collection, query, where, onSnapshot } from './app.js';

// --- AUTHENTICATION GUARD ---
onAuthStateChanged(auth, async (user) => {
    if (user) {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists() && userDoc.data().role === 'porter' && userDoc.data().approved) {
            initializePorterDashboard(user, userDoc.data());
        } else {
            alert('Access Denied. Your account is not an approved porter account.');
            signOut(auth);
            window.location.replace('index.html');
        }
    } else {
        window.location.replace('index.html');
    }
});

// --- MAIN DASHBOARD INITIALIZATION ---
function initializePorterDashboard(user, userData) {
    const userNameElement = document.getElementById('user-name');
    const phoneInput = document.getElementById('porter-phone');
    const savePhoneBtn = document.getElementById('save-phone-btn');
    
    if (userNameElement) userNameElement.textContent = userData.name || user.email.split('@')[0];
    if (phoneInput) phoneInput.value = userData.phone || ''; // Pre-fill phone number

    // Save Phone Number Logic
    if (savePhoneBtn) {
        savePhoneBtn.addEventListener('click', async () => {
            const newPhoneNumber = phoneInput.value.trim();
            if (newPhoneNumber.length === 10 && /^\d+$/.test(newPhoneNumber)) {
                try {
                    await updateDoc(doc(db, 'users', user.uid), { phone: newPhoneNumber });
                    alert('Phone number updated successfully!');
                } catch (error) {
                    alert('Failed to update phone number.');
                }
            } else {
                alert('Please enter a valid 10-digit phone number.');
            }
        });
    }

    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) logoutBtn.addEventListener('click', () => signOut(auth));

    // Listen for all job types
    listenForAvailableJobs(user);
    listenForActiveJobs(user);
    listenForCompletedJobs(user); // New listener
}

// --- LISTEN FOR AVAILABLE JOBS ('pending') ---
function listenForAvailableJobs(user) {
    const availableJobsList = document.getElementById('available-jobs-list');
    const q = query(collection(db, 'bookings'), where('bookingStatus', '==', 'pending'));

    onSnapshot(q, (snapshot) => {
        availableJobsList.innerHTML = '';
        if (snapshot.empty) {
            availableJobsList.innerHTML = '<p>No available jobs right now.</p>';
            return;
        }
        snapshot.forEach(docSnapshot => {
            const booking = docSnapshot.data();
            const jobCard = createJobCard(docSnapshot.id, booking, 'available');
            availableJobsList.appendChild(jobCard);
        });
        addAcceptJobListeners(user);
    });
}

// --- LISTEN FOR ACTIVE JOBS ('accepted') ---
function listenForActiveJobs(user) {
    const activeJobsList = document.getElementById('active-jobs-list');
    const q = query(collection(db, 'bookings'), where('porterId', '==', user.uid), where('bookingStatus', '==', 'accepted'));

    onSnapshot(q, (snapshot) => {
        activeJobsList.innerHTML = '';
        if (snapshot.empty) {
            activeJobsList.innerHTML = '<p>You have no active jobs.</p>';
            return;
        }
        snapshot.forEach(docSnapshot => {
            const booking = docSnapshot.data();
            const jobCard = createJobCard(docSnapshot.id, booking, 'active');
            activeJobsList.appendChild(jobCard);
        });
    });
}

// --- NEW: LISTEN FOR COMPLETED JOBS ---
function listenForCompletedJobs(user) {
    const completedJobsList = document.getElementById('completed-jobs-list');
    const jobsCompletedCountEl = document.getElementById('jobs-completed-count');
    const totalEarningsEl = document.getElementById('total-earnings');

    const q = query(collection(db, 'bookings'), where('porterId', '==', user.uid), where('bookingStatus', '==', 'completed'));

    onSnapshot(q, (snapshot) => {
        completedJobsList.innerHTML = '';
        let completedJobsCount = 0;
        let totalEarnings = 0;

        if (snapshot.empty) {
            completedJobsList.innerHTML = '<p>You have no completed jobs yet.</p>';
        } else {
            snapshot.forEach(docSnapshot => {
                const booking = docSnapshot.data();
                completedJobsCount++;
                totalEarnings += booking.price;
                const jobCard = createJobCard(docSnapshot.id, booking, 'completed');
                completedJobsList.appendChild(jobCard);
            });
        }
        
        jobsCompletedCountEl.textContent = completedJobsCount;
        totalEarningsEl.textContent = `₹${totalEarnings}`;
    });
}

// --- UNIVERSAL JOB CARD CREATOR ---
function createJobCard(bookingId, booking, type) {
    const jobCard = document.createElement('div');
    jobCard.className = 'job-card';

    const luggageList = Object.entries(booking.luggageDetails)
        .filter(([key, value]) => key !== 'totalBags' && value > 0)
        .map(([key, value]) => `${value} ${key.replace('Bags', '')}`)
        .join(', ');

    let cardContent = `
        <p><strong>Passenger:</strong> ${booking.passengerName}</p>
        <p><strong>Location:</strong> Platform ${booking.platformNumber}, Coach ${booking.coachNumber}</p>
        <p><strong>Luggage:</strong> ${luggageList || 'None'}</p>
        <p><strong>Fare:</strong> ₹${booking.price}</p>
    `;

    if (type === 'available') {
        cardContent += `<button class="accept-btn" data-id="${bookingId}">Accept Job</button>`;
    } else if (type === 'active') {
        cardContent += `<p><strong>Passenger Contact:</strong> ${booking.passengerPhone}</p>`;
    } else if (type === 'completed') {
        const rating = booking.rating ? '★'.repeat(booking.rating) + '☆'.repeat(5 - booking.rating) : 'Not rated';
        cardContent += `<p class="job-rating"><strong>Rating:</strong> ${rating}</p>`;
    }

    jobCard.innerHTML = cardContent;
    return jobCard;
}

// --- ACCEPT JOB LOGIC ---
function addAcceptJobListeners(user) {
    document.querySelectorAll('.accept-btn').forEach(button => {
        if (button.dataset.listenerAttached) return;
        button.dataset.listenerAttached = 'true';
        button.addEventListener('click', async (e) => {
            const bookingId = e.target.dataset.id;
            await updateDoc(doc(db, 'bookings', bookingId), {
                porterId: user.uid,
                bookingStatus: 'accepted'
            });
            alert('Job accepted!');
        });
    });
}
