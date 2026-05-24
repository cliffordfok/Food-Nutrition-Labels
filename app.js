const els = {
  camera: document.querySelector("#camera"),
  snapshot: document.querySelector("#snapshot"),
  preview: document.querySelector("#preview"),
  startCamera: document.querySelector("#startCamera"),
  capturePhoto: document.querySelector("#capturePhoto"),
  stopCamera: document.querySelector("#stopCamera"),
  imageUpload: document.querySelector("#imageUpload"),
  analyzePhotos: document.querySelector("#analyzePhotos"),
  clearPhotos: document.querySelector("#clearPhotos"),
  photoCount: document.querySelector("#photoCount"),
  photoList: document.querySelector("#photoList"),
  geminiApiKey: document.querySelector("#geminiApiKey"),
  geminiModel: document.querySelector("#geminiModel"),
  statusText: document.querySelector("#statusText"),
  statusDot: document.querySelector("#statusDot"),
  scorePill: document.querySelector("#scorePill"),
  verdictTitle: document.querySelector("#verdictTitle"),
  healthGrade: document.querySelector("#healthGrade"),
  energyValue: document.querySelector("#energyValue"),
  sugarValue: document.querySelector("#sugarValue"),
  sodiumValue: document.querySelector("#sodiumValue"),
  fatValue: document.querySelector("#fatValue"),
  plainExplanation: document.querySelector("#plainExplanation"),
  sharpAssessment: document.querySelector("#sharpAssessment"),
  overallAdvice: document.querySelector("#overallAdvice"),
  glossaryList: document.querySelector("#glossaryList"),
  aiExplanation: document.querySelector("#aiExplanation"),
  detailList: document.querySelector("#detailList"),
  ocrText: document.querySelector("#ocrText"),
};

let stream;
let selectedPhotos = [];
let activeAnalysisId = 0;

const GEMINI_KEY_STORAGE = "label-lens-gemini-api-key";
const GEMINI_MODEL_STORAGE = "label-lens-gemini-model";
const MAX_IMAGE_SIDE = 1600;
const IMAGE_QUALITY = 0.86;
const GEMINI_TIMEOUT_MS = 30000;
const DEEPSEEK_TIMEOUT_MS = 30000;

els.geminiApiKey.value = localStorage.getItem(GEMINI_KEY_STORAGE) || "";
els.geminiModel.value = localStorage.getItem(GEMINI_MODEL_STORAGE) || "gemini-2.5-flash";

const nutrientPatterns = {
  energy: /(?:energy|calories|calorie|熱量|能量)[^\d]{0,16}(\d+(?:\.\d+)?)\s*(kcal|kj|千卡|卡路里)?/i,
  sugar: /(?:sugars?|糖|糖質)[^\d]{0,16}(\d+(?:\.\d+)?)\s*g/i,
  sodium: /(?:sodium|鈉)[^\d]{0,16}(\d+(?:\.\d+)?)\s*(mg|毫克|g|克)?/i,
  fat: /(?:total\s*fat|fat|脂肪|總脂肪)[^\d]{0,16}(\d+(?:\.\d+)?)\s*g/i,
  satFat: /(?:saturated|飽和脂肪)[^\d]{0,16}(\d+(?:\.\d+)?)\s*g/i,
  protein: /(?:protein|蛋白質)[^\d]{0,16}(\d+(?:\.\d+)?)\s*g/i,
  fiber: /(?:fibre|fiber|膳食纖維|纖維)[^\d]{0,16}(\d+(?:\.\d+)?)\s*g/i,
};

