// 主流程：串接 ThingsBoard、套用溫度校正、更新卡片與趨勢圖
(function () {
  const cfg = window.HVAC_CONFIG;
  const Calibration = window.HVACCalibration;
  const Metrics = window.HVACMetrics;
  const Api = window.HVACApi;
  const Charts = window.HVACCharts;

  let token = null;
  let deviceId = null;
  let calConfig = Calibration.load();
  let currentRangeHours = cfg.DEFAULT_TREND_RANGE_HOURS;

  const $ = (id) => document.getElementById(id);

  function setStatus(state, text) {
    $("connDot").className = "dot" + (state ? " " + state : "");
    $("connText").textContent = text;
  }

  function fmt(v, digits = 1) {
    return typeof v === "number" && !Number.isNaN(v) ? v.toFixed(digits) : "--";
  }

  function calibratedTemp(key, rawValue) {
    return Calibration.apply(calConfig, key, rawValue);
  }

  async function ensureAuth() {
    if (!token) token = await Api.getPublicToken(cfg);
    if (!deviceId) deviceId = cfg.DEVICE_ID;
  }

  async function withAuthRetry(fn) {
    try {
      await ensureAuth();
      return await fn();
    } catch (e) {
      token = null;
      await ensureAuth();
      return await fn();
    }
  }

  // 依時間戳合併多個序列，缺值補 null，確保逐點運算時對齊
  function mergeByTimestamp(seriesMap, keys) {
    const tsSet = new Set();
    keys.forEach((k) => (seriesMap[k] || []).forEach((p) => tsSet.add(p.x)));
    const timestamps = [...tsSet].sort((a, b) => a - b);
    const lookups = {};
    keys.forEach((k) => {
      const m = new Map((seriesMap[k] || []).map((p) => [p.x, p.y]));
      lookups[k] = (ts) => (m.has(ts) ? m.get(ts) : null);
    });
    return { timestamps, lookups };
  }

  async function refreshLatest() {
    await withAuthRetry(async () => {
      const latest = await Api.getLatestTelemetry(cfg, token, deviceId);

      const chilledFlow = latest.chilled_flow.value;
      const chilledSupply = calibratedTemp("chilled_temp_supply", latest.chilled_temp_supply.value);
      const chilledReturn = calibratedTemp("chilled_temp_return", latest.chilled_temp_return.value);
      const coolingFlow = latest.cooling_flow.value;
      const coolingSupply = calibratedTemp("cooling_temp_supply", latest.cooling_temp_supply.value);
      const coolingReturn = calibratedTemp("cooling_temp_return", latest.cooling_temp_return.value);

      $("chilledFlow").textContent = fmt(chilledFlow, 0);
      $("chilledSupply").textContent = fmt(chilledSupply);
      $("chilledReturn").textContent = fmt(chilledReturn);
      $("coolingFlow").textContent = fmt(coolingFlow, 0);
      $("coolingSupply").textContent = fmt(coolingSupply);
      $("coolingReturn").textContent = fmt(coolingReturn);

      const chilledM = Metrics.computeChilled({ flow: chilledFlow, supply: chilledSupply, ret: chilledReturn });
      const coolingM = Metrics.computeCooling({ flow: coolingFlow, supply: coolingSupply, ret: coolingReturn });

      $("chilledDeltaT").textContent = fmt(chilledM.deltaT);
      $("chilledRT").textContent = fmt(chilledM.rt, 0);
      $("coolingDeltaT").textContent = fmt(coolingM.deltaT);
      $("coolingQ").textContent = fmt(coolingM.q, 0);

      const latestTs = Object.values(latest)
        .map((v) => v.ts)
        .filter(Boolean)
        .sort((a, b) => b - a)[0];
      $("lastUpdate").textContent =
        "最後更新時間：" + (latestTs ? new Date(latestTs).toLocaleString("zh-TW", { hour12: false }) : "--");

      setStatus("ok", "連線中");
    });
  }

  async function refreshHistory() {
    await withAuthRetry(async () => {
      const series = await Api.getHistoryTelemetry(cfg, token, deviceId, currentRangeHours);

      const calSeries = (raw, key) => raw.map((p) => ({ x: p.x, y: calibratedTemp(key, p.y) }));

      const chilledSupplySeries = calSeries(series.chilled_temp_supply, "chilled_temp_supply");
      const chilledReturnSeries = calSeries(series.chilled_temp_return, "chilled_temp_return");
      const coolingSupplySeries = calSeries(series.cooling_temp_supply, "cooling_temp_supply");
      const coolingReturnSeries = calSeries(series.cooling_temp_return, "cooling_temp_return");

      Charts.createOrUpdate(
        "chartChilledFlow",
        [{ key: "chilled_flow", label: "冰水流量", hue: "blue", data: series.chilled_flow }],
        "L/min"
      );
      Charts.createOrUpdate(
        "chartChilledTemp",
        [
          { key: "chilled_temp_supply", label: "出水溫", hue: "blue", data: chilledSupplySeries },
          { key: "chilled_temp_return", label: "回水溫", hue: "green", data: chilledReturnSeries },
        ],
        "℃"
      );
      Charts.createOrUpdate(
        "chartCoolingFlow",
        [{ key: "cooling_flow", label: "冷卻水流量", hue: "orange", data: series.cooling_flow }],
        "L/min"
      );
      Charts.createOrUpdate(
        "chartCoolingTemp",
        [
          { key: "cooling_temp_supply", label: "出水溫", hue: "blue", data: coolingSupplySeries },
          { key: "cooling_temp_return", label: "回水溫", hue: "green", data: coolingReturnSeries },
        ],
        "℃"
      );

      // 逐時間點計算 ΔT / Q，時間戳先對齊避免序列長度不一致造成誤配
      const calibratedMap = {
        chilled_flow: series.chilled_flow,
        chilled_temp_supply: chilledSupplySeries,
        chilled_temp_return: chilledReturnSeries,
        cooling_flow: series.cooling_flow,
        cooling_temp_supply: coolingSupplySeries,
        cooling_temp_return: coolingReturnSeries,
      };
      const { timestamps, lookups } = mergeByTimestamp(calibratedMap, Object.keys(calibratedMap));

      const deltaTChilled = [];
      const deltaTCooling = [];
      const qChilled = [];
      const qCooling = [];
      timestamps.forEach((x) => {
        const mC = Metrics.computeChilled({
          flow: lookups.chilled_flow(x),
          supply: lookups.chilled_temp_supply(x),
          ret: lookups.chilled_temp_return(x),
        });
        const mW = Metrics.computeCooling({
          flow: lookups.cooling_flow(x),
          supply: lookups.cooling_temp_supply(x),
          ret: lookups.cooling_temp_return(x),
        });
        deltaTChilled.push({ x, y: mC.deltaT });
        deltaTCooling.push({ x, y: mW.deltaT });
        qChilled.push({ x, y: mC.q });
        qCooling.push({ x, y: mW.q });
      });

      Charts.createOrUpdate(
        "chartDeltaTCompare",
        [
          { key: "deltaT_chilled", label: "ΔT冰水", hue: "blue", data: deltaTChilled },
          { key: "deltaT_cooling", label: "ΔT冷卻水", hue: "orange", data: deltaTCooling },
        ],
        "℃"
      );
      Charts.createOrUpdate(
        "chartQCompare",
        [
          { key: "q_chilled", label: "Q冷（冷凍能力）", hue: "blue", data: qChilled },
          { key: "q_cooling", label: "Q熱（冷凝熱）", hue: "orange", data: qCooling },
        ],
        "kW"
      );
    });
  }

  function onError(err) {
    console.error(err);
    setStatus("error", "連線異常");
  }

  function buildRangeButtons() {
    const wrap = $("rangeButtons");
    wrap.innerHTML = "";
    cfg.TREND_RANGES_HOURS.forEach((h) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = h + " 小時";
      if (h === currentRangeHours) btn.classList.add("active");
      btn.addEventListener("click", () => {
        currentRangeHours = h;
        [...wrap.children].forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        refreshHistory().catch(onError);
      });
      wrap.appendChild(btn);
    });
  }

  function renderCalibrationRows() {
    const tbody = $("calTableBody");
    tbody.innerHTML = "";
    Object.entries(calConfig.channels).forEach(([key, ch]) => {
      const tr = document.createElement("tr");

      const labelTd = document.createElement("td");
      labelTd.textContent = ch.label;

      const slopeTd = document.createElement("td");
      const slopeInput = document.createElement("input");
      slopeInput.type = "number";
      slopeInput.step = "0.0001";
      slopeInput.dataset.key = key;
      slopeInput.dataset.field = "slope";
      slopeInput.value = ch.slope;
      slopeTd.appendChild(slopeInput);

      const interceptTd = document.createElement("td");
      const interceptInput = document.createElement("input");
      interceptInput.type = "number";
      interceptInput.step = "0.0001";
      interceptInput.dataset.key = key;
      interceptInput.dataset.field = "intercept";
      interceptInput.value = ch.intercept;
      interceptTd.appendChild(interceptInput);

      tr.append(labelTd, slopeTd, interceptTd);
      tbody.appendChild(tr);
    });
  }

  function initCalibrationUI() {
    $("calEnabled").checked = calConfig.enabled;
    renderCalibrationRows();

    $("calSave").addEventListener("click", () => {
      calConfig.enabled = $("calEnabled").checked;
      $("calTableBody")
        .querySelectorAll("input")
        .forEach((input) => {
          const val = parseFloat(input.value);
          if (!Number.isNaN(val)) calConfig.channels[input.dataset.key][input.dataset.field] = val;
        });
      Calibration.save(calConfig);
      refreshLatest().catch(onError);
      refreshHistory().catch(onError);
    });

    $("calReset").addEventListener("click", () => {
      calConfig = Calibration.reset();
      $("calEnabled").checked = calConfig.enabled;
      renderCalibrationRows();
      refreshLatest().catch(onError);
      refreshHistory().catch(onError);
    });
  }

  async function init() {
    buildRangeButtons();
    initCalibrationUI();
    setStatus(null, "連線中…");

    try {
      await refreshLatest();
      await refreshHistory();
    } catch (e) {
      onError(e);
    }

    setInterval(() => refreshLatest().catch(onError), cfg.POLL_INTERVAL_MS);
    setInterval(() => refreshHistory().catch(onError), cfg.POLL_INTERVAL_MS * 4);
  }

  init();
})();
