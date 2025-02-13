let audio;
let isPlaying = false;
let currentSong = null;
let totalTime = Number(localStorage.getItem("totalTime") || 0); // Load total time from localStorage if available
let allSongs = [];

// Load the JSON file and initialize the song list
fetch("index.json")
    .then((response) => response.json())
    .then((data) => {
        data.forEach((entry) => {
            const [album, song] = entry.split("|");
            allSongs.push([album, song]);
        });
        pickRandomSong();
    })
    .catch((error) => console.error("Error loading song index:", error));

function pickRandomSong() {
    currentSong = allSongs[Math.floor(Math.random() * allSongs.length)];
    totalTime = 0;
    const [album, song] = currentSong;

    const albumName = album.split(" - ")[1];
    const songName = cleanSong(song);

    audio = new Audio(`albums/${album}/${song}`);
    document.querySelector("h1").textContent = `${songName} - ${albumName}`;
    audio.addEventListener("timeupdate", function () {
        if (audio.paused || audio.ended) return;
        updateProgress();
    });
    audio.addEventListener("durationchange", function () {
        updateProgress();
    });
}

function cleanSong(song) {
    const parts = song.split(" - ");
    let songName = parts.slice(1).join(" - ");
    songName = songName.replace(".mp3", "");
    songName = songName.replace(" (Taylor's Version)", "");
    songName = songName.replace(" (Taylor’s Version)", "");
    songName = songName.replace(" (From The Vault)", "");
    return songName;
}

function togglePlayPause() {
    if (isPlaying) {
        pause();
    } else {
        play();
    }
}

function play() {
    audio.play();
    document.getElementById("playButton").textContent = "Pause";
    isPlaying = true;
    updateProgress();
}

function pause() {
    audio.pause();
    document.getElementById("playButton").textContent = "Play";
    isPlaying = false;
    updateProgress();
}

function restartSong() {
    audio.currentTime = 0;
    updateProgress();
}

let lastTime = 0;
function updateProgress() {
    const now = audio.currentTime;
    const progress = (now / audio.duration) * 100;
    document.querySelector(".progress-bar").style.width = `${progress}%`;
    document.querySelector(".progress-text").textContent = `${Math.round(now)} / ${Math.round(audio.duration)} seconds`;

    if (now - lastTime > 0) {
        totalTime += now - lastTime; // Increment totalTime
    }
    lastTime = now;
    localStorage.setItem("totalTime", totalTime); // Store totalTime in localStorage
    document.querySelector(".time-text").textContent = `Total time: ${Math.round(totalTime)} seconds`;
}

// Event listeners
document.getElementById("playButton").addEventListener("click", togglePlayPause);
document.getElementById("restartButton").addEventListener("click", restartSong);

// Add event listener for the input to filter songs and albums
document.getElementById("guessSongInput").addEventListener("input", function () {
    pause();
    const query = this.value.toLowerCase();
    const suggestions = allSongs.filter((data) => cleanSong(data[1]).toLowerCase().includes(query));
    showSuggestions(document.getElementById("guessSongInput"), true, suggestions, query);
});
document.getElementById("guessAlbumInput").addEventListener("input", function () {
    pause();
    const query = this.value.toLowerCase();
    const suggestions = allSongs.filter((data) => data[0].toLowerCase().includes(query));
    showSuggestions(document.getElementById("guessAlbumInput"), false, suggestions, query);
});

function showSuggestions(input, song, suggestions, query) {
    const dropdown = document.getElementById("suggestions");
    if (query === "" || suggestions.length === 0) {
        dropdown.style.display = "none";
        return;
    }

    dropdown.style.display = "block";
    dropdown.innerHTML = "";
    dropdown.style.top = `${input.offsetTop + input.offsetHeight + window.scrollY}px`;

    const seenNames = {};
    suggestions.forEach((suggestion) => {
        const name = cleanSong(suggestion[song ? 1 : 0]);
        if (!seenNames.hasOwnProperty(name)) {
            seenNames[name] = true;

            const div = document.createElement("div");
            div.textContent = name;
            div.onclick = function () {
                input.value = name;
                dropdown.style.display = "none";
            };
            dropdown.appendChild(div);
        }
    });
}

function submitGuess() {
    pause();
    const song_guess = document.getElementById("guessSongInput").value.toLowerCase().trim();
    const album_guess = document.getElementById("guessAlbumInput").value.toLowerCase().trim();

    let score = 0;
    let message = "";

    // Evaluate guess correctness
    const album = currentSong[0].split(" - ")[1];
    const song = cleanSong(currentSong[1]);
    const albumCorrect = album.toLowerCase() === album_guess;
    const songCorrect = song.toLowerCase() === song_guess;

    if (songCorrect) {
        document.getElementById("guessSongInput").setAttribute("readonly", true);
    }
    if (albumCorrect) {
        document.getElementById("guessAlbumInput").setAttribute("readonly", true);
    }

    if (!albumCorrect && !songCorrect) {
        message = "Sorry, but you didn't guess the album or song correctly.";
    } else if (!albumCorrect) {
        message = `Correct song, what's the album?.`;
    } else if (!songCorrect) {
        message = `Correct album, what's the song?`;
    } else {
        // Evaluate how long it took to guess
        const progress = 100 - (audio.currentTime / audio.duration) * 100;
        score = Math.round(progress);
        message = `<strong>Score:</strong> ${score}<br>\nGreat job! You guessed both the album and song correctly!<br>You listened to ${Math.round(
            audio.currentTime
        )} seconds of the song before guessing!`;
    }

    document.getElementById("score").innerHTML = message;
}
