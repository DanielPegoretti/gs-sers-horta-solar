/* Neighborhood Action Dashboard — módulo SERS (horta comunitária solar) */
(function () {
  const R = window.RESULTADOS;
  const C = window.CalculosHorta;
  const cores = { A1: "#8A8A96", A2: "#9B7BC8", A3: "#E39B12", pv: "#1E7A3D", agua: "#1F6FB2" };
  const nomes = { A1: "A1 Convencional", A2: "A2 Rede + sensores", A3: "A3 Solar + sensores" };

  const fmt = (x, c = 1) =>
    Number(x).toLocaleString("pt-BR", { minimumFractionDigits: c, maximumFractionDigits: c });
  const brl = (x) => "R$ " + fmt(x, 2);
  const tip = document.getElementById("tooltip");
  function mostrarTip(ev, html) {
    tip.innerHTML = html;
    tip.style.left = ev.clientX + 12 + "px";
    tip.style.top = ev.clientY + 12 + "px";
    tip.style.opacity = 1;
  }
  const esconderTip = () => (tip.style.opacity = 0);

  // ------------------------------------------------------------------ KPIs
  function kpis(alt) {
    const a = R.alternativas[alt];
    const a1 = R.alternativas.A1;
    const itens = [
      { rot: "Consumo de energia", val: fmt(a.energia_kwh_mes, 2), un: "kWh/mês",
        det: `A1 consome ${fmt(a1.energia_kwh_mes, 2)} kWh/mês` },
      { rot: "Economia energética", val: fmt(a.economia_energia_pct, 1), un: "%",
        det: `${fmt(a1.energia_kwh_mes - a.energia_kwh_mes, 2)} kWh/mês a menos que A1` },
      { rot: "Redução de custo", val: brl(a.reducao_custo_rs_mes), un: "/mês", destaque: alt === "A3",
        det: alt === "A3" ? "sem conta de luz; só a reposição da bateria" :
          "a conta mínima de 30 kWh/mês continua" },
      { rot: "Participação renovável", val: fmt(a.participacao_renovavel * 100, 0), un: "%",
        det: alt === "A3" ? "painel cobre a demanda em todos os meses" : "energia 100% da rede" },
      { rot: "Emissões evitadas", val: fmt(a.emissoes_evitadas_kgco2_ano, 2), un: "kg CO₂e/ano",
        det: `fator do SIN: ${fmt(R.premissas.fator_emissao_sin * 1000, 1)} kg CO₂/MWh` },
      { rot: "Água economizada", val: fmt(a.economia_agua_m3_mes, 1), un: "m³/mês",
        det: `${fmt(a.economia_agua_pct, 1)}% menos água que o timer fixo` },
      { rot: "Bomba ligada (média)", val: fmt(a.horas_bomba_dia_media, 2), un: "h/dia",
        det: alt === "A3" ? "bomba menor (100 W), ligada mais tempo, durante o sol" : "mesma bomba de 370 W, só quando precisa" },
    ];
    document.getElementById("kpis").innerHTML = itens.map((k) => `
      <div class="card kpi${k.destaque ? " destaque" : ""}">
        <div class="rot">${k.rot}</div>
        <div class="val">${k.val} <small>${k.un}</small></div>
        <div class="det">${k.det}</div>
      </div>`).join("");
  }
  document.querySelectorAll("#seletorAlt button").forEach((b) =>
    b.addEventListener("click", () => {
      document.querySelectorAll("#seletorAlt button").forEach((x) => x.classList.remove("ativo"));
      b.classList.add("ativo");
      kpis(b.dataset.alt);
    }));

  // ------------------------------------------------------------------ gráfico de barras (SVG)
  function grafico(el, { categorias, series, linha, linha2, unidade, unidade2 }) {
    const W = 560, H = 290, m = { t: 14, r: linha2 ? 40 : 14, b: 30, l: 44 };
    const iw = W - m.l - m.r, ih = H - m.t - m.b;
    const maxY = Math.max(...series.flatMap((s) => s.valores), ...(linha ? linha.valores : [0])) * 1.12;
    const passo = maxY > 20 ? 5 : maxY > 8 ? 2 : 1;
    const y = (v) => m.t + ih - (v / maxY) * ih;
    const bw = iw / categorias.length;
    const gw = (bw * 0.78) / series.length;
    let svg = `<svg viewBox="0 0 ${W} ${H}" role="img">`;
    for (let v = 0; v <= maxY; v += passo) {
      svg += `<line x1="${m.l}" x2="${W - m.r}" y1="${y(v)}" y2="${y(v)}" stroke="#eee"/>`;
      svg += `<text x="${m.l - 6}" y="${y(v) + 4}" font-size="11" text-anchor="end" fill="#666">${v}</text>`;
    }
    svg += `<text x="12" y="${m.t + ih / 2}" font-size="11" fill="#666" transform="rotate(-90 12 ${m.t + ih / 2})" text-anchor="middle">${unidade}</text>`;
    categorias.forEach((c, i) => {
      const x0 = m.l + i * bw + bw * 0.11;
      series.forEach((s, j) => {
        const v = s.valores[i];
        svg += `<rect x="${x0 + j * gw}" y="${y(v)}" width="${gw - 1}" height="${m.t + ih - y(v)}" fill="${s.cor}"
          data-tip="${c} • ${s.nome}: ${fmt(v, 2)} ${unidade}"/>`;
      });
      svg += `<text x="${m.l + i * bw + bw / 2}" y="${H - 10}" font-size="11" text-anchor="middle" fill="#555">${c}</text>`;
    });
    if (linha) {
      const pts = linha.valores.map((v, i) => `${m.l + i * bw + bw / 2},${y(v)}`).join(" ");
      svg += `<polyline points="${pts}" fill="none" stroke="${linha.cor}" stroke-width="2.5"/>`;
      linha.valores.forEach((v, i) => {
        svg += `<circle cx="${m.l + i * bw + bw / 2}" cy="${y(v)}" r="3.5" fill="${linha.cor}" data-tip="${categorias[i]} • ${linha.nome}: ${fmt(v, 2)} ${unidade}"/>`;
      });
    }
    if (linha2) {
      const max2 = Math.max(...linha2.valores) * 1.25;
      const y2 = (v) => m.t + ih - (v / max2) * ih;
      const pts = linha2.valores.map((v, i) => `${m.l + i * bw + bw / 2},${y2(v)}`).join(" ");
      svg += `<polyline points="${pts}" fill="none" stroke="${linha2.cor}" stroke-width="2" stroke-dasharray="5 3"/>`;
      for (let v = 0; v <= max2; v += 5) {
        svg += `<text x="${W - m.r + 6}" y="${y2(v) + 4}" font-size="11" fill="#5a8fc0">${v}</text>`;
      }
      linha2.valores.forEach((v, i) => {
        svg += `<circle cx="${m.l + i * bw + bw / 2}" cy="${y2(v)}" r="3" fill="${linha2.cor}" data-tip="${categorias[i]} • ${linha2.nome}: ${v} ${unidade2}"/>`;
      });
    }
    svg += `<line x1="${m.l}" x2="${W - m.r}" y1="${m.t + ih}" y2="${m.t + ih}" stroke="#999"/></svg>`;
    el.innerHTML = svg;
    el.querySelectorAll("[data-tip]").forEach((n) => {
      n.addEventListener("mousemove", (ev) => mostrarTip(ev, n.dataset.tip));
      n.addEventListener("mouseleave", esconderTip);
    });
  }

  const meses = R.meses.map((m) => m.mes);
  grafico(document.getElementById("gEnergia"), {
    categorias: meses, unidade: "kWh/mês",
    series: ["A1", "A2", "A3"].map((k) => ({ nome: nomes[k], cor: cores[k], valores: R.meses.map((m) => m.energia_kwh[k]) })),
    linha: { nome: "Geração solar (100 Wp)", cor: cores.pv, valores: R.meses.map((m) => m.geracao_pv_kwh) },
  });
  grafico(document.getElementById("gAgua"), {
    categorias: meses, unidade: "m³/mês", unidade2: "dias",
    series: [
      { nome: "A1 Timer fixo", cor: cores.A1, valores: R.meses.map((m) => m.agua_m3.A1) },
      { nome: "A2/A3 Sensores", cor: cores.agua, valores: R.meses.map((m) => m.agua_m3.A3) },
    ],
    linha2: { nome: "Dias de chuva", cor: "#9cc3e6", valores: R.meses.map((m) => m.dias_chuva) },
  });

  // ------------------------------------------------------------------ tabela de comparação
  function tabelaComparacao() {
    const a = R.alternativas;
    const linhas = [
      ["Consumo de energia (kWh/mês)", (k) => fmt(a[k].energia_kwh_mes, 2), "min", (k) => a[k].energia_kwh_mes],
      ["Economia de energia vs. A1", (k) => (k === "A1" ? "—" : fmt(a[k].economia_energia_pct, 1) + "%"), null],
      ["Energia comprada da rede (kWh/ano)", (k) => fmt(a[k].energia_rede_kwh_ano, 1), "min", (k) => a[k].energia_rede_kwh_ano],
      ["Custo de operação (R$/mês)", (k) => brl(a[k].custo_rs_mes), "min", (k) => a[k].custo_rs_mes],
      ["Investimento — horta já tem energia", (k) => brl(a[k].investimento_sem_ligacao_rs), "min", (k) => a[k].investimento_sem_ligacao_rs],
      ["Investimento — horta sem energia (inclui padrão de entrada)", (k) => brl(a[k].investimento_com_ligacao_rs), "min", (k) => a[k].investimento_com_ligacao_rs],
      ["Água aplicada (m³/mês)", (k) => fmt(a[k].agua_m3_mes, 2), "min", (k) => a[k].agua_m3_mes],
      ["Participação renovável", (k) => fmt(a[k].participacao_renovavel * 100, 0) + "%", "max", (k) => a[k].participacao_renovavel],
      ["Emissões (kg CO₂e/ano)", (k) => fmt(a[k].emissoes_kgco2_ano, 2), "min", (k) => a[k].emissoes_kgco2_ano],
      ["Bomba ligada (h/dia, média)", (k) => fmt(a[k].horas_bomba_dia_media, 2), null],
    ];
    let h = `<thead><tr><th>Indicador</th>${["A1", "A2", "A3"].map((k) => `<th>${nomes[k]}</th>`).join("")}</tr></thead><tbody>`;
    linhas.forEach(([rot, f, criterio, valor]) => {
      let melhor = null;
      if (criterio) {
        const vals = ["A1", "A2", "A3"].map(valor);
        const alvo = criterio === "min" ? Math.min(...vals) : Math.max(...vals);
        melhor = ["A1", "A2", "A3"].filter((k, i) => vals[i] === alvo);
      }
      h += `<tr><td>${rot}</td>${["A1", "A2", "A3"].map((k) =>
        `<td class="num${melhor && melhor.includes(k) ? " melhor" : ""}">${f(k)}</td>`).join("")}</tr>`;
    });
    const pb = R.payback;
    h += `</tbody>`;
    document.getElementById("tabComparacao").innerHTML = h +
      `<caption style="caption-side:bottom;text-align:left;font-size:12.5px;color:#555;padding-top:8px">
       Em verde, o melhor valor de cada linha. Retorno do investimento extra da A3 sobre a A1:
       <b>${fmt(pb.horta_ja_tem_energia.payback_meses, 0)} meses</b> se a horta já tem energia; se não tem,
       a A3 custa <b>${brl(-pb.horta_sem_energia.investimento_extra_rs)} a menos</b> já na implantação.
       Tarifa usada: ${brl(R.tarifa_rs_kwh)}/kWh.</caption>`;
  }

  // ------------------------------------------------------------------ simulador
  const base = Object.assign({}, R.premissas, { tarifa_rs_kwh: R.tarifa_rs_kwh });
  const campos = [
    ["sArea", "oArea", "area_irrigada", (v) => fmt(v, 0)],
    ["sTarifa", "oTarifa", "tarifa_rs_kwh", (v) => fmt(v, 2)],
    ["sPainel", "oPainel", "painel_potencia", (v) => fmt(v, 0)],
    ["sPR", "oPR", "performance_ratio", (v) => fmt(v, 2)],
  ];
  function simular() {
    const p = Object.assign({}, base);
    campos.forEach(([s, o, chave, f]) => {
      const v = parseFloat(document.getElementById(s).value);
      p[chave] = v;
      document.getElementById(o).textContent = f(v);
    });
    const r = C.calcular(p, R.meses);
    const cob = r.cobertura_solar_min;
    const res = [
      ["Consumo A1 / A3", `${fmt(r.A1.energia_kwh_mes, 2)} / ${fmt(r.A3.energia_kwh_mes, 2)} kWh/mês`],
      ["Custo A1 / A3", `${brl(r.A1.custo_rs_mes)} / ${brl(r.A3.custo_rs_mes)} por mês`],
      ["Economia de energia A3", `${fmt(r.A3.economia_energia_pct, 1)}%`],
      ["Água economizada", `${fmt(r.A3.economia_agua_m3_mes, 1)} m³/mês`],
      ["Payback A3 (horta com energia)", isFinite(r.payback_meses) ? `${fmt(r.payback_meses, 0)} meses` : "não se paga"],
      ["Pior mês: painel cobre", `${fmt(Math.min(cob, 9.99) * 100, 0)}% da demanda` + (cob < 1 ? " ⚠ aumentar painel" : "")],
    ];
    document.getElementById("simRes").innerHTML = res.map(([a, b]) =>
      `<div class="card"><div class="rot" style="font-size:12px;color:#5b5b66">${a}</div><div style="font-weight:700;color:#4B1F7E;margin-top:3px">${b}</div></div>`).join("");
  }
  function resetar() {
    campos.forEach(([s, , chave]) => (document.getElementById(s).value = base[chave]));
    simular();
  }
  campos.forEach(([s]) => document.getElementById(s).addEventListener("input", simular));
  document.getElementById("btnReset").addEventListener("click", resetar);

  // ------------------------------------------------------------------ monitoramento (simulado)
  function diaSimulado() {
    const fev = R.meses[1];
    const hBomba = fev.horas_bomba_dia.A3;
    const pontos = [];
    let u = 43;
    for (let min = 0; min <= 1440; min += 5) {
      const h = min / 60;
      const sol = Math.max(0, Math.sin(((h - 6) / 12) * Math.PI));
      const bomba = h >= 9 && h < 9 + hBomba;
      const gotejando = h >= 9.2 && h < 11.2;
      u += -0.05 - 0.22 * sol + (gotejando ? 1.2 : 0);
      pontos.push({ h, u: Math.max(20, Math.min(70, u)), bomba });
    }
    return { pontos, hBomba, fev };
  }
  function monitoramento() {
    const { pontos, hBomba, fev } = diaSimulado();
    const W = 560, H = 250, m = { t: 12, r: 12, b: 28, l: 40 }, iw = W - m.l - m.r, ih = H - m.t - m.b;
    const x = (h) => m.l + (h / 24) * iw, y = (v) => m.t + ih - ((v - 20) / 50) * ih;
    let svg = `<svg viewBox="0 0 ${W} ${H}">`;
    for (let v = 20; v <= 70; v += 10) {
      svg += `<line x1="${m.l}" x2="${W - m.r}" y1="${y(v)}" y2="${y(v)}" stroke="#eee"/><text x="${m.l - 6}" y="${y(v) + 4}" font-size="11" text-anchor="end" fill="#666">${v}</text>`;
    }
    svg += `<rect x="${x(9)}" y="${m.t}" width="${x(9 + hBomba) - x(9)}" height="${ih}" fill="#E39B12" opacity=".25"/>`;
    svg += `<line x1="${m.l}" x2="${W - m.r}" y1="${y(35)}" y2="${y(35)}" stroke="#c33" stroke-dasharray="5 3"/>`;
    svg += `<polyline fill="none" stroke="#1F6FB2" stroke-width="2.4" points="${pontos.map((p) => `${x(p.h)},${y(p.u)}`).join(" ")}"/>`;
    for (let h = 0; h <= 24; h += 3) svg += `<text x="${x(h)}" y="${H - 8}" font-size="11" text-anchor="middle" fill="#555">${h}h</text>`;
    svg += `</svg>`;
    document.getElementById("gDia").innerHTML = svg;

    const agora = pontos.find((p) => Math.abs(p.h - 15) < 0.01);
    const antes = pontos.find((p) => Math.abs(p.h - 14) < 0.01);
    const energiaBomba = C.energiaKwh(R.premissas.bomba_solar_potencia, hBomba);
    const energiaEsp = C.energiaKwh(R.premissas.esp32_sensores_potencia_media, 24);
    const pvDia = fev.geracao_pv_kwh / fev.dias;
    const status = agora.u < 35 ? "seco" : agora.u < 42 ? "atencao" : "ok";
    const msg = {
      umidade: Math.round(agora.u), tendencia: agora.u < antes.u ? "queda" : "subida",
      status: { ok: "adequado", atencao: "atenção", seco: "seco" }[status],
      temp_ar: 27.4, umid_ar: 61, luz: 18500, bomba: false,
      energia_bomba_kwh_dia: +energiaBomba.toFixed(3), energia_total_kwh_dia: +(energiaBomba + energiaEsp).toFixed(3),
      geracao_pv_kwh_dia: +pvDia.toFixed(3), bateria_v: 12.9, agua_l_dia: Math.round(fev.demanda_L_dia),
    };
    document.getElementById("jsonMsg").textContent =
      "tópico: horta/canteiro01/energia  (15:00)\n" + JSON.stringify(msg, null, 2);
    const cards = [
      ["Umidade do solo", `${msg.umidade}% <span class="pill ${status}">${msg.status}</span>`],
      ["Energia usada hoje", `${fmt(msg.energia_total_kwh_dia, 3)} kWh`],
      ["Geração solar hoje", `${fmt(msg.geracao_pv_kwh_dia, 3)} kWh`],
      ["Água aplicada hoje", `${fmt(msg.agua_l_dia, 0)} L`],
      ["Bateria", `${fmt(msg.bateria_v, 1)} V`],
    ];
    document.getElementById("status").innerHTML = cards.map(([a, b]) =>
      `<div class="card"><div style="font-size:12px;color:#5b5b66;text-transform:uppercase">${a}</div><div style="font-size:20px;font-weight:700;color:#4B1F7E;margin-top:4px">${b}</div></div>`).join("");
  }

  // ------------------------------------------------------------------ premissas
  function premissas() {
    const rot = {
      area_irrigada: ["Área irrigada", "m²"], eto_media_anual: ["ETo média anual", "mm/dia"],
      kc_hortalicas: ["Kc das hortaliças", ""], eficiencia_gotejamento: ["Eficiência do gotejamento", ""],
      tarifa_b1_2025_sem_tributos: ["Tarifa B1 2025 sem tributos", "R$/kWh"],
      reajuste_2026_baixa_tensao: ["Reajuste 2026 (baixa tensão)", "fração"], fator_tributos: ["Fator de tributos", "×"],
      custo_disponibilidade_monofasico: ["Custo de disponibilidade", "kWh/mês"],
      custo_padrao_entrada_monofasico: ["Padrão de entrada monofásico", "R$"],
      fator_emissao_sin: ["Fator de emissão do SIN", "kg CO₂/kWh"],
      bomba_periferica_potencia: ["Bomba periférica (A1/A2)", "W"], bomba_periferica_vazao_operacao: ["Vazão da bomba periférica", "L/h"],
      bomba_periferica_preco: ["Preço da bomba periférica", "R$"], timer_preco: ["Preço do timer", "R$"],
      esp32_sensores_potencia_media: ["Consumo médio ESP32 + sensores", "W"], esp32_sensores_preco: ["Preço ESP32 + sensores", "R$"],
      bomba_solar_potencia: ["Bomba solar 12 V (A3)", "W"], bomba_solar_vazao: ["Vazão da bomba solar", "L/h"],
      bomba_solar_preco: ["Preço da bomba solar", "R$"], painel_potencia: ["Painel fotovoltaico", "Wp"],
      kit_painel_preco: ["Kit painel + controlador", "R$"], performance_ratio: ["Performance ratio", ""],
      bateria_preco: ["Preço da bateria 12 V 7 Ah", "R$"], bateria_vida_util: ["Vida útil da bateria", "meses"],
    };
    let h = "<thead><tr><th>Premissa</th><th>Valor</th><th>Unidade</th></tr></thead><tbody>";
    Object.entries(R.premissas).forEach(([k, v]) => {
      const [n, u] = rot[k] || [k, ""];
      h += `<tr><td>${n}</td><td class="num">${fmt(v, Number.isInteger(v) ? 0 : (v < 0.1 ? 4 : 2))}</td><td>${u}</td></tr>`;
    });
    h += `<tr><td><b>Tarifa final usada</b></td><td class="num"><b>${fmt(R.tarifa_rs_kwh, 4)}</b></td><td>R$/kWh</td></tr></tbody>`;
    document.getElementById("tabPremissas").innerHTML = h;
  }

  kpis("A3");
  tabelaComparacao();
  resetar();
  monitoramento();
  premissas();
})();
