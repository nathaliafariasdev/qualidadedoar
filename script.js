let estacoesCache = [];
let dadosGlobais = {};

const formatarNumero = (valor, casas = 1) => {
  const numero = Number(valor);
  if (!Number.isFinite(numero)) return '--';
  return numero.toFixed(casas);
};

function lerDataAtualizacao(valor, codigo) {
  const match = /^(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2})$/.exec(valor);
  if (!match) {
    const timestamp = Date.parse(valor);
    if (!Number.isFinite(timestamp)) {
      throw new Error(`Data de atualização inválida para a estação ${codigo}: ${valor}`);
    }

    const partes = new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23'
    }).formatToParts(new Date(timestamp));
    const valores = Object.fromEntries(partes.map(parte => [parte.type, parte.value]));

    return {
      timestamp,
      texto: `${valores.day}/${valores.month}/${valores.year} às ${valores.hour}:${valores.minute}:${valores.second}`
    };
  }

  const [, dia, mes, ano, hora, minuto] = match;
  const timestampLocal = Date.UTC(
    Number(ano),
    Number(mes) - 1,
    Number(dia),
    Number(hora),
    Number(minuto)
  );
  const data = new Date(timestampLocal);
  if (
    data.getUTCFullYear() !== Number(ano) ||
    data.getUTCMonth() !== Number(mes) - 1 ||
    data.getUTCDate() !== Number(dia) ||
    data.getUTCHours() !== Number(hora) ||
    data.getUTCMinutes() !== Number(minuto)
  ) {
    throw new Error(`Data de atualização inválida para a estação ${codigo}: ${valor}`);
  }

  return {
    timestamp: timestampLocal + 3 * 60 * 60 * 1000,
    texto: `${dia}/${mes}/${ano} às ${hora}:${minuto}`
  };
}

function formatarDataHoraBrasilia(timestamp) {
  const partesAgora = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(new Date());
  const agora = Object.fromEntries(partesAgora.map(parte => [parte.type, parte.value]));
  const inicioHoraBrasilia = Date.UTC(
    Number(agora.year),
    Number(agora.month) - 1,
    Number(agora.day),
    Number(agora.hour)
  ) + 3 * 60 * 60 * 1000;
  const dataExibida = new Date(Math.min(timestamp, inicioHoraBrasilia));

  const partesExibicao = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(dataExibida);
  const valores = Object.fromEntries(partesExibicao.map(parte => [parte.type, parte.value]));

  return `${valores.day}/${valores.month}/${valores.year} às ${valores.hour}:${valores.minute}`;
}

function normalizarDados(lista) {
  if (!Array.isArray(lista) || lista.length === 0) {
    throw new Error('estacoes_pred.json precisa conter um array não vazio de estações.');
  }

  const codigos = new Set();
  const estacoes = lista.map((estacao, index) => {
    if (!estacao || typeof estacao !== 'object' || Array.isArray(estacao)) {
      throw new Error(`Dados inválidos para a estação na posição ${index + 1}.`);
    }

    const codigo = typeof estacao.codigo === 'string' ? estacao.codigo.trim() : '';
    const nome = typeof estacao.nome === 'string' ? estacao.nome.trim() : '';
    const pm25 = estacao.pm2_5_pred;
    const pm10 = estacao.pm10_pred;
    const atualizacao = typeof estacao.ultima_atualizacao === 'string'
      ? estacao.ultima_atualizacao.trim()
      : '';

    if (!codigo || !nome || typeof pm25 !== 'number' || !Number.isFinite(pm25) || pm25 < 0 ||
        typeof pm10 !== 'number' || !Number.isFinite(pm10) || pm10 < 0 || !atualizacao) {
      throw new Error(`Dados inválidos para a estação na posição ${index + 1}.`);
    }
    if (codigos.has(codigo)) {
      throw new Error(`Código de estação duplicado em estacoes_pred.json: ${codigo}`);
    }
    codigos.add(codigo);

    return {
      codigo,
      nome,
      pm2_5_pred: pm25,
      pm10_pred: pm10,
      ultima_atualizacao: atualizacao,
      dataAtualizacao: lerDataAtualizacao(atualizacao, codigo)
    };
  });

  const somaPm25 = estacoes.reduce((soma, estacao) => soma + estacao.pm2_5_pred, 0);
  const somaPm10 = estacoes.reduce((soma, estacao) => soma + estacao.pm10_pred, 0);
  const atualizacaoMaisRecente = estacoes.reduce((maisRecente, estacao) =>
    estacao.dataAtualizacao.timestamp > maisRecente.dataAtualizacao.timestamp
      ? estacao
      : maisRecente
  );
  const mapaAtualizadoEm = typeof lista[0].mapa_atualizado_em === 'string'
    ? lista[0].mapa_atualizado_em.trim()
    : '';
  const dataAtualizacaoMapa = mapaAtualizadoEm
    ? lerDataAtualizacao(mapaAtualizadoEm, 'mapa')
    : null;

  return {
    atualizacaoTimestamp: atualizacaoMaisRecente.dataAtualizacao.timestamp,
    mapaAtualizadoTexto: dataAtualizacaoMapa ? dataAtualizacaoMapa.texto : '',
    media_sp_pm25: somaPm25 / estacoes.length,
    media_sp_pm10: somaPm10 / estacoes.length,
    estacoes
  };
}

