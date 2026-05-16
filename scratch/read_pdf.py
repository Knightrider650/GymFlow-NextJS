import os
import subprocess
import sys

def main():
    # Try to install pypdf locally
    print("Installing pypdf...")
    try:
        subprocess.check_call([sys.executable, "-m", "pip", "install", "pypdf", "--target", "./scratch/lib"])
    except Exception as e:
        print(f"Installation failed: {e}")
        return

    sys.path.append("./scratch/lib")
    
    try:
        from pypdf import PdfReader
        reader = PdfReader("C:/Users/prash/Downloads/gymflow-roles-report.pdf")
        text = ""
        for page in reader.pages:
            text += page.extract_text() + "\n"
        
        output_path = "scratch/roles_report.txt"
        with open(output_path, "w", encoding="utf-8") as f:
            f.write(text)
        print(f"Extracted text saved to {output_path}")
    except Exception as e:
        print(f"Error reading PDF: {e}")

if __name__ == "__main__":
    main()
