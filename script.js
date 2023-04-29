'use strict';

// DOM elements
const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

class Workout {
    date = new Date();
    id = (Date.now() + '').slice(-10);
    clicks = 0;

    constructor(coords, distance, duration) {
        this.coords = coords; // [lat, lng]
        this.distance = distance;
        this.duration = duration;
    }

    _setDescription() {
        // prettier-ignore
        const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 
        'September', 'October', 'November', 'December'];

        this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on 
        ${months[this.date.getMonth()]} ${this.date.getDate()} | ${String(this.date.getHours()).padStart(2, 0)}:${String(this.date.getMinutes()).padStart(2, 0)}`
    }

    click() {
        this.clicks++;
    }
}

class Running extends Workout {
    type = "running";

    constructor(coords, distance, duration, cadence) {
        super(coords, distance, duration);
        this.cadence = cadence;
        this.calcPace();
        this._setDescription();
    }

    calcPace() {
        this.pace = this.duration / this.distance;
        return this.pace;
    }
}

class Cycling extends Workout {
    type = "cycling";

    constructor(coords, distance, duration, elevationGain) {
        super(coords, distance, duration);
        this.elevationGain = elevationGain;
        this.calcSpeed();
        this._setDescription();
    }

    calcSpeed() {
        this.speed = this.distance / (this.duration / 60);
        return this.speed;
    }
}

class App {
    #map;
    #mapZoomLevel = 13;
    #mapEvent;
    #workouts = [];

    constructor() {
        this._getPosition();
        this._getLocalStorage();
        form.addEventListener("submit", this._newWorkout.bind(this));
        form.addEventListener("keydown", function(e) {if (e.key === "Escape") form.classList.add("hidden");;} );
        inputType.addEventListener("change", this._toggleElevationField);
        containerWorkouts.addEventListener("click", this._moveToPopup.bind(this));
    }

    _getPosition() {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                this._loadMap.bind(this), 
                () => alert("The application cannot work without access to geolocation :c")
            )
        } 
        else alert("Looks like your browser or device doesn't support geolocation :/"); 
    }

    _loadMap(position) {
        const { latitude, longitude } = position.coords;
        const userCoords = [latitude, longitude];
        
        // creates a map
        this.#map = L.map('map').setView(userCoords, this.#mapZoomLevel);
        
        // showing map
        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        }).addTo(this.#map);
        
        this.#map.on("click", this._showForm.bind(this));

        this.#workouts.forEach(work => this._renderWorkoutMarker(work));
    }

    _showForm(mapE) {
        this.#mapEvent = mapE;
        form.classList.remove("hidden");
        inputDistance.focus();
    }

    _hideForm() {
        const formRows = document.querySelectorAll(".form__row");

        const hideElements = function() {
            form.style.opacity = 0;
            form.style.width = 0;
            formRows.forEach(row => row.style.opacity = 0);
        }

        const revertDefaultStyles = function() {
            form.style.display = "none";
            form.style.opacity = null;
            form.style.width = null;
            form.classList.add("hidden");  
            formRows.forEach(row => row.style.opacity = null);
        }

        // clearing inputs
        inputDistance.value = inputDuration.value = inputCadence.value = inputElevation.value = "";
 
        hideElements();
        setTimeout(function(){
            revertDefaultStyles();
            setTimeout(() => form.style.display = "grid", 500);
        }, 500);
    }

    _toggleElevationField() {
        inputElevation.closest(".form__row").classList.toggle("form__row--hidden");
        inputCadence.closest(".form__row").classList.toggle("form__row--hidden");
    }

    _newWorkout(e) {
        e.preventDefault();

        const validInputs = (...inputs) => inputs.every(input => Number.isFinite(input));
        const allPositive = (...inputs) => inputs.every(input => input > 0);

        const { lat, lng } = this.#mapEvent.latlng;
        const type = inputType.value;
        const distance = +inputDistance.value; // '+' transforms string to number
        const duration = +inputDuration.value;
        let workout;

        // check if inputs are nums and postitive
        if (type === "running") {
            const cadence = +inputCadence.value;
            if (!validInputs(distance, duration, cadence) || !allPositive(distance, duration, cadence)) return alert("Inputs must be positive number!");

            workout = new Running([lat, lng], distance, duration, cadence);
        }

        if (type === "cycling") {
            const elevation = +inputElevation.value;
            if (!validInputs(distance, duration, elevation) || !allPositive(distance, duration)) return alert("Inputs must be positive number!");

            workout = new Cycling([lat, lng], distance, duration, elevation);
        }

        this.#workouts.push(workout);
        this._setLocalStorage();
        
        this._hideForm();
        setTimeout(() => {
            this._renderWorkoutMarker(workout);
            this._renderWorkout(workout);
        }, 500);
    }

    _renderWorkoutMarker(workout) {
        L.marker(workout.coords)
        .addTo(this.#map)
        .bindPopup(L.popup({
            maxWidth: 250,
            minWidth: 100,
            autoClose: false,
            closeOnClick: false,
            className: `${workout.type}-popup`,
        }))
        .setPopupContent((workout.type === "running" ? "🏃‍♂️" : "🚴‍♀️") + workout.description)
        .openPopup();
    }

    _renderWorkout(workout) {
        let html = `
        <li class="workout workout--${workout.type}" data-id="${workout.id}">
          <h2 class="workout__title">${workout.description}</h2>
          <div class="workout__details">
            <span class="workout__icon">${workout.type === "running" ? "🏃‍♂️" : "🚴‍♀️"}</span>
            <span class="workout__value">${workout.distance}</span>
            <span class="workout__unit">km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⏱</span>
            <span class="workout__value">${workout.duration}</span>
            <span class="workout__unit">min</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.type === "running" ? workout.pace.toFixed(1) : workout.speed.toFixed(1)}</span>
            <span class="workout__unit">${workout.type === "running" ? "min/km" : "km/h"}</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">${workout.type === "running" ? "🦶🏼" : "⛰"}</span>
            <span class="workout__value">${workout.type === "running" ? workout.cadence : workout.elevationGain}</span>
            <span class="workout__unit">${workout.type === "running" ? "spm" : "m"}</span>
          </div>
        </li>
        `

        form.insertAdjacentHTML("afterend", html);
    }

    _moveToPopup(e) {
        const workoutEl = e.target.closest(".workout");
        if (!workoutEl) return;

        const workout = this.#workouts.find(work => work.id === workoutEl.dataset.id);

        this.#map.setView(workout.coords, this.#mapZoomLevel, {
            animate: true,
            pan: {
                duration: 1
            }
        })

        // workout.click();
    }

    _setLocalStorage() {
        localStorage.setItem("workouts", JSON.stringify(this.#workouts));
    }

    _getLocalStorage() {
        const data = JSON.parse(localStorage.getItem("workouts"));

        if (!data) return;

        this.#workouts = data;
        this.#workouts.forEach(work => this._renderWorkout(work));
    }

    reset() {
        localStorage.removeItem("workouts");
        location.reload();
    }
}

const app = new App();
