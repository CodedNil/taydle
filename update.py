import os
import json
import hashlib

albums_folder = "albums"
output_file = "index.json"
salt = "salty1"

songs_list = []

# Iterate through each album directory in the albums folder
for album_folder in sorted(os.listdir(albums_folder)):
    album_path = os.path.join(albums_folder, album_folder)
    if os.path.isdir(album_path):
        # Iterate through each song file in the album folder
        for song_file in sorted(os.listdir(album_path)):
            if song_file.endswith(".mp3"):
                songs_list.append(f"{album_folder}|{song_file}")

# Shuffle the list of songs
songs_list.sort(
    key=lambda song: hashlib.sha256(f"{song}|{salt}".encode("utf-8")).hexdigest()
)

# Write the dictionary to a json file
with open(output_file, "w", encoding="utf-8") as json_file:
    json.dump(songs_list, json_file, indent=4, ensure_ascii=False)
