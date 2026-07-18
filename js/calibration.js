// 溫度校正模組
//
// 校正方式參考 UT9660 冰水主機性能量測 Excel（三杰 SJCL-115030221-01 校正報告）：
// 器示 = slope × 真值 + intercept  →  真值 = (器示 − intercept) / slope
//
// 依使用者確認，此校正報告對應「冷卻水」迴路（同 Excel「情境A：校正冷卻水」），
// 冰水側維持原始讀值不校正，因此預設啟用、且只對冷卻水 2 個通道套用。
// 注意：T1/T2 對應哪一個通道，Excel 原始報告本身也標註「歸屬未定」，
// 這裡先對調試看看（出水用 T1、回水用 T2），比較跟原本配置的差異：
//   出水：slope = 1.002,  intercept = -0.4899   （原為 T2，現改用 T1）
//   回水：slope = 1.0035, intercept = -0.4513   （原為 T1，現改用 T2）
(function () {
  const STORAGE_KEY = "hvac_temp_calibration_v3";

  const DEFAULT_CALIBRATION = {
    enabled: true,
    channels: {
      cooling_temp_supply: { label: "冷卻水出水溫", slope: 1.002, intercept: -0.4899 },
      cooling_temp_return: { label: "冷卻水回水溫", slope: 1.0035, intercept: -0.4513 },
    },
  };

  function clone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return clone(DEFAULT_CALIBRATION);
      const saved = JSON.parse(raw);
      const merged = clone(DEFAULT_CALIBRATION);
      merged.enabled = !!saved.enabled;
      for (const key of Object.keys(merged.channels)) {
        if (saved.channels && saved.channels[key]) {
          const { slope, intercept } = saved.channels[key];
          if (typeof slope === "number" && slope !== 0) merged.channels[key].slope = slope;
          if (typeof intercept === "number") merged.channels[key].intercept = intercept;
        }
      }
      return merged;
    } catch (e) {
      console.warn("讀取溫度校正設定失敗，改用預設值", e);
      return clone(DEFAULT_CALIBRATION);
    }
  }

  function save(cfg) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
  }

  function reset() {
    localStorage.removeItem(STORAGE_KEY);
    return clone(DEFAULT_CALIBRATION);
  }

  // 將原始器示值校正為真值；未啟用校正或無對應通道時原樣傳回
  function apply(cfg, key, rawValue) {
    if (typeof rawValue !== "number" || Number.isNaN(rawValue)) return rawValue;
    if (!cfg || !cfg.enabled) return rawValue;
    const ch = cfg.channels[key];
    if (!ch || !ch.slope) return rawValue;
    return (rawValue - ch.intercept) / ch.slope;
  }

  window.HVACCalibration = { DEFAULT_CALIBRATION, load, save, reset, apply };
})();