const GUIAS_RAPIDOS = {
  saude: 'O Sampa Ar combina medições atmosféricas e observáveis geodésicos GNSS em 8 estações base paulistas (RBMC/IBGE) para prever as concentrações de PM2,5 e PM10 na hora seguinte. A cobertura para os 645 municípios do Estado de São Paulo é obtida por interpolação espacial (IDW) — representando estimativas computacionais em rede, e não estações físicas locais.',
  pm25: 'Partículas finas inaláveis (diâmetro ≤ 2,5 µm) capazes de atingir os alvéolos pulmonares. Padrão CETESB (Faixa Boa): média de 24h até 25 µg/m³.',
  pm10: 'Partículas inaláveis (diâmetro ≤ 10 µm) associadas a poeira suspensa, queima de biomassa e emissões veiculares. Padrão CETESB (Faixa Boa): média de 24h até 50 µg/m³.',
  satelite: 'Sinais de satélites GNSS captados pelas antenas geodésicas da RBMC/IBGE (relação sinal-ruído — SNR e atraso troposférico) acoplados a dados meteorológicos e profundidade óptica de aerossóis (AOD).'
};

const DOCS_FTL = {
  intro: `
    <h3>O desafio</h3>
    <p>O monitoramento contínuo de material particulado (PM2,5 e PM10) depende de estações físico-químicas de alto custo de implantação e manutenção, deixando a maior parte dos 645 municípios paulistas sem cobertura telemétrica local.</p>
    <h3>O que o Sampa Ar desenvolveu</h3>
    <p>O Sampa Ar reaproveita a infraestrutura geodésica existente da Rede Brasileira de Monitoramento Contínuo (RBMC/IBGE) como sensor ambiental complementar. Combinando observáveis GNSS (SNR), meteorologia e profundidade óptica de aerossóis (AOD) em uma arquitetura profunda CNN-LSTM, o sistema prevê concentrações horárias em 8 estações base e projeta o campo estadual via interpolação espacial IDW.</p>
    <h3>Conexão com os ODS</h3>
    <ul>
      <li><strong>ODS 11 (Meta 11.6):</strong> Reduzir o impacto ambiental negativo per capita das cidades, com atenção especial à qualidade do ar e gestão municipal.</li>
      <li><strong>ODS 3 (Meta 3.9):</strong> Apoiar a identificação preventiva de episódios de poluição atmosférica associados a riscos respiratórios e cardiovasculares.</li>
      <li><strong>ODS 9 (Meta 9.5):</strong> Reaproveitar a infraestrutura científica e geodésica aberta da RBMC/IBGE para inovação ambiental de baixo custo.</li>
    </ul>
  `,
  dados: `
    <h3>Fontes e cobertura</h3>
    <p>A série histórica reúne 60 dias de registros horários (1.440 horas por estação) integrando qualidade do ar e meteorologia operacional (Open-Meteo / CAMS) com observáveis GNSS da RBMC/IBGE em 8 estações distribuídas pelo Estado de São Paulo: POLI (São Paulo/USP), SJSP (São José dos Campos), PPTE (Presidente Prudente), SPAR (Araçatuba), FRAN (Franca), BAUR (Bauru), UBA1 (Ubatuba) e ILHA (Ilha Solteira).</p>
    <h3>O que entra em cada previsão</h3>
    <p>O modelo processa janelas deslizantes de 24 horas contendo 8 variáveis: histórico de PM2,5, PM10, profundidade óptica de aerossóis (AOD), temperatura, umidade relativa, precipitação e codificação cíclica da hora (seno e cosseno) para preservar a continuidade entre 23h e 00h na previsão de t+1.</p>
  `,
  modelo: `
    <h3>Da sequência ao valor previsto</h3>
    <p>A arquitetura híbrida combina duas formas de analisar séries temporais:</p>
    <ul>
      <li><strong>1D-CNN (Convolução Unidimensional):</strong> Extrai assinaturas locais de alta frequência e variações bruscas de curto prazo nos dados horários.</li>
      <li><strong>LSTM (Long Short-Term Memory):</strong> Captura a inércia temporal e os ciclos diários de acúmulo e dispersão de poluentes na camada limite planetária.</li>
    </ul>
    <h3>Como as previsões chegam ao mapa</h3>
    <p>Após gerar as previsões nas 8 estações base, o algoritmo aplica interpolação espacial pelo Inverso do Quadrado da Distância (IDW, p = 2, k = 4 vizinhos mais próximos) sobre a malha oficial do IBGE para estimar os níveis nos 645 municípios paulistas.</p>
  `,
  resultados: `
    <h3>Resultados de validação reportados</h3>
    <p>Além da redução de 74% no erro médio absoluto (MAE) ao expandir a janela de treino de 14 para 60 dias com codificação cíclica, o sistema foi auditado em 13 localidades paulistas frente às redes de referência CETESB e CAMS:</p>
    <table>
      <thead><tr><th>Conjunto auditado</th><th>MAE</th><th>RMSE</th><th>Acerto de Faixa CETESB</th></tr></thead>
      <tbody>
        <tr><td>Estações Base (com GNSS, N=5)</td><td>2,16 µg/m³</td><td>2,99 µg/m³</td><td>100,0%</td></tr>
        <tr><td>Expansão Espacial (sem GNSS / IDW, N=8)</td><td>4,78 µg/m³</td><td>6,76 µg/m³</td><td>75,0%</td></tr>
        <tr><td>Consolidado Estadual (N=13)</td><td>3,77 µg/m³</td><td>5,63 µg/m³</td><td>84,6%</td></tr>
      </tbody>
    </table>
    <p><strong>MAE</strong> e <strong>RMSE</strong> expressam erros médios das estimativas em µg/m³; o acerto de faixa mede a concordância com a classificação de referência CETESB.</p>
    <h3>Aplicações possíveis e próximos passos</h3>
    <p>O painel oferece suporte técnico para vigilância ambiental, defesa civil e planejamento urbano em municípios sem estações telemétricas. Como próximos passos, prevê-se a inclusão de ozônio (O<sub>3</sub>) e dióxido de nitrogênio (NO<sub>2</sub>), além da expansão da malha para outros estados atendidos pela RBMC.</p>
  `
};

