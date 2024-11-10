async function run() {
  const res = await fetch("config.txt");
  const apiKey = await res.text(); 
  const fileInput = document.getElementById("file");
  const questionInput = document.getElementById("question");
  const file = fileInput.files[0];
  const question = questionInput.value;

  if (!file) {
    alert("Lütfen bir PDF dosyası seçin.");
    return;
  }
  if (!question) {
    alert("Lütfen bir soru girin.");
    return;
  }

  const NUM_BYTES = file.size;
  const DISPLAY_NAME = "TEXT";
  const BASE_URL = "https://generativelanguage.googleapis.com";
  const tmpHeaderFile = "upload-header.tmp";

  try {
    const startUploadResponse = await fetch(`${BASE_URL}/upload/v1beta/files?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'X-Goog-Upload-Protocol': 'resumable',
        'X-Goog-Upload-Command': 'start',
        'X-Goog-Upload-Header-Content-Length': NUM_BYTES,
        'X-Goog-Upload-Header-Content-Type': 'application/pdf',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        file: {
          display_name: DISPLAY_NAME,
        }
      }),
    });

    if (!startUploadResponse.ok) {
      throw new Error(`Failed to start upload: ${startUploadResponse.statusText}`);
    }

    const headers = startUploadResponse.headers;
    const uploadUrl = headers.get('x-goog-upload-url');
    if (!uploadUrl) {
      throw new Error("Failed to retrieve upload URL from response");
    }

    const uploadResponse = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'Content-Length': NUM_BYTES,
        'X-Goog-Upload-Offset': '0',
        'X-Goog-Upload-Command': 'upload, finalize',
      },
      body: file,
    });

    if (!uploadResponse.ok) {
      throw new Error(`File upload failed: ${uploadResponse.statusText}`);
    }

    const fileInfo = await uploadResponse.json();
    const fileUri = fileInfo.file.uri;
    document.getElementById("submit").textContent = "Yükleniyor...";

    const generateResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro-002:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [
            { "text": question },
            { "file_data": { "mime_type": "application/pdf", "file_uri": fileUri } }
          ]
        }]
      }),
    });

    if (!generateResponse.ok) {
      throw new Error(`Content generation failed: ${generateResponse.statusText}`);
    }

    const generateResponseBody = await generateResponse.json();
    const responseText = generateResponseBody.candidates[0].content.parts[0].text;

    document.getElementById("result-div").innerText = responseText;
    document.getElementById("submit").textContent = "Gönder";
  } catch (error) {
    console.error('Error:', error);
    alert('An error occurred: ' + error.message);
  }
}

document.getElementById("submit").onclick = run;