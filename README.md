# hvac-dashboard
HVAC 冰水冷卻水遠端監控儀表板

透過 ThingsBoard Cloud 讀取 ECU-1051 閘道器上傳的冰水／冷卻水流量與溫度數據，
以純 HTML/CSS/JavaScript（無需建置工具）呈現手機友善的即時監控儀表板，
包含即時數值卡片、趨勢圖與可調式溫度校正功能。

## 部署前設定

編輯 `js/config.js`：

```js
window.HVAC_CONFIG = {
  THINGSBOARD_HOST: "https://thingsboard.cloud",
  PUBLIC_ID: "REPLACE_WITH_PUBLIC_CUSTOMER_ID", // 換成 ThingsBoard 後台的 Public Customer ID
  DEVICE_NAME: "ECU-1051",
  ...
};
```

`PUBLIC_ID` 的取得方式請參照專案規格文件第 5 節（Customer → Public 分頁 → 記下 Public ID，
並將 `ECU-1051` 設備指派給該 Public Customer）。此 ID 公開亦無妨——僅能唯讀存取被指派的設備。

設定完成後，將整個目錄部署到 GitHub Pages 或任何靜態網站空間即可使用，無需 build step。

## 功能

- **即時數值卡片**：冰水／冷卻水側流量、出水溫、回水溫，每 30 秒（可調）自動更新。
- **趨勢圖**（Chart.js）：流量、溫度、ΔT 比較、換算能力（冷凍能力 Q冷／冷凝熱 Q熱）比較，
  可切換 1 / 6 / 24 小時範圍。折線設計與配色參考 UT9660 冰水主機性能量測 Excel「趨勢圖」工作表。
- **溫度校正設定**：可對 4 個溫度量測點分別設定線性校正（`真值 = (器示 − intercept) / slope`），
  預設值取自 Excel 中三杰 SJCL-115030221-01 感測器校正報告，僅供參考，
  請依實際感測器校正報告核對後調整；設定值保存於瀏覽器 localStorage。
- **衍生指標**：ΔT、冷凍能力（kW / RT）、冷凝熱（kW），公式與有效範圍（流量 ≥ 100 LPM、
  ΔT 合理區間）皆對齊 Excel「四、計算公式與假設」章節，用以濾除流量斷訊/脈衝與溫度瞬跳雜訊。

## 檔案結構

```
index.html          主頁面
css/style.css        版面與樣式（RWD，深色/淺色自動切換）
js/config.js          連線與顯示設定
js/calibration.js     溫度校正邏輯與 localStorage 讀寫
js/metrics.js         ΔT／冷凍能力／冷凝熱計算
js/api.js             ThingsBoard REST 客戶端（Public JWT 登入、即時值、歷史數據）
js/charts.js          Chart.js 趨勢圖封裝
js/app.js             主流程（輪詢、UI 綁定）
```

## 已知限制

- 目前 ThingsBoard 遙測僅有流量與溫度，未包含電力量測，因此儀表板不計算 COP／熱平衡（HB%），
  這點與 Excel 參考檔（含 PROVA 電力分析儀數據）不同。
- 溫度校正的通道對應（哪一組校正常數對應哪一個實體量測點）在 Excel 原始報告中亦標註「歸屬未定，
  需現場核對」，本儀表板預設 4 個通道各自使用相同的參考校正常數，正式使用前請依現場校正報告確認。
