(() => {
  const norms = window.LOADING_NORMS;
  const form = document.getElementById("calc-form");
  const pipeSize = document.getElementById("pipe-size");
  const pipeShellType = document.getElementById("pipe-shell-type");
  const pipeKoniki = document.getElementById("pipe-koniki");
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
  const cargoLayer = document.getElementById("cargo-layer");
  const cargoEmpty = document.getElementById("cargo-empty");
  const fillBadge = document.getElementById("fill-badge");
  const fillBadgeText = document.getElementById("fill-badge-text");
  const vizCaption = document.getElementById("viz-caption");
  const viz = document.getElementById("viz");
  const sourceNote = document.getElementById("source-note");

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

  function shellLabel(type) {
    return type === "oc" ? "ОЦ" : "ПЭ";
  }

  function fillSelects() {
    pipeSize.innerHTML = norms.pipes
      .map(
        (row, index) =>
          `<option value="${index}">Ø ${row.pipe} / ${row.shell} мм</option>`
      )
      .join("");

    fasSize.innerHTML = norms.fas
      .map(
        (row, index) =>
          `<option value="${index}">Ø ${row.pipe} / ${row.shell} мм</option>`
      )
      .join("");

    const defaultPipe = norms.pipes.findIndex(
      (row) => row.pipe === 133 && row.shell === 225
    );
    pipeSize.value = String(defaultPipe >= 0 ? defaultPipe : 0);
    syncFasToPipeShell();
  }

  function syncFasToPipeShell() {
    const pipeRow = norms.pipes[Number(pipeSize.value)];
    if (!pipeRow) return;
    const matchIndex = norms.fas.findIndex(
      (row) => row.pipe === pipeRow.pipe && row.shell === pipeRow.shell
    );
    const fallback = norms.fas.findIndex((row) => row.shell === pipeRow.shell);
    const index = matchIndex >= 0 ? matchIndex : fallback;
    if (index >= 0) {
      syncingFas = true;
      fasSize.value = String(index);
      syncingFas = false;
    }
  }

  function getPipeCapacity() {
    const row = norms.pipes[Number(pipeSize.value)];
    const koniki = pipeKoniki.value;
    const shellType = pipeShellType.value;
    const cell = row?.koniki?.[koniki];
    const capacity = cell ? cell[shellType] : null;
    return {
      row,
      pipe: row?.pipe,
      shell: row?.shell,
      koniki,
      shellType,
      capacity,
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

    const originX = 222;
    const originY = 188;
    const bayWidth = 336;
    const bayHeight = 104;
    const radius = 11;
    const gap = 3;
    const step = radius * 2 + gap;
    const cols = Math.floor(bayWidth / step);
    const rows = Math.floor(bayHeight / step);
    const totalSlots = cols * rows;
    const filledSlots = hasCargo ? Math.round(totalSlots * lastFillRatio) : 0;
    const pipeSlots = hasCargo ? Math.round(filledSlots * pipeRatio) : 0;

    let html = "";
    let index = 0;
    for (let r = 0; r < rows; r += 1) {
      for (let c = 0; c < cols; c += 1) {
        if (index >= filledSlots) {
          index += 1;
          continue;
        }
        const cx = originX + radius + c * step;
        const cy = originY - radius - r * step;
        const kind = index < pipeSlots ? "pipes" : "fas";
        const fill = kind === "pipes" ? "url(#pipeMetal)" : "url(#fasMetal)";
        const delay = Math.min(0.45, index * 0.012);
        html += `
          <g class="cargo-pipe cargo-pipe-${kind}" style="animation-delay:${delay}s">
            <circle cx="${cx}" cy="${cy}" r="${radius}" fill="${fill}" opacity="0.95" />
            <circle cx="${cx - 3}" cy="${cy - 3}" r="${radius * 0.35}" fill="#ffffff" opacity="0.35" />
            <circle cx="${cx}" cy="${cy}" r="${radius * 0.42}" fill="rgba(28,36,48,0.18)" />
            <circle cx="${cx}" cy="${cy}" r="${radius * 0.22}" fill="rgba(255,255,255,0.15)" />
          </g>`;
        index += 1;
      }
    }

    cargoLayer.innerHTML = html;
    cargoEmpty.style.display = hasCargo ? "none" : "block";
    fillBadge.setAttribute("opacity", hasCargo ? "1" : "0");
    fillBadgeText.textContent = `${lastFill}%`;
    viz.classList.toggle("is-loaded", hasCargo);
    viz.classList.toggle("is-mixed", pipeShare > 0 && fasShare > 0);

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
      pipeNormLine.textContent = `Норма: ${pipe.capacity} шт/машина · Ø ${pipe.pipe}/${pipe.shell} · ${shellLabel(pipe.shellType)} · коники ${formatLength(pipe.koniki)} м`;
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
      lines.push(`<div>Понадобится фур: <strong>${trucks}</strong></div>`);
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

  function cellText(cell) {
    if (cell.pe === cell.oc) return String(cell.pe);
    return `${cell.pe} ПЭ / ${cell.oc} ОЦ`;
  }

  function renderTables() {
    const pipeTable = document.getElementById("pipe-table");
    const fasTable = document.getElementById("fas-table");
    if (sourceNote) sourceNote.textContent = norms.source || "";

    pipeTable.innerHTML = `
      <table>
        <thead>
          <tr>
            <th>Труба / оболочка</th>
            <th>Коники 1,2 м</th>
            <th>Коники 1,5 м</th>
            <th>Коники 1,8 м</th>
          </tr>
        </thead>
        <tbody>
          ${norms.pipes
            .map(
              (row) => `
            <tr>
              <td>Ø ${row.pipe} / ${row.shell}</td>
              <td>${cellText(row.koniki["1.2"])}</td>
              <td>${cellText(row.koniki["1.5"])}</td>
              <td>${cellText(row.koniki["1.8"])}</td>
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

  pipeSize.addEventListener("change", () => {
    if (!syncingFas) syncFasToPipeShell();
  });

  form.addEventListener("input", calculate);
  form.addEventListener("change", calculate);

  fillSelects();
  renderTables();
  calculate();
})();
