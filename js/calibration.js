// 溫度校正模組
//
// 校正方式參考 UT9660 冰水主機性能量測 Excel（三杰 SJCL-115030221-01 校正報告）：
// 器示 = slope × 真值 + intercept  →  真值 = (器示 − intercept) / slope
//
// Excel 原始校正常數（同一批溫度感測器的參考值，僅供預設帶入，實際仍須以
// 現場感測器校正報告為準）：
//   T1（回水類通道）：slope = 1.002,  intercept = -0.4899
//   T2（供水類通道）：slope = 1.0035, intercept = -0.4513
(function () {
  const STORAGE_KEY = "hvac_temp_calibration_v1";

  const DEFAULT_CALIBRATION = {
    enabled: false,
    channels: {
      chilled_temp_supply: { label: "冰水出水溫", slope: 1.0035, intercept: -0.4513 },
      chilled_temp_return: { label: "冰水回水溫", slope: 1.002, intercept: -0.4899 },
      cooling_temp_supply: { label: "冷卻水出水溫", slope: 1.0035, intercept: -0.4513 },
      cooling_temp_return: { label: "冷卻水回水溫", slope: 1.002, intercept: -0.4899 },
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
