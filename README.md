<p align="center">
  <img src="assets/banner-relatorio.jfif" alt="Sampa Ar — Future Tech Leaders & UNDP" width="100%">
</p>

<h1 align="center">Sampa Ar</h1>

<p align="center">
  <strong>Monitoramento Inteligente da Qualidade do Ar (MP2,5 e MP10) no Estado de São Paulo</strong><br>
  Estimativa horária para os 645 municípios paulistas via sensoriamento remoto GNSS (RBMC/IBGE), meteorologia operacional e redes neurais híbridas (CNN-LSTM).
</p>

<p align="center">
  <a href="https://nathaliafariasdev.github.io/qualidadedoar/"><strong>🌐 Acessar Plataforma Sampa Ar</a>
  &nbsp;&nbsp;•&nbsp;&nbsp;
  <a href="https://nathaliafariasdev.github.io/qualidadedoar/dashboard.html"><strong>🗺️ Abrir Mapa Interativo</strong></a>
  &nbsp;&nbsp;•&nbsp;&nbsp;
  <a href="assets/relatorio-sampa-ar.pdf"><strong>📄 Ler Relatório Técnico (PDF)</strong></a>
</p>

---

## Arquitetura do Sistema

* **Sensoriamento Remoto Troposférico:** Coleta horária de observáveis GNSS (atraso troposférico zenital — ZTD e relação sinal-ruído — SNR) em 8 estações base paulistas (`BAUR`, `FRAN`, `ILHA`, `POLI`, `PPTE`, `SJSP`, `SPAR`, `UBA1`), acoplados a variáveis meteorológicas e profundidade óptica de aerossóis (AOD).
* **Modelagem Profunda (CNN-LSTM):** Extração de variações locais de alta frequência via camada convolucional 1D (`Conv1d`) seguida de duas camadas recorrentes `LSTM` para captura da inércia de acúmulo e dispersão na camada limite planetária.
* **Generalização Espacial (IDW):** Interpolação ponderada pelo inverso do quadrado da distância ($p = 2$, $k = 4$) sobre a malha oficial dos 645 municípios paulistas (IBGE).
* **Automação Horária:** Atualização contínua via **GitHub Actions** (`.github/workflows/atualizar.yml`), regenerando `estacoes_pred.json` e o mapa interativo `mapa_sp.html`.

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

* 📄 **[Relatório Técnico Completo](assets/relatorio-sampa-ar.pdf)** (`assets/relatorio-sampa-ar.pdf`) — Documento técnico com metodologia, protocolo V&V, comparação integral nas 13 localidades e atribuição física do erro.
* 🌐 **`index.html`, `dashboard.html`, `style.css`, `script.js`** — Interface web e painel cartográfico interativo. 
* ⚙️ **`atualizar_previsao.py`** — Pipeline horário de coleta, inferência, interpolação IDW e geração do mapa Folium.
* 🗺️ **`estacoes_pred.json` & `mapa_sp.html`** — Saídas atualizadas automaticamente a cada hora.
* 🤖 **`.github/workflows/atualizar.yml`** — Automação CI/CD horária no GitHub Actions.

---

**Autora:** Nathália C. Melo de Farias  
*Projeto desenvolvido no Future Tech Leaders GeoAI Bootcamp, em parceria com UNDP ICPSD, PNUD Brasil e Agência Espacial Brasileira (AEB).*