function avaliarAr(valor, poluente = 'pm25') {
  const faixas = poluente === 'pm10' ? [50, 100, 150, 250] : [25, 50, 75, 125];
  const niveis = [
    { status: 'Boa', cor: '#16A34A', bg: '#DCFCE7' },
    { status: 'Moderada', cor: '#CA8A04', bg: '#FEF9C3' },
    { status: 'Ruim', cor: '#EA580C', bg: '#FFEDD5' },
    { status: 'Muito Ruim', cor: '#DC2626', bg: '#FEE2E2' },
    { status: 'Péssima', cor: '#7E22CE', bg: '#F3E8FF' }
  ];
  const faixa = faixas.findIndex(limite => valor <= limite);
  return niveis[faixa === -1 ? niveis.length - 1 : faixa];
}

function atualizarPainelSuave(titulo, pm25, pm10, codigo = 'SP') {
  const pm25Valor = Number(pm25);
  const pm10Valor = Number(pm10);
  const infoPm25 = avaliarAr(pm25Valor);
  const infoPm10 = avaliarAr(pm10Valor, 'pm10');

  const elCidade = document.getElementById('panel-cidade');
  const elCardTitulo = document.getElementById('card-local-titulo');
  const elOrbStatus = document.getElementById('orb-status');
  const elDialNumber = document.getElementById('dial-number');
  const elDica = document.getElementById('panel-dica');
  const elPm25 = document.getElementById('bubble-pm25-val');
  const elPm10 = document.getElementById('bubble-pm10-val');
  const elBadge = document.getElementById('panel-badge');
  const elDotPm25 = document.getElementById('dot-pm25');
  const elDotPm10 = document.getElementById('dot-pm10');
  const elDotStatus = document.getElementById('dot-status');
  const elCount = document.getElementById('orb-count');
  const elCountLabel = document.getElementById('orb-count-label');
  const seletor = document.getElementById('seletor-estacao');

  if (elCidade) elCidade.textContent = titulo;
  if (elCardTitulo) elCardTitulo.textContent = `Previsão do modelo • ${titulo}`;
  if (elOrbStatus) elOrbStatus.textContent = infoPm25.status;
  if (elDialNumber) elDialNumber.textContent = formatarNumero(pm25Valor, 1);
  if (elDica) {
    elDica.textContent = 'Faixa de referência CETESB para PM2,5: Boa. Estimativa operacional para a hora seguinte (t+1) gerada pela rede híbrida CNN-LSTM. Para boletins oficiais de saúde pública, consulte a rede telemétrica da CETESB.';
  }
  if (elPm25) elPm25.textContent = formatarNumero(pm25Valor, 1);
  if (elPm10) elPm10.textContent = formatarNumero(pm10Valor, 1);
  if (seletor) seletor.value = codigo;
  if (elDotPm25) elDotPm25.style.backgroundColor = infoPm25.cor;
  if (elDotPm10) elDotPm10.style.backgroundColor = infoPm10.cor;
  if (elDotStatus) elDotStatus.style.backgroundColor = infoPm25.cor;

  if (elCount && elCountLabel) {
    elCount.textContent = codigo !== 'SP' ? codigo : '645';
    elCountLabel.textContent = codigo !== 'SP' ? 'ESTAÇÃO RBMC' : 'MUNICÍPIOS';
  }

  if (elBadge) {
    elBadge.textContent = `CETESB: ${infoPm25.status}`;
    elBadge.style.color = infoPm25.cor;
    elBadge.style.background = infoPm25.bg;
  }

  document.querySelectorAll('.q-pill').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.codigo === codigo);
  });
}

