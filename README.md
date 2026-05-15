# Label Lens 營養標籤分析

一個可以用手機相機掃描食品營養標籤的前端原型。它會用 OCR 讀取包裝上的營養資料，抽取熱量、糖、鈉、脂肪等數字，再用普通人容易明白的語句解釋食品大概健康與否。

## 功能

- 手機相機即時拍攝營養標籤
- 支援上載相片
- 使用 Tesseract.js 在瀏覽器內做 OCR
- 可輸入 Gemini API key，用 Gemini 直接閱讀相片並產生白話健康分析
- 自動抽取常見營養資料
- 以 0 至 100 分和 A 至 E 等級作健康提示
- 用廣東話白話解釋糖、鈉、脂肪、纖維、蛋白質等重點
- 可直接部署到 GitHub Pages

## 使用方法

直接開啟 `index.html`，或用任何靜態網站伺服器提供此資料夾。

手機使用相機時，建議透過 HTTPS 或 GitHub Pages 開啟，因為瀏覽器通常只允許安全來源使用相機。

## Gemini 分析

如果你有 Gemini API key，可以在 app 入面輸入 key。App 會把相片以 Gemini API 的 `generateContent` vision request 傳送到 Google，要求 Gemini 抽取營養數字並用廣東話解釋。

API key 只會儲存在使用者自己的瀏覽器 `localStorage`，不會寫入 GitHub repo。不過純前端 app 的 key 仍然會在瀏覽器端使用，公開部署時應限制 API key 使用範圍和配額。

## 發佈到 GitHub Pages

1. 建立一個 GitHub repository。
2. 將此資料夾內容 push 到 `main` branch。
3. 到 repository 的 Settings -> Pages。
4. Source 選 `Deploy from a branch`，branch 選 `main`，folder 選 `/root`。

## 注意

此 app 是健康資訊輔助工具，不是醫療建議。OCR 或 Gemini 都可能會讀錯字，分析結果應以包裝上的原始標籤為準。
