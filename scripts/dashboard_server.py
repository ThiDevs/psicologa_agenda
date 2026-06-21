import os
import json
import subprocess
from http.server import BaseHTTPRequestHandler, HTTPServer
import urllib.parse

PORT = 3002
APP_DIR = "/home/prod/.gemini/antigravity/scratch/psi-agenda"
DASHBOARD_DIR = os.path.join(APP_DIR, "scripts", "dashboard")
LOG_FILE = os.path.join(APP_DIR, "deploy.log")

class DashboardHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        parsed_path = urllib.parse.urlparse(self.path)
        
        if parsed_path.path == "/":
            self.serve_html()
        elif parsed_path.path == "/api/status":
            self.serve_status()
        else:
            self.send_response(404)
            self.end_headers()

    def do_POST(self):
        parsed_path = urllib.parse.urlparse(self.path)
        if parsed_path.path == "/api/start-runner":
            self.start_runner()
        else:
            self.send_response(404)
            self.end_headers()

    def start_runner(self):
        try:
            # Check if it's already running
            output = subprocess.check_output(
                "systemctl is-active actions.runner.*", 
                shell=True, stderr=subprocess.STDOUT
            ).decode("utf-8").strip()
            if "active" in output:
                self.send_response(200)
                self.end_headers()
                return
        except subprocess.CalledProcessError:
            pass
            
        try:
            subprocess.check_output("pgrep -f Runner.Listener", shell=True)
            self.send_response(200)
            self.end_headers()
            return
        except subprocess.CalledProcessError:
            pass

        # Try to start it using nohup if it's not running
        runner_dir = os.path.join(APP_DIR, "actions-runner")
        if os.path.exists(os.path.join(runner_dir, "run.sh")):
            with open(LOG_FILE, "a") as f:
                f.write("\n\n========================================\n")
                f.write("[PAINEL] Iniciando o GitHub Runner...\n")
                f.write("========================================\n")
            subprocess.Popen(f"nohup ./run.sh >> {LOG_FILE} 2>&1 &", shell=True, cwd=runner_dir, preexec_fn=os.setsid)
        
        self.send_response(200)
        self.send_header("Content-type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(json.dumps({"status": "starting"}).encode("utf-8"))

    def serve_html(self):
        index_path = os.path.join(DASHBOARD_DIR, "index.html")
        if not os.path.exists(index_path):
            self.send_response(404)
            self.end_headers()
            self.wfile.write(b"index.html not found")
            return
            
        self.send_response(200)
        self.send_header("Content-type", "text/html")
        self.end_headers()
        with open(index_path, "rb") as f:
            self.wfile.write(f.read())

    def serve_status(self):
        status = {
            "runner_active": False,
            "deploying": False,
            "logs": []
        }

        # 1. Check runner active
        try:
            # We check if any actions.runner service is active
            output = subprocess.check_output(
                "systemctl is-active actions.runner.*", 
                shell=True, stderr=subprocess.STDOUT
            ).decode("utf-8").strip()
            # systemctl might return "active\nactive" if there are multiple, or just "active"
            status["runner_active"] = "active" in output
        except subprocess.CalledProcessError as e:
            # Command fails if service is not active or doesn't exist
            status["runner_active"] = False

        # 2. Check if deploy is running
        try:
            # pgrep returns 0 if found
            subprocess.check_output("pgrep -f deploy-prod.sh", shell=True)
            status["deploying"] = True
        except subprocess.CalledProcessError:
            status["deploying"] = False

        # 3. Read deploy.log
        if os.path.exists(LOG_FILE):
            try:
                # Get last 100 lines
                output = subprocess.check_output(f"tail -n 100 {LOG_FILE}", shell=True).decode("utf-8")
                status["logs"] = output.split("\n")
            except Exception:
                status["logs"] = ["Error reading log file"]
        else:
            status["logs"] = ["No deploy.log found. Awaiting first deployment..."]

        # Send JSON
        self.send_response(200)
        self.send_header("Content-type", "application/json")
        # CORS just in case
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(json.dumps(status).encode("utf-8"))

def run():
    if not os.path.exists(DASHBOARD_DIR):
        os.makedirs(DASHBOARD_DIR, exist_ok=True)
    print(f"Starting server on port {PORT}...")
    server_address = ('', PORT)
    httpd = HTTPServer(server_address, DashboardHandler)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass
    httpd.server_close()
    print("Server stopped.")

if __name__ == '__main__':
    run()
