// ThingsBoard REST 客戶端
// 採用「Public Customer + Public Login」方案（規格文件第 5、6 節），
// 前端只保存公開的 Public Customer ID，不會出現任何可寫入的 Device Token。
(function () {
  const DEVICE_CACHE_KEY = "hvac_device_id_v1";

  function decodeJwtPayload(token) {
    const payload = token.split(".")[1];
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + c.charCodeAt(0).toString(16).padStart(2, "0"))
        .join("")
    );
    return JSON.parse(json);
  }

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

  async function resolveDeviceId(cfg, token) {
    const cached = localStorage.getItem(DEVICE_CACHE_KEY);
    if (cached) return cached;

    const { customerId } = decodeJwtPayload(token);
    if (!customerId) throw new Error("Token 內無 customerId，無法查詢設備");

    const res = await fetch(
      `${cfg.THINGSBOARD_HOST}/api/customer/${customerId}/devices?pageSize=50&page=0`,
      { headers: { "X-Authorization": `Bearer ${token}` } }
    );
    if (!res.ok) throw new Error(`查詢設備清單失敗 (${res.status})`);
    const data = await res.json();
    const device = (data.data || []).find((d) => d.name === cfg.DEVICE_NAME);
    if (!device) throw new Error(`找不到名稱為 ${cfg.DEVICE_NAME} 的設備`);

    localStorage.setItem(DEVICE_CACHE_KEY, device.id.id);
    return device.id.id;
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
    resolveDeviceId,
    getLatestTelemetry,
    getHistoryTelemetry,
  };
})();
