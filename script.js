let audio;
let allSongs = [];
let isPlaying = false;
let currentSong = null;
let gameNumber = 0;
let totalTime = Number(localStorage.getItem("totalTime") || 0); // Load total time from localStorage if available
let songGuessData;
let albumGuessData;
let eventsData = [];
let messageLines = []; // The Final score
let incorrectGuesses = Number(localStorage.getItem("incorrectGuesses") || 0);

// Function to format the current date to a string
function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}
const todayStr = formatDate(new Date());

// Check and update game state only if the date has changed
function initializeGame() {
    if (localStorage.getItem("lastGameDate") === todayStr) {
        const lastState = localStorage.getItem("lastGameState");
        if (lastState) {
            const lastScore = JSON.parse(lastState);
            document.getElementById("score").innerHTML = "Click To Copy To Clipboard<br><br>" + lastScore.join("<br>");
            document.getElementById("score").style.display = "block";
        }
    } else {
        resetData();
    }

    // Load songs and pick based on new date if it's a new day
    fetch("index.json")
        .then((response) => response.json())
        .then((data) => {
            allSongs = data.map((entry) => entry.split("|"));
            pickSong();
            document.querySelector("h1").textContent = `Taydle #${gameNumber}: Click To Play`;
        })
        .catch((error) => console.error("Error loading song index:", error));
}

function pickSong() {
    const startDate = new Date("2025-02-15");
    const today = new Date();
    localStorage.setItem("lastGameDate", todayStr);

    // Calculate number of days between today and start date
    const diffTime = today - startDate;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    gameNumber = diffDays + 1;

    // Compute index for the song based on the day count seen modulo the array length
    const index = (diffDays + allSongs.length) % allSongs.length;
    currentSong = allSongs[index];

    // Display song details as part of game setup
    const [hash, album, song] = currentSong;

    audio = new Audio(`albums/${album}/${song}`);
    audio.addEventListener("timeupdate", function () {
        if (audio.paused || audio.ended) return;
        updateProgress();
    });
    audio.addEventListener("durationchange", function () {
        updateProgress();
    });
}

function resetData() {
    // Reset game state related variables
    totalTime = 0;
    localStorage.setItem("totalTime", totalTime);
    incorrectGuesses = 0;
    localStorage.setItem("incorrectGuesses", incorrectGuesses);
    songGuessData = null;
    albumGuessData = null;
    eventsData = [];
    messageLines = [];
    document.getElementById("score").display = "none";
    document.getElementById("message").textContent = "";
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
    document.getElementById("playButton").textContent = "Playing";
    document.getElementById("playButton").style.backgroundColor = "#4caf50";
    isPlaying = true;
    updateProgress();
}

function pause() {
    audio.pause();
    document.getElementById("playButton").textContent = "Paused";
    document.getElementById("playButton").style.backgroundColor = "#8f5a03";
    isPlaying = false;
    updateProgress();
}

function restartSong() {
    audio.currentTime = 0;
    updateProgress();
}

// Logarithmic progress bar, to highlight the first seconds more prominently
function progressFalloff(now, dur) {
    const falloff_rate = 0.5;
    return clamp(((1 / dur ** falloff_rate) * now ** falloff_rate || 0) * 100, 0, 100);
}

let lastTime = 0;
function updateProgress() {
    const now = audio.currentTime;
    const dur = audio.duration;
    document.querySelector(".progress-bar").style.width = `${progressFalloff(now, dur)}%`;
    document.querySelector(".progress-text").textContent = `${Math.round(now)} / ${Math.round(dur)} seconds`;

    if (now - lastTime > 0) {
        totalTime += now - lastTime; // Increment totalTime
    }
    lastTime = now;
    localStorage.setItem("totalTime", totalTime); // Store totalTime in localStorage
    document.querySelector(".time-text").innerHTML = `Total Time: ${Math.round(
        totalTime
    )} seconds<br>Incorrect Guesses: ${incorrectGuesses}`;
}

// Event listeners
document.getElementById("playButton").addEventListener("click", togglePlayPause);
document.getElementById("restartButton").addEventListener("click", restartSong);

