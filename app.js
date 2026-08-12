(() => {
  const norms = window.LOADING_NORMS;
  const form = document.getElementById("calc-form");
  const pipeDiameter = document.getElementById("pipe-diameter");
  const pipeLength = document.getElementById("pipe-length");
  const pipeQty = document.getElementById("pipe-qty");
  const fasSize = document.getElementById("fas-size");
  const fasBendsQty = document.getElementById("fas-bends-qty");
  const fasNopQty = document.getElementById("fas-nop-qty");
  const fasEndQty = document.getElementById("fas-end-qty");
  const pipeNormLine = document.getElementById("pipe-norm-line");
  const fasNormLine = document.getElementById("fas-norm-line");
  const result = document.getElementById("result");
  const resultTrucksCount = document.getElementById("result-trucks-count");
  const resultMeta = document.getElementById("result-meta");
  const resultBreakdown = document.getElementById("result-breakdown");
  const shareBars = document.getElementById("share-bars");
  const truckFillPipes = document.getElementById("truck-fill-pipes");
  const truckFillFas = document.getElementById("truck-fill-fas");
  const pipeRows = document.getElementById("pipe-rows");
  const vizCaption = document.getElementById("viz-caption");

  let syncingFas = false;

  function formatRange([min, max]) {
    return min === max ? String(min) : `${min}–${max}`;
  }

  function formatLength(value) {
    return String(value).replace(".", ",");
  }

  function parseQty(input) {
    const value = Number(input.value);
    return Number.isFinite(value) && value > 0 ? value : 0;
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
    syncFasToPipeShell();
  }

  function syncFasToPipeShell() {
    const shell = Number(pipeDiameter.value);
    const matchIndex = norms.fas.findIndex((row) => row.shell === shell);
    if (matchIndex >= 0) {
      syncingFas = true;
      fasSize.value = String(matchIndex);
      syncingFas = false;
    }
  }

  function getPipeCapacity() {
    const diameter = Number(pipeDiameter.value);
    const length = pipeLength.value;
    const row = norms.pipes.find((item) => item.diameter === diameter);
    return {
      diameter,
      length,
      row,
      capacity: row?.lengths[length] ?? null,
    };
  }

  function getFasCapacities() {
    const row = norms.fas[Number(fasSize.value)];
    if (!row) return null;
    return {
      row,
      bends: row.bends[0],
      nop: row.nop[0],
      end: row.end[0],
      bendsRange: row.bends,
      nopRange: row.nop,
      endRange: row.end,
    };
  }

  function renderTruckViz(pipeShare, fasShare, trucks, hasCargo) {
    const totalShare = pipeShare + fasShare;
    const lastFillRatio = hasCargo && totalShare > 0 ? totalShare % 1 || 1 : 0;
    const lastFill = Math.round(lastFillRatio * 100);

    const pipeRatio = totalShare > 0 ? pipeShare / totalShare : 0;
    const fasRatio = totalShare > 0 ? fasShare / totalShare : 0;
    const lastPipePct = lastFillRatio * pipeRatio * 100;
    const lastFasPct = lastFillRatio * fasRatio * 100;

    truckFillPipes.style.height = `${lastPipePct}%`;
    truckFillFas.style.height = `${lastFasPct}%`;
    truckFillFas.style.bottom = `${lastPipePct}%`;

    const rows = 5;
    const cols = 12;
    const totalDots = rows * cols;
    const filled = hasCargo ? Math.round(totalDots * lastFillRatio) : 0;
    const pipeDots = hasCargo ? Math.round(filled * pipeRatio) : 0;

    let html = "";
    let index = 0;
    for (let r = 0; r < rows; r += 1) {
      html += `<div class="pipe-row">`;
      for (let c = 0; c < cols; c += 1) {
        const delay = Math.min(0.35, index * 0.012);
        if (index < pipeDots) {
          html += `<span class="pipe-dot pipe-dot-pipes" style="animation-delay:${delay}s"></span>`;
        } else if (index < filled) {
          html += `<span class="pipe-dot pipe-dot-fas" style="animation-delay:${delay}s"></span>`;
        } else {
          html += `<span class="pipe-dot" style="opacity:0.12;transform:scale(1);animation:none;filter:grayscale(1)"></span>`;
        }
        index += 1;
      }
      html += `</div>`;
    }
    pipeRows.innerHTML = html;

    if (!hasCargo) {
      vizCaption.textContent = "Добавьте количество, чтобы увидеть загрузку";
    } else if (trucks <= 1) {
      vizCaption.textContent = `Фура заполнена на ${lastFill}%`;
    } else {
      vizCaption.textContent = `Последняя фура заполнена на ${lastFill}% · всего нужно ${trucks}`;
    }
  }

  function calculate() {
    const pipe = getPipeCapacity();
    const fas = getFasCapacities();
    const pQty = parseQty(pipeQty);
    const bQty = parseQty(fasBendsQty);
    const nQty = parseQty(fasNopQty);
    const eQty = parseQty(fasEndQty);

    if (pipe.capacity != null) {
      pipeNormLine.textContent = `Норма: ${pipe.capacity} концов в фуре (Ø ${pipe.diameter}, ${formatLength(pipe.length)} м)`;
    } else {
      pipeNormLine.textContent = "Норма: —";
    }

    if (fas) {
      fasNormLine.textContent = `Нормы в 1 конец фуры: отводы ${formatRange(fas.bendsRange)}, НОП ${formatRange(fas.nopRange)}, концевой ${formatRange(fas.endRange)}`;
    } else {
      fasNormLine.textContent = "Нормы: —";
    }

    const pipeShare = pipe.capacity && pQty ? pQty / pipe.capacity : 0;
    const bendsShare = fas && bQty ? bQty / fas.bends : 0;
    const nopShare = fas && nQty ? nQty / fas.nop : 0;
    const endShare = fas && eQty ? eQty / fas.end : 0;
    const fasShare = bendsShare + nopShare + endShare;
    const totalShare = pipeShare + fasShare;
    const hasCargo = totalShare > 0;
    const trucks = hasCargo ? Math.ceil(totalShare) : 0;

    resultTrucksCount.textContent = String(trucks);

    if (!hasCargo) {
      resultMeta.textContent = "Укажите количество труб и/или фасонки";
    } else if (pipeShare > 0 && fasShare > 0) {
      resultMeta.textContent = `Трубы ${(pipeShare * 100).toFixed(0)}% фуры · фасонка ${(fasShare * 100).toFixed(0)}% фуры · всего ${(totalShare * 100).toFixed(0)}%`;
    } else if (pipeShare > 0) {
      resultMeta.textContent = `Только трубы: ${(pipeShare * 100).toFixed(0)}% от ёмкости фуры`;
    } else {
      resultMeta.textContent = `Только фасонка: ${(fasShare * 100).toFixed(0)}% от ёмкости фуры`;
    }

    const bars = [];
    if (pQty > 0 && pipe.capacity) {
      bars.push({
        label: "Трубы",
        detail: `${pQty} шт / норма ${pipe.capacity}`,
        share: pipeShare,
        cls: "share-pipes",
      });
    }
    if (bQty > 0 && fas) {
      bars.push({
        label: "Отводы",
        detail: `${bQty} шт / норма ${fas.bends}`,
        share: bendsShare,
        cls: "share-fas",
      });
    }
    if (nQty > 0 && fas) {
      bars.push({
        label: "НОП",
        detail: `${nQty} шт / норма ${fas.nop}`,
        share: nopShare,
        cls: "share-fas",
      });
    }
    if (eQty > 0 && fas) {
      bars.push({
        label: "Концевой",
        detail: `${eQty} шт / норма ${fas.end}`,
        share: endShare,
        cls: "share-fas",
      });
    }

    const maxShare = Math.max(totalShare, 1);
    shareBars.innerHTML = bars
      .map((item) => {
        const width = Math.min(100, (item.share / maxShare) * 100);
        return `
          <div class="share-row">
            <div class="share-head">
              <span>${item.label}</span>
              <span>${(item.share * 100).toFixed(0)}% · ${item.detail}</span>
            </div>
            <div class="share-track">
              <div class="share-bar ${item.cls}" style="width:${width}%"></div>
            </div>
          </div>`;
      })
      .join("");

    const lines = [];
    if (pQty > 0 && pipe.capacity) {
      lines.push(
        `<div>Трубы: <strong style="font-size:1rem;color:inherit">${pQty} шт</strong> → ${(pipeShare * 100).toFixed(1)}% фуры</div>`
      );
    }
    if (bQty > 0 && fas) {
      lines.push(
        `<div>Отводы: <strong style="font-size:1rem;color:inherit">${bQty} шт</strong> → ${(bendsShare * 100).toFixed(1)}% фуры</div>`
      );
    }
    if (nQty > 0 && fas) {
      lines.push(
        `<div>НОП: <strong style="font-size:1rem;color:inherit">${nQty} шт</strong> → ${(nopShare * 100).toFixed(1)}% фуры</div>`
      );
    }
    if (eQty > 0 && fas) {
      lines.push(
        `<div>Концевой: <strong style="font-size:1rem;color:inherit">${eQty} шт</strong> → ${(endShare * 100).toFixed(1)}% фуры</div>`
      );
    }
    if (hasCargo) {
      lines.push(
        `<div>Итого доля загрузки: <strong style="font-size:1rem;color:inherit">${(totalShare * 100).toFixed(1)}%</strong></div>`
      );
      lines.push(
        `<div>Понадобится фур: <strong>${trucks}</strong></div>`
      );
      lines.push(
        `<div style="color:var(--muted);font-size:0.9rem">Формула: ceil(трубы/норма + отводы/норма + НОП/норма + концевой/норма)</div>`
      );
    }
    resultBreakdown.innerHTML = lines.join("");

    renderTruckViz(pipeShare, fasShare, trucks, hasCargo);

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

  pipeDiameter.addEventListener("change", () => {
    if (!syncingFas) syncFasToPipeShell();
  });

  form.addEventListener("input", calculate);
  form.addEventListener("change", calculate);

  fillSelects();
  renderTables();
  calculate();
})();