function popularControlesEstacoes(lista) {
  const seletor = document.getElementById('seletor-estacao');
  const pillsWrap = document.getElementById('lista-estacoes-rapida');

  if (seletor) {
    seletor.innerHTML = '<option value="SP">Sampa Ar — média do estado</option>';
    lista.forEach(est => {
      const opt = document.createElement('option');
      opt.value = est.codigo;
      opt.textContent = `${est.nome} (${est.codigo}) — ${formatarNumero(est.pm2_5_pred, 1)} µg/m³`;
      seletor.appendChild(opt);
    });

    seletor.addEventListener('change', () => {
      const val = seletor.value;
      if (val === 'SP') {
        atualizarPainelSuave('Estado de SP', dadosGlobais.media_sp_pm25, dadosGlobais.media_sp_pm10, 'SP');
      } else {
        const est = estacoesCache.find(e => e.codigo === val);
        if (est) atualizarPainelSuave(est.nome, est.pm2_5_pred, est.pm10_pred, est.codigo);
      }
    });
  }

  if (pillsWrap) {
    pillsWrap.innerHTML = '';
    const btnSp = document.createElement('button');
    btnSp.className = 'q-pill active';
    btnSp.dataset.codigo = 'SP';
    btnSp.textContent = 'Sampa Ar';
    btnSp.addEventListener('click', () => {
      atualizarPainelSuave('Estado de SP', dadosGlobais.media_sp_pm25, dadosGlobais.media_sp_pm10, 'SP');
    });
    pillsWrap.appendChild(btnSp);

    lista.forEach(est => {
      const btn = document.createElement('button');
      btn.className = 'q-pill';
      btn.dataset.codigo = est.codigo;
      btn.textContent = est.nome;
      btn.addEventListener('click', () => {
        atualizarPainelSuave(est.nome, est.pm2_5_pred, est.pm10_pred, est.codigo);
      });
      pillsWrap.appendChild(btn);
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  // Mini-abas explicativas (Saúde, PM2.5, PM10, Satélite)
  document.querySelectorAll('.ws-filter').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.ws-filter').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const guideEl = document.getElementById('guide-content');
      if (guideEl) guideEl.innerHTML = GUIAS_RAPIDOS[btn.dataset.guide];
    });
  });

  // Botão Dashboard volta para Média Estadual
  const btnResetSp = document.getElementById('btn-reset-sp');
  if (btnResetSp) {
    btnResetSp.addEventListener('click', () => {
      atualizarPainelSuave('Estado de SP', dadosGlobais.media_sp_pm25, dadosGlobais.media_sp_pm10, 'SP');
    });
  }

  // Modal Científico FTL
  const modal = document.getElementById('modal-ftl');
  const modalContent = document.getElementById('modal-content');
  if (modal && modalContent) {
    modalContent.innerHTML = DOCS_FTL.intro;

    const abrirModal = () => modal.classList.add('open');
    const fecharModal = () => modal.classList.remove('open');

    const btnModal1 = document.getElementById('btn-modal-ftl');
    const btnModal2 = document.getElementById('btn-abrir-modal-2');
    const btnFechar = document.getElementById('btn-fechar-modal');

    if (btnModal1) btnModal1.addEventListener('click', abrirModal);
    if (btnModal2) btnModal2.addEventListener('click', abrirModal);
    if (btnFechar) btnFechar.addEventListener('click', fecharModal);
    modal.addEventListener('click', e => { if (e.target === modal) fecharModal(); });

    document.querySelectorAll('.doc-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.doc-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        modalContent.innerHTML = DOCS_FTL[tab.dataset.doc];
      });
    });
  }

  const aplicarDados = (data) => {
    dadosGlobais = normalizarDados(data);
    estacoesCache = dadosGlobais.estacoes;

    const homePm25 = document.getElementById('home-pm25');
    if (homePm25) homePm25.textContent = `${formatarNumero(dadosGlobais.media_sp_pm25, 1)} µg/m³`;

    const pillAtualizacao = document.getElementById('pill-atualizacao');
    if (pillAtualizacao) {
      pillAtualizacao.textContent = dadosGlobais.mapaAtualizadoTexto
        ? `Mapa atualizado: ${dadosGlobais.mapaAtualizadoTexto} (Horário de Brasília)`
        : `Horário de geração do mapa indisponível; dados da fonte até ${formatarDataHoraBrasilia(dadosGlobais.atualizacaoTimestamp)} (Horário de Brasília)`;
    }

    popularControlesEstacoes(estacoesCache);
    atualizarPainelSuave('Estado de SP', dadosGlobais.media_sp_pm25, dadosGlobais.media_sp_pm10, 'SP');
  };

  // Carrega as previsões geradas pelo modelo para as estações.
  fetch(`estacoes_pred.json?t=${Date.now()}`, { cache: 'no-store' })
    .then(r => {
      if (!r.ok) {
        throw new Error(`Falha ao carregar estacoes_pred.json (${r.status})`);
      }
      return r.json();
    })
    .then(aplicarDados)
    .catch(err => {
      console.error('Erro ao carregar estacoes_pred.json:', err);
      const pillAtualizacao = document.getElementById('pill-atualizacao');
      const elDica = document.getElementById('panel-dica');
      const elOrbStatus = document.getElementById('orb-status');
      const elDialNumber = document.getElementById('dial-number');
      const elPm25 = document.getElementById('bubble-pm25-val');
      const elPm10 = document.getElementById('bubble-pm10-val');
      const elBadge = document.getElementById('panel-badge');
      const seletor = document.getElementById('seletor-estacao');
      if (pillAtualizacao) pillAtualizacao.textContent = 'Falha ao carregar previsões';
      if (elDica) elDica.textContent = 'Não foi possível carregar os dados previstos das estações.';
      if (elOrbStatus) elOrbStatus.textContent = 'Indisponível';
      if (elDialNumber) elDialNumber.textContent = '--';
      if (elPm25) elPm25.textContent = '--';
      if (elPm10) elPm10.textContent = '--';
      if (elBadge) elBadge.textContent = 'Dados indisponíveis';
      if (seletor) seletor.disabled = true;
    });
});