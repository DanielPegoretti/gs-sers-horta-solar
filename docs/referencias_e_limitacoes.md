# Referências e limitações

## Referências (consultadas em 19/11/2026)

**Dados climáticos e solares**
1. LABREN/CCST/INPE. *Atlas Brasileiro de Energia Solar*, 2ª ed., 2017. Médias do total diário da irradiação no plano inclinado — Estado de São Paulo (ponto ID 5728, lon −46,649, lat −23,5005). https://labren.ccst.inpe.br/atlas2_tables/SP_inc.html
2. INMET. *Normais Climatológicas do Brasil 1991–2020*, estação Mirante de Santana (São Paulo). Valores obtidos da tabela climática que cita o INMET como fonte: https://en.wikipedia.org/wiki/S%C3%A3o_Paulo — consulta oficial em https://portal.inmet.gov.br/normais
3. CRESESB/CEPEL. Programa SunData (usa os dados do Atlas do INPE). https://cresesb.cepel.br/index.php?section=sundata

**Irrigação**
4. MAROUELLI, W. A.; BRAGA, M. B. *Irrigação na produção de mudas de hortaliças*. Embrapa Hortaliças (ETo de 4,4 mm/dia para 20 °C e UR de 70%). https://www.infoteca.cnptia.embrapa.br/infoteca/bitstream/doc/1060740/1/4447MarcosBrandao.pdf
5. PINTO, J. M. et al. *Sistema de gotejamento por gravidade para a irrigação de hortas*. Embrapa, Instruções Técnicas 122, 2015. https://www.infoteca.cnptia.embrapa.br/infoteca/bitstream/doc/1025428/1/INT122.pdf
6. ALLEN, R. G. et al. *Crop evapotranspiration — FAO Irrigation and Drainage Paper 56*. FAO, 1998 (coeficiente de cultivo Kc). https://www.fao.org/4/x0490e/x0490e00.htm

**Tarifa, regras e emissões**
7. Exame. Reajuste de 2025 da Enel SP — tarifa B1 residencial de R$ 725,18/MWh. https://exame.com/economia/conta-de-luz-sp-aumento-enel-reajuste-tarifa-aneel-julho
8. Canal Rural. Área técnica da ANEEL estima reajuste de 8,97% na baixa tensão da Enel SP em 2026. https://www.canalrural.com.br/economia/area-tecnica-da-aneel-estima-alta-media-de-1018-na-tarifa-da-enel-sp/
9. DGABC. ANEEL aprova alta média de 10,18% para a Enel SP (30/06/2026). https://www.dgabc.com.br/Noticia/4332348/aneel-aprova-alta-media-de-10-18-para-tarifas-dos-consumidores-da-enel-sao-paulo
10. Fatura Enel SP B1 de fev/2026, publicada no portal de transparência da Câmara dos Deputados (tarifa com e sem tributos: fator 1,298). https://www.camara.leg.br/cota-parlamentar/documentos/publ/3283/2026/8055087.pdf
11. ANEEL. Resolução Normativa nº 1.000/2021, art. 291 (custo de disponibilidade: 30 kWh monofásico). https://www.legisweb.com.br/legislacao/?id=490988 — explicação: https://blog.esferaenergia.com.br/gestao-empresarial/valor-taxa-minima-luz
12. Canal Solar / MCTI-SIRENE. Fatores médios de emissão de CO₂ do SIN, jan a abr/2025. https://canalsolar.com.br/emissoes-de-co%e2%82%82-geracao-eletrica-mcti/

**Equipamentos e preços (referência de mercado, nov/2026)**
13. Bombas periféricas 1/2 cv (370 W; até 2.400 L/h e 30 m.c.a.). https://www.casasbahia.com.br/bomba-periferica-foxlux-1-2cv-110v/p/1582259248 e https://www.magazineluiza.com.br/busca/bomba+p/
14. Kit painel solar 100 W + controlador 30 A + cabos MC4 (R$ 994). https://m.magazineluiza.com.br/busca/kit+solar+microinversor
15. Bomba d'água solar 12 V 100 W 480 L/h. https://www.mercadolivre.com.br/loja/e-solar
16. Monitor do Mercado. Custo de padrão de entrada em 2026 (monofásico a partir de R$ 1.800). https://monitordomercado.com.br/noticias/410146-quanto-custa-trocar-o-padrao-de-entrada-de-energia-para-suportar-os-novos-aparelhos-da-casa/

**Integração**
17. Projeto *Sistema Preditivo de Irrigação com IoT* — Arquitetura e Organização de Computadores (mesmo grupo): ESP32, sensor capacitivo, BME280, BH1750, MQTT.

## Limitações da proposta

1. **Necessidade de água simplificada.** A ETo de cada mês foi distribuída de forma proporcional à irradiação a partir de
   um valor anual de referência (4,4 mm/dia), sem o método completo de Penman-Monteith. O Kc foi considerado igual a 1,0
   para a horta inteira, embora varie com a cultura e a fase.
2. **Chuva.** Cada dia com chuva ≥ 1 mm dispensa a irrigação daquele dia; chuvas fortes que molham o solo por vários dias
   não foram consideradas (a economia de água real pode ser maior).
3. **Médias climáticas.** Os cálculos usam médias de longo prazo; anos mais secos ou nublados alteram os resultados.
4. **Equipamentos.** Vazões em operação, performance ratio (0,70) e consumo do ESP32 (0,5 W) são premissas e devem ser
   confirmados com medição após a instalação (INA219).
5. **Custos.** Preços de lojas online em nov/2026, sem frete, instalação, mão de obra nem caixa d'água e gotejamento (que
   são iguais nas três alternativas). Tarifa B1 usada como referência; a classe tarifária real da horta pode ser outra.
6. **Água sem valor em reais.** A economia de 9,6 m³/mês não foi convertida em dinheiro porque depende da fonte de água
   da horta (rede da Sabesp, poço ou captação de chuva).
7. **Segurança e manutenção.** Painel e bateria podem ser furtados; a bateria precisa ser trocada a cada 3 anos e
   descartada em ponto de coleta.
8. **Monitoramento simulado.** A seção de monitoramento do dashboard usa dados simulados; não houve montagem física,
   conforme permitido pelo enunciado.
9. **Projeções.** Economias, geração renovável e emissões evitadas são projeções condicionadas às premissas, e não
   resultados garantidos.
