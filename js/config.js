// ThingsBoard 連線設定
// PUBLIC_ID：ThingsBoard 後台自動建立的系統 Public Customer ID
// （做法：把 ECU-1051 所屬的 Device Group 勾選「Make public」，
//  系統會自動建立/使用內建的 Public 客戶，到 Customers 清單開啟該客戶、
//  用「Copy customer Id」取得）。
// DEVICE_ID：ECU-1051 設備本身的 ID（Devices 清單開啟設備、
//  「Copy device Id」取得）。此環境的 Public 權限模型不允許用 Public
//  token 查詢「客戶底下設備清單」，因此改為直接設定固定的 Device ID。
window.HVAC_CONFIG = {
  THINGSBOARD_HOST: "https://thingsboard.cloud",
  PUBLIC_ID: "38b0a800-82bc-11f1-8b3b-037118875eb0",
  DEVICE_ID: "1469eae0-802f-11f1-bb5b-f59caa77e86d",
  DEVICE_NAME: "ECU-1051",

  // 自動更新頻率（毫秒）
  POLL_INTERVAL_MS: 30000,

  // 趨勢圖可選時間範圍（小時）
  TREND_RANGES_HOURS: [1, 6, 24],
  DEFAULT_TREND_RANGE_HOURS: 6,

  TELEMETRY_KEYS: [
    "chilled_flow",
    "chilled_temp_supply",
    "chilled_temp_return",
    "cooling_flow",
    "cooling_temp_supply",
    "cooling_temp_return",
  ],
};
