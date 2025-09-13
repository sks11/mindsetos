# Simple script to run the FastAPI backend
import subprocess
import sys
import os

def install_requirements():
    """Install required packages"""
    try:
        subprocess.check_call([sys.executable, "-m", "pip", "install", "-r", "scripts/requirements.txt"])
        print("✅ Requirements installed successfully")
    except subprocess.CalledProcessError as e:
        print(f"❌ Failed to install requirements: {e}")
        return False
    return True

def check_env_file():
    """Check if .env file exists with OPENAI_API_KEY"""
    env_file = ".env"
    if os.path.exists(env_file):
        with open(env_file, 'r') as f:
            content = f.read()
            if "OPENAI_API_KEY=" in content and "your_openai_api_key_here" not in content:
                print("✅ Found .env file with OPENAI_API_KEY")
                return True
            else:
                print("⚠️  Found .env file but OPENAI_API_KEY appears to be placeholder")
                return False
    else:
        print("⚠️  No .env file found")
        return False

def run_server():
    """Run the FastAPI server"""
    try:
        print("🚀 Starting FastAPI server on http://localhost:8000")
        
        if not check_env_file():
            print("📝 Please create a .env file in the project root with:")
            print("🔑 OPENAI_API_KEY=your_actual_openai_api_key_here")
            print("🌐 Get your API key from: https://platform.openai.com/api-keys")
            print("\n" + "="*50)
        
        # Change to scripts directory and run the server
        os.chdir("scripts")
        subprocess.run([sys.executable, "-m", "uvicorn", "fastapi_backend:app", "--reload", "--host", "0.0.0.0", "--port", "8000"])
    except KeyboardInterrupt:
        print("\n👋 Server stopped")
    except Exception as e:
        print(f"❌ Failed to start server: {e}")

if __name__ == "__main__":
    print("🔧 Setting up MindsetOS AI Journal Backend...")
    
    if install_requirements():
        run_server()
    else:
        print("❌ Setup failed. Please check the error messages above.")