// Add event listener for the input to filter songs and albums
document.getElementById("guessSongInput").addEventListener("input", function () {
    pause();
    const query = this.value.toLowerCase();
    const suggestions = allSongs.filter((data) => cleanSong(data[2]).toLowerCase().includes(query));
    showSuggestions(document.getElementById("guessSongInput"), true, suggestions, query);
});
document.getElementById("guessAlbumInput").addEventListener("input", function () {
    pause();
    const query = this.value.toLowerCase();
    const suggestions = allSongs.filter((data) => data[1].toLowerCase().includes(query));
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
        const name = cleanSong(suggestion[song ? 2 : 1]);
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

const clamp = (num, min, max) => Math.min(Math.max(num, min), max);

function addGuessMarker(now, type) {
    // Create a marker element
    const marker = document.createElement("div");
    marker.classList.add("marker");
    marker.style.left = `${progressFalloff(now, audio.duration)}%`;
    if (type == "incorrect") {
        marker.style.backgroundColor = "red";
    } else if (type == "correct") {
        marker.style.backgroundColor = "rgb(0 255 0)";
        marker.style.height = "100%";
        marker.style.top = "0";
    }

    // Append marker to the progress bar
    document.querySelector(".progress-container").appendChild(marker);
}

let lastGuess;
function submitGuess() {
    pause();
    const song_guess = document.getElementById("guessSongInput").value.toLowerCase().trim();
    const album_guess = document.getElementById("guessAlbumInput").value.toLowerCase().trim();

    if (song_guess === "" || album_guess === "") {
        return;
    }
    // Check if the guess is identical to the last guess
    if (lastGuess && song_guess === lastGuess[0] && album_guess === lastGuess[1]) {
        return;
    }
    lastGuess = [song_guess, album_guess];

    // Evaluate guess correctness
    const album = currentSong[1].split(" - ")[1];
    const song = cleanSong(currentSong[2]);
    const albumCorrect = album.toLowerCase() === album_guess;
    const songCorrect = song.toLowerCase() === song_guess;

    if (songCorrect && !songGuessData) {
        songGuessData = totalTime;
        document.getElementById("guessSongInput").setAttribute("readonly", true);
        document.getElementById("guessSongInput").value = `${song} - ${Math.round(totalTime)} seconds.`;
        addGuessMarker(audio.currentTime, "correct"); // Add marker for the guess
        document.getElementById("message").innerHTML = "Correct song, what's the album?";
        updateProgress();
    }
    if (albumCorrect && !albumGuessData) {
        albumGuessData = totalTime;
        document.getElementById("guessAlbumInput").setAttribute("readonly", true);
        document.getElementById("guessAlbumInput").value = `${album} - ${Math.round(totalTime)} seconds.`;
        addGuessMarker(audio.currentTime, "correct"); // Add marker for the guess
        document.getElementById("message").innerHTML = "Correct album, what's the song?";
        updateProgress();
    }
    if (!songCorrect && !albumCorrect) {
        incorrectGuesses++;
        localStorage.setItem("incorrectGuesses", incorrectGuesses);
        eventsData.push("Incorrect");
        addGuessMarker(audio.currentTime, "incorrect"); // Add marker for the guess
        document.getElementById("message").innerHTML = "Sorry that's not it!";
        updateProgress();
    }

    if (songGuessData != null && albumGuessData != null) {
        eventsData.push("Complete");
        // Calculate score based on how long it took to guess
        const max_time = 120; // Anything past this is 0 score
        const buffer_time = 2; // How long to allow score to be max before it starts dropping
        const falloff_rate = 0.6; // How fast the score drops off logarithmically, lower is faster falloff
        const albumScore =
            clamp(
                100 -
                    (100 / (max_time - buffer_time) ** falloff_rate) * (albumGuessData - buffer_time) ** falloff_rate ||
                    100,
                0,
                100
            ) / 2;
        const songScore =
            clamp(
                100 -
                    (100 / (max_time - buffer_time) ** falloff_rate) * (songGuessData - buffer_time) ** falloff_rate ||
                    100,
                0,
                100
            ) / 2;
        const incorrectScore = incorrectGuesses * 10;
        const totalScore = Math.round(clamp(albumScore + songScore - incorrectScore, 0, 100));

        // Get the emojis line
        let emojiLine = "";
        let encounteredCorrect = false;
        eventsData.forEach((event, index) => {
            if (event === "Incorrect") {
                emojiLine += "🟥";
            } else if (event === "Complete") {
                emojiLine += "🟩";
                encounteredCorrect = true;
            } else if (event === "Album" || event === "Song") {
                if (!encounteredCorrect) {
                    emojiLine += "🟦";
                    encounteredCorrect = true;
                } else {
                    emojiLine += "🟩";
                }
            }
        });

        // Retrieve past scores from localStorage, add new score, then save it
        const pastScores = JSON.parse(localStorage.getItem("pastScores")) || [];
        const hash = currentSong[0];
        pastScores.push(hash + "|" + totalScore);
        localStorage.setItem("pastScores", JSON.stringify(pastScores));

        // Calculate average score
        const totalGames = pastScores.length;
        const averageScore = pastScores.reduce((acc, score) => acc + parseFloat(score.split("|")[1]), 0) / totalGames;

        messageLines = [
            `Taydle #${gameNumber} ${totalScore}/100 Points`,
            emojiLine,
            `Incorrect Guesses: ${incorrectGuesses}`,
            `Got Album In: ${Math.round(albumGuessData)} seconds`,
            `Got Song In: ${Math.round(songGuessData)} seconds`,
            `Average Points Over ${totalGames} Games: ${Math.round(averageScore)}/100`,
            `https://taydle.codenil.dev`,
        ];
        document.getElementById("message").innerHTML = "";
        document.getElementById("score").innerHTML = "Click To Copy To Clipboard<br><br>" + messageLines.join("<br>");
        document.getElementById("score").style.display = "block";
        updateProgress();

        // Store game state so it persists with refreshes
        localStorage.setItem("lastGameState", JSON.stringify(messageLines));

        // Hide guess button
        document.getElementById("guessButton").style.display = "none";
    } else if (songCorrect && !songGuessData) {
        eventsData.push("Song");
    } else if (albumCorrect && !albumGuessData) {
        eventsData.push("Album");
    }
}

function giveUp() {
    pause();
    incorrectGuesses += 100;
    localStorage.setItem("incorrectGuesses", incorrectGuesses);
    document.getElementById("message").innerHTML = `The song was ${cleanSong(currentSong[2])} from ${
        currentSong[1].split(" - ")[1]
    }`;
    updateProgress();
}

// Add click event listener to copy the message
function copyScore() {
    navigator.clipboard.writeText(messageLines.join("\n")).then(
        function () {
            console.log("Async: Copying to clipboard was successful!");
        },
        function (err) {
            console.error("Async: Could not copy text: ", err);
        }
    );
}

// Initialize game on page load
initializeGame();