const glossaryTerms = [
  {
    pattern: /energy|calories|calorie|熱量|能量/i,
    term: "熱量 / Calories",
    meaning: "代表這件食物會提供幾多能量。太高而又不飽肚，通常容易令每日總攝取超標。",
  },
  {
    pattern: /sugars?|糖|糖質/i,
    term: "糖",
    meaning: "不只是砂糖，也包括食物中容易快速吸收的糖。高糖產品不適合經常食或大份量食。",
  },
  {
    pattern: /sodium|鈉/i,
    term: "鈉",
    meaning: "鈉基本上就是鹽分指標。鈉高即代表偏鹹，對血壓和水腫控制不友善。",
  },
  {
    pattern: /total\s*fat|fat|脂肪|總脂肪/i,
    term: "總脂肪",
    meaning: "脂肪本身不是壞事，但高脂食品熱量密度通常高，容易不知不覺食多。",
  },
  {
    pattern: /saturated|飽和脂肪/i,
    term: "飽和脂肪",
    meaning: "較需要控制的一類脂肪。長期攝取太多，對心血管健康不理想。",
  },
  {
    pattern: /protein|蛋白質/i,
    term: "蛋白質",
    meaning: "幫助飽肚和維持肌肉。零食如果蛋白質低，通常營養價值也有限。",
  },
  {
    pattern: /fibre|fiber|膳食纖維|纖維/i,
    term: "膳食纖維",
    meaning: "有助飽肚和腸道健康。纖維高通常是比較加分的訊號。",
  },
  {
    pattern: /carbohydrate|碳水|碳水化合物/i,
    term: "碳水化合物",
    meaning: "身體主要能量來源。要留意當中有多少是糖，以及整體熱量是否合理。",
  },
  {
    pattern: /serving|per serving|每份|食用分量/i,
    term: "每份 / Serving",
    meaning: "廠商定義的一份，不一定等於你實際會食的份量。比較產品時要看清楚基準。",
  },
  {
    pattern: /per 100g|每100克|每 100 克|每100毫升|每 100 毫升/i,
    term: "每 100g / 100ml",
    meaning: "最適合用來比較不同產品，因為份量基準一致。",
  },
];

els.startCamera.addEventListener("click", startCamera);
els.capturePhoto.addEventListener("click", capturePhoto);
els.stopCamera.addEventListener("click", () => {
  stopCamera();
  setStatus("相機已關閉。你可以再開相機拍下一張，或直接分析已選圖片。", false);
});
els.imageUpload.addEventListener("change", handleUpload);
els.analyzePhotos.addEventListener("click", analyzeSelectedPhotos);
els.clearPhotos.addEventListener("click", clearPhotos);
els.geminiApiKey.addEventListener("input", () => {
  localStorage.setItem(GEMINI_KEY_STORAGE, els.geminiApiKey.value.trim());
});
els.geminiModel.addEventListener("change", () => {
  localStorage.setItem(GEMINI_MODEL_STORAGE, els.geminiModel.value);
});

async function startCamera() {
  setStatus("正在開啟相機...", true);
  try {
    stopCamera({ silent: true });
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment" },
      audio: false,
    });
    els.camera.srcObject = stream;
    els.camera.hidden = false;
    els.preview.hidden = true;
    els.capturePhoto.disabled = false;
    els.stopCamera.disabled = false;
    setStatus("相機已開啟。拍一張後相機會自動關閉，你可以再開相機拍下一張。", true);
  } catch (error) {
    setStatus("無法開啟相機。你仍可改用上傳圖片。", false);
  }
}

function stopCamera(options = {}) {
  stream?.getTracks().forEach((track) => track.stop());
  stream = undefined;
  els.camera.srcObject = null;
  els.capturePhoto.disabled = true;
  els.stopCamera.disabled = true;
  if (!options.silent) {
    els.camera.hidden = true;
    showLatestPreview();
  }
}

async function capturePhoto() {
  const canvas = els.snapshot;
  const video = els.camera;
  canvas.width = video.videoWidth || 1280;
  canvas.height = video.videoHeight || 960;
  canvas.getContext("2d").drawImage(video, 0, 0, canvas.width, canvas.height);
  const dataUrl = canvas.toDataURL("image/jpeg", IMAGE_QUALITY);
  stopCamera({ silent: true });
  await addPhoto(dataUrl, "相機");
  setStatus("已加入 1 張相機圖片，相機已關閉。可再開相機拍下一張，或按分析。", false);
}

