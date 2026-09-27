"""Test script to verify NWIS server and endpoints."""
import requests
import time
import subprocess
import sys

def start_server():
    """Start the NWIS server in background."""
    proc = subprocess.Popen(
        [sys.executable, "-m", "src.cli", "serve"],
        cwd="D:\\data retrival system\\nwis",
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE
    )
    time.sleep(3)
    return proc

def test_endpoints():
    """Test key NWIS endpoints."""
    base = "http://127.0.0.1:8000"
    
    tests = [
        ("GET /health", f"{base}/health"),
        ("GET /docs", f"{base}/docs"),
        ("GET /ready", f"{base}/ready"),
        ("GET /api/v1/stats/chromadb", f"{base}/api/v1/stats/chromadb"),
        ("GET /api/v1/stats/supabase", f"{base}/api/v1/stats/supabase"),
    ]
    
    results = []
    for name, url in tests:
        try:
            r = requests.get(url, timeout=5)
            results.append((name, r.status_code, r.text[:100] if r.text else ""))
        except Exception as e:
            results.append((name, "ERROR", str(e)))
    
    return results

if __name__ == "__main__":
    print("Starting NWIS server...")
    proc = start_server()
    
    print("\nTesting endpoints:")
    for name, status, text in test_endpoints():
        print(f"  {name}: {status} - {text}")
    
    # Cleanup
    proc.terminate()
    proc.wait()
    print("\nServer terminated.")