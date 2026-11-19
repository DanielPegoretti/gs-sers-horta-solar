"""
Global Solution 2026.2 - Soluções em Energias Renováveis e Sustentáveis (SERS)
Neighborhood Action Dashboard - CitizenTech
Horta comunitária com irrigação automatizada e bombeamento solar (São Paulo - SP)

Integrantes:
    Daniel Rodrigues Pegoretti de Almeida - RM 574898
    Gabriel Oliveira Fernandes da Costa   - RM 574826

O que este script faz
    1. Lê as premissas e os dados públicos da pasta dados/.
    2. Calcula, mês a mês, a necessidade de água da horta.
    3. Calcula consumo de energia, custo, emissões e água para 3 alternativas:
         A1 - Convencional: bomba de 370 W na rede elétrica com timer fixo
         A2 - Eficiência: mesma bomba na rede, acionada pelo ESP32 com sensores
         A3 - Renovável: bomba solar 12 V de 100 W + painel de 100 Wp + ESP32 com sensores
    4. Gera os indicadores do dashboard em dados/resultados.json e dados/resultados.js
       e as tabelas em docs/tabelas_resultados.md.

Fórmula de energia usada (enunciado, item 4.2):  E (kWh) = P (W) x t (h) / 1000

Como executar (Python 3, sem bibliotecas externas):
    python calculos/calculos_energia.py
"""

import csv
import json
import math
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
DADOS = RAIZ / "dados"
DOCS = RAIZ / "docs"
MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"]


# ---------------------------------------------------------------- leitura dos dados
def ler_premissas():
    with open(DADOS / "premissas.csv", encoding="utf-8") as f:
        return {linha["parametro"]: float(linha["valor"]) for linha in csv.DictReader(f)}


def ler_irradiacao():
    with open(DADOS / "irradiacao_labren_sp.csv", encoding="utf-8") as f:
        return [float(l["irradiacao_inclinada_Wh_m2_dia"]) / 1000 for l in csv.DictReader(f)]


def ler_clima():
    with open(DADOS / "clima_inmet_sp.csv", encoding="utf-8") as f:
        return list(csv.DictReader(f))


def energia_kwh(potencia_w, horas):
    """E = P x t / 1000 (enunciado, item 4.2)."""
    return potencia_w * horas / 1000


