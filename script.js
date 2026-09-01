// ======================================================
// DISASTER ALERT DASHBOARD
// ======================================================

// ---------------- SEVERITY ----------------

const SEVERITY = {
  low: {
    rank: 1,
    color: "#4ade80",
    label: "LOW"
  },

  moderate: {
    rank: 2,
    color: "#facc15",
    label: "MODERATE"
  },

  high: {
    rank: 3,
    color: "#fb923c",
    label: "HIGH"
  },

  severe: {
    rank: 4,
    color: "#ef4444",
    label: "SEVERE"
  }
};

const RANK_TO_KEY = {
  1: "low",
  2: "moderate",
  3: "high",
  4: "severe"
};


// ---------------- EARTHQUAKE ----------------

function earthquakeSeverity(magnitude) {

  if (magnitude == null) {
    return "low";
  }

  if (magnitude < 4) {
    return "low";
  }

  if (magnitude < 5.5) {
    return "moderate";
  }

  if (magnitude < 6.5) {
    return "high";
  }

  return "severe";
}


// ---------------- WEATHER ----------------

function weatherSeverity({
  precipitation = 0,
  windspeed = 0,
  weathercode = 0
}) {

  let rank = 1;

  if (precipitation >= 50) {
    rank = Math.max(rank, 4);
  } else if (precipitation >= 20) {
    rank = Math.max(rank, 3);
  } else if (precipitation >= 5) {
    rank = Math.max(rank, 2);
  }

  if (windspeed >= 90) {
    rank = Math.max(rank, 4);
  } else if (windspeed >= 60) {
    rank = Math.max(rank, 3);
  } else if (windspeed >= 40) {
    rank = Math.max(rank, 2);
  }

  if ([95, 96, 99].includes(weathercode)) {
    rank = Math.max(rank, 3);
  }

  if ([65, 82].includes(weathercode)) {
    rank = Math.max(rank, 2);
  }

  return RANK_TO_KEY[rank];
}


// ---------------- WEATHER LABEL ----------------

function weatherLabel(code) {

  const labels = {
    0: "Clear sky",
    1: "Mainly clear",
    2: "Partly cloudy",
    3: "Overcast",

    45: "Fog",
    48: "Rime fog",

    51: "Light drizzle",
    53: "Drizzle",
    55: "Dense drizzle",

    61: "Light rain",
    63: "Rain",
    65: "Heavy rain",

    71: "Light snow",
    73: "Snow",
    75: "Heavy snow",

    80: "Rain showers",
    81: "Heavy showers",
    82: "Violent showers",

    95: "Thunderstorm",
    96: "Thunderstorm with hail",
    99: "Severe thunderstorm"
  };

  return labels[code] || "Unknown";
}


// ---------------- TIME ----------------

function timeAgo(date) {

  const seconds = Math.floor(
    (Date.now() - date.getTime()) / 1000
  );

  if (seconds < 60) {
    return "just now";
  }

  if (seconds < 3600) {
    return `${Math.floor(seconds / 60)}m ago`;
  }

  if (seconds < 86400) {
    return `${Math.floor(seconds / 3600)}h ago`;
  }

  return `${Math.floor(seconds / 86400)}d ago`;
}


// ======================================================
// FIREBASE
// ======================================================

const DEFAULT_WATCHLIST = [
  {
    name: "Gaya, Bihar, India",
    lat: 24.7955,
    lon: 84.9994
  },

  {
    name: "New Delhi, India",
    lat: 28.6139,
    lon: 77.2090
  },

  {
    name: "Mumbai, India",
    lat: 19.0760,
    lon: 72.8777
  }
];

let db = null;
let usingFirestore = false;


function initStorage() {

  try {

    if (
      typeof firebaseConfig !== "undefined" &&
      firebaseConfig.apiKey &&
      firebaseConfig.projectId
    ) {

      firebase.initializeApp(firebaseConfig);

      db = firebase.firestore();

      usingFirestore = true;
    }

  } catch (error) {

    console.error("Firebase error:", error);

    usingFirestore = false;
  }


  document.getElementById("storageMode").textContent =
    usingFirestore
      ? "Storage: Firestore"
      : "Storage: Local";
}


async function loadWatchlist() {

  if (usingFirestore) {

    const snapshot =
      await db.collection("watchlist").get();

    if (snapshot.empty) {

      for (const location of DEFAULT_WATCHLIST) {

        await db
          .collection("watchlist")
          .add(location);

      }

      return loadWatchlist();
    }

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  }


  const saved =
    localStorage.getItem("disaster_watchlist");

  if (!saved) {

    const initial =
      DEFAULT_WATCHLIST.map((location, index) => ({
        id: `local_${index}`,
        ...location
      }));

    localStorage.setItem(
      "disaster_watchlist",
      JSON.stringify(initial)
    );

    return initial;
  }

  return JSON.parse(saved);
}


