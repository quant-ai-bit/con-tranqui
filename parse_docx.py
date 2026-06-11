import zipfile
import xml.etree.ElementTree as ET
import sys
import os

def get_docx_text(path):
    """
    Extract text from a docx file using standard zipfile and xml parsing.
    """
    if not os.path.exists(path):
        return f"File not found: {path}"
        
    try:
        with zipfile.ZipFile(path) as docx:
            xml_content = docx.read('word/document.xml')
            root = ET.fromstring(xml_content)
            
            # XML namespace map
            ns = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
            
            # Find all paragraph elements
            paragraphs = []
            for para in root.iter('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}p'):
                # Extract text runs
                text_runs = []
                for run in para.iter('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}t'):
                    if run.text:
                        text_runs.append(run.text)
                if text_runs:
                    paragraphs.append("".join(text_runs))
            
            return "\n".join(paragraphs)
    except Exception as e:
        return f"Error parsing docx: {str(e)}"

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: python parse_docx.py <path_to_docx>")
        sys.exit(1)
    
    doc_path = sys.argv[1]
    text = get_docx_text(doc_path)
    
    # Write directly to stdout using UTF-8 to prevent encoding issues on Windows
    sys.stdout.buffer.write(text.encode('utf-8'))

