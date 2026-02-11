import { GoogleGenerativeAI } from "https://esm.run/@google/generative-ai";

const API_KEY = "AIzaSyAgKPihiDxQcJmFQUTaARw5YfNRgXbd5Yc"; 

const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

let frontImageBase64 = null;
let backImageBase64 = null;

const readFileAsBase64 = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(',')[1]);
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
        const prompt = `
            Analyze the two provided images of an Egyptian National ID card.
            Extract the following information in Arabic:
            1. National ID Number (الرقم القومي)
            2. Name (الاسم)
            3. Address (العنوان)
            4. Date of Birth (تاريخ الميلاد)
            5. Job (المهنة)
            6. Gender (النوع)
            7. Religion (الديانة)
            8. Marital Status (الحالة الاجتماعية)
            9. Expiry Date (تاريخ الانتهاء)

            Return ONLY a valid JSON object with these keys:
            {
                "national_id": "...",
                "name": "...",
                "address": "...",
                "dob": "...",
                "job": "...",
                "gender": "...",
                "religion": "...",
                "marital_status": "...",
                "expiry_date": "..."
            }
        `;

        const result = await model.generateContent([
            prompt,
            { inlineData: { data: frontImageBase64, mimeType: "image/png" } },
            { inlineData: { data: backImageBase64, mimeType: "image/png" } }
        ]);

        const response = await result.response;
        const text = response.text();
        const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const data = JSON.parse(cleanText);

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
        errorMsg.textContent = "حدث خطأ أثناء تحليل البيانات. حاول مرة أخرى.";
    } finally {
        loader.style.display = 'none';
        btn.disabled = false;
    }
});