async function handleUpload(event) {
  const files = [...(event.target.files || [])];
  if (!files.length) return;

  setStatus(`正在加入 ${files.length} 張圖片...`, true);
  try {
    for (const file of files) {
      const dataUrl = await readFileAsDataUrl(file);
      await addPhoto(dataUrl, "上傳");
    }
    setStatus(`已加入 ${files.length} 張圖片。可繼續加入，或按分析已選圖片。`, false);
  } catch (error) {
    setStatus("有圖片無法讀取，請再試一次。", false);
  } finally {
    els.imageUpload.value = "";
  }
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Image failed to load"));
    reader.readAsDataURL(file);
  });
}

async function addPhoto(imageSource, source) {
  const optimizedImage = await optimizeImage(imageSource).catch(() => imageSource);
  selectedPhotos.push({
    id: crypto.randomUUID(),
    src: optimizedImage,
    source,
  });
  showLatestPreview();
  renderPhotoQueue();
}

function showLatestPreview() {
  const latest = selectedPhotos.at(-1);
  if (!latest) {
    els.preview.hidden = true;
    els.preview.removeAttribute("src");
    return;
  }

  els.preview.src = latest.src;
  els.preview.hidden = false;
  els.camera.hidden = true;
}

function renderPhotoQueue() {
  const count = selectedPhotos.length;
  els.photoCount.textContent = count ? `已加入 ${count} 張圖片` : "未加入圖片";
  els.analyzePhotos.disabled = !count;
  els.clearPhotos.disabled = !count;
  els.photoList.innerHTML = selectedPhotos
    .map(
      (photo, index) => `
        <article class="photo-thumb">
          <img src="${photo.src}" alt="標籤圖片 ${index + 1}" />
          <span>${photo.source} ${index + 1}</span>
        </article>
      `,
    )
    .join("");
}

function clearPhotos() {
  selectedPhotos = [];
  activeAnalysisId += 1;
  renderPhotoQueue();
  showLatestPreview();
  resetResults();
  setStatus("已清除所有圖片。", false);
}

async function analyzeSelectedPhotos() {
  if (!selectedPhotos.length) {
    setStatus("請先拍照或上傳至少一張圖片。", false);
    return;
  }

  const analysisId = ++activeAnalysisId;
  setAnalyzeBusy(true);
  resetResults();
  els.scorePill.textContent = "分析中";
  els.verdictTitle.textContent = "正在讀取";

  try {
    const images = selectedPhotos.map((photo) => photo.src);
    const apiKey = els.geminiApiKey.value.trim();
    const selectedModel = els.geminiModel.value;

    if (apiKey && !isDeepSeekModel(selectedModel)) {
      setStatus(`正在使用 Gemini 分析 ${images.length} 張圖片...`, true);
      try {
        const analysis = await analyzeWithGemini(images, apiKey, selectedModel);
        if (!isCurrentAnalysis(analysisId)) return;
        renderAiAnalysis(analysis);
        setStatus("Gemini 多張圖片分析完成。", true);
        return;
      } catch (error) {
        if (!isCurrentAnalysis(analysisId)) return;
        els.aiExplanation.textContent = "Gemini 分析失敗，已改用瀏覽器 OCR。";
        setStatus("Gemini 分析失敗，正在改用 OCR...", false);
      }
    }

    if (!window.Tesseract) {
      setStatus("OCR 套件尚未載入，請稍後再試，或輸入 Gemini API key。", false);
      return;
    }

    const textParts = [];
    for (const [index, image] of images.entries()) {
      if (!isCurrentAnalysis(analysisId)) return;
      setStatus(`正在用 OCR 讀取第 ${index + 1}/${images.length} 張圖片...`, true);
      const result = await Tesseract.recognize(image, "eng+chi_tra", {
        logger: (message) => {
          if (!isCurrentAnalysis(analysisId)) return;
          if (message.status === "recognizing text") {
            setStatus(`第 ${index + 1}/${images.length} 張辨識中 ${Math.round(message.progress * 100)}%`, true);
          }
        },
      });
      textParts.push(`圖片 ${index + 1}:\n${result.data.text}`);
    }

    if (!isCurrentAnalysis(analysisId)) return;
    const text = normalizeText(textParts.join("\n\n"));
    els.ocrText.textContent = text || "沒有讀到清楚文字。";
    if (apiKey && isDeepSeekModel(selectedModel)) {
      setStatus(`正在使用 ${modelDisplayName(selectedModel)} 分析 OCR 文字...`, true);
      try {
        const analysis = await analyzeWithDeepSeek(text, apiKey, selectedModel);
        if (!isCurrentAnalysis(analysisId)) return;
        renderAiAnalysis(analysis);
        setStatus(`${modelDisplayName(selectedModel)} OCR 文字分析完成。`, true);
        return;
      } catch (error) {
        if (!isCurrentAnalysis(analysisId)) return;
        els.aiExplanation.textContent = "DeepSeek 分析失敗，已保留瀏覽器 OCR 初步分析。";
        setStatus("DeepSeek 分析失敗，已改用 OCR 初步分析。", false);
      }
    }
    renderAnalysis(parseNutrition(text), text);
    setStatus("OCR 多張圖片分析完成。", true);
  } catch (error) {
    if (isCurrentAnalysis(analysisId)) {
      setStatus("分析失敗。請換更清楚、光線更平均的圖片再試。", false);
    }
  } finally {
    if (isCurrentAnalysis(analysisId)) {
      setAnalyzeBusy(false);
    }
  }
}

