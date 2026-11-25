<p align="center">
  <img src="assets/banner-relatorio.jfif" alt="Sampa Ar — Future Tech Leaders & UNDP" width="100%">
</p>

<h1 align="center">Sampa Ar</h1>

<p align="center">
  <strong>Monitoramento Inteligente da Qualidade do Ar (MP2,5 e MP10) no Estado de São Paulo</strong><br>
  Estimativa horária para os 645 municípios paulistas via sensoriamento remoto GNSS (RBMC/IBGE), meteorologia operacional e redes neurais híbridas (CNN-LSTM).
</p>

<p align="center">
  <a href="https://nathaliafariasdev.github.io/qualidadedoar/"><strong>🌐 Acessar Plataforma Sampa Ar</strong></a>
  &nbsp;&nbsp;•&nbsp;&nbsp;
  <a href="https://nathaliafariasdev.github.io/qualidadedoar/dashboard.html"><strong>🗺️ Abrir Mapa Interativo</strong></a>
  &nbsp;&nbsp;•&nbsp;&nbsp;
  <a href="assets/relatorio-sampa-ar.pdf"><strong>📄 Ler Relatório Técnico (PDF)</strong></a>
</p>

<p align="center">
  <a href="#arquitetura-do-sistema">🇧🇷 Português</a>
  &nbsp;&nbsp;|&nbsp;&nbsp;
  <a href="#english-version">🇺🇸 English</a>
</p>

---

## Arquitetura do Sistema

- **Sensoriamento Remoto Troposférico:** Coleta horária de observáveis GNSS (atraso troposférico zenital — ZTD e relação sinal-ruído — SNR) em 8 estações base paulistas (`BAUR`, `FRAN`, `ILHA`, `POLI`, `PPTE`, `SJSP`, `SPAR`, `UBA1`), acoplados a variáveis meteorológicas e profundidade óptica de aerossóis (AOD).
- **Modelagem Profunda (CNN-LSTM):** Extração de variações locais de alta frequência via camada convolucional 1D (`Conv1d`) seguida de duas camadas recorrentes `LSTM` para captura da inércia de acúmulo e dispersão na camada limite planetária.
- **Generalização Espacial (IDW):** Interpolação ponderada pelo inverso do quadrado da distância ($p = 2$, $k = 4$) sobre a malha oficial dos 645 municípios paulistas (IBGE).
- **Automação Horária:** Atualização contínua via **GitHub Actions** (`.github/workflows/atualizar.yml`), regenerando `estacoes_pred.json` e o mapa interativo `mapa_sp.html`.

---

## Validação Experimental (CETESB & CAMS)

Auditado em **13 localidades paulistas** (5 estações base com recepção GNSS direta e 8 municípios sem antena em validação espacial cega):

| Escopo de Avaliação | Localidades ($N$) | MAE ($\mu\text{g/m}^3$) | RMSE ($\mu\text{g/m}^3$) | Precisão na Escala Boa | Acerto de Faixa CETESB |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Estações Base (com GNSS)** | 5 | 2,16 | 2,99 | 91,4% | 100,0% |
| **Expansão Espacial (sem GNSS / IDW)** | 8 | 4,78 | 6,76 | 80,9% | 75,0% |
| **Consolidado Estadual** | **13** | **3,77** | **5,63** | **84,9%** | **84,6%** |

---

## Documentação e Estrutura do Repositório

- 📄 **[Relatório Técnico Completo](assets/relatorio-sampa-ar.pdf)** (`assets/relatorio-sampa-ar.pdf`) — Documento técnico com metodologia, protocolo V&V, comparação integral nas 13 localidades e atribuição física do erro.
- 🌐 **`index.html`, `dashboard.html`, `style.css`, `script.js`** — Interface web e painel cartográfico interativo.
- ⚙️ **`atualizar_previsao.py`** — Pipeline horário de coleta, inferência, interpolação IDW e geração do mapa Folium.
- 🗺️ **`estacoes_pred.json` & `mapa_sp.html`** — Saídas atualizadas automaticamente a cada hora.
- 🤖 **`.github/workflows/atualizar.yml`** — Automação CI/CD horária no GitHub Actions.

