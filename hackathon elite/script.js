// === ELEMENT REFERENCES ===
const dateInput = document.getElementById('date-input');
const timeInput = document.getElementById('time-input');
const saveBtn = document.getElementById('save-btn');
const savedAlarm = document.getElementById('saved-alarm');
const prepTimeInput = document.getElementById('prep-time');
const bufferTimeInput = document.getElementById('buffer-time');
const homeDisplayText = document.getElementById('home-display-text');
const mapDestinationDisplay = document.getElementById('map-destination-display');
const destinationInput = document.getElementById('destination-input');
const destinationSuggestions = document.getElementById('destination-suggestions');

// === GLOBAL STATE ===
let homeCoordinates = null;
let destinationCoordinates = null;
let alarmTriggered = false;

// === Prevent Negative Inputs ===
prepTimeInput.addEventListener('input', () => {
    if (prepTimeInput.value < 0) prepTimeInput.value = 0;
});

bufferTimeInput.addEventListener('input', () => {
    if (bufferTimeInput.value < 0) bufferTimeInput.value = 0;
});

// === ALARM SOUND SETUP ===
const alarmAudio = new Audio('assets/sounds/alarm.mp3');
if (Notification.permission !== 'granted') {
    Notification.requestPermission();
}

// === SET MIN DATE ===
(() => {
    const today = new Date();
    today.setDate(today.getDate());
    dateInput.min = today.toISOString().split('T')[0];
})();

// === DETECT HOME COORDINATES ===
navigator.geolocation.getCurrentPosition(
    (position) => {
        homeCoordinates = `${position.coords.latitude},${position.coords.longitude}`;
        homeDisplayText.textContent = `${position.coords.latitude.toFixed(5)}, ${position.coords.longitude.toFixed(5)}`;
    },
    () => {
        homeDisplayText.textContent = '❌ Location detection failed.';
    }
);

// === DESTINATION SEARCH: Railway API Proxy ===
destinationInput.addEventListener('input', async () => {
    const query = destinationInput.value.trim();
    if (!query) {
        destinationSuggestions.innerHTML = '';
        return;
    }

    const apiUrl = `https://no-more-late-alarm-api-production.up.railway.app/geocode?query=${encodeURIComponent(query)}`;

    try {
        const response = await fetch(apiUrl);
        const data = await response.json();
        destinationSuggestions.innerHTML = '';

        if (!data.results || data.results.length === 0) {
            destinationSuggestions.innerHTML = '<div>No results found.</div>';
            return;
        }

        data.results.forEach(result => {
            const suggestion = document.createElement('div');
            suggestion.textContent = result.formatted;
            suggestion.addEventListener('click', () => {
                destinationCoordinates = `${result.geometry.lat},${result.geometry.lng}`;
                destinationInput.value = result.formatted;
                mapDestinationDisplay.textContent = `Destination: ${result.formatted}`;
                destinationSuggestions.innerHTML = '';
            });
            destinationSuggestions.appendChild(suggestion);
        });

    } catch (error) {
        destinationSuggestions.innerHTML = '<div>❌ Failed to load suggestions</div>';
    }
});

// === SAVE BUTTON ===
saveBtn.addEventListener('click', async () => {
    if (!dateInput.value || !timeInput.value || !destinationCoordinates || !homeCoordinates) {
        alert('⚠️ Complete all fields and select a destination.');
        return;
    }

    const now = new Date();
    const alarmDateTime = new Date(`${dateInput.value}T${timeInput.value}`);
    if (alarmDateTime <= now) {
        alert('⚠️ Alarms cannot be set in the past.');
        return;
    }

    const details = {
        homeCoordinates,
        destinationCoordinates,
        eventTime: alarmDateTime.getTime(),
        preparationTime: parseInt(prepTimeInput.value) || 0,
        userBufferTime: parseInt(bufferTimeInput.value) || 0
    };

    await fetchAndDisplayAlarm(details, true);
});

// === FETCH FROM API AND DISPLAY ALARM ===
async function fetchAndDisplayAlarm(details, saveToStorage) {
    const apiUrl = `https://no-more-late-alarm-api-production.up.railway.app/alarm-time` +
        `?origin=${encodeURIComponent(details.homeCoordinates)}` +
        `&destination=${encodeURIComponent(details.destinationCoordinates)}` +
        `&preparationTime=${details.preparationTime}` +
        `&userBufferTime=${details.userBufferTime}`;

    try {
        const apiResponse = await fetch(apiUrl);

        if (!apiResponse.ok) throw new Error(`API error: ${apiResponse.status}`);

        const apiData = await apiResponse.json();
        const adjustmentMinutes = apiData.totalAdjustmentTimeMinutes;

        if (!adjustmentMinutes || isNaN(adjustmentMinutes)) {
            throw new Error('Invalid response from API.');
        }

        const recommendedWakeUp = new Date(details.eventTime - adjustmentMinutes * 60000);
        const recommendedTimeStr = recommendedWakeUp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const recommendedDateStr = recommendedWakeUp.toLocaleDateString();

        savedAlarm.innerHTML = `
            <strong>Ongoing Alarm:</strong><br>
            ${recommendedTimeStr}<br>
            ${recommendedDateStr}<br>
            Destination: ${destinationInput.value || 'Map Selected'}<br>
            (Alarm set ${adjustmentMinutes} minutes earlier)
        `;

        if (saveToStorage) {
            localStorage.setItem('alarmDetails', JSON.stringify(details));
            localStorage.setItem('recommendedWakeupTime', recommendedWakeUp.getTime());
            alarmTriggered = false;
        }

    } catch (error) {
        console.error(error);
        savedAlarm.innerHTML = `<span style="color:red">❌ Failed to fetch alarm time.<br>${error.message}</span>`;
    }
}

