'use strict';

// prettier-ignore
const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

class Workout {
  dataID;
  date;

  constructor(coords, distance, duration) {
    this.coords = coords;
    this.distance = distance;
    this.duration = duration;

    this.generatedID();
    this.generatedDate();
  }

  generatedID() {
    this.dataID = Math.trunc(Math.random() * 1234567890) + 1;
  }

  generatedDate() {
    const dateOption = {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
    };

    this.date = new Intl.DateTimeFormat(
      navigator.geolocation,
      dateOption
    ).format(new Date());
  }
}

class Running extends Workout {
  type = 'running';
  pace;

  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace();
  }

  calcPace() {
    this.pace = (this.duration / this.distance).toFixed(1);
  }
}

class Cycling extends Workout {
  type = 'cycling';
  speed;

  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;
    this.calcSpeed();
  }

  calcSpeed() {
    this.speed = (this.duration / (this.distance / 60)).toFixed(1);
  }
}

/////////////////////////////////////
// APPLICATIOIN ARCHITECHTURE
class App {
  #markerPoint;
  #map;

  _workout = [];

  constructor() {
    this._getPosition();
    this._toggleElevationField();

    // Get local storage to Render
    this._getLocalStorage();

    // Submit form and create new workout
    form.addEventListener('submit', e => {
      e.preventDefault();
      this._newWorkout();
    });

    // click workout'list move to map's center
    containerWorkouts.addEventListener('click', e => {
      this._moveToMarker(e.target);
    });
  }

