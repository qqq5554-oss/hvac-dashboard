// ThingsBoard 連線設定
// 依「HVAC 遠端監控儀表板」規格文件第 5 節設定 Public Customer 後，
// 將下方 PUBLIC_ID 換成 ThingsBoard 後台產生的 Public Customer ID。
window.HVAC_CONFIG = {
  THINGSBOARD_HOST: "https://thingsboard.cloud",
  PUBLIC_ID: "REPLACE_WITH_PUBLIC_CUSTOMER_ID",
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
