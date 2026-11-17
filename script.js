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
    throw new Error(`Data de atualização inválida para a estação ${codigo}: ${valor}`);
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

  return {
    atualizacaoTimestamp: atualizacaoMaisRecente.dataAtualizacao.timestamp,
    media_sp_pm25: somaPm25 / estacoes.length,
    media_sp_pm10: somaPm10 / estacoes.length,
    estacoes
  };
}

const GUIAS_RAPIDOS = {
  saude: 'Sampa Ar é a média aritmética das previsões para oito estações. Ao escolher uma estação, os círculos e o card mostram a previsão individual. No mapa, a interpolação IDW estima valores entre as estações; isso não equivale a uma medição em cada município.',
  pm25: '<strong>PM<sub>2.5</sub>:</strong> partículas suspensas com diâmetro de até 2,5 micrômetros. O painel mostra a concentração prevista para a hora seguinte, em µg/m³. A faixa de referência não é um alerta oficial nem uma recomendação de saúde.',
  pm10: '<strong>PM<sub>10</sub>:</strong> partículas suspensas com diâmetro de até 10 micrômetros. A previsão combina o histórico recente de PM<sub>10</sub> com dados meteorológicos, indicadores atmosféricos e sinais GNSS.',
  satelite: '<strong>Por que GNSS?</strong> Imagens ópticas podem perder informação à noite ou sob nuvens e costumam oferecer registros em passagens espaçadas. Receptores da RBMC/IBGE acompanham sinais GNSS continuamente, em diferentes condições de céu. O SNR (relação entre sinal e ruído) é uma pista indireta, não uma medição de partículas; o modelo também usa dados horários do Open-Meteo.'
};

