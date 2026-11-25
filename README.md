<p align="center">
  <img src="assets/banner-relatorio.jfif" alt="Sampa Ar — Future Tech Leaders & UNDP" width="100%">
</p>

<h1 align="center">Sampa Ar — Monitoramento Inteligente da Qualidade do Ar</h1>

<p align="center">
  Estimativa horária de material particulado (<b>MP2,5</b> e <b>MP10</b>) nos <b>645 municípios do Estado de São Paulo</b> via sensoriamento remoto GNSS (RBMC/IBGE), meteorologia operacional e redes neurais híbridas (CNN-LSTM).
</p>

<p align="center">
  <a href="https://nathaliafariasdev.github.io/qualidadedoar/">
    <img src="https://img.shields.io/badge/🌐_Acessar_Plataforma_Interativa-2B5B84?style=for-the-badge" alt="Acessar Plataforma">
  </a>
  <a href="https://nathaliafariasdev.github.io/qualidadedoar/dashboard.html">
    <img src="https://img.shields.io/badge/🗺️_Mapa_em_Tempo_Real-68B893?style=for-the-badge" alt="Mapa em Tempo Real">
  </a>
  <a href="assets/relatorio-sampa-ar.pdf">
    <img src="https://img.shields.io/badge/📄_Relatório_Técnico_(PDF)-1E293B?style=for-the-badge" alt="Relatório Técnico PDF">
  </a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Cobertura-645_Municípios_SP-2B5B84?style=flat-square" alt="645 Municípios">
  <img src="https://img.shields.io/badge/Modelo-CNN--LSTM_+_IDW-68B893?style=flat-square" alt="CNN-LSTM + IDW">
  <img src="https://img.shields.io/badge/Atualização-Horária_(GitHub_Actions)-0F172A?style=flat-square" alt="Atualização Horária">
  <img src="https://img.shields.io/badge/Validação-CETESB_&_CAMS-2B5B84?style=flat-square" alt="Validação CETESB e CAMS">
</p>

---

## Arquitetura do Sistema

1. **Sensoriamento Remoto Troposférico:** Coleta horária de observáveis GNSS (atraso troposférico zenital — ZTD e relação sinal-ruído — SNR) em 8 estações base paulistas (`BAUR`, `FRAN`, `ILHA`, `POLI`, `PPTE`, `SJSP`, `SPAR`, `UBA1`), acoplados a variáveis meteorológicas e profundidade óptica de aerossóis (AOD)[cite: 23].
2. **Modelagem Profunda (CNN-LSTM):** Extração de variações locais de alta frequência via camada convolucional 1D (`Conv1d`) seguida de duas camadas recorrentes `LSTM` para captura da inércia de acúmulo e dispersão na camada limite planetária[cite: 23].
3. **Generalização Espacial (IDW):** Interpolação ponderada pelo inverso do quadrado da distância ($p = 2$, $k = 4$) sobre a malha oficial dos 645 municípios paulistas (IBGE)[cite: 24].
4. **Automação Horária:** Atualização contínua via **GitHub Actions** (`.github/workflows/atualizar.yml`), regenerando `estacoes_pred.json` e o mapa interativo `mapa_sp.html`[cite: 24].

---

## Validação Experimental (CETESB & CAMS)

Auditado em **13 localidades paulistas** (5 estações base com recepção GNSS direta e 8 municípios sem antena em validação espacial cega)[cite: 25]:

| Escopo de Avaliação | Localidades ($N$) | MAE ($\mu\text{g/m}^3$) | RMSE ($\mu\text{g/m}^3$) | Precisão na Escala Boa | Acerto de Faixa CETESB |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Estações Base (com GNSS)** | 5 | 2,16 | 2,99 | 91,4% | 100,0% |
| **Expansão Espacial (sem GNSS / IDW)** | 8 | 4,78 | 6,76 | 80,9% | 75,0% |
| **Consolidado Estadual** | **13** | **3,77** | **5,63** | **84,9%** | **84,6%** |

---

## Documentação e Estrutura do Repositório

* 📄 **[Relatório Técnico Completo (`assets/relatorio-sampa-ar.pdf`)](assets/relatorio-sampa-ar.pdf)** — Documento técnico com metodologia, protocolo V&V, comparação integral nas 13 localidades e atribuição física do erro[cite: 1, 25].
* 🌐 **`index.html`, `dashboard.html`, `style.css`, `script.js`** — Interface web e painel cartográfico interativo[cite: 25].
* ⚙️ **`atualizar_previsao.py`** — Pipeline horário de coleta, inferência, interpolação IDW e geração do mapa Folium[cite: 25].
* 🗺️ **`estacoes_pred.json` & `mapa_sp.html`** — Saídas atualizadas automaticamente a cada hora[cite: 25].
* 🤖 **`.github/workflows/atualizar.yml`** — Automação CI/CD horária no GitHub Actions[cite: 25].

---

<p align="center">
  <b>Autora:</b> Nathália C. Melo de Farias<br>
  <i>Projeto desenvolvido no Future Tech Leaders GeoAI Bootcamp, em parceria com UNDP ICPSD, PNUD Brasil e Agência Espacial Brasileira (AEB).</i>
</p>
