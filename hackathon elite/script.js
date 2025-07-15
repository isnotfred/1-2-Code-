const dateInput = document.getElementById('date-input');
const timeInput = document.getElementById('time-input');
const locationInput = document.getElementById('location-input');
const suggestionsList = document.getElementById('suggestions');
const saveBtn = document.getElementById('save-btn');
const savedAlarm = document.getElementById('saved-alarm');

let isLocationSelectedFromDropdown = false;

// Set Min Date (Tomorrow Only)
function setMinDate() {
    const today = new Date();
    today.setDate(today.getDate() + 1);
    const tomorrow = today.toISOString().split('T')[0];
    dateInput.min = tomorrow;
}
setMinDate();

// LocationIQ Autocomplete (PH Only)
locationInput.addEventListener('input', async () => {
    isLocationSelectedFromDropdown = false;
    const query = locationInput.value.trim();
    if (!query) {
        suggestionsList.innerHTML = '';
        return;
    }

    const accessToken = 'pk.062878272323e8212f6cc505b589e8b4';
    const url = `https://api.locationiq.com/v1/autocomplete?key=${accessToken}&q=${encodeURIComponent(query)}&limit=5&dedupe=1`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        suggestionsList.innerHTML = '';

        data.forEach(location => {
            if (location.address && location.address.country_code === 'ph') {
                const option = document.createElement('li');
                option.textContent = location.display_name;
                option.addEventListener('click', () => {
                    locationInput.value = location.display_name;
                    suggestionsList.innerHTML = '';
                    isLocationSelectedFromDropdown = true;
                });
                suggestionsList.appendChild(option);
            }
        });

        if (suggestionsList.children.length === 0) {
            const noResult = document.createElement('li');
            noResult.textContent = 'No PH locations found';
            suggestionsList.appendChild(noResult);
        }

    } catch (error) {
        console.error('Autocomplete Error:', error);
    }
});

// Save Alarm (No alerts, just block if invalid)
saveBtn.addEventListener('click', () => {
    const selectedDate = dateInput.value;
    const selectedTime = timeInput.value;
    const location = locationInput.value.trim();

    if (!selectedDate || !selectedTime || !location || !isLocationSelectedFromDropdown) {
        return; // Do nothing silently
    }

    const now = new Date();
    const alarmDateTime = new Date(`${selectedDate}T${selectedTime}`);

    if (alarmDateTime <= now) {
        return; // Do nothing silently
    }

    savedAlarm.innerHTML = `
        <strong>Ongoing Alarm:</strong><br>
        ${selectedTime}<br>
        ${selectedDate}<br>
        Destination: ${location}
    `;
});

// Help Popup
const helpbtn = document.getElementById('helpbtn');
const helppopup = document.getElementById('help');
const closeHelpBtn = document.getElementById('closeHelpBtn');

helpbtn.addEventListener('click', () => {
    helppopup.style.display = helppopup.style.display === 'none' ? 'block' : 'none';
});
closeHelpBtn.addEventListener('click', () => {
    helppopup.style.display = 'none';
});

// About Us Popup
const aboutBtn = document.querySelector('.nav-links a:nth-child(2)');
const aboutPopup = document.getElementById('about');
const closeAboutBtn = document.getElementById('closeAboutBtn');

aboutBtn.addEventListener('click', () => {
    aboutPopup.style.display = 'block';
});
closeAboutBtn.addEventListener('click', () => {
    aboutPopup.style.display = 'none';
});

// Terms and Conditions Popup
const termsBtn = document.querySelector('.nav-links a:nth-child(3)');
const termsPopup = document.getElementById('terms');
const closeTermsBtn = document.getElementById('closeTermsBtn');

termsBtn.addEventListener('click', () => {
    termsPopup.style.display = 'block';
});
closeTermsBtn.addEventListener('click', () => {
    termsPopup.style.display = 'none';
});