async function addToWatchlist(location) {

  if (usingFirestore) {

    const reference =
      await db
        .collection("watchlist")
        .add(location);

    return {
      id: reference.id,
      ...location
    };
  }


  const list = await loadWatchlist();

  const newLocation = {
    id: `local_${Date.now()}`,
    ...location
  };

  list.push(newLocation);

  localStorage.setItem(
    "disaster_watchlist",
    JSON.stringify(list)
  );

  return newLocation;
}


async function removeFromWatchlist(id) {

  if (usingFirestore) {

    await db
      .collection("watchlist")
      .doc(id)
      .delete();

    return;
  }


  const list =
    (await loadWatchlist())
      .filter(location => location.id !== id);

  localStorage.setItem(
    "disaster_watchlist",
    JSON.stringify(list)
  );
}


// ======================================================
// MAP
// ======================================================

let map;
let earthquakeLayer;
let weatherLayer;

function initMap() {

  map = L
    .map("map")
    .setView([22.9734, 78.6569], 4);


  L.tileLayer(
    "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    {
      attribution:
        "&copy; OpenStreetMap &copy; CARTO",

      maxZoom: 18
    }
  ).addTo(map);


  earthquakeLayer =
    L.layerGroup().addTo(map);

  weatherLayer =
    L.layerGroup().addTo(map);
}


function markerIcon(color) {

  return L.divIcon({

    className: "",

    html: `
      <div style="
        width:16px;
        height:16px;
        border-radius:50%;
        background:${color};
        border:2px solid white;
        box-shadow:0 0 0 3px rgba(0,0,0,.35);
      "></div>
    `,

    iconSize: [16, 16],

    iconAnchor: [8, 8]
  });
}


// ======================================================
// API DATA
// ======================================================

let allAlerts = [];
let selectedAlert = null;


// ---------------- EARTHQUAKES ----------------

async function fetchEarthquakes() {

  const response = await fetch(
    "https://earthquake.usgs.gov/earthquakehazards/feed/v1.0/summary/2.5_day.geojson"
  );

  if (!response.ok) {
    throw new Error("Earthquake API failed");
  }

  const data = await response.json();


  return data.features.map(feature => {

    const [lon, lat] =
      feature.geometry.coordinates;

    const magnitude =
      feature.properties.mag;


    return {

      type: "earthquake",

      title:
        feature.properties.place ||
        "Unknown location",

      time:
        new Date(feature.properties.time),

      sevKey:
        earthquakeSeverity(magnitude),

      lat,
      lon,

      meta:
        `M${magnitude != null ? magnitude.toFixed(1) : "?"} · depth ${feature.geometry.coordinates[2]?.toFixed(0) || "?"} km`
    };

  });
}


// ---------------- WEATHER ----------------

async function fetchWeather(location) {

  const url =
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${location.lat}` +
    `&longitude=${location.lon}` +
    `&current_weather=true` +
    `&hourly=precipitation` +
    `&timezone=auto`;


  const response =
    await fetch(url);

  if (!response.ok) {
    throw new Error("Weather API failed");
  }


  const data =
    await response.json();

  const current =
    data.current_weather;


  let precipitation = 0;


  if (
    data.hourly &&
    data.hourly.time
  ) {

    const index =
      data.hourly.time.indexOf(
        current.time.slice(0, 13) + ":00"
      );

    if (index >= 0) {

      precipitation =
        data.hourly.precipitation[index] || 0;
    }
  }


  const severity =
    weatherSeverity({

      precipitation,

      windspeed:
        current.windspeed,

      weathercode:
        current.weathercode
    });


  return {

    type: "weather",

    title: location.name,

    time: new Date(),

    sevKey: severity,

    lat: location.lat,

    lon: location.lon,

    meta:
      `${weatherLabel(current.weathercode)} · ${current.temperature}°C · wind ${current.windspeed} km/h · rain ${precipitation}mm/h`
  };
}


// ---------------- GEOCODING ----------------

async function geocodeCity(cityName) {

  const url =
    `https://geocoding-api.open-meteo.com/v1/search` +
    `?name=${encodeURIComponent(cityName)}` +
    `&count=1`;


  const response =
    await fetch(url);

  if (!response.ok) {
    throw new Error("Geocoding failed");
  }


  const data =
    await response.json();


  if (
    !data.results ||
    data.results.length === 0
  ) {

    return null;
  }


  const result =
    data.results[0];


  const name = [
    result.name,
    result.admin1,
    result.country
  ]
    .filter(Boolean)
    .join(", ");


  return {

    name,

    lat: result.latitude,

    lon: result.longitude
  };
}


