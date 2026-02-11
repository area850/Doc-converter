from flask import Flask, render_template, request, send_file, jsonify
import os, uuid, sqlite3
from datetime import date
from werkzeug.utils import secure_filename
import img2pdf
import markdown

app = Flask(__name__)

# ---------------- CONFIG ----------------
app.config['UPLOAD_FOLDER'] = "uploads"
app.config['OUTPUT_FOLDER'] = "outputs"
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024

app.config['ALLOWED_EXTENSIONS'] = {
    'docx', 'xlsx', 'xls', 'pptx',
    'txt', 'md', 'csv',
    'jpg', 'jpeg', 'png', 'gif', 'bmp'
}

os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
os.makedirs(app.config['OUTPUT_FOLDER'], exist_ok=True)

# ---------------- DATABASE ----------------
def get_db():
    return sqlite3.connect("database.db")

def init_db():
    db = get_db()
    db.execute("""
        CREATE TABLE IF NOT EXISTS usage (
            ip TEXT,
            day TEXT,
            count INTEGER
        )
    """)
    db.execute("""
        CREATE TABLE IF NOT EXISTS conversions (
            ip TEXT,
            filename TEXT,
            from_format TEXT,
            to_format TEXT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)
    db.commit()

init_db()

# ---------------- HELPERS ----------------
def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in app.config['ALLOWED_EXTENSIONS']

def can_convert(ip):
    today = str(date.today())
    db = get_db()
    row = db.execute("SELECT count FROM usage WHERE ip=? AND day=?", (ip, today)).fetchone()

    if row and row[0] >= 5:
        return False

    if row:
        db.execute("UPDATE usage SET count=count+1 WHERE ip=? AND day=?", (ip, today))
    else:
        db.execute("INSERT INTO usage VALUES (?, ?, 1)", (ip, today))

    db.commit()
    return True

def log_conversion(ip, filename, from_f, to_f):
    db = get_db()
    db.execute(
        "INSERT INTO conversions (ip, filename, from_format, to_format) VALUES (?, ?, ?, ?)",
        (ip, filename, from_f, to_f)
    )
    db.commit()

# ---------------- CONVERTERS ----------------

def docx_to_pdf(input_path, output_path):
    """ PERFECT Word → PDF (keeps layout, pages, tables, images) """
    try:
        from docx2pdf import convert
        convert(input_path, output_path)
        return True
    except Exception as e:
        print("DOCX ERROR:", e)
        return False

def images_to_pdf(input_path, output_path):
    try:
        with open(output_path, "wb") as f:
            f.write(img2pdf.convert(input_path))
        return True
    except Exception as e:
        print("IMAGE ERROR:", e)
        return False

def text_to_pdf(input_path, output_path):
    try:
        from reportlab.pdfgen import canvas
        from reportlab.lib.pagesizes import A4

        pdf = canvas.Canvas(output_path, pagesize=A4)
        width, height = A4
        y = height - 40

        with open(input_path, "r", encoding="utf-8") as f:
            for line in f:
                if y < 40:
                    pdf.showPage()
                    y = height - 40
                pdf.drawString(40, y, line[:100])
                y -= 14

        pdf.save()
        return True
    except Exception as e:
        print("TXT ERROR:", e)
        return False

def excel_to_pdf(input_path, output_path):
    try:
        import openpyxl
        from reportlab.pdfgen import canvas
        from reportlab.lib.pagesizes import A4

        wb = openpyxl.load_workbook(input_path)
        ws = wb.active

        pdf = canvas.Canvas(output_path, pagesize=A4)
        y = 800

        for row in ws.iter_rows(max_col=6, max_row=100):
            if y < 50:
                pdf.showPage()
                y = 800
            x = 40
            for cell in row:
                pdf.drawString(x, y, str(cell.value)[:15] if cell.value else "")
                x += 90
            y -= 16

        pdf.save()
        return True
    except Exception as e:
        print("EXCEL ERROR:", e)
        return False

def csv_to_pdf(input_path, output_path):
    try:
        import pandas as pd
        from reportlab.pdfgen import canvas
        from reportlab.lib.pagesizes import A4

        df = pd.read_csv(input_path)
        pdf = canvas.Canvas(output_path, pagesize=A4)
        y = 800

        for _, row in df.head(100).iterrows():
            if y < 50:
                pdf.showPage()
                y = 800
            pdf.drawString(40, y, " | ".join(str(v) for v in row[:5]))
            y -= 16

        pdf.save()
        return True
    except Exception as e:
        print("CSV ERROR:", e)
        return False

def markdown_to_pdf(input_path, output_path):
    try:
        from reportlab.pdfgen import canvas
        from reportlab.lib.pagesizes import A4

        with open(input_path, "r", encoding="utf-8") as f:
            text = markdown.markdown(f.read())

        pdf = canvas.Canvas(output_path, pagesize=A4)
        y = 800

        for line in text.splitlines():
            if y < 50:
                pdf.showPage()
                y = 800
            pdf.drawString(40, y, line[:100])
            y -= 14

        pdf.save()
        return True
    except Exception as e:
        print("MD ERROR:", e)
        return False

# ---------------- ROUTES ----------------
@app.route("/")
def index():
    return render_template("index.html")

@app.route("/convert", methods=["POST"])
def convert():
    if 'file' not in request.files:
        return jsonify(error="No file"), 400

    file = request.files['file']
    if file.filename == '' or not allowed_file(file.filename):
        return jsonify(error="Invalid file"), 400

    ip = request.remote_addr
    if not can_convert(ip):
        return jsonify(error="Daily limit reached"), 429

    uid = str(uuid.uuid4())[:8]
    input_name = secure_filename(file.filename)
    input_path = os.path.join(app.config['UPLOAD_FOLDER'], f"{uid}_{input_name}")
    file.save(input_path)

    ext = input_name.rsplit('.', 1)[1].lower()
    output_name = f"{input_name.rsplit('.',1)[0]}_{uid}.pdf"
    output_path = os.path.join(app.config['OUTPUT_FOLDER'], output_name)

    converters = {
        'docx': docx_to_pdf,
        'jpg': images_to_pdf,
        'jpeg': images_to_pdf,
        'png': images_to_pdf,
        'gif': images_to_pdf,
        'bmp': images_to_pdf,
        'txt': text_to_pdf,
        'xlsx': excel_to_pdf,
        'xls': excel_to_pdf,
        'csv': csv_to_pdf,
        'md': markdown_to_pdf,
    }

    if ext not in converters or not converters[ext](input_path, output_path):
        return jsonify(error="Conversion failed"), 500

    log_conversion(ip, input_name, ext, "pdf")
    os.remove(input_path)

    return send_file(output_path, as_attachment=True)

# ---------------- RUN ----------------
if __name__ == "__main__":
    app.run(debug=True)
