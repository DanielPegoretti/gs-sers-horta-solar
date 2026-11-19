/*
 * Mesmas fórmulas de calculos/calculos_energia.py, em JavaScript, para o simulador do
 * dashboard recalcular os indicadores quando o usuário muda uma premissa.
 * E (kWh) = P (W) x t (h) / 1000
 */
(function (global) {
  function energiaKwh(potenciaW, horas) {
    return (potenciaW * horas) / 1000;
  }

  function calcular(p, meses) {
    const tarifa = p.tarifa_rs_kwh;
    const hsp = meses.map((m) => m.hsp);
    const hspMedia = hsp.reduce((a, b) => a + b, 0) / 12;
    const demanda = hsp.map(
      (h) => ((p.eto_media_anual * h) / hspMedia) * p.kc_hortalicas / p.eficiencia_gotejamento * p.area_irrigada
    );
    const pico = Math.max(...demanda);
    const out = { A1: { e: 0, agua: 0, fat: 0 }, A2: { e: 0, agua: 0, fat: 0 }, A3: { e: 0, agua: 0 } };
    let renov = 0;
    let coberturaMin = Infinity;
    meses.forEach((m, i) => {
      const irrigados = m.dias - m.dias_chuva;
      const eEsp = energiaKwh(p.esp32_sensores_potencia_media, 24 * m.dias);
      const e1 = energiaKwh(p.bomba_periferica_potencia, (pico / p.bomba_periferica_vazao_operacao) * m.dias);
      const e2 = energiaKwh(p.bomba_periferica_potencia, (demanda[i] / p.bomba_periferica_vazao_operacao) * irrigados) + eEsp;
      const e3 = energiaKwh(p.bomba_solar_potencia, (demanda[i] / p.bomba_solar_vazao) * irrigados) + eEsp;
      const pv = (p.painel_potencia / 1000) * m.hsp * p.performance_ratio * m.dias;
      out.A1.e += e1; out.A2.e += e2; out.A3.e += e3;
      out.A1.agua += pico * m.dias / 1000;
      out.A2.agua += demanda[i] * irrigados / 1000;
      out.A3.agua += demanda[i] * irrigados / 1000;
      out.A1.fat += Math.max(e1, p.custo_disponibilidade_monofasico);
      out.A2.fat += Math.max(e2, p.custo_disponibilidade_monofasico);
      renov += Math.min(pv, e3);
      coberturaMin = Math.min(coberturaMin, pv / e3);
    });
    const r = {};
    ["A1", "A2", "A3"].forEach((k) => {
      const o = out[k];
      const custo = k === "A3" ? p.bateria_preco / p.bateria_vida_util : (o.fat * tarifa) / 12;
      const invest = k === "A3"
        ? p.bomba_solar_preco + p.kit_painel_preco + p.bateria_preco + p.esp32_sensores_preco
        : p.bomba_periferica_preco + (k === "A1" ? p.timer_preco : p.esp32_sensores_preco);
      r[k] = {
        energia_kwh_mes: o.e / 12,
        energia_rede_kwh_ano: k === "A3" ? 0 : o.e,
        agua_m3_mes: o.agua / 12,
        custo_rs_mes: custo,
        investimento_sem_ligacao_rs: invest,
        investimento_com_ligacao_rs: invest + (k === "A3" ? 0 : p.custo_padrao_entrada_monofasico),
        emissoes_kgco2_ano: (k === "A3" ? 0 : o.e) * p.fator_emissao_sin,
        participacao_renovavel: k === "A3" ? renov / o.e : 0,
      };
    });
    ["A2", "A3"].forEach((k) => {
      r[k].economia_energia_pct = (1 - r[k].energia_kwh_mes / r.A1.energia_kwh_mes) * 100;
      r[k].economia_agua_m3_mes = r.A1.agua_m3_mes - r[k].agua_m3_mes;
      r[k].reducao_custo_rs_mes = r.A1.custo_rs_mes - r[k].custo_rs_mes;
      r[k].emissoes_evitadas_kgco2_ano = r.A1.emissoes_kgco2_ano - r[k].emissoes_kgco2_ano;
    });
    const extra = r.A3.investimento_sem_ligacao_rs - r.A1.investimento_sem_ligacao_rs;
    r.payback_meses = r.A3.reducao_custo_rs_mes > 0 ? extra / r.A3.reducao_custo_rs_mes : Infinity;
    r.extra_sem_energia = r.A3.investimento_com_ligacao_rs - r.A1.investimento_com_ligacao_rs;
    r.cobertura_solar_min = coberturaMin;
    r.demanda_pico = pico;
    return r;
  }

  global.CalculosHorta = { calcular, energiaKwh };
  if (typeof module !== "undefined") module.exports = { calcular, energiaKwh };
})(typeof window !== "undefined" ? window : globalThis);