async function analyzeWithGemini(imageSources, apiKey, selectedModel) {
  const images = imageSources.map(dataUrlToGeminiImage);
  const modelsToTry = [...new Set([selectedModel, "gemini-2.5-flash", "gemini-2.0-flash"])];
  let lastError;

  for (const model of modelsToTry) {
    try {
      return await requestGeminiAnalysis({ apiKey, model, images });
    } catch (error) {
      lastError = error;
      if (!String(error.message || "").includes("404")) break;
    }
  }

  throw lastError;
}

async function analyzeWithDeepSeek(labelText, apiKey, selectedModel) {
  return requestDeepSeekAnalysis({
    apiKey,
    model: selectedModel,
    labelText,
  });
}

function isDeepSeekModel(model) {
  return String(model || "").startsWith("deepseek-");
}

function modelDisplayName(model) {
  if (model === "deepseek-v4-pro") return "DeepSeek V4 Pro";
  if (model === "deepseek-v4-flash") return "DeepSeek V4 Flash";
  return model || "AI";
}

async function optimizeImage(imageSource) {
  const image = await loadImage(imageSource);
  const scale = Math.min(1, MAX_IMAGE_SIDE / Math.max(image.naturalWidth, image.naturalHeight));
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));

  const canvas = els.snapshot;
  canvas.width = width;
  canvas.height = height;
  canvas.getContext("2d").drawImage(image, 0, 0, width, height);
  return canvas.toDataURL("image/jpeg", IMAGE_QUALITY);
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Image failed to load"));
    image.src = src;
  });
}

function dataUrlToGeminiImage(dataUrl) {
  const match = String(dataUrl).match(/^data:(image\/[a-z0-9.+-]+);base64,(.+)$/i);
  if (!match) {
    throw new Error("Unsupported image format");
  }
  return { mimeType: match[1], base64: match[2] };
}

async function requestGeminiAnalysis({ apiKey, model, images }) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS);
  const imageParts = images.map(({ base64, mimeType }) => ({
    inline_data: {
      mime_type: mimeType,
      data: base64,
    },
  }));
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
    {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [...imageParts, { text: buildGeminiPrompt(images.length) }],
          },
        ],
        generationConfig: {
          temperature: 0.2,
          response_mime_type: "application/json",
        },
      }),
    },
  ).finally(() => window.clearTimeout(timeoutId));

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error?.message || `Gemini request failed: ${response.status}`);
  }

  const text = payload.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("\n").trim();
  if (!text) {
    throw new Error("Gemini returned no analysis text");
  }

  return parseGeminiJson(text);
}

async function requestDeepSeekAnalysis({ apiKey, model, labelText }) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), DEEPSEEK_TIMEOUT_MS);
  const response = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    signal: controller.signal,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "user",
          content: buildDeepSeekPrompt(labelText),
        },
      ],
      temperature: 0.2,
      response_format: { type: "json_object" },
    }),
  }).finally(() => window.clearTimeout(timeoutId));

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error?.message || `DeepSeek request failed: ${response.status}`);
  }

  const text = payload.choices?.[0]?.message?.content?.trim();
  if (!text) {
    throw new Error("DeepSeek returned no analysis text");
  }

  return parseGeminiJson(text);
}

