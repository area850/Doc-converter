document.addEventListener('DOMContentLoaded', function() {
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('fileInput');
    const fileName = document.getElementById('fileName');
    const conversionCards = document.querySelectorAll('.type-card');
    const convertBtn = document.getElementById('convertBtn');
    const progressBar = document.getElementById('progressBar');
    const progressFill = document.querySelector('.progress-fill');
    const resultDiv = document.getElementById('result');
    
    let selectedFile = null;
    let selectedConversion = 'docx_to_pdf';
    
    // Handle file upload
    uploadArea.addEventListener('click', () => fileInput.click());
    
    fileInput.addEventListener('change', function(e) {
        if (this.files.length > 0) {
            selectedFile = this.files[0];
            fileName.textContent = selectedFile.name;
            uploadArea.style.borderColor = '#4CAF50';
            
            // Auto-select conversion type based on file extension
            const ext = selectedFile.name.split('.').pop().toLowerCase();
            selectConversionType(`${ext}_to_pdf`);
        }
    });
    
    // Handle drag and drop
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.style.borderColor = '#4361ee';
        uploadArea.style.background = 'rgba(67, 97, 238, 0.1)';
    });
    
    uploadArea.addEventListener('dragleave', () => {
        uploadArea.style.borderColor = '#ddd';
        uploadArea.style.background = '#f8f9fa';
    });
    
    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.style.borderColor = '#ddd';
        uploadArea.style.background = '#f8f9fa';
        
        if (e.dataTransfer.files.length > 0) {
            fileInput.files = e.dataTransfer.files;
            selectedFile = e.dataTransfer.files[0];
            fileName.textContent = selectedFile.name;
            
            const ext = selectedFile.name.split('.').pop().toLowerCase();
            selectConversionType(`${ext}_to_pdf`);
        }
    });
    
    // Handle conversion type selection
    conversionCards.forEach(card => {
        card.addEventListener('click', function() {
            selectedConversion = this.dataset.type;
            
            conversionCards.forEach(c => c.classList.remove('selected'));
            this.classList.add('selected');
        });
    });
    
    function selectConversionType(type) {
        conversionCards.forEach(card => {
            card.classList.remove('selected');
            if (card.dataset.type === type) {
                card.classList.add('selected');
                selectedConversion = type;
            }
        });
    }
    
    // Handle conversion
    convertBtn.addEventListener('click', async function() {
        if (!selectedFile) {
            alert('Please select a file first!');
            return;
        }
        
        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('conversion_type', selectedConversion);
        
        // Show progress
        progressBar.style.display = 'block';
        progressFill.style.width = '30%';
        
        try {
            const response = await fetch('/convert', {
                method: 'POST',
                body: formData
            });
            
            progressFill.style.width = '70%';
            
            if (response.ok) {
                // Get the blob for download
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = selectedFile.name.replace(/\.[^/.]+$/, "") + '.pdf';
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                
                progressFill.style.width = '100%';
                
                // Show success message
                resultDiv.innerHTML = `
                    <i class="fas fa-check-circle" style="color:#4CAF50;font-size:48px;"></i>
                    <h3>Conversion Successful!</h3>
                    <p>Your file has been converted and downloaded.</p>
                `;
                resultDiv.style.display = 'block';
                
                // Reset progress after 2 seconds
                setTimeout(() => {
                    progressBar.style.display = 'none';
                    progressFill.style.width = '0%';
                }, 2000);
                
                // Update stats
                updateStats();
                
            } else {
                const error = await response.json();
                throw new Error(error.error || 'Conversion failed');
            }
            
        } catch (error) {
            progressFill.style.width = '0%';
            resultDiv.innerHTML = `
                <i class="fas fa-exclamation-circle" style="color:#f44336;font-size:48px;"></i>
                <h3>Conversion Failed</h3>
                <p>${error.message}</p>
            `;
            resultDiv.style.display = 'block';
        }
    });
    
    // Update stats
    async function updateStats() {
        try {
            const response = await fetch('/stats');
            const data = await response.json();
            
            document.getElementById('todayCount').textContent = data.today;
            document.getElementById('totalCount').textContent = data.total;
        } catch (error) {
            console.error('Failed to update stats:', error);
        }
    }
    
    // Initial stats update
    updateStats();
    
    // Load Font Awesome icons dynamically
    const faScript = document.createElement('script');
    faScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/js/all.min.js';
    document.head.appendChild(faScript);
});