---

**Autora:** Nathália C. Melo de Farias  
*Projeto desenvolvido no Future Tech Leaders GeoAI Bootcamp, em parceria com UNDP ICPSD, PNUD Brasil e Agência Espacial Brasileira (AEB).*

---
---

<a id="english-version"></a>

<h1 align="center">Sampa Ar (English)</h1>

<p align="center">
  <strong>Intelligent Air Quality Monitoring (PM2.5 and PM10) in the State of São Paulo</strong><br>
  Hourly estimation across all 645 municipalities in São Paulo via GNSS remote sensing (RBMC/IBGE), operational meteorology, and hybrid neural networks (CNN-LSTM).
</p>

<p align="center">
  <a href="https://nathaliafariasdev.github.io/qualidadedoar/"><strong>🌐 Access Sampa Ar Platform</strong></a>
  &nbsp;&nbsp;•&nbsp;&nbsp;
  <a href="https://nathaliafariasdev.github.io/qualidadedoar/dashboard.html"><strong>🗺️ Open Interactive Map</strong></a>
  &nbsp;&nbsp;•&nbsp;&nbsp;
  <a href="assets/relatorio-sampa-ar.pdf"><strong>📄 Read Technical Report (PDF)</strong></a>
</p>

---

## System Architecture

- **Tropospheric Remote Sensing:** Hourly collection of GNSS observables (Zenith Tropospheric Delay — ZTD and Signal-to-Noise Ratio — SNR) across 8 base stations in São Paulo (`BAUR`, `FRAN`, `ILHA`, `POLI`, `PPTE`, `SJSP`, `SPAR`, `UBA1`), coupled with meteorological variables and Aerosol Optical Depth (AOD).
- **Deep Learning Modeling (CNN-LSTM):** High-frequency local variation extraction via a 1D convolutional layer (`Conv1d`) followed by two recurrent `LSTM` layers to capture accumulation and dispersion inertia within the planetary boundary layer.
- **Spatial Generalization (IDW):** Inverse Distance Weighting interpolation ($p = 2$, $k = 4$) across the official mesh of all 645 municipalities in São Paulo (IBGE).
- **Hourly Automation:** Continuous updates via **GitHub Actions** (`.github/workflows/atualizar.yml`), regenerating `estacoes_pred.json` and the interactive map `mapa_sp.html`.

---

## Experimental Validation (CETESB & CAMS)

Audited across **13 locations in São Paulo** (5 base stations with direct GNSS reception and 8 antenna-free municipalities in blind spatial validation):

| Evaluation Scope | Locations ($N$) | MAE ($\mu\text{g/m}^3$) | RMSE ($\mu\text{g/m}^3$) | Good-Scale Accuracy | CETESB Tier Agreement |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Base Stations (with GNSS)** | 5 | 2.16 | 2.99 | 91.4% | 100.0% |
| **Spatial Expansion (without GNSS / IDW)** | 8 | 4.78 | 6.76 | 80.9% | 75.0% |
| **Statewide Consolidated** | **13** | **3.77** | **5.63** | **84.9%** | **84.6%** |

---

## Documentation and Repository Structure

- 📄 **[Full Technical Report](assets/relatorio-sampa-ar.pdf)** (`assets/relatorio-sampa-ar.pdf`) — Technical document detailing methodology, V&V protocol, full comparison across all 13 locations, and physical error attribution.
- 🌐 **`index.html`, `dashboard.html`, `style.css`, `script.js`** — Web interface and interactive cartographic dashboard.
- ⚙️ **`atualizar_previsao.py`** — Hourly pipeline for data ingestion, inference, IDW interpolation, and Folium map generation.
- 🗺️ **`estacoes_pred.json` & `mapa_sp.html`** — Outputs automatically updated every hour.
- 🤖 **`.github/workflows/atualizar.yml`** — Hourly CI/CD automation via GitHub Actions.

---

**Author:** Nathália C. Melo de Farias  
*Project developed during the Future Tech Leaders GeoAI Bootcamp, in partnership with UNDP ICPSD, UNDP Brazil, and the Brazilian Space Agency (AEB).*