function buildGeminiPrompt(imageCount) {
  return `你是一位直接但負責任的食品營養標籤助手。使用者提供了 ${imageCount} 張圖片，可能是同一個長標籤的不同位置。請把所有圖片合併閱讀，不要把重複欄位重複計算。

請做三件事：
1. 分析營養價值，包括糖、鈉、脂肪、熱量和任何明顯優缺點。
2. 把標籤中一般人可能不懂的詞彙翻譯成白話意思，例如鈉、飽和脂肪、每份、每100g、碳水、添加糖、膳食纖維、蛋白質或任何添加劑名稱。
3. 用尖銳但不恐嚇的語氣給整體評估和建議。要直接講這款產品值不值得買、可否經常食、比較適合甚麼情況。

請只回傳 JSON，不要 Markdown。文字使用繁體中文／香港口吻。
{
  "score": 0-100,
  "grade": "A-E",
  "verdict": "一句短評，例如：糖和鈉都偏高，不值得當日常零食",
  "nutrients": {
    "energy": "例如 120kcal 或 --",
    "sugar": "例如 4.5g 或 --",
    "sodium": "例如 300mg 或 --",
    "fat": "例如 8g 或 --"
  },
  "plainExplanation": "一段白話營養重點，約 40-80 字",
  "sharpAssessment": "尖銳總評，直接講好壞和值不值得食",
  "overallAdvice": "具體建議，例如食用頻率、份量、適合或不適合的人",
  "glossary": [
    {"term": "鈉", "meaning": "普通人聽得明的意思"},
    {"term": "飽和脂肪", "meaning": "普通人聽得明的意思"}
  ],
  "findings": [
    {"title": "糖", "body": "一個重點"},
    {"title": "鈉", "body": "一個重點"}
  ],
  "labelText": "你讀到的主要標籤文字"
}`;
}

function buildDeepSeekPrompt(labelText) {
  return `你是一位直接但負責任的食品營養標籤助手。以下是瀏覽器 OCR 從食品營養標籤讀出的文字，可能有錯字、漏字或順序混亂。請根據文字做分析，無法確認的欄位請用 "--"，不要編造數字。

OCR 文字：
${labelText}

請做三件事：
1. 分析營養價值，包括糖、鈉、脂肪、熱量和任何明顯優缺點。
2. 把標籤中一般人可能不懂的詞彙翻譯成白話意思。
3. 用尖銳但不恐嚇的語氣給整體評估和建議。要直接講這款產品值不值得買、可否經常食、比較適合甚麼情況。

請只回傳 JSON，不要 Markdown。文字使用繁體中文／香港口吻。
{
  "score": 0-100,
  "grade": "A-E",
  "verdict": "一句短評，例如：糖和鈉都偏高，不值得當日常零食",
  "nutrients": {
    "energy": "例如 120kcal 或 --",
    "sugar": "例如 4.5g 或 --",
    "sodium": "例如 300mg 或 --",
    "fat": "例如 8g 或 --"
  },
  "plainExplanation": "一段白話營養重點，約 40-80 字",
  "sharpAssessment": "尖銳總評，直接講好壞和值不值得食",
  "overallAdvice": "具體建議，例如食用頻率、份量、適合或不適合的人",
  "glossary": [
    {"term": "鈉", "meaning": "普通人聽得明的意思"},
    {"term": "飽和脂肪", "meaning": "普通人聽得明的意思"}
  ],
  "findings": [
    {"title": "糖", "body": "一個重點"},
    {"title": "鈉", "body": "一個重點"}
  ],
  "labelText": "整理後的主要標籤文字"
}`;
}