// ======================================================
// RENDER
// ======================================================

function renderMarkers(alerts) {

  earthquakeLayer.clearLayers();
  weatherLayer.clearLayers();


  alerts.forEach(alert => {

    const color =
      SEVERITY[alert.sevKey].color;


    const marker =
      L.marker(
        [alert.lat, alert.lon],
        {
          icon: markerIcon(color)
        }
      );


    marker.bindPopup(`

      <div class="popup-title">
        ${escapeHtml(alert.title)}
      </div>

      <div class="popup-row">
        ${escapeHtml(alert.meta)}
      </div>

      <div class="popup-row">
        ${SEVERITY[alert.sevKey].label}
        ·
        ${timeAgo(alert.time)}
      </div>

    `);


    marker.on("click", () => {

      selectedAlert = alert;

      document.getElementById(
        "aiResult"
      ).textContent =
        `Selected: ${alert.title}. Click "Explain Current Alert" to ask AI.`;
    });


    if (alert.type === "earthquake") {

      earthquakeLayer.addLayer(marker);

    } else {

      weatherLayer.addLayer(marker);
    }

  });
}


function renderFeed(alerts) {

  const list =
    document.getElementById("alertsFeed");

  const filter =
    currentFilter;


  const filtered =
    filter === "all"
      ? alerts
      : alerts.filter(
          alert => alert.type === filter
        );


  const sorted =
    [...filtered].sort(
      (a, b) =>
        SEVERITY[b.sevKey].rank -
        SEVERITY[a.sevKey].rank ||
        b.time - a.time
    );


  document.getElementById(
    "alertCount"
  ).textContent = sorted.length;


  if (!sorted.length) {

    list.innerHTML =
      `<li class="feed-empty">
        No alerts in this category.
      </li>`;

    return;
  }


  list.innerHTML =
    sorted.map((alert, index) => `

      <li
        class="alert-card"
        data-index="${index}"
      >

        <span
          class="alert-stripe"
          style="
            color:${SEVERITY[alert.sevKey].color};
          "
        ></span>


        <div class="alert-body">

          <div class="alert-top">

            <span class="alert-title">
              ${escapeHtml(alert.title)}
            </span>

            <span class="alert-time">
              ${timeAgo(alert.time)}
            </span>

          </div>


          <div class="alert-meta">
            ${escapeHtml(alert.meta)}
          </div>


          <span
            class="alert-tag"
            style="
              color:${SEVERITY[alert.sevKey].color};
              background:${SEVERITY[alert.sevKey].color}18;
            "
          >
            ${SEVERITY[alert.sevKey].label}
          </span>

        </div>

      </li>

    `).join("");


  list.querySelectorAll(".alert-card")
    .forEach((card, index) => {

      card.addEventListener(
        "click",
        () => {

          const filteredAlerts =
            currentFilter === "all"
              ? allAlerts
              : allAlerts.filter(
                  alert =>
                    alert.type === currentFilter
                );


          selectedAlert =
            [...filteredAlerts].sort(
              (a, b) =>
                SEVERITY[b.sevKey].rank -
                SEVERITY[a.sevKey].rank ||
                b.time - a.time
            )[index];


          document.getElementById(
            "aiResult"
          ).textContent =
            `Selected: ${selectedAlert.title}. Click "Explain Current Alert".`;

        }
      );

    });
}


function renderOverallSeverity(alerts) {

  const badge =
    document.getElementById(
      "overallSeverity"
    );

  const label =
    document.getElementById(
      "severityLabel"
    );


  if (!alerts.length) {

    badge.className =
      "severity-badge sev-low";

    label.textContent =
      "ALL CLEAR";

    return;
  }


  const highestRank =
    Math.max(
      ...alerts.map(
        alert =>
          SEVERITY[alert.sevKey].rank
      )
    );


  const key =
    RANK_TO_KEY[highestRank];


  badge.className =
    `severity-badge sev-${key}`;


  label.textContent =
    key === "low"
      ? "ALL CLEAR"
      : `${SEVERITY[key].label} ALERT`;
}


