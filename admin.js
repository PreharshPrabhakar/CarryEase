// admin.js
import { auth, db, onAuthStateChanged, signOut, doc, getDoc, updateDoc, setDoc, collection, query, onSnapshot, where, getDocs } from './app.js';

// --- AUTHENTICATION GUARD ---
onAuthStateChanged(auth, async (user) => {
    if (user) {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists() && userDoc.data().role === 'admin') {
            initializeAdminDashboard(user, userDoc.data());
        } else {
            alert('Access Denied. You do not have administrative privileges.');
            window.location.replace('index.html');
        }
    } else {
        window.location.replace('index.html');
    }
});

// --- INITIALIZE DASHBOARD ---
function initializeAdminDashboard(user, userData) {
    document.getElementById('user-name').textContent = userData.name || user.email.split('@')[0];
    document.getElementById('logout-btn').addEventListener('click', () => signOut(auth));

    initializePriceManagement();
    listenForUsersAndStats();
    listenForPlatformPerformance();
    initializeSearchFilters();
}

// --- PRICE MANAGEMENT ---
async function initializePriceManagement() {
    const priceForm = document.getElementById('price-form');
    const pricesDocRef = doc(db, 'config', 'prices');

    const pricesDoc = await getDoc(pricesDocRef);
    if (pricesDoc.exists()) {
        const prices = pricesDoc.data();
        for (const type in prices) {
            const input = document.getElementById(`price-${type}`);
            if (input) input.value = prices[type];
        }
    }

    priceForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const newPrices = {};
        const priceTypes = ['trolley', 'suitcase', 'backpack', 'handbag', 'duffel', 'carton'];
        
        priceTypes.forEach(type => {
            const input = document.getElementById(`price-${type}`);
            if (input) newPrices[type] = parseInt(input.value) || 0;
        });

        try {
            await setDoc(pricesDocRef, newPrices);
            alert('Prices updated successfully!');
        } catch (error) {
            alert('Error updating prices: ' + error.message);
        }
    });
}

// --- USER & STATS MANAGEMENT ---
async function listenForUsersAndStats() {
    const porterListBody = document.getElementById('porter-list');
    const passengerListBody = document.getElementById('passenger-list');
    
    const bookingsSnapshot = await getDocs(collection(db, 'bookings'));
    const allBookings = bookingsSnapshot.docs.map(doc => doc.data());

    onSnapshot(query(collection(db, 'users')), (usersSnapshot) => {
        porterListBody.innerHTML = '';
        passengerListBody.innerHTML = '';

        usersSnapshot.forEach((userDoc) => {
            const user = userDoc.data();
            const userId = userDoc.id;

            if (user.role === 'porter') {
                const porterJobs = allBookings.filter(b => b.porterId === userId && b.bookingStatus === 'completed');
                const ratedJobs = porterJobs.filter(j => j.rating);
                const averageRating = ratedJobs.length > 0 ? (ratedJobs.reduce((acc, job) => acc + job.rating, 0) / ratedJobs.length).toFixed(1) : 'N/A';
                
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${user.name}</td><td>${user.email}</td>
                    <td>${user.approved ? '<span class="status-approved">Approved</span>' : 'Pending'}</td>
                    <td>${porterJobs.length}</td><td class="rating-display">${averageRating}</td>
                    <td>${user.approved ? `<button class="deny-btn" data-id="${userId}">Deny</button>` : `<button class="approve-btn" data-id="${userId}">Approve</button>`}</td>
                `;
                porterListBody.appendChild(row);

            } else if (user.role === 'passenger') {
                const row = document.createElement('tr');
                row.innerHTML = `<td>${user.name}</td><td>${user.email}</td>`;
                passengerListBody.appendChild(row);
            }
        });
        addAdminActionListeners();
    });
}

// --- PLATFORM PERFORMANCE ---
async function listenForPlatformPerformance() {
    const completedJobsList = document.getElementById('completed-jobs-list');
    const totalEarningsEl = document.getElementById('total-earnings');
    
    const usersSnapshot = await getDocs(collection(db, 'users'));
    const usersMap = {};
    usersSnapshot.forEach(doc => usersMap[doc.id] = doc.data().name);

    onSnapshot(query(collection(db, 'bookings'), where('bookingStatus', '==', 'completed')), (snapshot) => {
        completedJobsList.innerHTML = '';
        let totalEarnings = 0;
        
        snapshot.forEach(doc => {
            const job = doc.data();
            totalEarnings += job.price;
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${usersMap[job.passengerId] || 'N/A'}</td>
                <td>${usersMap[job.porterId] || 'N/A'}</td>
                <td>₹${job.price}</td>
                <td class="rating-display">${job.rating ? '★'.repeat(job.rating) : 'N/A'}</td>
            `;
            completedJobsList.appendChild(row);
        });
        totalEarningsEl.textContent = `₹${totalEarnings}`;
    });
}

// --- SEARCH FILTERS ---
function initializeSearchFilters() {
    const setupFilter = (inputId, tableBodyId, cellIndex) => {
        document.getElementById(inputId).addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            const rows = document.getElementById(tableBodyId).getElementsByTagName('tr');
            for (const row of rows) {
                const cell = row.getElementsByTagName('td')[cellIndex];
                row.style.display = cell && cell.textContent.toLowerCase().includes(searchTerm) ? '' : 'none';
            }
        });
    };

    const setupMultiCellFilter = (inputId, tableBodyId, cellIndices) => {
        const searchInput = document.getElementById(inputId);
        searchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            const tableBody = document.getElementById(tableBodyId);
            const rows = tableBody.getElementsByTagName('tr');
            
            for (const row of rows) {
                let match = false;
                for (const index of cellIndices) {
                    const cell = row.getElementsByTagName('td')[index];
                    if (cell && (cell.textContent || cell.innerText).toLowerCase().includes(searchTerm)) {
                        match = true;
                        break;
                    }
                }
                row.style.display = match ? '' : 'none';
            }
        });
    };
    setupFilter('porter-search', 'porter-list', 0);
    setupFilter('passenger-search', 'passenger-list', 0);
    setupMultiCellFilter('jobs-search', 'completed-jobs-list', [0, 1]); // Search passenger (0) or porter (1)
}

// --- ADMIN ACTION LISTENERS (APPROVE/DENY) ---
function addAdminActionListeners() {
    document.querySelectorAll('.approve-btn, .deny-btn').forEach(button => {
        if (button.dataset.listenerAttached) return;
        button.dataset.listenerAttached = 'true';
        button.addEventListener('click', async (e) => {
            const userId = e.target.getAttribute('data-id');
            const isApproving = e.target.classList.contains('approve-btn');
            await updateDoc(doc(db, 'users', userId), { approved: isApproving });
            alert(`Porter access has been ${isApproving ? 'approved' : 'revoked'}.`);
        });
    });
}
