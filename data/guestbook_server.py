#!/usr/bin/env python3
"""Guestbook server for El Gran Libro de la Magia"""
import json, os, sys
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
from datetime import datetime

DATA_FILE = os.path.expanduser("~/jarvis-voice-factory/data/firmas.json")
os.makedirs(os.path.dirname(DATA_FILE), exist_ok=True)

class Handler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "POST, GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path == "/firmas":
            if os.path.exists(DATA_FILE):
                with open(DATA_FILE) as f:
                    data = json.load(f)
            else:
                data = []
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(json.dumps({"count": len(data), "firmas": data[-50:]}).encode())
        elif parsed.path == "/stats":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(json.dumps({"status": "ok", "total": 0}).encode())
        else:
            self.send_response(200)
            self.send_header("Content-Type", "text/html")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(b"<h1>Guestbook Server OK</h1>")

    def do_POST(self):
        content_len = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(content_len).decode()
        try:
            data = json.loads(body)
        except:
            data = {}
        data["_received"] = datetime.now().isoformat()

        firmas = []
        if os.path.exists(DATA_FILE):
            with open(DATA_FILE) as f:
                firmas = json.load(f)
        firmas.append(data)
        with open(DATA_FILE, "w") as f:
            json.dump(firmas, f, indent=2)

        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(json.dumps({"status": "ok", "id": data.get("id", "")}).encode())

if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8080
    server = HTTPServer(("0.0.0.0", port), Handler)
    print(f"Guestbook server on :{port}")
    server.serve_forever()
