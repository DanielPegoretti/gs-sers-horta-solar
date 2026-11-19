# Indicadores de eficiência e sustentabilidade

Todos os indicadores são calculados por `calculos/calculos_energia.py`, gravados em `dados/resultados.json` e exibidos no
dashboard (`index.html`). Valores = projeção para um ano típico em São Paulo, comparando a proposta (A3) com a alternativa
convencional (A1).

| # | Indicador | Unidade | A1 | A2 | A3 | Fórmula | Fonte do dado em operação |
|---|---|---|---|---|---|---|---|
| 1 | Consumo de energia | kWh/mês | 6,17 | 4,17 | 3,58 | Σ P × t / 1000 (bomba + ESP32) ÷ 12 | INA219 (tensão × corrente × tempo) |
| 2 | Economia energética estimada | % | — | 32,4 | 42,0 | 1 − consumo da alternativa ÷ consumo A1 | indicador 1 |
| 3 | Redução estimada de custos | R$/mês | — | 0,00 | 27,99 | custo A1 − custo da alternativa | indicador 1 + tarifa |
| 4 | Participação de energia renovável | % | 0 | 0 | 100 | Σ min(geração solar, consumo) ÷ consumo | INA219 no painel e na carga |
| 5 | Emissões evitadas estimadas | kg CO₂e/ano | — | 0,59 | 1,83 | (energia da rede A1 − energia da rede da alternativa) × 0,0247 | indicador 1 |
| 6 | Água economizada | m³/mês | — | 9,6 | 9,6 | água A1 − água da alternativa | tempo de bomba × vazão (ou hidrômetro) |
| 7 | Tempo de funcionamento da bomba | h/dia | 0,55 | 0,34 | 1,06 | litros do dia ÷ vazão da bomba (média anual) | tempo com a saída da bomba ligada |

## Como ler os indicadores

- **A2 economiza energia, mas não dinheiro.** O consumo (4,17 kWh/mês) fica abaixo do custo de disponibilidade da
  ligação monofásica (30 kWh/mês), então a conta continua igual.
- **A3 consome menos energia** que A1 e A2, porque a bomba de 12 V é menor, e toda essa energia vem do painel.
- **A bomba da A3 fica ligada mais tempo** (1,06 h/dia), porque tem vazão menor (480 L/h). Como funciona com o sol,
  isso não é um problema: o painel gera de 2,2 a 4,0 vezes o consumo, conforme o mês.
- **As emissões evitadas são pequenas** (1,83 kg CO₂e/ano), porque a matriz elétrica brasileira já é pouco
  intensiva em carbono (24,7 kg CO₂/MWh). O ganho ambiental principal é a água (38% a menos).

> Todos os valores são projeções condicionadas às premissas de `dados/premissas.csv`.
