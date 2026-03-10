from http.server import BaseHTTPRequestHandler
import json, re, urllib.request, urllib.parse

def fetch_transcript(video_id):
    headers = {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    }

    url = f"https://www.youtube.com/watch?v={video_id}"
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, timeout=15) as r:
        html = r.read().decode("utf-8")

    # Extract caption tracks from page
    match = re.search(r'"captionTracks":(\[.*?\]),"audioTracks"', html)
    if not match:
        match = re.search(r'"captionTracks":(\[.*?\]),"translationLanguages"', html)
    if not match:
        raise ValueError("No captions available for this video")

    tracks = json.loads(match.group(1))
    if not tracks:
        raise ValueError("No captions available for this video")

    def score(t):
        lang = t.get("languageCode","")
        kind = t.get("kind","")
        if lang in ("en","en-US","en-GB") and kind != "asr": return 0
        if lang.startswith("en") and kind != "asr": return 1
        if lang in ("en","en-US","en-GB"): return 2
        if lang.startswith("en"): return 3
        return 4

    track = sorted(tracks, key=score)[0]
    base_url = track.get("baseUrl","")
    if not base_url:
        raise ValueError("No caption URL found")

    cap_req = urllib.request.Request(base_url + "&fmt=srv3", headers=headers)
    with urllib.request.urlopen(cap_req, timeout=15) as r:
        xml = r.read().decode("utf-8")

    def clean(text):
        text = re.sub(r'<[^>]+>', '', text)
        text = text.replace('&amp;', '&').replace('&lt;', '<').replace('&gt;', '>') \
                   .replace('&quot;', '"').replace('&#39;', "'").strip()
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
