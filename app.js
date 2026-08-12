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
  const resultUnit = document.getElementById("result-unit");
  const resultMeta = document.getElementById("result-meta");
  const resultTrucks = document.getElementById("result-trucks");
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

  function calculate() {
    const qty = Number(quantity.value);
    const hasQty = Number.isFinite(qty) && qty > 0;

    let normText = "—";
    let meta = "";
    let capacityForTrucks = null;
    let trucksHtml = "";

    if (mode === "pipes") {
      const diameter = Number(pipeDiameter.value);
      const length = pipeLength.value;
      const row = norms.pipes.find((item) => item.diameter === diameter);
      const count = row?.lengths[length];

      if (count != null) {
        normText = String(count);
        capacityForTrucks = count;
        meta = `Диаметр оболочки Ø ${diameter} мм · длина ${formatLength(length)} м`;
        resultUnit.textContent = "концов в фуре";
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

      if (range) {
        normText = formatRange(range);
        capacityForTrucks = range[0];
        meta = `Труба/оболочка Ø ${row.pipe}/${row.shell} мм · ${typeLabel}`;
        resultUnit.textContent = "шт в 1 конец фуры";
      }
    }

    resultNorm.textContent = normText;
    resultMeta.textContent = meta;

    if (hasQty && capacityForTrucks) {
      const trucks = trucksNeeded(qty, capacityForTrucks);
      const capacityLabel =
        mode === "pipes"
          ? `${capacityForTrucks} концов / фура`
          : `${capacityForTrucks} шт / конец фуры (по нижнему краю нормы)`;

      trucksHtml = `
        <div>К отгрузке: <strong style="font-size:1rem;color:inherit">${qty} шт</strong></div>
        <div>Понадобится фур: <strong>${trucks}</strong></div>
        <div style="color:var(--muted);font-size:0.9rem">Расчёт по норме ${capacityLabel}</div>
      `;
      resultTrucks.hidden = false;
      resultTrucks.classList.remove("is-hidden");
      resultTrucks.innerHTML = trucksHtml;
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
