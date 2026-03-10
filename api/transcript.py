from http.server import BaseHTTPRequestHandler
import json, re, urllib.request, urllib.parse, os

YOUTUBE_API_KEY = os.environ.get("YOUTUBE_API_KEY", "")

def fetch_transcript(video_id):
    headers = {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
    }

    # Step 1: get caption track list via YouTube Data API
    api_url = f"https://www.googleapis.com/youtube/v3/captions?part=snippet&videoId={video_id}&key={YOUTUBE_API_KEY}"
    req = urllib.request.Request(api_url, headers=headers)
    with urllib.request.urlopen(req, timeout=15) as r:
        data = json.loads(r.read().decode("utf-8"))

    tracks = data.get("items", [])
    if not tracks:
        raise ValueError("No captions available for this video")

    # Prefer English manual > English auto > any
    def score(t):
        lang = t["snippet"].get("language","")
        kind = t["snippet"].get("trackKind","")
        if lang in ("en","en-US") and kind == "standard": return 0
        if lang.startswith("en") and kind == "standard": return 1
        if lang in ("en","en-US"): return 2
        if lang.startswith("en"): return 3
        return 4

    track = sorted(tracks, key=score)[0]
    track_id = track["id"]

    # Step 2: download caption XML
    cap_url = f"https://www.googleapis.com/youtube/v3/captions/{track_id}?key={YOUTUBE_API_KEY}&tfmt=srv3"
    cap_req = urllib.request.Request(cap_url, headers=headers)
    with urllib.request.urlopen(cap_req, timeout=15) as r:
        xml = r.read().decode("utf-8")

    def clean(text):
        text = re.sub(r'<[^>]+>', '', text)
        text = text.replace('&amp;','&').replace('&lt;','<').replace('&gt;','>') \
                   .replace('&quot;','"').replace('&#39;',"'").strip()
        return text

    entries = re.findall(r'start="([\d.]+)"[^>]*>(.+?)</text>', xml, re.DOTALL)
    result = [{"time": round(float(s)), "text": clean(t)} for s,t in entries if clean(t)]

    if not result:
        raise ValueError("Transcript is empty")
    return result


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        video_id = None
        if "?" in self.path:
            for part in self.path.split("?",1)[1].split("&"):
                if part.startswith("videoId="):
                    video_id = urllib.parse.unquote(part.split("=",1)[1])
                    break

        if not video_id:
            self._respond(400, {"error": "Missing videoId"})
            return

        try:
            self._respond(200, fetch_transcript(video_id))
        except ValueError as e:
            self._respond(404, {"error": str(e)})
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
        pass