function parseGeminiJson(text) {
  const cleaned = text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();
  const jsonStart = cleaned.indexOf("{");
  const jsonEnd = cleaned.lastIndexOf("}");
  if (jsonStart === -1 || jsonEnd === -1 || jsonEnd <= jsonStart) {
    throw new Error("Gemini returned invalid JSON");
  }
  return JSON.parse(cleaned.slice(jsonStart, jsonEnd + 1));
}

function normalizeText(text) {
  return String(text || "")
    .replace(/[：:]/g, ":")
    .replace(/[，,]/g, ",")
    .replace(/\s+/g, " ")
    .trim();
}

function parseNutrition(text) {
  return Object.fromEntries(
    Object.entries(nutrientPatterns).map(([key, pattern]) => {
      const match = text.match(pattern);
      if (!match) return [key, null];
      return [
        key,
        {
          value: Number.parseFloat(match[1]),
          unit: normalizeUnit(match[2], key),
        },
      ];
    }),
  );
}

function normalizeUnit(unit, key) {
  if (key === "energy") return /kj/i.test(unit || "") ? "kJ" : "kcal";
  if (key === "sodium") return /g|克/i.test(unit || "") ? "g" : "mg";
  return "g";
}

function renderAnalysis(nutrition, labelText = "") {
  const score = calculateScore(nutrition);
  const grade = scoreToGrade(score);
  const findings = buildFindings(nutrition);
  const glossary = buildGlossary(labelText, nutrition);

  els.scorePill.textContent = `${score}/100`;
  els.healthGrade.textContent = grade;
  els.verdictTitle.textContent = verdictText(score);
  els.energyValue.textContent = formatNutrient(nutrition.energy);
  els.sugarValue.textContent = formatNutrient(nutrition.sugar);
  els.sodiumValue.textContent = formatNutrient(nutrition.sodium);
  els.fatValue.textContent = formatNutrient(nutrition.fat);
  els.plainExplanation.textContent = buildPlainExplanation(score, findings);
  els.sharpAssessment.textContent = buildSharpAssessment(score, nutrition);
  els.overallAdvice.textContent = buildOverallAdvice(score, nutrition);
  els.aiExplanation.textContent = "目前使用瀏覽器 OCR 做初步分析。加入 Gemini API key 後，可獲得更完整的多圖像理解和詞彙解釋。";
  renderGlossary(glossary);
  renderFindings(findings);
}

function renderAiAnalysis(analysis) {
  const nutrients = analysis.nutrients || {};
  const score = clampScore(analysis.score);
  const grade = /^[A-E]$/.test(analysis.grade || "") ? analysis.grade : scoreToGrade(score);
  const findings = Array.isArray(analysis.findings) ? analysis.findings : [];
  const glossary = Array.isArray(analysis.glossary) ? analysis.glossary : [];

  els.scorePill.textContent = `${score}/100`;
  els.healthGrade.textContent = grade;
  els.verdictTitle.textContent = analysis.verdict || verdictText(score);
  els.energyValue.textContent = nutrients.energy || "--";
  els.sugarValue.textContent = nutrients.sugar || "--";
  els.sodiumValue.textContent = nutrients.sodium || "--";
  els.fatValue.textContent = nutrients.fat || "--";
  els.plainExplanation.textContent = analysis.plainExplanation || "Gemini 已完成分析，請參考下方重點。";
  els.sharpAssessment.textContent = analysis.sharpAssessment || buildSharpAssessment(score, {});
  els.overallAdvice.textContent = analysis.overallAdvice || buildOverallAdvice(score, {});
  els.aiExplanation.textContent = "已使用所選 AI 模型整理營養重點、詞彙翻譯和整體建議。";
  els.ocrText.textContent = analysis.labelText || "Gemini 未回傳標籤原文。";
  renderGlossary(glossary);
  renderFindings(findings);
}

function renderGlossary(glossary) {
  const items = glossary.length
    ? glossary
    : [{ term: "未找到明顯艱深詞彙", meaning: "如果標籤文字較清楚，AI 或 OCR 會在這裡解釋營養詞彙。" }];

  els.glossaryList.innerHTML = items
    .map(
      (item) => `
        <article>
          <strong>${escapeHtml(item.term || "詞彙")}</strong>
          <p>${escapeHtml(item.meaning || "")}</p>
        </article>
      `,
    )
    .join("");
}