const DOCS_FTL = {
  intro: `
    <h3>O desafio</h3>
    <p>PM<sub>2.5</sub> e PM<sub>10</sub> são partículas suspensas no ar. O monitoramento em solo depende de estações físicas, que têm custo de instalação e manutenção; por isso, a cobertura contínua não alcança todos os municípios paulistas.</p>
    <h3>O que o Sampa Ar desenvolveu</h3>
    <p>O Sampa Ar integra meteorologia, indicadores atmosféricos e sinais GNSS para prever as concentrações de PM<sub>2.5</sub> e PM<sub>10</sub> na hora seguinte em oito estações de referência. Uma etapa de interpolação espacial projeta essas previsões nos centros dos 645 municípios paulistas.</p>
    <p>Essa ampliação é uma <strong>estimativa computacional</strong>: não cria sensores físicos nas cidades nem substitui medições oficiais.</p>
    <h3>Conexão com os ODS</h3>
    <ul>
      <li><strong>ODS 11, meta 11.6:</strong> informação para estudar impactos ambientais urbanos e apoiar políticas de qualidade do ar.</li>
      <li><strong>ODS 3, meta 3.9:</strong> contribuir para identificar episódios de poluição associados a riscos à saúde.</li>
      <li><strong>ODS 9, meta 9.5:</strong> reaproveitar a infraestrutura GNSS da RBMC/IBGE e ferramentas abertas para inovação.</li>
    </ul>
  `,
  dados: `
    <h3>Fontes e cobertura</h3>
    <p>A série reúne <strong>60 dias de dados horários</strong> do Open-Meteo Air Quality &amp; Weather e parâmetros SNR GNSS da RBMC/IBGE em oito estações: POLI (São Paulo/USP), SJSP (São José dos Campos), PPTE (Presidente Prudente), SPAR (Araçatuba), FRAN (Franca), BAUR (Bauru), UBA1 (Ubatuba) e ILHA (Ilha Solteira).</p>
    <h3>O que entra em cada previsão</h3>
    <p>O modelo analisa janelas deslizantes de 24 horas. As oito variáveis são o histórico recente de PM<sub>2.5</sub> e PM<sub>10</sub>, profundidade óptica de aerossóis (AOD, indicador de partículas ao longo da coluna atmosférica), temperatura, umidade relativa, precipitação e duas codificações cíclicas da hora (seno e cosseno). A saída é uma previsão para <strong>t+1</strong>, isto é, a hora seguinte.</p>
    <p>A codificação cíclica ajuda a representar que 23h e 0h são horas vizinhas, apesar da diferença numérica entre 23 e 0.</p>
  `,
  modelo: `
    <h3>Da sequência ao valor previsto</h3>
    <p>A arquitetura híbrida <strong>1D-CNN + LSTM</strong> combina duas formas de analisar séries temporais:</p>
    <ul>
      <li><strong>1D-CNN (convolução unidimensional):</strong> identifica variações locais e padrões de curto prazo nos dados horários.</li>
      <li><strong>LSTM:</strong> mantém contexto ao longo da sequência para aprender dependências temporais e ciclos atmosféricos diários.</li>
    </ul>
    <h3>Como as previsões chegam ao mapa</h3>
    <p>O modelo Sampa Ar gera previsões para as oito estações. Em seguida, a interpolação <strong>IDW</strong> (Inverse Distance Weighting, ou ponderação pelo inverso da distância) estima valores nos centros municipais usando as quatro estações mais próximas; pontos mais próximos têm maior influência.</p>
    <p>Assim, o mapa HTML interativo, gerado com Folium e integrado ao dashboard, representa uma superfície estimada a partir dos pontos de referência. Condições locais entre estações podem não estar representadas.</p>
  `,
  resultados: `
    <h3>Resultados de validação reportados</h3>
    <p>A comparação do documento é entre um modelo-base treinado com 14 dias e o modelo final com 60 dias e codificação cíclica da hora:</p>
    <table>
      <thead><tr><th>Métrica</th><th>Base (14 dias)</th><th>Final (60 dias + ciclo horário)</th><th>Variação</th></tr></thead>
      <tbody>
        <tr><td>MAE de PM<sub>2.5</sub></td><td>4,30 µg/m³</td><td>1,13 µg/m³</td><td>redução de ~74%</td></tr>
        <tr><td>MAE de PM<sub>10</sub></td><td>4,92 µg/m³</td><td>1,33 µg/m³</td><td>redução de ~73%</td></tr>
        <tr><td>Perda Huber</td><td>0,2083</td><td>0,0217</td><td>redução de ~90%</td></tr>
      </tbody>
    </table>
    <p><strong>MAE</strong> é o erro absoluto médio: em termos simples, indica o tamanho médio da diferença entre previsões e valores de referência no conjunto avaliado. A perda Huber também mede erro, mas não é expressa em µg/m³. São métricas de validação; não garantem o mesmo erro em todas as horas ou nos 645 municípios.</p>
    <h3>Aplicações possíveis e próximos passos</h3>
    <p>O painel pode apoiar análises de saúde pública, gestão municipal e defesa civil, monitoramento ambiental e planejamento urbano. Isso significa ampliar informação para investigação e planejamento — não emitir alertas oficiais ou recomendações individuais.</p>
    <p>O documento aponta como próximos passos incorporar outros poluentes, como ozônio e dióxido de nitrogênio, automatizar a execução em nuvem e avaliar a expansão para outros estados.</p>
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
    elDica.textContent = `Faixa de referência CETESB para PM2.5: ${infoPm25.status}. É uma previsão para a hora seguinte, não um boletim oficial nem uma orientação de saúde.`;
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
      pillAtualizacao.textContent = `Atualizado: ${formatarDataHoraBrasilia(dadosGlobais.atualizacaoTimestamp)} (Horário de Brasília)`;
    }

    popularControlesEstacoes(estacoesCache);
    atualizarPainelSuave('Estado de SP', dadosGlobais.media_sp_pm25, dadosGlobais.media_sp_pm10, 'SP');
  };

  // Carrega as previsões geradas pelo modelo para as estações.
  fetch('estacoes_pred.json')
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