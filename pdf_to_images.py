import sys
import os
import fitz  # PyMuPDF

def convert_pdf_to_png(pdf_path, output_dir):
    """
    Converts each page of a PDF into a PNG image and saves it to output_dir.
    Returns the list of absolute paths of the generated PNG files.
    """
    if not os.path.exists(pdf_path):
        print(f"Error: File not found: {pdf_path}", file=sys.stderr)
        return []
    
    if not os.path.exists(output_dir):
        os.makedirs(output_dir, exist_ok=True)
        
    generated_files = []
    
    try:
        doc = fitz.open(pdf_path)
        base_name = os.path.splitext(os.path.basename(pdf_path))[0]
        # Replace characters that could break shell/paths
        safe_base_name = "".join(c for c in base_name if c.isalnum() or c in (' ', '_', '-')).rstrip()
        
        for page_num in range(len(doc)):
            page = doc.load_page(page_num)
            # Use a DPI of 100 for clear readability inside the Word doc while keeping file sizes small
            pix = page.get_pixmap(dpi=100)
            
            output_filename = f"{safe_base_name}_page_{page_num + 1}.jpg"
            output_path = os.path.join(output_dir, output_filename)
            
            # Save as JPEG with 75% quality for optimal compression
            pix.save(output_path, jpg_quality=75)
            generated_files.append(output_path)
            
        doc.close()
        return generated_files
    except Exception as e:
        print(f"Error converting PDF: {str(e)}", file=sys.stderr)
        return []

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python pdf_to_images.py <pdf_path> <output_dir>")
        sys.exit(1)
        
    pdf_path = sys.argv[1]
    output_dir = sys.argv[2]
    
    png_paths = convert_pdf_to_png(pdf_path, output_dir)
    # Print the paths to stdout, separated by lines so Node can parse them easily
    for p in png_paths:
        print(p)