function renderFindings(findings) {
  els.detailList.innerHTML = findings
    .map(
      (item) => `
        <article>
          <strong>${escapeHtml(item.title || "重點")}</strong>
          <p>${escapeHtml(item.body || "")}</p>
        </article>
      `,
    )
    .join("");
}

function buildGlossary(text, nutrition) {
  const matched = glossaryTerms.filter((item) => item.pattern.test(text));
  if (!matched.length && Object.values(nutrition).some(Boolean)) {
    return glossaryTerms.slice(0, 5).map(({ term, meaning }) => ({ term, meaning }));
  }
  return matched.map(({ term, meaning }) => ({ term, meaning }));
}

function clampScore(value) {
  const numeric = Number.parseInt(value, 10);
  if (Number.isNaN(numeric)) return 60;
  return Math.max(0, Math.min(100, numeric));
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function isCurrentAnalysis(analysisId) {
  return analysisId === activeAnalysisId;
}

function setAnalyzeBusy(isBusy) {
  els.startCamera.disabled = isBusy;
  els.capturePhoto.disabled = isBusy || !stream;
  els.stopCamera.disabled = isBusy || !stream;
  els.imageUpload.disabled = isBusy;
  els.analyzePhotos.disabled = isBusy || !selectedPhotos.length;
  els.clearPhotos.disabled = isBusy || !selectedPhotos.length;
  els.geminiApiKey.disabled = isBusy;
  els.geminiModel.disabled = isBusy;
}

function calculateScore(n) {
  let score = 78;

  if (n.sugar?.value > 22.5) score -= 24;
  else if (n.sugar?.value > 10) score -= 12;
  else if (n.sugar?.value <= 5) score += 6;

  const sodiumMg = n.sodium ? (n.sodium.unit === "g" ? n.sodium.value * 1000 : n.sodium.value) : null;
  if (sodiumMg > 600) score -= 22;
  else if (sodiumMg > 300) score -= 10;
  else if (sodiumMg !== null && sodiumMg <= 120) score += 5;

  if (n.satFat?.value > 5) score -= 18;
  else if (n.fat?.value > 17.5) score -= 12;

  if (n.fiber?.value >= 6) score += 8;
  if (n.protein?.value >= 10) score += 4;
  if (n.energy?.value > 450) score -= 10;

  return Math.max(0, Math.min(100, Math.round(score)));
}

function scoreToGrade(score) {
  if (score >= 82) return "A";
  if (score >= 68) return "B";
  if (score >= 52) return "C";
  if (score >= 36) return "D";
  return "E";
}

function verdictText(score) {
  if (score >= 82) return "整體表現佳";
  if (score >= 68) return "可以考慮，留意份量";
  if (score >= 52) return "普通，建議比較同類產品";
  if (score >= 36) return "需要節制";
  return "不建議經常食用";
}

function buildPlainExplanation(score, findings) {
  if (!findings.length) {
    return "沒有讀到足夠的營養數字。請確認圖片清晰，並盡量讓每 100g 或每份資料完整入鏡。";
  }
  const lead = score >= 68 ? "整體還算可以。" : "這款產品需要多留意。";
  return `${lead}${findings.map((item) => item.body).join(" ")}`;
}

function buildSharpAssessment(score, nutrition) {
  const sodiumMg = nutrition.sodium ? (nutrition.sodium.unit === "g" ? nutrition.sodium.value * 1000 : nutrition.sodium.value) : null;
  const sugarHigh = nutrition.sugar?.value > 10;
  const sodiumHigh = sodiumMg > 300;
  const fatHigh = nutrition.fat?.value > 17.5 || nutrition.satFat?.value > 5;

  if (score >= 82) return "這款算是標籤上比較乾淨的一類，不是神奇健康食品，但不用過份戒備。";
  if (score >= 68) return "可以食，但不要被包裝上的健康感騙到；它仍然要按份量控制。";
  if (score >= 52) return "營養價值普通，沒有差到要避開，但也不值得因為它而特別買。";
  if (sugarHigh && sodiumHigh) return "糖和鈉同時偏高，這種組合最麻煩：容易好食、也容易食過量。";
  if (fatHigh) return "脂肪表現拖後腿，當日常零食不太划算。";
  return "整體營養價值偏弱，想食可以，但不要安慰自己它很健康。";
}

function buildOverallAdvice(score, nutrition) {
  const sodiumMg = nutrition.sodium ? (nutrition.sodium.unit === "g" ? nutrition.sodium.value * 1000 : nutrition.sodium.value) : null;
  const cautions = [];
  if (nutrition.sugar?.value > 10) cautions.push("糖");
  if (sodiumMg > 300) cautions.push("鈉");
  if (nutrition.fat?.value > 17.5 || nutrition.satFat?.value > 5) cautions.push("脂肪");

  if (!cautions.length && score >= 68) return "可作日常選項之一，但仍建議看清楚每份大小，不要因為分數不錯就加倍食。";
  if (score >= 52) return `建議偶爾食，重點控制份量。需要留意的是${cautions.join("、") || "整體熱量"}。`;
  return `建議當作偶爾想食的選擇，不建議每日食。特別要留意${cautions.join("、") || "熱量和份量"}。`;
}

function buildFindings(n) {
  const findings = [];
  const sodiumMg = n.sodium ? (n.sodium.unit === "g" ? n.sodium.value * 1000 : n.sodium.value) : null;

  if (n.sugar) {
    findings.push({
      title: "糖",
      body:
        n.sugar.value > 22.5
          ? "糖含量偏高，建議只作偶爾食用，並留意一天內其他甜食或飲品。"
          : n.sugar.value > 10
            ? "糖含量中等，份量越大越需要控制。"
            : "糖含量較低，這是較友善的一項。",
    });
  }

  if (sodiumMg !== null) {
    findings.push({
      title: "鈉",
      body:
        sodiumMg > 600
          ? "鈉含量偏高，較容易讓一天的鹽分攝取超標。"
          : sodiumMg > 300
            ? "鈉含量中等，搭配其他餐點時要避免太鹹。"
            : "鈉含量較低，對日常控制鹽分比較友善。",
    });
  }

  if (n.fat) {
    findings.push({
      title: "脂肪",
      body:
        n.satFat?.value > 5 || n.fat.value > 17.5
          ? "脂肪或飽和脂肪偏高，建議控制份量。"
          : "脂肪含量不算突出，可再搭配糖和鈉一起判斷。",
    });
  }

  if (n.fiber?.value >= 6) {
    findings.push({
      title: "纖維",
      body: "纖維含量不錯，有助增加飽足感。",
    });
  }

  if (n.protein?.value >= 10) {
    findings.push({
      title: "蛋白質",
      body: "蛋白質含量較高，對飽足感和日常補充有幫助。",
    });
  }

  return findings;
}

function formatNutrient(item) {
  if (!item) return "--";
  return `${item.value}${item.unit}`;
}

function resetResults() {
  els.scorePill.textContent = "待分析";
  els.verdictTitle.textContent = selectedPhotos.length ? "等待分析" : "等待圖片";
  els.healthGrade.textContent = "--";
  els.energyValue.textContent = "--";
  els.sugarValue.textContent = "--";
  els.sodiumValue.textContent = "--";
  els.fatValue.textContent = "--";
  els.plainExplanation.textContent = selectedPhotos.length
    ? "已加入圖片。按「分析已選圖片」後會整理營養重點。"
    : "分析完成後，這裡會用簡單文字說明糖、鈉、脂肪和熱量的重點。";
  els.sharpAssessment.textContent = "未分析前不作判斷。完成後會直接指出這款產品值不值得經常食。";
  els.overallAdvice.textContent = "建議會按營養價值、份量和適合食用頻率整理。";
  renderGlossary([]);
  els.aiExplanation.textContent = "選擇 Gemini 可直接分析圖片；選擇 DeepSeek 會先 OCR，再分析文字。沒有 key 時會改用瀏覽器 OCR。";
  els.detailList.innerHTML = "";
}

function setStatus(message, active) {
  els.statusText.textContent = message;
  els.statusDot.classList.toggle("active", active);
}