# ---------------------------------------------------------------- cálculo principal
def calcular(p, hsp, clima):
    tarifa = p["tarifa_b1_2025_sem_tributos"] * (1 + p["reajuste_2026_baixa_tensao"]) * p["fator_tributos"]
    hsp_media = sum(hsp) / 12

    # Necessidade de água: ETo do mês proporcional à irradiação (a radiação solar é o
    # principal motor da evapotranspiração), ETc = ETo x Kc, e lâmina bruta = ETc / eficiência.
    # 1 mm de lâmina sobre 1 m² = 1 litro.
    def litros_dia(i):
        eto = p["eto_media_anual"] * hsp[i] / hsp_media
        return eto * p["kc_hortalicas"] / p["eficiencia_gotejamento"] * p["area_irrigada"]

    demanda_dia = [litros_dia(i) for i in range(12)]
    pico = max(demanda_dia)                  # o timer fixo (A1) é regulado para o pior mês

    meses = []
    for i, nome in enumerate(MESES):
        dias = int(clima[i]["dias_no_mes"])
        chuva = int(clima[i]["dias_com_chuva_1mm"])
        dias_irrigados = dias - chuva        # com sensor, dias de chuva não são irrigados

        # A1: timer fixo, todo dia, volume do mês de pico
        agua_a1 = pico * dias
        h_a1_dia = pico / p["bomba_periferica_vazao_operacao"]
        e_a1 = energia_kwh(p["bomba_periferica_potencia"], h_a1_dia * dias)

        # A2 e A3: volume do próprio mês, só nos dias sem chuva
        agua_auto = demanda_dia[i] * dias_irrigados
        h_a2_dia = demanda_dia[i] / p["bomba_periferica_vazao_operacao"]
        e_esp32 = energia_kwh(p["esp32_sensores_potencia_media"], 24 * dias)
        e_a2 = energia_kwh(p["bomba_periferica_potencia"], h_a2_dia * dias_irrigados) + e_esp32

        h_a3_dia = demanda_dia[i] / p["bomba_solar_vazao"]
        e_a3 = energia_kwh(p["bomba_solar_potencia"], h_a3_dia * dias_irrigados) + e_esp32
        geracao_pv = p["painel_potencia"] / 1000 * hsp[i] * p["performance_ratio"] * dias

        meses.append({
            "mes": nome, "dias": dias, "dias_chuva": chuva, "hsp": round(hsp[i], 3),
            "demanda_L_dia": round(demanda_dia[i], 1),
            "agua_m3": {"A1": round(agua_a1 / 1000, 3), "A2": round(agua_auto / 1000, 3),
                        "A3": round(agua_auto / 1000, 3)},
            "energia_kwh": {"A1": round(e_a1, 3), "A2": round(e_a2, 3), "A3": round(e_a3, 3)},
            "horas_bomba_dia": {"A1": round(h_a1_dia, 3), "A2": round(h_a2_dia, 3),
                                "A3": round(h_a3_dia, 3)},
            "geracao_pv_kwh": round(geracao_pv, 3),
            "cobertura_solar": round(min(geracao_pv / e_a3, 1.0), 4),
        })

    def soma(campo, alt):
        return sum(m[campo][alt] for m in meses)

    custo_disp = p["custo_disponibilidade_monofasico"]
    alternativas = {}
    for alt in ["A1", "A2", "A3"]:
        energia_ano = soma("energia_kwh", alt)
        agua_ano = soma("agua_m3", alt)
        if alt == "A3":
            # off-grid: não paga energia; custo de operação = reposição da bateria
            custo_mes = p["bateria_preco"] / p["bateria_vida_util"]
            energia_rede_ano = 0.0
            investimento = (p["bomba_solar_preco"] + p["kit_painel_preco"] + p["bateria_preco"]
                            + p["esp32_sensores_preco"])
            renovavel = sum(min(m["geracao_pv_kwh"], m["energia_kwh"]["A3"]) for m in meses) / energia_ano
        else:
            # rede: a fatura cobra o maior valor entre o consumo e o custo de disponibilidade
            faturado = sum(max(m["energia_kwh"][alt], custo_disp) for m in meses)
            custo_mes = faturado * tarifa / 12
            energia_rede_ano = energia_ano
            investimento = p["bomba_periferica_preco"] + (
                p["timer_preco"] if alt == "A1" else p["esp32_sensores_preco"])
            renovavel = 0.0
        alternativas[alt] = {
            "energia_kwh_mes": round(energia_ano / 12, 3),
            "energia_kwh_ano": round(energia_ano, 2),
            "energia_rede_kwh_ano": round(energia_rede_ano, 2),
            "agua_m3_mes": round(agua_ano / 12, 3),
            "agua_m3_ano": round(agua_ano, 2),
            "custo_rs_mes": round(custo_mes, 2),
            "investimento_sem_ligacao_rs": round(investimento, 2),
            "investimento_com_ligacao_rs": round(
                investimento + (0 if alt == "A3" else p["custo_padrao_entrada_monofasico"]), 2),
            "emissoes_kgco2_ano": round(energia_rede_ano * p["fator_emissao_sin"], 3),
            "participacao_renovavel": round(renovavel, 4),
            "horas_bomba_dia_media": round(
                sum(m["horas_bomba_dia"][alt] * (m["dias"] if alt == "A1" else m["dias"] - m["dias_chuva"])
                    for m in meses) / 365, 3),
        }

    a1 = alternativas["A1"]
    for alt in ["A2", "A3"]:
        a = alternativas[alt]
        a["economia_energia_pct"] = round((1 - a["energia_kwh_ano"] / a1["energia_kwh_ano"]) * 100, 1)
        a["economia_rede_kwh_mes"] = round((a1["energia_rede_kwh_ano"] - a["energia_rede_kwh_ano"]) / 12, 3)
        a["economia_agua_m3_mes"] = round(a1["agua_m3_mes"] - a["agua_m3_mes"], 3)
        a["economia_agua_pct"] = round((1 - a["agua_m3_ano"] / a1["agua_m3_ano"]) * 100, 1)
        a["reducao_custo_rs_mes"] = round(a1["custo_rs_mes"] - a["custo_rs_mes"], 2)
        a["emissoes_evitadas_kgco2_ano"] = round(a1["emissoes_kgco2_ano"] - a["emissoes_kgco2_ano"], 3)

    # Retorno do investimento extra da A3 em relação à A1 (dois cenários de ligação)
    a3 = alternativas["A3"]
    extra_sem = a3["investimento_sem_ligacao_rs"] - a1["investimento_sem_ligacao_rs"]
    extra_com = a3["investimento_com_ligacao_rs"] - a1["investimento_com_ligacao_rs"]
    economia = a3["reducao_custo_rs_mes"]
    payback = {
        "horta_ja_tem_energia": {"investimento_extra_rs": round(extra_sem, 2),
                                 "payback_meses": round(extra_sem / economia, 1)},
        "horta_sem_energia": {"investimento_extra_rs": round(extra_com, 2),
                              "payback_meses": 0.0 if extra_com <= 0 else round(extra_com / economia, 1)},
    }

    sobra_pv = sum(max(m["geracao_pv_kwh"] - m["energia_kwh"]["A3"], 0) for m in meses)
    return {
        "local": "São Paulo - SP (LABREN/INPE ponto 5728: -23,50; -46,65)",
        "tarifa_rs_kwh": round(tarifa, 4),
        "demanda_pico_L_dia": round(pico, 1),
        "demanda_media_L_dia": round(sum(demanda_dia) / 12, 1),
        "meses": meses,
        "alternativas": alternativas,
        "payback": payback,
        "sobra_solar_kwh_ano": round(sobra_pv, 1),
        "premissas": p,
    }