function renderWatchlist(list) {

  const element =
    document.getElementById(
      "watchlistItems"
    );


  element.innerHTML =
    list.map(location => `

      <li>

        <span>
          ${escapeHtml(location.name)}
        </span>

        <button
          class="remove-btn"
          data-id="${location.id}"
          title="Remove"
        >
          ×
        </button>

      </li>

    `).join("");


  element
    .querySelectorAll(".remove-btn")
    .forEach(button => {

      button.addEventListener(
        "click",
        async () => {

          await removeFromWatchlist(
            button.dataset.id
          );

          refreshAll();
        }
      );

    });
}


// ======================================================
// REFRESH
// ======================================================

async function refreshAll() {

  const button =
    document.getElementById(
      "refreshBtn"
    );


  button.disabled = true;


  try {

    const watchlist =
      await loadWatchlist();


    renderWatchlist(watchlist);


    const earthquakePromise =
      fetchEarthquakes()
        .catch(() => []);


    const weatherPromises =
      watchlist.map(
        location =>
          fetchWeather(location)
            .catch(() => null)
      );


    const [
      earthquakes,
      ...weatherResults
    ] = await Promise.all([
      earthquakePromise,
      ...weatherPromises
    ]);


    allAlerts = [
      ...earthquakes,
      ...weatherResults.filter(Boolean)
    ];


    renderMarkers(allAlerts);

    renderFeed(allAlerts);

    renderOverallSeverity(allAlerts);


    document.getElementById(
      "lastUpdated"
    ).textContent =
      "Updated " +
      new Date().toLocaleTimeString();

  } catch (error) {

    console.error(
      "Refresh failed:",
      error
    );

  } finally {

    button.disabled = false;
  }
}


// ======================================================
// AI
// ======================================================

async function explainWithAI() {

  const button =
    document.getElementById(
      "aiExplainBtn"
    );

  const result =
    document.getElementById(
      "aiResult"
    );


  if (!selectedAlert) {

    result.textContent =
      "Please select an alert first.";

    return;
  }


  button.disabled = true;

  result.textContent =
    "AI is analyzing the alert...";


  try {

    const response =
      await fetch("/api/ai", {

        method: "POST",

        headers: {
          "Content-Type": "application/json"
        },

        body: JSON.stringify({
          alert: {

            type: selectedAlert.type,

            title: selectedAlert.title,

            severity:
              SEVERITY[
                selectedAlert.sevKey
              ].label,

            details:
              selectedAlert.meta
          }
        })

      });


    const data =
      await response.json();


    if (!response.ok) {

      throw new Error(
        data.error ||
        "AI request failed"
      );
    }


    result.textContent =
      data.answer;

  } catch (error) {

    console.error(error);

    result.textContent =
      "AI explanation is currently unavailable.";

  } finally {

    button.disabled = false;
  }
}


// ======================================================
// EVENTS
// ======================================================

let currentFilter = "all";


function initEvents() {

  document
    .getElementById("refreshBtn")
    .addEventListener(
      "click",
      refreshAll
    );


  document
    .querySelectorAll(".filter-btn")
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          document
            .querySelectorAll(".filter-btn")
            .forEach(
              btn =>
                btn.classList.remove(
                  "active"
                )
            );


          button.classList.add(
            "active"
          );


          currentFilter =
            button.dataset.filter;


          renderFeed(allAlerts);
        }
      );

    });


  document
    .getElementById(
      "addLocationForm"
    )
    .addEventListener(
      "submit",
      async event => {

        event.preventDefault();


        const input =
          document.getElementById(
            "cityInput"
          );

        const message =
          document.getElementById(
            "addLocationMsg"
          );


        const city =
          input.value.trim();


        if (!city) {
          return;
        }


        message.textContent =
          "Finding city...";


        try {

          const location =
            await geocodeCity(city);


          if (!location) {

            message.textContent =
              `Couldn't find "${city}".`;

            return;
          }


          await addToWatchlist(
            location
          );


          input.value = "";

          message.textContent = "";


          await refreshAll();

        } catch (error) {

          console.error(error);

          message.textContent =
            "Unable to add this location.";

        }

      }
    );


  document
    .getElementById(
      "aiExplainBtn"
    )
    .addEventListener(
      "click",
      explainWithAI
    );
}


// ======================================================
// SECURITY HELPER
// ======================================================

function escapeHtml(value) {

  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


// ======================================================
// START
// ======================================================

async function startApp() {

  initStorage();

  initMap();

  initEvents();

  await refreshAll();

}


startApp();


// Refresh every 5 minutes

setInterval(
  refreshAll,
  5 * 60 * 1000
);