  _getPosition() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(this._loadMap.bind(this), () =>
        alert(`Cannot access your location`)
      );
    }
  }

  _loadMap(position) {
    const { latitude, longitude } = position.coords;
    const coords = [latitude, longitude];

    this.#map = L.map('map').setView(coords, 13);

    L.tileLayer(
      'https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token={accessToken}',
      {
        attribution:
          'Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
        maxZoom: 18,
        id: 'mapbox/streets-v11',
        tileSize: 512,
        zoomOffset: -1,
        accessToken:
          'pk.eyJ1IjoicGhpbGlwMTczNjgxMiIsImEiOiJjbDNtaWk1MDkwNHc1M2Judzk3MXU1bTdvIn0.f_OkugTrCWXQTsegssBHOQ',
      }
    ).addTo(this.#map);

    this.#map.on('click', this._showForm.bind(this));

    this._workout.forEach(data => {
      this._renderMarker(data);
    });
  }

  _showForm(mapEvent) {
    this.#markerPoint = mapEvent;

    if (form.classList.contains('hidden')) {
      inputDistance.focus();
      form.classList.remove('hidden');
    }
  }

  _hideFields() {
    form.classList.add('hidden');
    inputType.value = 'running';
    inputDistance.value =
      inputDuration.value =
      inputCadence.value =
      inputElevation.value =
        '';
  }

  _toggleElevationField() {
    form.addEventListener('change', () => {
      if (inputType.value == 'cycling') {
        inputElevation
          .closest('.form__row')
          .classList.remove('form__row--hidden');
        inputCadence.closest('.form__row').classList.add('form__row--hidden');
      }
      if (inputType.value == 'running') {
        inputCadence
          .closest('.form__row')
          .classList.remove('form__row--hidden');
        inputElevation.closest('.form__row').classList.add('form__row--hidden');
      }
    });
  }

  _newWorkout() {
    const type = inputType.value + '';
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const { lat, lng } = this.#markerPoint.latlng;
    let workout;

    const inputIsValid = function (...input) {
      const value = input.every(input => input > 0 && Number.isFinite(input));
      return value;
    };

    // check number is valid & is number --- Running
    if (type === 'running') {
      const cadence = +inputCadence.value;

      if (!inputIsValid(distance, duration, cadence)) {
        return alert(`Input positive number and fill all form`);
      }

      workout = new Running([lat, lng], distance, duration, cadence);
    }

    // check number is valid & is number --- Cycling
    if (type === 'cycling') {
      const elevation = +inputElevation.value;

      if (!inputIsValid(distance, duration, elevation)) {
        return alert(`Input positive number and fill all form`);
      }

      workout = new Cycling([lat, lng], distance, duration, elevation);
    }

    // Add new Object to workout array
    this._workout.push(workout);

    // Render workout on map as marker
    this._renderMarker(workout);

    // Render Workout
    this._renderWorkout(workout);

    // Set data to local storage
    this._setLocalStorage();

    // Hide form and clear input fields
    this._hideFields();
  }

  _renderWorkout(workout) {
    setTimeout(() => {
      const html = `
      <li class="workout workout--${workout.type}" data-id="${workout.dataID}">
          <h2 class="workout__title">${
            workout.type[0].toUpperCase() + workout.type.slice(1)
          } on ${workout.date}</h2>
          <div class="workout__details">
            <span class="workout__icon">${
              workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'
            }</span>
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
            <span class="workout__value"> ${
              workout.type === 'running' ? workout.pace : workout.speed
            } </span>
            <span class="workout__unit"> ${
              workout.type === 'running' ? 'min/km' : 'km/h'
            } </span>
          </div>

          <div class="workout__details">
            <span class="workout__icon">${
              workout.type === 'running' ? '🦶🏼' : '⛰'
            }</span>
            <span class="workout__value"> ${
              workout.type === 'running'
                ? workout.cadence
                : workout.elevationGain
            }</span>
            <span class="workout__unit">${
              workout.type == 'running' ? 'spm' : 'm'
            }</span>
          </div>

      </li>
      `;

      containerWorkouts.insertAdjacentHTML('beforeend', html);
      // form.insertAdjacentHTML('afterend', html);

      // Animation fade in workout list
      setTimeout(() => {
        const containerAllWorkouts = document.querySelectorAll('.workout');
        containerAllWorkouts.forEach(el => {
          if (+el.dataset.id === +workout.dataID) {
            el.style.opacity = '1';
          }
        });
      }, 100);
    }, 500);
  }

  _moveToMarker(el) {
    const workoutEl = el.closest('.workout');
    const workoutList = this._workout?.find(
      el => el.dataID == workoutEl?.dataset.id
    );
    if (!workoutEl?.classList.contains('workout')) return;
    const [lat, lng] = workoutList.coords;

    // this.#map.panTo(new L.LatLng(lat, lng));
    // or
    this.#map.setView([lat, lng], 13, {
      zoom: {
        animate: true,
      },
      pan: {
        animate: true,
        duration: 0.5,
        easeLinearity: 0.7,
      },
    });
  }

  _renderMarker(workout) {
    const marker = L.marker(workout.coords, {
      riseOnHover: true,
      autoPanOnFocus: false,
      draggable: true,
    })
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${
            workout.type === 'running' ? 'running-popup' : 'cycling-popup'
          }`,
        })
      )
      .openPopup()
      .setPopupContent(
        `${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.type} on ${
          workout.date
        } `
      );
  }

  _setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this._workout));
  }

  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts'));
    if (!data) return;

    this._workout = data;
    console.log(this._workout);

    // setTimeout(() => {
    //   this._workout.forEach(data => {
    //     this._renderWorkout(data);
    //     this._renderMarker(data);
    //   });
    // }, 500);

    this._workout.forEach(data => {
      this._renderWorkout(data);
    });
  }

  reset() {
    localStorage.removeItem('workouts');
    location.reload();
  }
}

const appMap = new App();
/*
// let markerPoint, map;


// Render workout in list
// class Workout {
//   #dataID;

//   constructor(type, distance, duration, cadence, elevation) {
//     this.type = type;
//     this.distance = distance;
//     this.duration = duration;
//     this.cadence = cadence;
//     this.elevation = elevation;
//   }

// Render Submit Form
// createWorkOut() {
//   setTimeout(() => {
//     const dataID = Math.trunc(Math.random() * 1234567890) + 1;
//     const createDate = new Date();
//     const dateOption = {
//       month: 'short',
//       day: 'numeric',
//       hour: 'numeric',
//       minute: 'numeric',
//       second: 'numeric',
//     };
//     this.#dataID = dataID;

//     const html = `
//     <li class="workout workout--${this.type}" data-id="${this.#dataID}">
//         <h2 class="workout__title">${
//           this.type[0].toUpperCase() + this.type.slice(1)
//         } on ${new Intl.DateTimeFormat(
//       navigator.geolocation,
//       dateOption
//     ).format(createDate)}</h2>
//         <div class="workout__details">
//           <span class="workout__icon">${
//             this.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'
//           }</span>
//           <span class="workout__value">${this.distance}</span>
//           <span class="workout__unit">km</span>
//         </div>

//         <div class="workout__details">
//           <span class="workout__icon">⏱</span>
//           <span class="workout__value">${this.duration}</span>
//           <span class="workout__unit">min</span>
//         </div>

//         <div class="workout__details">
//           <span class="workout__icon">⚡️</span>
//           <span class="workout__value"> ${
//             this.duration / this.distance
//           } </span>
//           <span class="workout__unit">min/km</span>
//         </div>

//         <div class="workout__details">
//           <span class="workout__icon">${
//             this.type === 'running' ? '🦶🏼' : '⛰'
//           }</span>
//           <span class="workout__value"> ${
//             this.type === 'running' ? this.cadence : this.elevation
//           }</span>
//           <span class="workout__unit">${
//             this.type == 'running' ? 'spm' : 'm'
//           }</span>
//         </div>

//     </li>
//     `;

//     containerWorkouts.insertAdjacentHTML('beforeend', html);

//     // Click Marker on map.
//     const { lat, lng } = markerPoint.latlng;
//     const marker = L.marker([lat, lng], {
//       riseOnHover: true,
//       autoPanOnFocus: false,
//       draggable: true,
//     })
//       .addTo(map)
//       .bindPopup(
//         L.popup({
//           maxWidth: 250,
//           minWidth: 100,
//           autoClose: false,
//           closeOnClick: false,
//           className: 'running-popup',
//         })
//       )
//       .openPopup()
//       .setPopupContent(
//         `${this.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${
//           this.type
//         } on ${new Intl.DateTimeFormat(
//           navigator.geolocation,
//           dateOption
//         ).format(createDate)}`
//       );

//     // Animation fade in workout list
//     setTimeout(() => {
//       const containerAllWorkouts = document.querySelectorAll('.workout');
//       containerAllWorkouts.forEach(el => {
//         if (+el.dataset.id === +this.#dataID) {
//           el.style.opacity = '1';
//         }
//       });
//     }, 100);
//   }, 500);
// }
// }

// Submit form && Update render workout list
// const inputFormFn = e => {
//   const type_cycling =
//     inputType.value &&
//     inputDistance.value &&
//     inputDuration.value &&
//     inputElevation.value;

//   const type_running =
//     inputType.value &&
//     inputDistance.value &&
//     inputDuration.value &&
//     inputCadence.value;

//   if (inputType.value === 'cycling' ? type_cycling : type_running) {
//     // Update Workout list

//     const newWorkout = new Workout(
//       inputType.value,
//       inputDistance.value,
//       inputDuration.value,
//       inputCadence.value,
//       inputElevation.value
//     );
//     newWorkout.createWorkOut();

//     //   reset form
//     form.classList.add('hidden');
//     inputType.value = 'running';
//     inputDistance.value =
//       inputDuration.value =
//       inputCadence.value =
//       inputElevation.value =
//         '';
//   }
// };

// const UpdateNavigator = () => {
//   if (navigator.geolocation) {
//     navigator.geolocation.getCurrentPosition(
//       position => {
//         const { latitude, longitude } = position.coords;
//         const coords = [latitude, longitude];

//         map = L.map('map').setView(coords, 13);

//         L.tileLayer(
//           'https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token={accessToken}',
//           {
//             attribution:
//               'Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
//             maxZoom: 18,
//             id: 'mapbox/streets-v11',
//             tileSize: 512,
//             zoomOffset: -1,
//             accessToken:
//               'pk.eyJ1IjoicGhpbGlwMTczNjgxMiIsImEiOiJjbDNtaWk1MDkwNHc1M2Judzk3MXU1bTdvIn0.f_OkugTrCWXQTsegssBHOQ',
//           }
//         ).addTo(map);

//         map.on('click', mapEvent => {
//           markerPoint = mapEvent;

//           if (form.classList.contains('hidden')) {
//             inputDistance.focus();
//             form.classList.remove('hidden');
//           }
//         });
//       },
//       () => alert(`Cannot access your location`)
//     );
//   }
// };

// const init = () => {
//   // Update Map
//   // UpdateNavigator();

//   // set form

//   form.addEventListener('change', () => {
//     if (inputType.value == 'cycling') {
//       inputElevation
//         .closest('.form__row')
//         .classList.remove('form__row--hidden');
//       inputCadence.closest('.form__row').classList.add('form__row--hidden');
//     }
//     if (inputType.value == 'running') {
//       inputCadence.closest('.form__row').classList.remove('form__row--hidden');
//       inputElevation.closest('.form__row').classList.add('form__row--hidden');
//     }
//   });

//   form.addEventListener('submit', e => {
//     e.preventDefault();
//     inputFormFn(e);
//   });
// };

// init();


*/
