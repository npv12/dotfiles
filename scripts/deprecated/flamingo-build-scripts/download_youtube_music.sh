function download_yt --description "Download videos off yt in audio format"
  yt-dlp -ciwx --audio-format mp3 --audio-quality 0 $argv[1]
end
