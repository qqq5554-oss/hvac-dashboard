# hvac-dashboard
HVAC 冰水冷卻水遠端監控儀表板

透過 ThingsBoard Cloud 讀取 ECU-1051 閘道器上傳的冰水／冷卻水流量與溫度數據，
以純 HTML/CSS/JavaScript（無需建置工具）呈現手機友善的即時監控儀表板，
包含即時數值卡片、趨勢圖與可調式溫度校正功能。

## 部署前設定

`js/config.js` 裡的 `PUBLIC_ID` 與 `DEVICE_ID` 已依實際 ThingsBoard 後台設定填好，
可直接部署使用。若要換一台設備、或在別的 ThingsBoard 租戶重建，請照以下步驟
（本專案使用的是 **ThingsBoard Cloud Professional Edition**，跟社群版 CE 的
「Public Customer」設定方式不同，經實測整理如下）：

1. **Devices → 開啟目標設備 → 「Copy device Id」**，記下 Device ID。
2. **Devices → Groups 分頁**，勾選 `All` 群組（或另建一個只放此設備的群組）
   最右邊的 **Public** 核取方塊。這會讓 ThingsBoard 自動建立/使用內建的
   `Public` 系統客戶。
   - ⚠️ 若之後這個 Tenant 會加入其他不想公開的設備，建議改成另建一個
     專用群組，只把要公開的設備放進去再勾 Public，避免整個 `All` 群組被公開。
   - ⚠️ 若透過「Manage owner and groups」把設備的 Owner 改指派給某個
     Customer，設備會離開 Tenant 層級的群組，導致上面設的 Public 群組
     權限失效（找不到設備遙測）。維持設備 Owner 為 **Tenant** 本身即可。
3. **Customers → All**，這時應該會多一筆 Title 為 `Public` 的客戶（系統自動建立）。
   點進去 → **「Copy customer Id」**，這就是 `PUBLIC_ID`。
4. 確認 Public 群組使用的角色（Permissions 分頁 → `Entity Group Public User`）
   已包含 `Read`、`Read Attributes`、`Read Telemetry` 操作（ThingsBoard 自動產生
   的角色預設就有，通常不用調整）。
5. 把 `PUBLIC_ID` 與 `DEVICE_ID` 填入 `js/config.js`：

```js
window.HVAC_CONFIG = {
  THINGSBOARD_HOST: "https://thingsboard.cloud",
  PUBLIC_ID: "從步驟 3 複製的 customer Id",
  DEVICE_ID: "從步驟 1 複製的 device Id",
  ...
};
```

這兩個 ID 公開亦無妨——`PUBLIC_ID` 只能唯讀存取被設為公開的群組內容，
`DEVICE_ID` 也不是可寫入的憑證。真正的 Device Access Token 完全不會出現在
前端程式碼裡。

設定完成後，將整個目錄部署到 GitHub Pages 或任何靜態網站空間即可使用，無需 build step。

## 功能

- **即時數值卡片**：冰水／冷卻水側流量、出水溫、回水溫，每 30 秒（可調）自動更新。
- **趨勢圖**（Chart.js）：流量、溫度、ΔT 比較、換算能力（冷凍能力 Q冷／冷凝熱 Q熱）比較，
  可切換 1 / 6 / 24 小時範圍。折線設計與配色參考 UT9660 冰水主機性能量測 Excel「趨勢圖」工作表。
- **溫度校正**：已確認三杰 SJCL-115030221-01 校正報告對應**冷卻水**迴路，因此預設
  自動套用於冷卻水出水溫／回水溫（`真值 = (器示 − intercept) / slope`），冰水側維持
  原始讀值不校正。設定面板目前隱藏（邏輯保留在 `js/calibration.js`，之後要調整
  或重新開放給使用者自行設定，把 `index.html` 裡 `#calibrationPanel` 的
  `display: none` 拿掉即可）。
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
- Excel 原始報告標註校正通道「歸屬未定，需現場核對」；使用者已確認此報告對應冷卻水迴路，
  故僅套用於冷卻水 2 個溫度通道。
- 實際上線後觀察到冰水側「出水溫」讀數持續高於「回水溫」，與 Excel「三、溫度標籤反置」章節記載的
  同一款感測器問題相符（ThingsBoard 遙測欄位標籤與現場實際管路接反）。ΔT 計算已比照 Excel 的作法
  一律取絕對值，因此不受標籤反置影響；但欄位名稱本身（出水/回水）仍建議現場核對後更正。
