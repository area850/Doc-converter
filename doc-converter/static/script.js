document.addEventListener('DOMContentLoaded', function () {
    const uploadArea   = document.getElementById('uploadArea');
    const fileInput    = document.getElementById('fileInput');
    const fileName     = document.getElementById('fileName');
    const browseBtn    = document.querySelector('.btn');
    const convCards    = document.querySelectorAll('.type-card');
    const convertBtn   = document.getElementById('convertBtn');
    const progressBar  = document.getElementById('progressBar');
    const progressFill = document.querySelector('.progress-fill');
    const resultDiv    = document.getElementById('result');

    let selectedFile = null;
    let selectedConversion = 'docx_to_pdf';

    // Browse button
    browseBtn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        fileInput.click();
    });

    uploadArea.addEventListener('click', function (e) {
        if (e.target === browseBtn || browseBtn.contains(e.target)) return;
        fileInput.click();
    });

    fileInput.addEventListener('change', function () {
        if (this.files.length > 0) {
            selectedFile = this.files[0];
            setFileName(selectedFile.name);
            uploadArea.style.borderColor = '#43d9ad';
            autoSelectType(selectedFile.name.split('.').pop().toLowerCase());
        }
    });

    // Drag & drop
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('drag-over');
    });

    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('drag-over');
        uploadArea.style.borderColor = '';
    });

    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('drag-over');
        if (e.dataTransfer.files.length > 0) {
            fileInput.files = e.dataTransfer.files;
            selectedFile = e.dataTransfer.files[0];
            setFileName(selectedFile.name);
            uploadArea.style.borderColor = '#43d9ad';
            autoSelectType(selectedFile.name.split('.').pop().toLowerCase());
        }
    });

    function setFileName(name) {
        fileName.textContent = name;
        fileName.classList.add('has-file');
    }

    // Card selection
    convCards.forEach(card => {
        card.addEventListener('click', function () {
            convCards.forEach(c => c.classList.remove('selected'));
            this.classList.add('selected');
            selectedConversion = this.dataset.type;
        });
    });

    function autoSelectType(ext) {
        const map = {
            docx: 'docx_to_pdf',
            xlsx: 'xlsx_to_pdf', xls: 'xlsx_to_pdf',
            pptx: 'pptx_to_pdf',
            jpg: 'jpg_to_pdf', jpeg: 'jpg_to_pdf',
            png: 'jpg_to_pdf', gif: 'jpg_to_pdf', bmp: 'jpg_to_pdf',
            txt: 'txt_to_pdf', md: 'txt_to_pdf', csv: 'txt_to_pdf',
            pdf: 'pdf_to_docx',
        };
        const type = map[ext] || 'docx_to_pdf';
        convCards.forEach(card => {
            card.classList.toggle('selected', card.dataset.type === type);
        });
        selectedConversion = type;
    }

    // Convert
    convertBtn.addEventListener('click', async function () {
        if (!selectedFile) {
            showResult('error', 'Please select a file first.');
            return;
        }

        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('conversion_type', selectedConversion);

        progressBar.style.display = 'block';
        progressFill.style.width = '30%';
        resultDiv.style.display = 'none';

        try {
            const response = await fetch('/convert', {
                method: 'POST',
                body: formData
            });

            progressFill.style.width = '75%';

            if (response.ok) {
                const blob = await response.blob();

                // Determine extension from content-disposition or type
                let ext = 'pdf';
                const disp = response.headers.get('Content-Disposition') || '';
                const match = disp.match(/filename=.*?\.(\w+)/);
                if (match) ext = match[1];
                else if (selectedConversion === 'pdf_to_docx') ext = 'docx';
                else if (selectedConversion === 'img_to_txt') ext = 'txt';

                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = selectedFile.name.replace(/\.[^/.]+$/, '') + '.' + ext;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);

                progressFill.style.width = '100%';
                showResult('success', 'Conversion complete — your file has been downloaded.');
                setTimeout(() => {
                    progressBar.style.display = 'none';
                    progressFill.style.width = '0%';
                }, 2000);
                updateStats();

            } else {
                const error = await response.json();
                progressBar.style.display = 'none';
                progressFill.style.width = '0%';
                if (response.status === 429) {
                    showResult('limit', error.error || 'Daily limit reached. Try again tomorrow.');
                } else {
                    showResult('error', error.error || 'Conversion failed.');
                }
            }
        } catch (err) {
            progressBar.style.display = 'none';
            progressFill.style.width = '0%';
            showResult('error', err.message);
        }
    });

    function showResult(type, message) {
        const config = {
            success: { icon: 'fa-check-circle', color: '#43d9ad', title: 'Done!' },
            limit:   { icon: 'fa-hourglass-half', color: '#ffd166', title: 'Daily Limit Reached' },
            error:   { icon: 'fa-exclamation-circle', color: '#ff6b6b', title: 'Conversion Failed' },
        };
        const { icon, color, title } = config[type];
        resultDiv.className = type;
        resultDiv.innerHTML = `
            <i class="fas ${icon}" style="color:${color}"></i>
            <h3 style="color:${color}">${title}</h3>
            <p>${message}</p>
            ${type === 'limit' ? '<p style="margin-top:8px;font-size:0.78rem;">Free limit: 5 conversions/day. <a href="/upgrade" style="color:#a89dff">Upgrade to Pro →</a></p>' : ''}
        `;
        resultDiv.style.display = 'block';
    }

    async function updateStats() {
        try {
            const res = await fetch('/stats');
            const data = await res.json();
            document.getElementById('todayCount').textContent = data.today;
            document.getElementById('totalCount').textContent = data.total;
        } catch (e) {}
    }

    updateStats();
    setInterval(updateStats, 30000);
});
