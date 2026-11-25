<p align="center">
  <img src="assets/logo-escuro.png" alt="Sampa Ar" width="280">
</p>

# Sampa Ar — Monitoramento Inteligente da Qualidade do Ar

Plataforma web e pipeline automatizado de GeoAI para estimativa horária de material particulado (**MP2,5** e **MP10**) nos **645 municípios do Estado de São Paulo**, combinando sinais geodésicos GNSS da Rede Brasileira de Monitoramento Contínuo (**RBMC/IBGE**), meteorologia operacional e redes neurais híbridas (**CNN-LSTM**).

🌐 **Plataforma Interativa:** [nathaliafariasdev.github.io/qualidadedoar](https://nathaliafariasdev.github.io/qualidadedoar/)

---

## Arquitetura do Sistema

1. **Sensoriamento Remoto Troposférico:** Coleta horária de observáveis GNSS (atraso troposférico zenital — ZTD e relação sinal-ruído — SNR) em 8 estações base paulistas (`BAUR`, `FRAN`, `ILHA`, `POLI`, `PPTE`, `SJSP`, `SPAR`, `UBA1`), acoplados a variáveis meteorológicas e profundidade óptica de aerossóis (AOD).
2. **Modelagem Profunda (CNN-LSTM):** Extração de variações locais de alta frequência via camada convolucional 1D (`Conv1d`) seguida de duas camadas recorrentes `LSTM` para captura da inércia de acúmulo e dispersão na camada limite planetária.
3. **Generalização Espacial (IDW):** Interpolação ponderada pelo inverso do quadrado da distância ($p = 2$, $k = 4$) sobre a malha oficial dos 645 municípios paulistas (IBGE).
4. **Automação Horária:** Atualização contínua via **GitHub Actions** (`.github/workflows/atualizar.yml`), regenerando `estacoes_pred.json` e o mapa interativo `mapa_sp.html`.

---

## Validação Experimental (CETESB & CAMS)

Auditado em **13 localidades paulistas** (5 estações base com recepção GNSS direta e 8 municípios sem antena em validação espacial cega):

| Escopo de Avaliação | Localidades ($N$) | MAE ($\mu\text{g/m}^3$) | RMSE ($\mu\text{g/m}^3$) | Precisão na Escala Boa | Acerto de Faixa CETESB |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Estações Base (com GNSS)** | 5 | 2,16 | 2,99 | 91,4% | 100,0% |
| **Expansão Espacial (sem GNSS / IDW)** | 8 | 4,78 | 6,76 | 80,9% | 75,0% |
| **Consolidado Estadual** | **13** | **3,77** | **5,63** | **84,9%** | **84,6%** |

---

## Estrutura do Repositório

* `index.html`, `dashboard.html`, `style.css`, `script.js` — Interface web e painel cartográfico interativo.
* `atualizar_previsao.py` — Pipeline horário de coleta, inferência, interpolação IDW e geração do mapa Folium.
* `estacoes_pred.json` & `mapa_sp.html` — Saídas atualizadas automaticamente a cada hora.
* `assets/relatorio-sampa-ar.pdf` — Relatório técnico completo (verificação, validação e atribuição física do erro).
* `.github/workflows/atualizar.yml` — Automação CI/CD horária no GitHub Actions.

---

**Autora:** Nathália C. Melo de Farias  
*Projeto desenvolvido no Future Tech Leaders GeoAI Bootcamp, em parceria com UNDP ICPSD, PNUD Brasil e Agência Espacial Brasileira (AEB).*
