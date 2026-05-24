# Label Lens 營養標籤分析

一個可直接在瀏覽器使用的靜態網頁工具，用來拍攝或上傳食品營養標籤，快速整理熱量、糖、鈉、脂肪等重點。

## 功能

- 可拍攝或上傳最多 6 張標籤圖片，再一次過合併分析
- 圖片會先在瀏覽器中壓縮和優化
- 可用 Gemini 模型直接做圖片分析
- 可用 DeepSeek V4 Flash / V4 Pro 先 OCR 再做文字營養分析
- 沒有合適 API key 時，改用 Tesseract.js 在瀏覽器中做 OCR 初步分析
- 解析常見中英文營養數字，包括熱量、脂肪、飽和脂肪、糖、鈉和蛋白質
- 偵測標籤基準，例如每100g、每100ml 或每份；未能確認時會提示分數只供初步參考
- 分析營養重點、標籤詞彙白話解釋、尖銳總評和整體食用建議
- 以 0 到 100 分與 A 到 E 等級呈現健康概覽
- 可部署到 GitHub Pages，無需後端伺服器

## 使用方式

1. 開啟 app。
2. 拍攝標籤，或從相簿上傳圖片。
3. 如需要 AI 分析，選擇 Gemini 或 DeepSeek 模型。
4. 輸入自己的 API key。
5. 按「分析已選圖片」，查看營養摘要、詞彙解釋、總評和建議。

相機和 OCR 通常在 HTTPS 下較穩定。GitHub Pages 會提供 HTTPS，比直接用 `file://` 開啟更適合手機測試。

## AI API key 安全提示

API key 不會寫入 repository。

app 只會把 API key 儲存在使用者自己瀏覽器的 `localStorage`，方便下次使用。不過這是前端 app，使用 API key 時，key 仍會出現在使用者自己瀏覽器送出的請求中。

建議只使用已限制來源、配額或用途的 API key，不要使用無限制或高權限 key。

Gemini 模型會直接分析圖片。DeepSeek V4 Flash / V4 Pro 會先用瀏覽器 OCR 讀取標籤文字，再把文字送到 DeepSeek 做營養分析。

## 本機檢查

```powershell
node --check app.js
node --check nutrition.js
node tests/parseNutrition.test.js
node tests/staticChecks.js
```

## GitHub Pages 部署

1. 將檔案 push 到 GitHub repository。
2. 到 repository 的 Settings -> Pages。
3. Source 選 `Deploy from a branch`。
4. Branch 選要部署的分支，Folder 選 `/root`。
5. 儲存後等待 GitHub Pages 發布完成。

## 備註

`manifest.webmanifest` 暫未設定正式 icons；之後可以再補。
