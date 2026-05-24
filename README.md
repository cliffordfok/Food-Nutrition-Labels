# Label Lens 營養標籤分析

一個可直接在瀏覽器使用的靜態網頁工具，用來拍攝或上傳食品營養標籤，快速整理熱量、糖、鈉、脂肪等重點。

## 功能

- 開啟相機拍攝營養標籤
- 拍照後自動關閉相機，也可手動關閉相機
- 可連續拍攝或上傳多張圖片，最多 6 張，再一次過合併分析
- 可輸入 Gemini API key 進行多圖像理解分析
- 沒有 Gemini API key 時，改用 Tesseract.js 在瀏覽器中做 OCR
- 分析營養重點、標籤詞彙白話解釋、尖銳總評和整體食用建議
- 偵測標籤基準，例如每100g、每100ml 或每份；未能確認時會提示分數只供初步參考
- 以 0 到 100 分與 A 到 E 等級呈現健康概覽
- 可部署到 GitHub Pages，無需後端伺服器

## 使用方式

1. 開啟相機拍一張，拍完相機會自動關閉。
2. 如果標籤太長，可再次開啟相機拍下一段，或用「上傳圖片」從相簿一次選多張。
3. 圖片加入完成後，按「分析已選圖片」。
4. 結果會顯示營養摘要、艱深詞彙解釋、直接總評和食用建議。

相機功能通常需要 HTTPS；GitHub Pages 會提供 HTTPS，因此比直接用 `file://` 開啟更適合手機測試。

## Gemini API key

Gemini API key 只會儲存在使用者瀏覽器的 `localStorage`，不會寫入 repository。輸入 key 後，圖片會送到 Google Gemini API 做分析；不輸入 key 時會改用瀏覽器 OCR。

注意：這是前端 app。使用 API key 時，key 仍會出現在使用者自己瀏覽器送出的請求中。建議只使用已限制來源、配額或用途的 API key，不要使用無限制或高權限 key。

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

`manifest.webmanifest` 暫未設定 icons；之後可以再補正式圖示。
