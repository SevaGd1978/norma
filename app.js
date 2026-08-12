(() => {
  const norms = window.LOADING_NORMS;
  const form = document.getElementById("calc-form");
  const pipeFields = document.getElementById("pipe-fields");
  const fasFields = document.getElementById("fas-fields");
  const pipeDiameter = document.getElementById("pipe-diameter");
  const pipeLength = document.getElementById("pipe-length");
  const fasSize = document.getElementById("fas-size");
  const fasType = document.getElementById("fas-type");
  const quantity = document.getElementById("quantity");
  const result = document.getElementById("result");
  const resultNorm = document.getElementById("result-norm");
  const resultLabel = document.getElementById("result-label");
  const resultUnit = document.getElementById("result-unit");
  const resultMeta = document.getElementById("result-meta");
  const resultTrucks = document.getElementById("result-trucks");
  const truckFill = document.getElementById("truck-fill");
  const pipeRows = document.getElementById("pipe-rows");
  const vizCaption = document.getElementById("viz-caption");
  const lengthCompare = document.getElementById("length-compare");
  const modeButtons = document.querySelectorAll(".mode-btn");

  let mode = "pipes";

  function formatRange([min, max]) {
    return min === max ? String(min) : `${min}–${max}`;
  }

  function formatLength(value) {
    return String(value).replace(".", ",");
  }

  function fillSelects() {
    pipeDiameter.innerHTML = norms.pipes
      .map(
        (row) =>
          `<option value="${row.diameter}">Ø ${row.diameter} мм</option>`
      )
      .join("");

    fasSize.innerHTML = norms.fas
      .map(
        (row, index) =>
          `<option value="${index}">Ø ${row.pipe} / ${row.shell} мм</option>`
      )
      .join("");

    pipeDiameter.value = "225";
  }

  function setMode(nextMode) {
    mode = nextMode;
    modeButtons.forEach((btn) => {
      const active = btn.dataset.mode === mode;
      btn.classList.toggle("is-active", active);
      btn.setAttribute("aria-selected", String(active));
    });

    const showPipes = mode === "pipes";
    pipeFields.hidden = !showPipes;
    pipeFields.classList.toggle("is-hidden", !showPipes);
    fasFields.hidden = showPipes;
    fasFields.classList.toggle("is-hidden", showPipes);
    calculate();
  }

  function trucksNeeded(qty, capacity) {
    if (!qty || !capacity) return null;
    return Math.ceil(qty / capacity);
  }

  function renderTruckViz({ capacity, qty, hasQty, diameterHint }) {
    const fillRatio = hasQty
      ? Math.min(1, qty / capacity)
      : 1;
    const fillPercent = Math.round(fillRatio * 100);
    truckFill.style.height = `${fillPercent}%`;

    const rows = 5;
    const cols = Math.max(4, Math.min(18, Math.round(8 + (diameterHint ? 200 / diameterHint : 8))));
    const totalDots = rows * cols;
    const filledDots = Math.round(totalDots * fillRatio);

    let html = "";
    let index = 0;
    for (let r = 0; r < rows; r += 1) {
      html += `<div class="pipe-row">`;
      for (let c = 0; c < cols; c += 1) {
        const delay = Math.min(0.35, index * 0.012);
        const on = index < filledDots;
        html += on
          ? `<span class="pipe-dot" style="animation-delay:${delay}s"></span>`
          : `<span class="pipe-dot" style="opacity:0.12;transform:scale(1);animation:none;filter:grayscale(1)"></span>`;
        index += 1;
      }
      html += `</div>`;
    }
    pipeRows.innerHTML = html;

    if (hasQty) {
      const leftover = qty % capacity;
      const lastFill = leftover === 0 ? 100 : Math.round((leftover / capacity) * 100);
      vizCaption.textContent = `Последняя фура заполнена на ${lastFill}% · всего нужно ${trucksNeeded(qty, capacity)}`;
    } else {
      vizCaption.textContent = `Полная загрузка по норме: ${capacity} шт`;
    }
  }

  function renderLengthCompare(row, activeLength) {
    if (!row) {
      lengthCompare.classList.add("is-hidden");
      lengthCompare.innerHTML = "";
      return;
    }

    const entries = [
      ["1.8", row.lengths["1.8"]],
      ["2", row.lengths["2"]],
      ["2.2", row.lengths["2.2"]],
    ];
    const max = Math.max(...entries.map(([, value]) => value));

    lengthCompare.classList.remove("is-hidden");
    lengthCompare.innerHTML = entries
      .map(([length, value]) => {
        const width = Math.round((value / max) * 100);
        const active = length === activeLength ? " is-active" : "";
        return `
          <div class="compare-row${active}">
            <span>${formatLength(length)} м</span>
            <div class="compare-track"><div class="compare-bar" style="width:${width}%"></div></div>
            <span class="compare-val">${value}</span>
          </div>`;
      })
      .join("");

    // trigger bar animation
    requestAnimationFrame(() => {
      lengthCompare.querySelectorAll(".compare-bar").forEach((bar) => {
        const width = bar.style.width;
        bar.style.width = "0%";
        requestAnimationFrame(() => {
          bar.style.width = width;
        });
      });
    });
  }

  function calculate() {
    const qty = Number(quantity.value);
    const hasQty = Number.isFinite(qty) && qty > 0;

    let normText = "—";
    let meta = "";
    let capacityForTrucks = null;
    let diameterHint = 200;

    if (mode === "pipes") {
      const diameter = Number(pipeDiameter.value);
      const length = pipeLength.value;
      const row = norms.pipes.find((item) => item.diameter === diameter);
      const count = row?.lengths[length];
      diameterHint = diameter;

      if (count != null) {
        normText = String(count);
        capacityForTrucks = count;
        meta = `Диаметр оболочки Ø ${diameter} мм · длина ${formatLength(length)} м`;
        resultLabel.textContent = "Норма погрузки";
        resultUnit.textContent = "концов в фуре";
        renderLengthCompare(row, length);
      }
    } else {
      const row = norms.fas[Number(fasSize.value)];
      const type = fasType.value;
      const range = row?.[type];
      const typeLabel = {
        bends: "Отводы укор. ПЭ, ОЦ",
        nop: "НОП (L = 1500 мм)",
        end: "Концевой элемент (L = 2200 мм)",
      }[type];
      diameterHint = row?.shell || 200;

      if (range) {
        normText = formatRange(range);
        capacityForTrucks = range[0];
        meta = `Труба/оболочка Ø ${row.pipe}/${row.shell} мм · ${typeLabel}`;
        resultLabel.textContent = "Норма в 1 конец фуры";
        resultUnit.textContent = "шт";
        lengthCompare.classList.add("is-hidden");
        lengthCompare.innerHTML = "";
      }
    }

    resultNorm.textContent = normText;
    resultMeta.textContent = meta;

    if (capacityForTrucks) {
      renderTruckViz({
        capacity: capacityForTrucks,
        qty,
        hasQty,
        diameterHint,
      });
    }

    if (hasQty && capacityForTrucks) {
      const trucks = trucksNeeded(qty, capacityForTrucks);
      const capacityLabel =
        mode === "pipes"
          ? `${capacityForTrucks} концов / фура`
          : `${capacityForTrucks} шт / конец фуры (по нижнему краю нормы)`;

      resultTrucks.hidden = false;
      resultTrucks.classList.remove("is-hidden");
      resultTrucks.innerHTML = `
        <div>К отгрузке: <strong style="font-size:1rem;color:inherit">${qty} шт</strong></div>
        <div>Понадобится фур: <strong>${trucks}</strong></div>
        <div style="color:var(--muted);font-size:0.9rem">Расчёт по норме ${capacityLabel}</div>
      `;
    } else {
      resultTrucks.hidden = true;
      resultTrucks.classList.add("is-hidden");
      resultTrucks.innerHTML = "";
    }

    result.classList.remove("is-updated");
    void result.offsetWidth;
    result.classList.add("is-updated");
  }

  function renderTables() {
    const pipeTable = document.getElementById("pipe-table");
    const fasTable = document.getElementById("fas-table");

    pipeTable.innerHTML = `
      <table>
        <thead>
          <tr>
            <th>Диаметр оболочки</th>
            <th>1,8 м</th>
            <th>2 м</th>
            <th>2,2 м</th>
          </tr>
        </thead>
        <tbody>
          ${norms.pipes
            .map(
              (row) => `
            <tr>
              <td>Ø ${row.diameter}</td>
              <td>${row.lengths["1.8"]}</td>
              <td>${row.lengths["2"]}</td>
              <td>${row.lengths["2.2"]}</td>
            </tr>`
            )
            .join("")}
        </tbody>
      </table>
    `;

    fasTable.innerHTML = `
      <table>
        <thead>
          <tr>
            <th>Труба / оболочка</th>
            <th>Отводы</th>
            <th>НОП</th>
            <th>Концевой</th>
          </tr>
        </thead>
        <tbody>
          ${norms.fas
            .map(
              (row) => `
            <tr>
              <td>Ø ${row.pipe} / ${row.shell}</td>
              <td>${formatRange(row.bends)}</td>
              <td>${formatRange(row.nop)}</td>
              <td>${formatRange(row.end)}</td>
            </tr>`
            )
            .join("")}
        </tbody>
      </table>
    `;
  }

  modeButtons.forEach((btn) => {
    btn.addEventListener("click", () => setMode(btn.dataset.mode));
  });

  form.addEventListener("input", calculate);
  form.addEventListener("change", calculate);

  fillSelects();
  renderTables();
  calculate();
})();
