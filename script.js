let audio;
let allSongs = [];
let isPlaying = false;
let currentSong = null;
let totalTime = Number(localStorage.getItem("totalTime") || 0); // Load total time from localStorage if available
let songGuessData;
let albumGuessData;
let eventsData = [];
let incorrectGuesses = 0;

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
    incorrectGuesses = 0;
    songGuessData = null;
    albumGuessData = null;
    eventsData = [];
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

const clamp = (num, min, max) => Math.min(Math.max(num, min), max);

function submitGuess() {
    pause();
    const song_guess = document.getElementById("guessSongInput").value.toLowerCase().trim();
    const album_guess = document.getElementById("guessAlbumInput").value.toLowerCase().trim();

    let message = "Sorry that's not it!";

    // Evaluate guess correctness
    const album = currentSong[0].split(" - ")[1];
    const song = cleanSong(currentSong[1]);
    const albumCorrect = album.toLowerCase() === album_guess;
    const songCorrect = song.toLowerCase() === song_guess;

    if (songCorrect && !songGuessData && albumCorrect && !albumGuessData) {
        message = `Well done!`;
        songGuessData = {
            name: song_guess,
            time: totalTime,
        };
        document.getElementById("guessSongInput").setAttribute("readonly", true);
        document.getElementById("guessSongInput").value = `${song} - ${Math.round(totalTime)} seconds.`;
        albumGuessData = {
            name: album_guess,
            time: totalTime,
        };
        document.getElementById("guessAlbumInput").setAttribute("readonly", true);
        document.getElementById("guessAlbumInput").value = `${album} - ${Math.round(totalTime)} seconds.`;
        eventsData.push("Complete");
    } else if (songCorrect && !songGuessData) {
        message = `Correct song, what's the album?.`;
        songGuessData = {
            name: song_guess,
            time: totalTime,
        };
        document.getElementById("guessSongInput").setAttribute("readonly", true);
        document.getElementById("guessSongInput").value = `${song} - ${Math.round(totalTime)} seconds.`;
        eventsData.push("Song");
    } else if (albumCorrect && !albumGuessData) {
        message = `Correct album, what's the song?`;
        albumGuessData = {
            name: album_guess,
            time: totalTime,
        };
        document.getElementById("guessAlbumInput").setAttribute("readonly", true);
        document.getElementById("guessAlbumInput").value = `${album} - ${Math.round(totalTime)} seconds.`;
        eventsData.push("Album");
    }
    if (!songCorrect && !albumCorrect) {
        incorrectGuesses++;
        eventsData.push("Incorrect");
    }

    if (songGuessData && albumGuessData) {
        // Calculate score based on how long it took to guess
        const max_time = 120; // Anything past this is 0 score
        const buffer_time = 2; // How long to allow score to be max before it starts dropping
        const falloff_rate = 0.6; // How fast the score drops off logarithmically, lower is faster falloff
        const albumScore =
            clamp(
                100 -
                    (100 / (max_time - buffer_time) ** falloff_rate) *
                        (albumGuessData.time - buffer_time) ** falloff_rate || 100,
                0,
                100
            ) / 2;
        const songScore =
            clamp(
                100 -
                    (100 / (max_time - buffer_time) ** falloff_rate) *
                        (songGuessData.time - buffer_time) ** falloff_rate || 100,
                0,
                100
            ) / 2;
        const incorrectScore = incorrectGuesses * 10;
        const totalScore = clamp(albumScore + songScore - incorrectScore, 0, 100);

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

        const messageLines = [
            `Taydle #1 ${Math.round(totalScore)}/100 Points`,
            emojiLine,
            `Incorrect Guesses: ${incorrectGuesses}`,
            `Got Album In: ${Math.round(albumGuessData.time)} seconds`,
            `Got Song In: ${Math.round(songGuessData.time)} seconds`,
            `Total Time: ${Math.round(Math.max(albumGuessData.time, songGuessData.time))} seconds`,
        ];

        message = messageLines.join("<br>");

        // Hide guess button
        document.getElementById("guessButton").style.display = "none";
    }

    document.getElementById("score").innerHTML = message;
    updateProgress();
}
