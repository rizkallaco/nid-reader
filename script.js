let frontImageBase64 = null;
let backImageBase64 = null;

const readFileAsBase64 = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.src = e.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                // Resize image if too large (e.g., max width/height 1024px)
                const MAX_SIZE = 1024;
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > MAX_SIZE) {
                        height *= MAX_SIZE / width;
                        width = MAX_SIZE;
                    }
                } else {
                    if (height > MAX_SIZE) {
                        width *= MAX_SIZE / height;
                        height = MAX_SIZE;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                ctx.drawImage(img, 0, 0, width, height);

                // Convert to base64
                const dataUrl = canvas.toDataURL('image/jpeg', 0.8); // 80% quality
                resolve(dataUrl.split(',')[1]);
            };
            img.onerror = reject;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
};

const handleUpload = async (inputId, previewId, isFront) => {
    const input = document.getElementById(inputId);
    const preview = document.getElementById(previewId);

    input.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (file) {
            preview.src = URL.createObjectURL(file);
            preview.style.display = 'block';
            
            try {
                const base64 = await readFileAsBase64(file);
                if (isFront) frontImageBase64 = base64;
                else backImageBase64 = base64;
            } catch (err) {
                console.error("Error reading file:", err);
            }
        }
    });
};

handleUpload('front-upload', 'front-preview', true);
handleUpload('back-upload', 'back-preview', false);

document.getElementById('analyze-btn').addEventListener('click', async () => {
    const loader = document.getElementById('loader');
    const resultDiv = document.getElementById('result');
    const errorMsg = document.getElementById('error-msg');
    const btn = document.getElementById('analyze-btn');

    if (!frontImageBase64 || !backImageBase64) {
        errorMsg.textContent = "برجاء رفع الصورتين (الأمامية والخلفية)";
        return;
    }

    errorMsg.textContent = "";
    resultDiv.style.display = 'none';
    resultDiv.innerHTML = '';
    loader.style.display = 'block';
    btn.disabled = true;

    try {
        const response = await fetch('/api/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                frontImage: frontImageBase64, 
                backImage: backImageBase64 
            })
        });

        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.details || errData.error || 'Server Error');
        }

        const data = await response.json();

        const fields = [
            { key: 'national_id', label: 'الرقم القومي' },
            { key: 'name', label: 'الاسم' },
            { key: 'address', label: 'العنوان' },
            { key: 'dob', label: 'تاريخ الميلاد' },
            { key: 'job', label: 'المهنة' },
            { key: 'gender', label: 'النوع' },
            { key: 'religion', label: 'الديانة' },
            { key: 'marital_status', label: 'الحالة الاجتماعية' },
            { key: 'expiry_date', label: 'تاريخ الانتهاء' }
        ];

        fields.forEach(field => {
            if (data[field.key]) {
                const div = document.createElement('div');
                div.className = 'result-item';
                div.innerHTML = `<span class="label">${field.label}:</span> <span class="value">${data[field.key]}</span>`;
                resultDiv.appendChild(div);
            }
        });

        resultDiv.style.display = 'block';

    } catch (error) {
        console.error("API Error:", error);
        errorMsg.textContent = "حدث خطأ أثناء تحليل البيانات. حاول مرة أخرى. " + error.message;
    } finally {
        loader.style.display = 'none';
        btn.disabled = false;
    }
});