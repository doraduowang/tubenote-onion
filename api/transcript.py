from http.server import BaseHTTPRequestHandler
from youtube_transcript_api import YouTubeTranscriptApi
from youtube_transcript_api._errors import TranscriptsDisabled, NoTranscriptFound
import json

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        # Parse videoId from query string
        video_id = None
        if "?" in self.path:
            qs = self.path.split("?", 1)[1]
            for part in qs.split("&"):
                if part.startswith("videoId="):
                    video_id = part.split("=", 1)[1]
                    break

        if not video_id:
            self._respond(400, {"error": "Missing videoId parameter"})
            return

        try:
            # Try fetching in preferred language order
            transcript_list = YouTubeTranscriptApi.list_transcripts(video_id)

            transcript = None
            # 1. Try manually created English first
            try:
                transcript = transcript_list.find_manually_created_transcript(["en", "en-US", "en-GB"])
            except NoTranscriptFound:
                pass

            # 2. Fall back to auto-generated English
            if not transcript:
                try:
                    transcript = transcript_list.find_generated_transcript(["en", "en-US", "en-GB"])
                except NoTranscriptFound:
                    pass

            # 3. Fall back to any available transcript
            if not transcript:
                for t in transcript_list:
                    transcript = t
                    break

            if not transcript:
                self._respond(404, {"error": "No transcript available for this video"})
                return

            raw = transcript.fetch()
            # Normalize to [{time, text}] — round to nearest second
            result = [
                {"time": round(entry["start"]), "text": entry["text"].replace("\n", " ").strip()}
                for entry in raw
                if entry.get("text", "").strip()
            ]

            self._respond(200, result)

        except TranscriptsDisabled:
            self._respond(404, {"error": "Transcripts are disabled for this video"})
        except Exception as e:
            self._respond(500, {"error": str(e)})

    def _respond(self, status, data):
        body = json.dumps(data).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, format, *args):
        pass  # Suppress default logging
