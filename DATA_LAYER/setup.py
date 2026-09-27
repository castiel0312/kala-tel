#!/usr/bin/env python
"""NWIS Setup Script"""
import subprocess
import sys
import os
from pathlib import Path

def run_command(cmd, description):
    """Run a command and handle errors"""
    print(f"\n{description}...")
    try:
        result = subprocess.run(cmd, shell=True, check=True, capture_output=True, text=True)
        print(f"✓ {description} completed")
        return True
    except subprocess.CalledProcessError as e:
        print(f"✗ {description} failed: {e.stderr}")
        return False

def main():
    """Main setup function"""
    project_root = Path(__file__).parent
    os.chdir(project_root)
    
    print("=" * 60)
    print("NWIS - Nearby Wells Intelligence System Setup")
    print("=" * 60)
    
    # Check Python version
    python_version = sys.version_info
    if python_version.major < 3 or (python_version.major == 3 and python_version.minor < 10):
        print("Error: Python 3.10+ required")
        return False
    
    print(f"Python version: {python_version.major}.{python_version.minor}.{python_version.micro}")
    
    # Create virtual environment
    venv_path = project_root / "venv"
    if not venv_path.exists():
        if not run_command(f"{sys.executable} -m venv venv", "Creating virtual environment"):
            return False
    else:
        print("✓ Virtual environment already exists")
    
    # Determine pip path
    if sys.platform == "win32":
        pip_path = venv_path / "Scripts" / "pip.exe"
        python_path = venv_path / "Scripts" / "python.exe"
    else:
        pip_path = venv_path / "bin" / "pip"
        python_path = venv_path / "bin" / "python"
    
    # Upgrade pip
    run_command(f"{pip_path} install --upgrade pip", "Upgrading pip")
    
    # Install requirements
    if not run_command(f"{pip_path} install -r requirements.txt", "Installing Python dependencies"):
        return False
    
    # Download spaCy model
    run_command(f"{python_path} -m spacy download en_core_web_lg", "Downloading spaCy model")
    
    # Create .env from template if not exists
    env_path = project_root / ".env"
    env_template = project_root / ".env.template"
    if not env_path.exists() and env_template.exists():
        import shutil
        shutil.copy(env_template, env_path)
        print("✓ Created .env from template - please edit with your credentials")
    
    # Create data directories
    data_dirs = [
        project_root / "data" / "chromadb",
        project_root / "logs",
        project_root / "uploads",
        project_root / "models" / "paddleocr" / "det",
        project_root / "models" / "paddleocr" / "rec",
    ]
    
    for d in data_dirs:
        d.mkdir(parents=True, exist_ok=True)
    
    print("\n" + "=" * 60)
    print("Setup Complete!")
    print("=" * 60)
    print("\nNext steps:")
    print("1. Edit .env with your Supabase, Neo4j, and ChromaDB credentials")
    print("2. Run database initialization:")
    print(f"   {python_path} -m src.cli init-db")
    print("3. Start the API server:")
    print(f"   {python_path} -m src.cli serve")
    print("4. Or use the CLI directly:")
    print(f"   {python_path} -m src.cli --help")
    
    return True

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)