# ---------------------------------------------------------------- saídas
def br(x, casas=2):
    return f"{x:,.{casas}f}".replace(",", "X").replace(".", ",").replace("X", ".")


def gerar_tabelas_md(r):
    a = r["alternativas"]
    linhas = [
        "# Tabelas de resultados (geradas por `calculos/calculos_energia.py`)",
        "",
        f"Tarifa de energia usada: **R$ {br(r['tarifa_rs_kwh'], 2)}/kWh**. "
        f"Necessidade de água: média de **{br(r['demanda_media_L_dia'], 0)} L/dia** e pico de "
        f"**{br(r['demanda_pico_L_dia'], 0)} L/dia** (fevereiro).",
        "",
        "## Necessidade de água e energia mês a mês",
        "",
        "| Mês | Irradiação (kWh/m²·dia) | Dias de chuva | Demanda (L/dia) | Energia A1 (kWh) "
        "| Energia A2 (kWh) | Energia A3 (kWh) | Geração solar (kWh) |",
        "|---|---|---|---|---|---|---|---|",
    ]
    for m in r["meses"]:
        e = m["energia_kwh"]
        linhas.append(f"| {m['mes']} | {br(m['hsp'])} | {m['dias_chuva']} | {br(m['demanda_L_dia'], 0)} | "
                      f"{br(e['A1'])} | {br(e['A2'])} | {br(e['A3'])} | {br(m['geracao_pv_kwh'])} |")
    linhas += [
        "",
        "## Comparação anual das alternativas",
        "",
        "| Indicador | A1 Convencional | A2 Eficiência | A3 Solar |",
        "|---|---|---|---|",
        f"| Consumo de energia (kWh/mês) | {br(a['A1']['energia_kwh_mes'])} | {br(a['A2']['energia_kwh_mes'])} "
        f"| {br(a['A3']['energia_kwh_mes'])} |",
        f"| Energia da rede (kWh/ano) | {br(a['A1']['energia_rede_kwh_ano'])} | "
        f"{br(a['A2']['energia_rede_kwh_ano'])} | {br(a['A3']['energia_rede_kwh_ano'])} |",
        f"| Economia de energia vs. A1 | — | {br(a['A2']['economia_energia_pct'], 1)}% | "
        f"{br(a['A3']['economia_energia_pct'], 1)}% |",
        f"| Água usada (m³/mês) | {br(a['A1']['agua_m3_mes'])} | {br(a['A2']['agua_m3_mes'])} | "
        f"{br(a['A3']['agua_m3_mes'])} |",
        f"| Custo de operação (R$/mês) | {br(a['A1']['custo_rs_mes'])} | {br(a['A2']['custo_rs_mes'])} | "
        f"{br(a['A3']['custo_rs_mes'])} |",
        f"| Investimento, horta já com energia (R$) | {br(a['A1']['investimento_sem_ligacao_rs'])} | "
        f"{br(a['A2']['investimento_sem_ligacao_rs'])} | {br(a['A3']['investimento_sem_ligacao_rs'])} |",
        f"| Investimento, horta sem energia (R$) | {br(a['A1']['investimento_com_ligacao_rs'])} | "
        f"{br(a['A2']['investimento_com_ligacao_rs'])} | {br(a['A3']['investimento_com_ligacao_rs'])} |",
        f"| Participação renovável | 0% | 0% | {br(a['A3']['participacao_renovavel'] * 100, 0)}% |",
        f"| Emissões (kg CO₂/ano) | {br(a['A1']['emissoes_kgco2_ano'])} | {br(a['A2']['emissoes_kgco2_ano'])} "
        f"| {br(a['A3']['emissoes_kgco2_ano'])} |",
        f"| Bomba ligada (h/dia, média) | {br(a['A1']['horas_bomba_dia_media'])} | "
        f"{br(a['A2']['horas_bomba_dia_media'])} | {br(a['A3']['horas_bomba_dia_media'])} |",
        "",
        f"Payback da A3 em relação à A1: **{br(r['payback']['horta_ja_tem_energia']['payback_meses'], 1)} meses** "
        f"se a horta já tem energia; se a horta não tem energia, a A3 custa "
        f"R$ {br(-r['payback']['horta_sem_energia']['investimento_extra_rs'])} a menos já na implantação.",
        "",
        "> Projeções condicionadas às premissas de `dados/premissas.csv`; não são resultados garantidos.",
    ]
    (DOCS / "tabelas_resultados.md").write_text("\n".join(linhas) + "\n", encoding="utf-8")


