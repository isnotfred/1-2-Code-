const dateInput = document.getElementById('date-input');
const timeInput = document.getElementById('time-input');
const locationInput = document.getElementById('location-input');
const suggestionsList = document.getElementById('suggestions');
const saveBtn = document.getElementById('save-btn');
const savedAlarm = document.getElementById('saved-alarm');

// --- Enforce date cannot be today or past ---
function setMinDate() {
    const today = new Date();
    today.setDate(today.getDate() + 1);
    const tomorrow = today.toISOString().split('T')[0];
    dateInput.min = tomorrow;
}
setMinDate();

// --- Geoapify Autocomplete for PH locations ---
locationInput.addEventListener('input', async () => {
    const query = locationInput.value.trim();
    if (!query) {
        suggestionsList.innerHTML = '';
        return;
    }

    const apiKey = '1dad3ab8f9f042d2b2814079d5f0e282';
    const url = `https://api.geoapify.com/v1/geocode/autocomplete?text=${encodeURIComponent(query)}&filter=countrycode:PH&format=json&apiKey=${apiKey}`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        suggestionsList.innerHTML = '';
        data.features.forEach(feature => {
            const option = document.createElement('li');
            option.textContent = feature.properties.formatted;
            option.addEventListener('click', () => {
                locationInput.value = feature.properties.formatted;
                suggestionsList.innerHTML = '';
            });
            suggestionsList.appendChild(option);
        });
    } catch (error) {
        console.error('Error fetching suggestions:', error);
    }
});

// --- Save Alarm Button Functionality ---
saveBtn.addEventListener('click', () => {
    const selectedDate = dateInput.value;
    const selectedTime = timeInput.value;
    const location = locationInput.value.trim();

    if (!selectedDate || !selectedTime || !location) {
        alert('Please fill all fields.');
        return;
    }

    const now = new Date();
    const alarmDateTime = new Date(`${selectedDate}T${selectedTime}`);

    if (alarmDateTime <= now) {
        alert('Please choose a valid future date and time.');
        return;
    }

    savedAlarm.innerHTML = `
        <strong>Ongoing Alarm:</strong><br>
        ${selectedTime}<br>
        ${selectedDate}<br>
        Destination: ${location}
    `;
});
