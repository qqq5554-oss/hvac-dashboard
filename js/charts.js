// 趨勢圖模組（Chart.js）
// 圖表結構參考 UT9660 冰水主機性能量測 Excel「趨勢圖」工作表：
// 流量、供回水溫度、ΔT、換算能力(RT/kW) 隨時間變化的折線圖。
// 配色為驗證過的色盲安全色票（見 dataviz skill）：藍 #2a78d6／綠 #008300／橘 #eb6834。
(function () {
  const CHROME = {
    light: {
      grid: "#e1e0d9",
      axis: "#c3c2b7",
      text: "#52514e",
      surface: "#fcfcfb",
    },
    dark: {
      grid: "#2c2c2a",
      axis: "#383835",
      text: "#c3c2b7",
      surface: "#1a1a19",
    },
  };

  const SERIES_COLOR = {
    blue: { light: "#2a78d6", dark: "#3987e5" },
    green: { light: "#008300", dark: "#008300" },
    orange: { light: "#eb6834", dark: "#d95926" },
  };

  const charts = {};

  function isDarkMode() {
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  }

  function seriesColor(hue) {
    return SERIES_COLOR[hue][isDarkMode() ? "dark" : "light"];
  }

  function chromeColors() {
    return CHROME[isDarkMode() ? "dark" : "light"];
  }

  // seriesDefs: [{ key, label, hue, data: [{x,y}] }]
  function createOrUpdate(canvasId, seriesDefs, yLabel) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const chrome = chromeColors();

    if (charts[canvasId]) {
      const chart = charts[canvasId];
      chart.data.datasets.forEach((ds, i) => {
        ds.data = seriesDefs[i].data;
      });
      chart.options.scales.x.grid.color = chrome.grid;
      chart.options.scales.x.ticks.color = chrome.text;
      chart.options.scales.y.grid.color = chrome.grid;
      chart.options.scales.y.ticks.color = chrome.text;
      chart.update("none");
      return chart;
    }

    const datasets = seriesDefs.map((s) => ({
      label: s.label,
      data: s.data,
      borderColor: seriesColor(s.hue),
      backgroundColor: seriesColor(s.hue),
      borderWidth: 2,
      pointRadius: 0,
      pointHoverRadius: 4,
      tension: 0.2,
      spanGaps: false,
      __hue: s.hue,
    }));

    const chart = new Chart(canvas.getContext("2d"), {
      type: "line",
      data: { datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        interaction: { mode: "index", intersect: false },
        plugins: {
          legend: {
            display: seriesDefs.length > 1,
            labels: { color: chrome.text, usePointStyle: true, boxHeight: 8 },
          },
          tooltip: {
            callbacks: {
              label: (ctx) =>
                `${ctx.dataset.label}: ${ctx.parsed.y === null ? "—" : ctx.parsed.y.toFixed(2)}`,
            },
          },
        },
        scales: {
          x: {
            type: "time",
            time: { tooltipFormat: "MM/dd HH:mm" },
            grid: { color: chrome.grid },
            ticks: { color: chrome.text, maxRotation: 0, autoSkip: true },
          },
          y: {
            title: { display: !!yLabel, text: yLabel, color: chrome.text },
            grid: { color: chrome.grid },
            ticks: { color: chrome.text },
          },
        },
      },
    });

    charts[canvasId] = chart;
    return chart;
  }

  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
    Object.keys(charts).forEach((id) => {
      const chart = charts[id];
      const chrome = chromeColors();
      chart.data.datasets.forEach((ds, i) => {
        const hue = ds.__hue;
        if (hue) ds.borderColor = ds.backgroundColor = seriesColor(hue);
      });
      chart.options.plugins.legend.labels.color = chrome.text;
      chart.options.scales.x.grid.color = chrome.grid;
      chart.options.scales.x.ticks.color = chrome.text;
      chart.options.scales.y.grid.color = chrome.grid;
      chart.options.scales.y.ticks.color = chrome.text;
      chart.update();
    });
  });

  window.HVACCharts = { createOrUpdate };
})();
