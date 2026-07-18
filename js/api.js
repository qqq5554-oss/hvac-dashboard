// ThingsBoard REST 客戶端
// 採用「Public Customer + Public Login」方案（規格文件第 5、6 節），
// 前端只保存公開的 Public Customer ID，不會出現任何可寫入的 Device Token。
//
// 注意：此 ThingsBoard 環境為 Professional Edition，Public 權限是透過
// 「Device Group → Make public」授予的群組權限，不包含查詢
// 「/api/customer/{customerId}/devices」（客戶底下設備清單）的權限，
// 因此本檔案不做設備自動查詢，deviceId 直接使用 config.js 裡設定的
// DEVICE_ID（固定值，可用 ThingsBoard 後台「Copy device Id」取得）。
(function () {
  async function getPublicToken(cfg) {
    const res = await fetch(`${cfg.THINGSBOARD_HOST}/api/auth/login/public`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ publicId: cfg.PUBLIC_ID }),
    });
    if (!res.ok) throw new Error(`公開登入失敗 (${res.status})`);
    const data = await res.json();
    return data.token;
  }

  async function getLatestTelemetry(cfg, token, deviceId) {
    const keys = cfg.TELEMETRY_KEYS.join(",");
    const res = await fetch(
      `${cfg.THINGSBOARD_HOST}/api/plugins/telemetry/DEVICE/${deviceId}/values/timeseries?keys=${keys}`,
      { headers: { "X-Authorization": `Bearer ${token}` } }
    );
    if (!res.ok) throw new Error(`讀取即時數值失敗 (${res.status})`);
    const raw = await res.json();
    const result = {};
    for (const key of cfg.TELEMETRY_KEYS) {
      const entry = raw[key] && raw[key][0];
      result[key] = entry
        ? { value: Number(entry.value), ts: entry.ts }
        : { value: null, ts: null };
    }
    return result;
  }

  function pickInterval(hours) {
    if (hours <= 1) return 60 * 1000; // 1 分鐘
    if (hours <= 6) return 5 * 60 * 1000; // 5 分鐘
    return 15 * 60 * 1000; // 15 分鐘
  }

  async function getHistoryTelemetry(cfg, token, deviceId, hours) {
    const endTs = Date.now();
    const startTs = endTs - hours * 3600 * 1000;
    const interval = pickInterval(hours);
    const keys = cfg.TELEMETRY_KEYS.join(",");
    const url =
      `${cfg.THINGSBOARD_HOST}/api/plugins/telemetry/DEVICE/${deviceId}/values/timeseries` +
      `?keys=${keys}&startTs=${startTs}&endTs=${endTs}&interval=${interval}&limit=1000&agg=AVG`;
    const res = await fetch(url, { headers: { "X-Authorization": `Bearer ${token}` } });
    if (!res.ok) throw new Error(`讀取歷史數據失敗 (${res.status})`);
    const raw = await res.json();
    const series = {};
    for (const key of cfg.TELEMETRY_KEYS) {
      series[key] = (raw[key] || [])
        .map((p) => ({ x: p.ts, y: p.value === null ? null : Number(p.value) }))
        .sort((a, b) => a.x - b.x);
    }
    return series;
  }

  window.HVACApi = {
    getPublicToken,
    getLatestTelemetry,
    getHistoryTelemetry,
  };
})();
