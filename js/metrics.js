// 衍生指標計算
//
// 公式與有效範圍參考 UT9660 冰水主機性能量測 Excel「四、計算公式與假設」：
//   Q冷 = 冰水流量(LPM)/60 × ρ × Cp × ΔT冰水  (kW)；RT = Q冷 / 3.517
//   Q熱 = 冷卻水流量(LPM)/60 × ρ × Cp × ΔT冷卻  (kW)
//   假設：ρ = 1.0 kg/L，Cp = 4.186 kJ/kg·K
// 有效範圍濾除流量斷訊/脈衝與溫度瞬跳（同 Excel 時序對齊數據 K/M 欄邏輯）：
//   冰水：flow ≥ 100 LPM 且 0.2 < ΔT < 12℃ 才計入
//   冷卻水：flow ≥ 100 LPM 且 0.05 < ΔT < 8℃ 才計入
(function () {
  const RHO = 1.0; // kg/L
  const CP = 4.186; // kJ/kg·K
  const RT_FACTOR = 3.517; // kW/RT

  function isNum(v) {
    return typeof v === "number" && !Number.isNaN(v);
  }

  function computeChilled({ flow, supply, ret }) {
    const deltaT = isNum(supply) && isNum(ret) ? ret - supply : null;
    let q = null;
    if (isNum(flow) && flow >= 100 && isNum(deltaT) && deltaT > 0.2 && deltaT < 12) {
      q = (flow / 60) * RHO * CP * deltaT;
    }
    const rt = isNum(q) ? q / RT_FACTOR : null;
    return { deltaT, q, rt };
  }

  function computeCooling({ flow, supply, ret }) {
    // ΔT冷卻 = 出水(熱) − 回水(冷)
    const deltaT = isNum(supply) && isNum(ret) ? supply - ret : null;
    let q = null;
    if (isNum(flow) && flow >= 100 && isNum(deltaT) && deltaT > 0.05 && deltaT < 8) {
      q = (flow / 60) * RHO * CP * deltaT;
    }
    return { deltaT, q };
  }

  window.HVACMetrics = { RHO, CP, RT_FACTOR, computeChilled, computeCooling };
})();