// === WAKE-UP ALERT ===
const alarmPopup = document.getElementById('alarm-popup');
const dismissAlarmBtn = document.getElementById('dismiss-alarm-btn');

function triggerWakeUpAlert() {
    alarmAudio.loop = true;
    alarmAudio.play();

    alarmPopup.classList.add('show');
}

dismissAlarmBtn.addEventListener('click', () => {
    alarmAudio.pause();
    alarmAudio.currentTime = 0;  // Reset audio
    alarmPopup.classList.remove('show');

    // Optional: reset alarm state
    localStorage.removeItem('alarmDetails');
    localStorage.removeItem('recommendedWakeupTime');
    alarmTriggered = false;
    savedAlarm.innerHTML = 'NO CURRENT ALARM SET';
});

// === AUTO-UPDATE & ALARM CHECKER ===
async function checkForAutoUpdate() {
    const alarmDetails = JSON.parse(localStorage.getItem('alarmDetails'));
    if (!alarmDetails) return;

    const now = Date.now();
    const timeBeforeEvent = alarmDetails.eventTime - now;

    if (timeBeforeEvent > 3600000 && timeBeforeEvent < 7200000) {
        await fetchAndDisplayAlarm(alarmDetails, false);
    }

    if (!alarmTriggered) {
        const recommendedWakeupTime = parseInt(localStorage.getItem('recommendedWakeupTime'));
        if (recommendedWakeupTime && now >= recommendedWakeupTime) {
            triggerWakeUpAlert();
            alarmTriggered = true;
        }
    }
}

setInterval(checkForAutoUpdate, 60000);

window.addEventListener('DOMContentLoaded', () => {
    // Sidebar Toggle Elements
    const menuToggle = document.getElementById('menu-toggle');
    const sidebar = document.getElementById('sidebar');
    const closeSidebar = document.getElementById('close-sidebar');
    const overlay = document.getElementById('sidebar-overlay');

    // Sidebar Toggle Logic
    menuToggle.addEventListener('click', () => {
        sidebar.classList.add('show');
        overlay.classList.add('show');
    });

    closeSidebar.addEventListener('click', () => {
        sidebar.classList.remove('show');
        overlay.classList.remove('show');
    });

    overlay.addEventListener('click', () => {
        sidebar.classList.remove('show');
        overlay.classList.remove('show');
    });

    // Setup Popups After Sidebar Setup
    setupPopups();
});

// === POPUPS ===
function setupPopups() {
    const popups = {
        help: document.getElementById('help'),
        about: document.getElementById('about'),
        terms: document.getElementById('terms')
    };

    function closeAllPopups() {
        Object.values(popups).forEach(popup => popup.style.display = 'none');
    }

    function openPopup(popup) {
        closeAllPopups();
        popup.style.display = 'block';
        document.getElementById('sidebar').classList.remove('show');
        document.getElementById('sidebar-overlay').classList.remove('show');  // ✅ hide overlay properly
    }

    const buttonMapping = [
        { ids: ['helpbtn', 'helpbtn-sidebar'], popup: popups.help },
        { ids: ['aboutbtn', 'aboutbtn-sidebar'], popup: popups.about },
        { ids: ['termsbtn', 'termsbtn-sidebar'], popup: popups.terms }
    ];

    buttonMapping.forEach(mapping => {
        mapping.ids.forEach(id => {
            const btn = document.getElementById(id);
            if (btn) btn.addEventListener('click', () => openPopup(mapping.popup));
        });
    });

    document.getElementById('closeHelpBtn').addEventListener('click', closeAllPopups);
    document.getElementById('closeAboutBtn').addEventListener('click', closeAllPopups);
    document.getElementById('closeTermsBtn').addEventListener('click', closeAllPopups);
}

// Date Picker
flatpickr("#date-input", {
    dateFormat: "Y-m-d",
    altInput: true,
    altFormat: "F j, Y",
    allowInput: true
});

// Time Picker
flatpickr("#time-input", {
    enableTime: true,
    noCalendar: true,
    dateFormat: "H:i",
    time_24hr: true,
    altInput: true,
    altFormat: "h:i K",
    allowInput: true
});

if (window.innerWidth > 768) {
    flatpickr("#date-input", {
        dateFormat: "Y-m-d",
        altInput: true,
        altFormat: "F j, Y",
        allowInput: true
    });

    flatpickr("#time-input", {
        enableTime: true,
        noCalendar: true,
        dateFormat: "H:i",
        time_24hr: true,
        altInput: true,
        altFormat: "h:i K",
        allowInput: true
    });
}