def main():
    r = calcular(ler_premissas(), ler_irradiacao(), ler_clima())
    texto = json.dumps(r, ensure_ascii=False, indent=2)
    (DADOS / "resultados.json").write_text(texto, encoding="utf-8")
    # cópia em JavaScript para o dashboard abrir direto do disco (sem servidor)
    (DADOS / "resultados.js").write_text("window.RESULTADOS = " + texto + ";\n", encoding="utf-8")
    gerar_tabelas_md(r)

    a = r["alternativas"]
    print(f"Tarifa: R$ {r['tarifa_rs_kwh']:.4f}/kWh | demanda média {r['demanda_media_L_dia']} L/dia, "
          f"pico {r['demanda_pico_L_dia']} L/dia")
    for alt, nome in [("A1", "Convencional"), ("A2", "Eficiência"), ("A3", "Solar")]:
        x = a[alt]
        print(f"{alt} {nome:12s} {x['energia_kwh_mes']:6.2f} kWh/mês | R$ {x['custo_rs_mes']:6.2f}/mês | "
              f"água {x['agua_m3_mes']:5.2f} m³/mês | CO2 {x['emissoes_kgco2_ano']:5.2f} kg/ano | "
              f"renov. {x['participacao_renovavel']*100:5.1f}% | inv. R$ {x['investimento_sem_ligacao_rs']:7.2f}"
              f" / {x['investimento_com_ligacao_rs']:7.2f} | {x['horas_bomba_dia_media']:.2f} h/dia")
    for alt in ["A2", "A3"]:
        x = a[alt]
        print(f"{alt} vs A1: energia -{x['economia_energia_pct']}% | água -{x['economia_agua_pct']}% | "
              f"R$ -{x['reducao_custo_rs_mes']}/mês | CO2 evitado {x['emissoes_evitadas_kgco2_ano']} kg/ano")
    print("Payback:", r["payback"], "| sobra solar", r["sobra_solar_kwh_ano"], "kWh/ano")
    print("Cobertura solar mínima:", min(m["cobertura_solar"] for m in r["meses"]))


if __name__ == "__main__":
    main()
