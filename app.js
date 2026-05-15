const els = {
  camera: document.querySelector("#camera"),
  snapshot: document.querySelector("#snapshot"),
  preview: document.querySelector("#preview"),
  startCamera: document.querySelector("#startCamera"),
  capturePhoto: document.querySelector("#capturePhoto"),
  imageUpload: document.querySelector("#imageUpload"),
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
  detailList: document.querySelector("#detailList"),
  ocrText: document.querySelector("#ocrText"),
};

let stream;

const nutrientPatterns = {
  energy: /(?:energy|calories|熱量|能量)[^\d]{0,12}(\d+(?:\.\d+)?)\s*(kcal|kj|千卡|卡路里)?/i,
  sugar: /(?:sugars?|糖)[^\d]{0,12}(\d+(?:\.\d+)?)\s*g/i,
  sodium: /(?:sodium|鈉)[^\d]{0,12}(\d+(?:\.\d+)?)\s*(mg|毫克|g)?/i,
  fat: /(?:total\s*fat|fat|脂肪|總脂肪)[^\d]{0,12}(\d+(?:\.\d+)?)\s*g/i,
  satFat: /(?:saturated|飽和脂肪)[^\d]{0,12}(\d+(?:\.\d+)?)\s*g/i,
  protein: /(?:protein|蛋白質)[^\d]{0,12}(\d+(?:\.\d+)?)\s*g/i,
  fiber: /(?:fibre|fiber|膳食纖維|纖維)[^\d]{0,12}(\d+(?:\.\d+)?)\s*g/i,
};

els.startCamera.addEventListener("click", startCamera);
els.capturePhoto.addEventListener("click", captureAndAnalyze);
els.imageUpload.addEventListener("change", handleUpload);

async function startCamera() {
  setStatus("正在開啟相機...", true);
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment" },
      audio: false,
    });
    els.camera.srcObject = stream;
    els.camera.hidden = false;
    els.preview.hidden = true;
    els.capturePhoto.disabled = false;
    setStatus("相機已開啟，將營養標籤放入白框內。", true);
  } catch (error) {
    setStatus("開唔到相機。你可以改為上載相片。", false);
  }
}

function captureAndAnalyze() {
  const canvas = els.snapshot;
  const video = els.camera;
  canvas.width = video.videoWidth || 1280;
  canvas.height = video.videoHeight || 960;
  canvas.getContext("2d").drawImage(video, 0, 0, canvas.width, canvas.height);
  const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
  showPreview(dataUrl);
  analyzeImage(dataUrl);
}

function handleUpload(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    showPreview(reader.result);
    analyzeImage(reader.result);
  };
  reader.readAsDataURL(file);
}

function showPreview(src) {
  els.preview.src = src;
  els.preview.hidden = false;
  els.camera.hidden = true;
}

async function analyzeImage(imageSource) {
  if (!window.Tesseract) {
    setStatus("OCR 載入中，請等多一秒再試。", false);
    return;
  }

  setStatus("正在讀取相片文字...", true);
  resetResults();

  try {
    const result = await Tesseract.recognize(imageSource, "eng+chi_tra", {
      logger: (message) => {
        if (message.status === "recognizing text") {
          setStatus(`正在辨認文字 ${Math.round(message.progress * 100)}%`, true);
        }
      },
    });
    const text = normalizeText(result.data.text);
    els.ocrText.textContent = text || "未能讀取到清晰文字。";
    const nutrition = parseNutrition(text);
    renderAnalysis(nutrition);
    setStatus("分析完成。數字始終以包裝標籤為準。", true);
  } catch (error) {
    setStatus("分析失敗。試下用光啲、近啲、對焦清楚啲再影。", false);
  }
}

function normalizeText(text) {
  return text
    .replace(/[：]/g, ":")
    .replace(/[，]/g, ",")
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
  if (key === "sodium") return /g/i.test(unit || "") ? "g" : "mg";
  return "g";
}

function renderAnalysis(nutrition) {
  const score = calculateScore(nutrition);
  const grade = scoreToGrade(score);
  const findings = buildFindings(nutrition);

  els.scorePill.textContent = `${score}/100`;
  els.healthGrade.textContent = grade;
  els.verdictTitle.textContent = verdictText(score);
  els.energyValue.textContent = formatNutrient(nutrition.energy);
  els.sugarValue.textContent = formatNutrient(nutrition.sugar);
  els.sodiumValue.textContent = formatNutrient(nutrition.sodium);
  els.fatValue.textContent = formatNutrient(nutrition.fat);
  els.plainExplanation.textContent = buildPlainExplanation(score, findings);
  els.detailList.innerHTML = findings
    .map(
      (item) => `
        <article>
          <strong>${item.title}</strong>
          <p>${item.body}</p>
        </article>
      `,
    )
    .join("");
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
  if (score >= 82) return "整體幾健康";
  if (score >= 68) return "可以，留意份量";
  if (score >= 52) return "普通，唔好食太多";
  if (score >= 36) return "偏高負擔";
  return "建議少食";
}

function buildPlainExplanation(score, findings) {
  if (!findings.length) {
    return "我暫時抽唔到足夠數字。試下影清楚營養成分表，尤其是每 100g 或每份的糖、鈉、脂肪。";
  }
  const lead = score >= 68 ? "呢款食品整體可以接受。" : "呢款食品要小心份量。";
  return `${lead}${findings.map((item) => item.body).join(" ")}`;
}

function buildFindings(n) {
  const findings = [];
  const sodiumMg = n.sodium ? (n.sodium.unit === "g" ? n.sodium.value * 1000 : n.sodium.value) : null;

  if (n.sugar) {
    findings.push({
      title: "糖分",
      body:
        n.sugar.value > 22.5
          ? "糖分屬高，當甜品或零食會比較合理，日日食容易超標。"
          : n.sugar.value > 10
            ? "糖分中等，飲品或早餐食品要留意同其他食物加埋的總糖。"
            : "糖分偏低，對控制糖分攝取比較友善。",
    });
  }

  if (sodiumMg !== null) {
    findings.push({
      title: "鈉質",
      body:
        sodiumMg > 600
          ? "鈉質偏高，代表比較鹹，血壓或水腫人士要特別留意。"
          : sodiumMg > 300
            ? "鈉質中等，食同一餐其他鹹味食物時要扣返。"
            : "鈉質偏低，日常選擇上較容易控制鹽分。",
    });
  }

  if (n.fat) {
    findings.push({
      title: "脂肪",
      body:
        n.satFat?.value > 5 || n.fat.value > 17.5
          ? "脂肪偏高，飽肚但熱量密度高，減脂或控制膽固醇時要留意。"
          : "脂肪未見特別高，仍要睇整包份量有幾多。",
    });
  }

  if (n.fiber?.value >= 6) {
    findings.push({
      title: "纖維",
      body: "纖維量幾好，通常會較飽肚，對腸道同血糖穩定有幫助。",
    });
  }

  if (n.protein?.value >= 10) {
    findings.push({
      title: "蛋白質",
      body: "蛋白質不錯，作為加餐或正餐配搭會比較頂肚。",
    });
  }

  return findings;
}

function formatNutrient(item) {
  if (!item) return "--";
  return `${item.value}${item.unit}`;
}

function resetResults() {
  els.scorePill.textContent = "分析中";
  els.verdictTitle.textContent = "讀取中";
  els.healthGrade.textContent = "--";
  els.detailList.innerHTML = "";
}

function setStatus(message, active) {
  els.statusText.textContent = message;
  els.statusDot.classList.toggle("active", active);
}
