/* =========================================================
   ENGINEGAME — EDITOR 2D COM GERENCIAMENTO DE PROJETOS
   Salvamento automático, projetos independentes e orientação
========================================================= */

const canvas = document.getElementById("editorCanvas");
const ctx = canvas.getContext("2d");

const sceneTree = document.getElementById("sceneTree");
const inspector = document.getElementById("inspector");
const output = document.getElementById("output");

const addObjectBtn = document.getElementById("addObjectBtn");
const deleteObjectBtn = document.getElementById("deleteObjectBtn");
const runBtn = document.getElementById("runBtn");

const projectManager = document.getElementById("projectManager");
const newProjectBtn = document.getElementById("newProjectBtn");
const projectList = document.getElementById("projectList");
const newProjectModal = document.getElementById("newProjectModal");
const editorApp = document.getElementById("editorApp");
const projectNameInput = document.getElementById("projectNameInput");
const cancelProjectBtn = document.getElementById("cancelProjectBtn");
const createProjectBtn = document.getElementById("createProjectBtn");

const CHAVE_PROJETOS = "engineGameProjetosV2";
const CHAVE_PROJETO_ATIVO = "engineGameProjetoAtivoV2";
const CHAVE_PROJETO_ANTIGO = "engineGameProjetoV1";

const LARGURA_PAISAGEM = 640;
const ALTURA_PAISAGEM = 400;
const LARGURA_RETRATO = 360;
const ALTURA_RETRATO = 640;

const TAMANHO_ALCA = 8;
const TAMANHO_MINIMO = 10;

let projetos = [];
let projetoAtivoId = null;
let orientacaoNova = "landscape";

let objetos = [];
let objetoSelecionadoId = null;
let ferramenta = "select";
let arrastando = false;
let modoArrasto = "mover";
let alcaSelecionada = null;
let ponteiroId = null;
let deslocamentoX = 0;
let deslocamentoY = 0;
let inicioX = 0;
let inicioY = 0;
let inicioLargura = 0;
let inicioAltura = 0;
let inicioDesenho = null;
let proximoId = 1;
let executando = false;
/* =========================================================
   SISTEMA DE MUNDO INFINITO & CÂMERA DO EDITOR
========================================================= */

let editorOffsetX = 0;
let editorOffsetY = 0;
let arrastandoEditor = false;
let inicioPanX = 0;
let inicioPanY = 0;



const gamePreview = document.getElementById("gamePreview");
const gameCanvas = document.getElementById("gameCanvas");
const gameCtx = gameCanvas.getContext("2d");
const stopGameBtn = document.getElementById("stopGameBtn");

const scriptEditor = document.getElementById("scriptEditor");
const scriptCode = document.getElementById("scriptCode");
const scriptObjectName = document.getElementById("scriptObjectName");
const scriptFileName = document.getElementById("scriptFileName");
const scriptStatus = document.getElementById("scriptStatus");
const validateScriptBtn = document.getElementById("validateScriptBtn");

/* =========================================================
   MODELO DE CENA
========================================================= */

function criarObjetosIniciais() {
  return [
    {
      id: 1,
      nome: "Jogador",
      tipo: "Sprite2D",
      forma: "rect",
      x: 100,
      y: 90,
      largura: 50,
      altura: 50,
      cor: "#2563eb",
      opacidade: 1,
      camada: 2,
      script: ""
    },
    {
      id: 2,
      nome: "Inimigo",
      tipo: "Sprite2D",
      forma: "rect",
      x: 260,
      y: 150,
      largura: 50,
      altura: 50,
      cor: "#ef4444",
      opacidade: 1,
      camada: 1,
      script: ""
    },
    {
      id: 3,
      nome: "Plataforma",
      tipo: "StaticBody2D",
      forma: "rect",
      x: 80,
      y: 300,
      largura: 200,
      altura: 25,
      cor: "#16a34a",
      opacidade: 1,
      camada: 0,
      script: ""
    },
    {
      id: 4,
      nome: "Colisão",
      tipo: "StaticBody2D",
      forma: "rect",
      x: 150,
      y: 200,
      largura: 80,
      altura: 80,
      cor: "#9333ea",
      opacidade: 1,
      camada: 1,
      script: ""
    }
  ];
}

function criarIdProjeto() {
  return "projeto_" + Date.now().toString(36) +
    "_" + Math.random().toString(36).slice(2, 8);
}

function criarProjeto(nome, orientacao = "landscape") {
  return {
    id: criarIdProjeto(),
    nome: nome.trim(),
    orientacao,
    atualizadoEm: Date.now(),
    objetos: criarObjetosIniciais(),
    objetoSelecionadoId: 1,
    proximoId: 5
  };
}

function obterProjetoAtivo() {
  return projetos.find(projeto => projeto.id === projetoAtivoId) || null;
}

function definirTamanhoCanvas() {
  const container = canvas.parentElement;
  
  canvas.width = container ? container.clientWidth || window.innerWidth : window.innerWidth;
  canvas.height = container ? container.clientHeight || window.innerHeight : window.innerHeight;

  canvas.style.width = "100%";
  canvas.style.height = "100%";
  canvas.style.aspectRatio = "";

  if (gameCanvas && gameCanvas.parentElement) {
    const gameContainer = gameCanvas.parentElement;
    gameCanvas.width = gameContainer.clientWidth || window.innerWidth;
    gameCanvas.height = gameContainer.clientHeight || window.innerHeight;
    gameCanvas.style.width = "100%";
    gameCanvas.style.height = "100%";
    gameCanvas.style.aspectRatio = "";
  }

  desenhar();
}

window.addEventListener("resize", () => definirTamanhoCanvas());

/* =========================================================
   ARMAZENAMENTO E MIGRAÇÃO
========================================================= */

function salvarListaProjetos() {
  try {
    localStorage.setItem(CHAVE_PROJETOS, JSON.stringify(projetos));
    localStorage.setItem(CHAVE_PROJETO_ATIVO, projetoAtivoId || "");
    return true;
  } catch (erro) {
    console.error(erro);
    output.textContent = "Não foi possível salvar os projetos.";
    return false;
  }
}

function salvarProjeto() {
  const projeto = obterProjetoAtivo();

  if (!projeto) return;

  projeto.objetos = objetos;
  projeto.objetoSelecionadoId = objetoSelecionadoId;
  projeto.proximoId = proximoId;
  projeto.atualizadoEm = Date.now();

  const salvo = salvarListaProjetos();

  if (salvo) {
    output.textContent = "Projeto salvo automaticamente.";
  }
}

function normalizarProjeto(projeto) {
  if (!projeto || typeof projeto !== "object") return null;

  const listaObjetos = Array.isArray(projeto.objetos)
    ? projeto.objetos
    : criarObjetosIniciais();

  const objetosValidos = listaObjetos
    .filter(obj => obj && typeof obj === "object")
    .map((obj, indice) => {
      const formasValidas = [
        "rect",
        "circle",
        "triangle",
        "joystick",
        "camera",
        "button"
      ];

      const tiposValidos = [
        "Sprite2D",
        "StaticBody2D",
        "Area2D",
        "Control2D",
        "Camera2D"
      ];

      const forma = formasValidas.includes(obj.forma)
        ? obj.forma
        : "rect";

      const tipo = tiposValidos.includes(obj.tipo)
        ? obj.tipo
        : "Sprite2D";

            return {
        id: Number.isFinite(Number(obj.id))
          ? Number(obj.id)
          : indice + 1,

        nome: String(obj.nome || `Objeto ${indice + 1}`),

        tipo,
        forma,

        x: Number.isFinite(Number(obj.x))
          ? Number(obj.x)
          : 0,

        y: Number.isFinite(Number(obj.y))
          ? Number(obj.y)
          : 0,

        largura: Math.max(
          TAMANHO_MINIMO,
          Number(obj.largura) || 50
        ),

        altura: Math.max(
          TAMANHO_MINIMO,
          Number(obj.altura) || 50
        ),

        cor: typeof obj.cor === "string"
          ? obj.cor
          : "#2563eb",

        opacidade: Number.isFinite(Number(obj.opacidade))
          ? Math.max(0, Math.min(1, Number(obj.opacidade)))
          : 1,

        camada: Number.isFinite(Number(obj.camada))
          ? Math.trunc(Number(obj.camada))
          : 0,

        pressionado: obj.pressionado === true,
        acabouDePressionar: obj.acabouDePressionar === true,

        cameraTipo: ["estatica", "seguir"].includes(obj.cameraTipo) ? obj.cameraTipo : "estatica",
        cameraAlvo: typeof obj.cameraAlvo === "string" ? obj.cameraAlvo : "Jogador",

        // Adicione esta propriedade para o arredondamento ser salvo corretamente:
        arredondamento: Number.isFinite(Number(obj.arredondamento))
          ? Number(obj.arredondamento)
          : 0,

        script: typeof obj.script === "string"
          ? obj.script
          : ""
      };
    });

  const maiorId = Math.max(
    0,
    ...objetosValidos.map(obj => obj.id)
  );

  const orientacao = projeto.orientacao === "portrait"
    ? "portrait"
    : "landscape";

  return {
    id: String(projeto.id || criarIdProjeto()),
    nome: String(projeto.nome || "Projeto sem nome"),
    orientacao,
    atualizadoEm: Number(projeto.atualizadoEm) || Date.now(),
    objetos: objetosValidos,
    objetoSelecionadoId: projeto.objetoSelecionadoId ?? objetosValidos[0]?.id ?? null,
    proximoId: Math.max(Number(projeto.proximoId) || 1, maiorId + 1)
  };
}

function carregarListaProjetos() {
  try {
    const salvo = localStorage.getItem(CHAVE_PROJETOS);

    if (salvo) {
      const lista = JSON.parse(salvo);
      projetos = Array.isArray(lista)
        ? lista.map(normalizarProjeto).filter(Boolean)
        : [];
    } else {
      projetos = [];

      const projetoAntigo = localStorage.getItem(CHAVE_PROJETO_ANTIGO);

      if (projetoAntigo) {
        try {
          const dadosAntigos = JSON.parse(projetoAntigo);
          const migrado = normalizarProjeto({
            id: criarIdProjeto(),
            nome: "Meu Projeto",
            orientacao: "landscape",
            ...dadosAntigos
          });

          if (migrado) projetos.push(migrado);
        } catch (erro) {
          console.warn("Não foi possível migrar o projeto antigo.", erro);
        }
      }
    }

    projetoAtivoId = localStorage.getItem(CHAVE_PROJETO_ATIVO) || null;

    if (!projetos.some(projeto => projeto.id === projetoAtivoId)) {
      projetoAtivoId = null;
    }

    salvarListaProjetos();
  } catch (erro) {
    console.error(erro);
    projetos = [];
    projetoAtivoId = null;
  }
}

/* =========================================================
   GERENCIADOR DE PROJETOS
========================================================= */

function mostrarGerenciador() {
  pararJogo();
  fecharEditorScript();

  if (editorApp) {
    editorApp.style.display = "none";
  }

  if (projectManager) {
    projectManager.style.display = "flex";
    projectManager.classList.remove("hidden");
  }

  atualizarListaProjetos();
}

function mostrarEditor() {
  if (projectManager) {
    projectManager.style.display = "none";
  }

  if (editorApp) {
    editorApp.style.display = "";
    editorApp.classList.remove("hidden");
  }

  const projeto = obterProjetoAtivo();

  if (!projeto) {
    mostrarGerenciador();
    return;
  }

  const titulo = document.querySelector(".project-name");

  if (titulo) {
    titulo.textContent = projeto.nome;
  }

  definirTamanhoCanvas(projeto.orientacao);

  atualizarArvore();
  atualizarInspetor();
  desenhar();
}

function atualizarListaProjetos() {
  if (!projectList) return;

  projectList.innerHTML = "";

  if (projetos.length === 0) {
    const vazio = document.createElement("div");
    vazio.className = "empty-message";
    vazio.textContent = "Nenhum projeto criado. Toque em Novo Projeto para começar.";
    projectList.appendChild(vazio);
    return;
  }

  const ordenados = [...projetos].sort(
    (a, b) => (b.atualizadoEm || 0) - (a.atualizadoEm || 0)
  );

  for (const projeto of ordenados) {
    const card = document.createElement("div");
    card.className = "project-card";

    const informacoes = document.createElement("div");
    informacoes.className = "project-card-info";

    const nome = document.createElement("h3");
    nome.textContent = projeto.nome;

    const detalhes = document.createElement("p");
    const orientacao = projeto.orientacao === "portrait"
      ? "Retrato"
      : "Paisagem";

    detalhes.textContent = `${orientacao} • ${projeto.objetos.length} objeto(s)`;

    informacoes.append(nome, detalhes);

    const acoes = document.createElement("div");
    acoes.className = "project-card-actions";

    const abrir = document.createElement("button");
    abrir.type = "button";
    abrir.className = "btn btn-run";
    abrir.textContent = "Abrir";
    abrir.addEventListener("click", () => abrirProjeto(projeto.id));

    const excluir = document.createElement("button");
    excluir.type = "button";
    excluir.className = "btn";
    excluir.textContent = "Excluir";
    excluir.addEventListener("click", () => excluirProjeto(projeto.id));

    acoes.append(abrir, excluir);
    card.append(informacoes, acoes);
    projectList.appendChild(card);
  }
}

function abrirModalProjeto() {
  orientacaoNova = "landscape";

  if (projectNameInput) projectNameInput.value = "";

  document.querySelectorAll(".orientation-option").forEach(botao => {
    botao.classList.toggle(
      "selected",
      botao.dataset.orientation === orientacaoNova
    );
  });

  if (newProjectModal) {
    newProjectModal.classList.remove("hidden");
    newProjectModal.style.display = "flex";
  }

  setTimeout(() => projectNameInput?.focus(), 50);
}

function fecharModalProjeto() {
  if (!newProjectModal) return;
  newProjectModal.classList.add("hidden");
  newProjectModal.style.display = "none";
}

function criarNovoProjeto() {
  const nome = projectNameInput?.value.trim();

  if (!nome) {
    output.textContent = "Digite um nome para o projeto.";
    projectNameInput?.focus();
    return;
  }

  const projeto = criarProjeto(nome, orientacaoNova);
  projetos.push(projeto);
  projetoAtivoId = projeto.id;

  carregarDadosProjeto(projeto);
  salvarProjeto();
  fecharModalProjeto();
  mostrarEditor();
}

function carregarDadosProjeto(projeto) {
  objetos = projeto.objetos.map(obj => ({ ...obj }));
  objetoSelecionadoId = projeto.objetoSelecionadoId;

  proximoId = projeto.proximoId ||
    Math.max(0, ...objetos.map(obj => obj.id)) + 1;

  if (!objetos.some(obj => obj.id === objetoSelecionadoId)) {
    objetoSelecionadoId = objetos[0]?.id ?? null;
  }

  definirTamanhoCanvas(projeto.orientacao);
}

function abrirProjeto(id) {
  salvarProjeto();

  const projeto = projetos.find(item => item.id === id);
  if (!projeto) return;

  projetoAtivoId = projeto.id;
  carregarDadosProjeto(projeto);
  salvarListaProjetos();
  mostrarEditor();
  output.textContent = `Projeto "${projeto.nome}" aberto.`;
}

function excluirProjeto(id) {
  const projeto = projetos.find(item => item.id === id);
  if (!projeto) return;

  if (!confirm(`Deseja realmente excluir o projeto "${projeto.nome}"?`)) {
    return;
  }

  projetos = projetos.filter(item => item.id !== id);

  if (projetoAtivoId === id) {
    projetoAtivoId = null;
    objetos = [];
    objetoSelecionadoId = null;
    proximoId = 1;
    pararJogo();
    fecharEditorScript();

    if (editorApp) editorApp.style.display = "none";
    if (projectManager) projectManager.style.display = "flex";
  }

  salvarListaProjetos();
  atualizarListaProjetos();
}

function voltarParaProjetos() {
  salvarProjeto();
  mostrarGerenciador();
}

newProjectBtn?.addEventListener("click", abrirModalProjeto);
cancelProjectBtn?.addEventListener("click", fecharModalProjeto);
createProjectBtn?.addEventListener("click", criarNovoProjeto);

projectNameInput?.addEventListener("keydown", evento => {
  if (evento.key === "Enter") criarNovoProjeto();
  if (evento.key === "Escape") fecharModalProjeto();
});

document.querySelectorAll(".orientation-option").forEach(botao => {
  botao.addEventListener("click", () => {
    orientacaoNova = botao.dataset.orientation === "portrait"
      ? "portrait"
      : "landscape";

    document.querySelectorAll(".orientation-option").forEach(opcao => {
      opcao.classList.toggle("selected", opcao === botao);
    });
  });
});

const topbar = document.querySelector(".topbar");

if (topbar && !document.getElementById("backProjectsBtn")) {
  const backButton = document.createElement("button");
  backButton.id = "backProjectsBtn";
  backButton.type = "button";
  backButton.className = "btn";
  backButton.textContent = "‹ Projetos";
  backButton.addEventListener("click", voltarParaProjetos);
  topbar.prepend(backButton);
}

/* =========================================================
   EDITOR DE CENA
========================================================= */

function obterSelecionado() {
  return objetos.find(obj => obj.id === objetoSelecionadoId);
}

function ordenarPorCamada(lista) {
  return lista
    .map((obj, indice) => ({ obj, indice }))
    .sort((a, b) => {
      const camadaA = Number(a.obj.camada) || 0;
      const camadaB = Number(b.obj.camada) || 0;

      return camadaA - camadaB || a.indice - b.indice;
    })
    .map(item => item.obj);
}

function desenharGrade() {
  ctx.save();
  ctx.strokeStyle = "#303541";
  ctx.lineWidth = 1;

  const inicioXGrid = Math.floor(editorOffsetX / 20) * 20;
  const fimXGrid = inicioXGrid + canvas.width + 40;
  const inicioYGrid = Math.floor(editorOffsetY / 20) * 20;
  const fimYGrid = inicioYGrid + canvas.height + 40;

  for (let x = inicioXGrid; x <= fimXGrid; x += 20) {
    ctx.beginPath();
    ctx.moveTo(x - editorOffsetX, 0);
    ctx.lineTo(x - editorOffsetX, canvas.height);
    ctx.stroke();
  }

  for (let y = inicioYGrid; y <= fimYGrid; y += 20) {
    ctx.beginPath();
    ctx.moveTo(0, y - editorOffsetY);
    ctx.lineTo(canvas.width, y - editorOffsetY);
    ctx.stroke();
  }

  ctx.restore();
}

function desenharObjeto(obj) {
  const x = (Number(obj.x) || 0) - editorOffsetX;
  const y = (Number(obj.y) || 0) - editorOffsetY;
  const largura = Math.max(1, Number(obj.largura) || 50);
  const altura = Math.max(1, Number(obj.altura) || 50);

  ctx.save();

  const opacidade = Math.max(0, Math.min(1, Number(obj.opacidade ?? 1)));
  ctx.globalAlpha = opacidade;

  if (obj.forma === "joystick") {
    const centroX = x + largura / 2;
    const centroY = y + altura / 2;
    const raio = Math.min(largura, altura) / 2;

    ctx.globalAlpha = opacidade * 0.55;
    ctx.fillStyle = obj.cor || "#111827";
    ctx.beginPath();
    ctx.arc(centroX, centroY, raio, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.globalAlpha = opacidade * 0.9;
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(centroX, centroY, raio * 0.42, 0, Math.PI * 2);
    ctx.fill();

  } else if (obj.forma === "camera") {
    ctx.fillStyle = obj.cor || "#06b6d4";
    ctx.fillRect(x, y, largura, altura);

    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, largura, altura);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 14px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("📷", x + largura / 2, y + altura / 2);

    } else if (obj.forma === "button") {
    ctx.globalAlpha = opacidade * 0.75;
    ctx.fillStyle = obj.cor || "#2563eb";
    const raio = Number(obj.arredondamento) || 0;

    ctx.beginPath();
    if (typeof ctx.roundRect === "function") {
      ctx.roundRect(x, y, largura, altura, raio);
    } else {
      ctx.rect(x, y, largura, altura);
    }
    ctx.fill();

    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.globalAlpha = opacidade;
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 14px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(obj.nome || "AÇÃO", x + largura / 2, y + altura / 2);


  } else if (obj.forma === "triangle") {
    ctx.fillStyle = obj.cor || "#2563eb";
    ctx.beginPath();
    ctx.moveTo(x + largura / 2, y);
    ctx.lineTo(x + largura, y + altura);
    ctx.lineTo(x, y + altura);
    ctx.closePath();
    ctx.fill();

  } else if (obj.forma === "circle") {
    ctx.fillStyle = obj.cor || "#2563eb";
    ctx.beginPath();
    ctx.ellipse(x + largura / 2, y + altura / 2, largura / 2, altura / 2, 0, 0, Math.PI * 2);
    ctx.fill();

  } else {
    ctx.fillStyle = obj.cor || "#2563eb";
    ctx.fillRect(x, y, largura, altura);
  }

  ctx.restore();
}

function obterAlcas(obj) {
  const meioX = obj.x + obj.largura / 2;
  const meioY = obj.y + obj.altura / 2;
  const direita = obj.x + obj.largura;
  const baixo = obj.y + obj.altura;

  return [
    { nome: "nw", x: obj.x, y: obj.y },
    { nome: "n", x: meioX, y: obj.y },
    { nome: "ne", x: direita, y: obj.y },
    { nome: "e", x: direita, y: meioY },
    { nome: "se", x: direita, y: baixo },
    { nome: "s", x: meioX, y: baixo },
    { nome: "sw", x: obj.x, y: baixo },
    { nome: "w", x: obj.x, y: meioY }
  ];
}

function desenharSelecao(obj) {
  ctx.save();
  ctx.strokeStyle = "#facc15";
  ctx.lineWidth = 1.5;
  ctx.setLineDash([5, 3]);
  ctx.strokeRect(obj.x - editorOffsetX, obj.y - editorOffsetY, obj.largura, obj.altura);
  ctx.setLineDash([]);

  for (const alca of obterAlcas(obj)) {
    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = "#2563eb";
    ctx.lineWidth = 1.5;
    ctx.fillRect(
      alca.x - editorOffsetX - TAMANHO_ALCA / 2,
      alca.y - editorOffsetY - TAMANHO_ALCA / 2,
      TAMANHO_ALCA,
      TAMANHO_ALCA
    );
    ctx.strokeRect(
      alca.x - editorOffsetX - TAMANHO_ALCA / 2,
      alca.y - editorOffsetY - TAMANHO_ALCA / 2,
      TAMANHO_ALCA,
      TAMANHO_ALCA
    );
  }

  ctx.restore();
}

function desenharPrevia() {
  if (!inicioDesenho) return;

  const x = Math.min(inicioDesenho.x, inicioDesenho.atualX) - editorOffsetX;
  const y = Math.min(inicioDesenho.y, inicioDesenho.atualY) - editorOffsetY;
  const largura = Math.abs(inicioDesenho.atualX - inicioDesenho.x);
  const altura = Math.abs(inicioDesenho.atualY - inicioDesenho.y);

  ctx.save();
  ctx.strokeStyle = "#facc15";
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 4]);

  if (ferramenta === "circle") {
    ctx.beginPath();
    ctx.ellipse(x + largura / 2, y + altura / 2, largura / 2, altura / 2, 0, 0, Math.PI * 2);
    ctx.stroke();
  } else if (ferramenta === "triangle") {
    ctx.beginPath();
    ctx.moveTo(x + largura / 2, y);
    ctx.lineTo(x + largura, y + altura);
    ctx.lineTo(x, y + altura);
    ctx.closePath();
    ctx.stroke();
  } else {
    ctx.strokeRect(x, y, largura, altura);
  }

  ctx.restore();
}

function desenhar() {
  if (!ctx || !canvas.width || !canvas.height) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  desenharGrade();

  for (const obj of ordenarPorCamada(objetos)) {
    desenharObjeto(obj);
  }

  const selecionado = obterSelecionado();
  if (selecionado) desenharSelecao(selecionado);

  desenharPrevia();
}

function atualizarArvore() {
  if (!sceneTree) return;

  sceneTree.innerHTML = "";

  for (const obj of objetos) {
    const item = document.createElement("div");
    item.className = "tree-item";

    if (obj.id === objetoSelecionadoId) {
      item.classList.add("selected");
    }

    const icones = {
      rect: "▣",
      circle: "◯",
      triangle: "▲",
      joystick: "🕹️",
      button: "🔘",
      camera: "📷"
    };

    item.textContent = (icones[obj.forma] || "▣") + " " + obj.nome;
    item.addEventListener("click", () => selecionarObjeto(obj.id));
    sceneTree.appendChild(item);
  }
}

function criarCampo(rotulo, propriedade, valor, tipo = "text") {
  const campo = document.createElement("div");
  campo.className = "field";

  const label = document.createElement("label");
  label.textContent = rotulo;

  const input = document.createElement("input");
  input.type = tipo;
  input.value = valor;

  if (tipo === "number") input.step = "1";

  input.addEventListener("change", () => {
    alterarPropriedade(propriedade, input.value, tipo);
  });

  campo.append(label, input);
  return campo;
}

function criarCampoOpacidade(valor) {
  const campo = document.createElement("div");
  campo.className = "field";

  const cabecalho = document.createElement("div");
  cabecalho.style.display = "flex";
  cabecalho.style.justifyContent = "space-between";
  cabecalho.style.alignItems = "center";

  const label = document.createElement("label");
  label.textContent = "Opacidade";

  const valorTexto = document.createElement("span");
  valorTexto.style.fontSize = "13px";
  valorTexto.style.color = "#9ca3af";
  valorTexto.textContent = `${Math.round(valor * 100)}%`;

  cabecalho.append(label, valorTexto);

  const input = document.createElement("input");
  input.type = "range";
  input.min = "0";
  input.max = "100";
  input.step = "1";
  input.value = String(Math.round(valor * 100));
  input.style.width = "100%";

  input.addEventListener("input", () => {
    const obj = obterSelecionado();
    if (!obj) return;

    const porcentagem = Number(input.value);
    obj.opacidade = porcentagem / 100;

    valorTexto.textContent = `${porcentagem}%`;

    desenhar();
    salvarProjeto();
  });

  campo.append(cabecalho, input);
  return campo;
}

function atualizarInspetor() {
  if (!inspector) return;

  const obj = obterSelecionado();

  if (!obj) {
    inspector.innerHTML =
      '<p class="empty-message">Selecione um objeto para editar.</p>';
    return;
  }

  inspector.innerHTML = "";

  const propriedades = document.createElement("div");
  propriedades.className = "inspector-section";

  const titulo = document.createElement("div");
  titulo.className = "section-title";
  titulo.textContent = "Propriedades";

  propriedades.append(
    titulo,
    criarCampo("Nome", "nome", obj.nome),
    criarCampo("Camada (Z)", "camada", obj.camada ?? 0, "number")
  );

  const tipoCampo = document.createElement("div");
  tipoCampo.className = "field";

  const tipoLabel = document.createElement("label");
  tipoLabel.textContent = "Tipo";

  const tipoSelect = document.createElement("select");

  for (const nomeTipo of ["Sprite2D", "StaticBody2D", "Area2D"]) {
    const option = document.createElement("option");
    option.value = nomeTipo;
    option.textContent = nomeTipo;
    tipoSelect.appendChild(option);
  }

  tipoSelect.value = obj.tipo;
  tipoSelect.addEventListener("change", () => {
    alterarPropriedade("tipo", tipoSelect.value);
  });

  tipoCampo.append(tipoLabel, tipoSelect);
  propriedades.appendChild(tipoCampo);

  const scriptButton = document.createElement("button");
  scriptButton.className = "btn";
  scriptButton.textContent = "〈/〉 Abrir Script";
  scriptButton.style.width = "100%";
  scriptButton.addEventListener("click", abrirEditorScript);
  propriedades.appendChild(scriptButton);

  const transformacao = document.createElement("div");
  transformacao.className = "inspector-section";

  const tituloTransformacao = document.createElement("div");
  tituloTransformacao.className = "section-title";
  tituloTransformacao.textContent = "Transformação";

  const posicao = document.createElement("div");
  posicao.className = "field-row";
  posicao.append(
    criarCampo("Posição X", "x", obj.x, "number"),
    criarCampo("Posição Y", "y", obj.y, "number")
  );

  const tamanho = document.createElement("div");
  tamanho.className = "field-row";
  tamanho.append(
    criarCampo("Largura", "largura", obj.largura, "number"),
    criarCampo("Altura", "altura", obj.altura, "number")
  );

  transformacao.append(tituloTransformacao, posicao, tamanho);

  const visual = document.createElement("div");
  visual.className = "inspector-section";

  const tituloVisual = document.createElement("div");
  tituloVisual.className = "section-title";
  tituloVisual.textContent = "Visual";

  visual.append(
    tituloVisual,
    criarCampo("Cor", "cor", obj.cor, "color"),
    criarCampoOpacidade(obj.opacidade ?? 1)
  );

  inspector.append(propriedades, transformacao, visual);

  // Secção específica para Câmera
  if (obj.forma === "camera") {
    const cameraSecao = document.createElement("div");
    cameraSecao.className = "inspector-section";

    const tituloCamera = document.createElement("div");
    tituloCamera.className = "section-title";
    tituloCamera.textContent = "Configurações da Câmera";

    const tipoCampoCam = document.createElement("div");
    tipoCampoCam.className = "field";

    const tipoLabelCam = document.createElement("label");
    tipoLabelCam.textContent = "Tipo de Câmera";

    const tipoSelectCam = document.createElement("select");
    
    const optEstatica = document.createElement("option");
    optEstatica.value = "estatica";
    optEstatica.textContent = "Estática";
    
    const optSeguir = document.createElement("option");
    optSeguir.value = "seguir";
    optSeguir.textContent = "Seguir Objeto";

    tipoSelectCam.append(optEstatica, optSeguir);
    tipoSelectCam.value = obj.cameraTipo || "estatica";
    
    tipoSelectCam.addEventListener("change", () => {
      alterarPropriedade("cameraTipo", tipoSelectCam.value);
      atualizarInspetor();
    });

    tipoCampoCam.append(tipoLabelCam, tipoSelectCam);
    cameraSecao.append(tituloCamera, tipoCampoCam);

    if (obj.cameraTipo === "seguir") {
      const alvoCampo = document.createElement("div");
      alvoCampo.className = "field";

      const alvoLabel = document.createElement("label");
      alvoLabel.textContent = "Objeto Alvo";

      const alvoSelect = document.createElement("select");
      
      for (const itemObj of objetos) {
        if (itemObj.id !== obj.id) {
          const option = document.createElement("option");
          option.value = itemObj.nome;
          option.textContent = itemObj.nome;
          alvoSelect.appendChild(option);
        }
      }

      alvoSelect.value = obj.cameraAlvo || "Jogador";
      
      alvoSelect.addEventListener("change", () => {
        alterarPropriedade("cameraAlvo", alvoSelect.value);
      });

      alvoCampo.append(alvoLabel, alvoSelect);
      cameraSecao.appendChild(alvoCampo);
    }

    inspector.append(cameraSecao);
  }

  // Secção específica para Botão
  if (obj.forma === "button") {
    const botaoSecao = document.createElement("div");
    botaoSecao.className = "inspector-section";

    const tituloBotao = document.createElement("div");
    tituloBotao.className = "section-title";
    tituloBotao.textContent = "Configurações do Botão";

    botaoSecao.append(
      tituloBotao,
      criarCampo("Arredondamento", "arredondamento", obj.arredondamento ?? 0, "number")
    );

    inspector.append(botaoSecao);
  }
}

function selecionarObjeto(id) {
  objetoSelecionadoId = id;
  atualizarArvore();
  atualizarInspetor();
  desenhar();
  salvarProjeto();
}

function alterarPropriedade(propriedade, valor, tipo) {
  const obj = obterSelecionado();
  if (!obj) return;

  if (tipo === "number") {
    valor = Number(valor);
    if (!Number.isFinite(valor)) return;

    if (propriedade === "largura" || propriedade === "altura") {
      valor = Math.max(TAMANHO_MINIMO, valor);
    }
  }

  obj[propriedade] = valor;
  atualizarArvore();
  atualizarInspetor();
  desenhar();
  salvarProjeto();
}

function adicionarObjeto(
  forma = "rect",
  x = 180,
  y = 100,
  largura = 50,
  altura = 50,
  tipo = "Sprite2D"
) {
  const id = proximoId++;

  const nomes = {
    rect: "Retangulo",
    circle: "Circulo",
    triangle: "Triangulo",
    joystick: "Joystick",
    button: "Botao",
    camera: "Camera"
  };

    const novoObjeto = {
    id,
    nome: (nomes[forma] || "Objeto") + id,
    tipo,
    forma,
    x,
    y,
    largura,
    altura,
    cor: forma === "circle" ? "#f59e0b" :
      forma === "triangle" ? "#eab308" :
      forma === "joystick" ? "#64748b" :
      forma === "button" ? "#16a34a" : 
      forma === "camera" ? "#06b6d4" : "#a855f7",
    pressionado: false,
    acabouDePressionar: false,
    opacidade: 1,
    camada: 0,
    arredondamento: 0, // Adicione esta linha aqui
    cameraTipo: "estatica",
    cameraAlvo: "Jogador",
    script: "// Código do objeto\n"
  };

  objetos.push(novoObjeto);
  selecionarObjeto(novoObjeto.id);
  output.textContent = "Novo objeto criado.";
  salvarProjeto();
}

addObjectBtn?.addEventListener("click", () => {
  const escolha = prompt(
    "Escolha o objeto:\n\n" +
    "1 - Retângulo\n" +
    "2 - Círculo\n" +
    "3 - Joystick virtual\n" +
    "4 - Botão de ação\n" +
    "5 - Triângulo\n" +
    "6 - Câmera"
  );

  if (escolha === null) return;

  const opcoes = {
    "1": "rect",
    "2": "circle",
    "3": "joystick",
    "4": "button",
    "5": "triangle",
    "6": "camera"
  };

  const forma = opcoes[escolha.trim()];

  if (!forma) {
    output.textContent = "Opção inválida. Digite um número de 1 a 6.";
    return;
  }

  const dimensoes = {
    rect: [50, 50],
    circle: [50, 50],
    triangle: [60, 60],
    joystick: [100, 100],
    button: [65, 65],
    camera: [40, 40]
  };

  const [largura, altura] = dimensoes[forma];

  adicionarObjeto(
    forma,
    180,
    100,
    largura,
    altura,
    forma === "joystick" || forma === "button"
      ? "Control2D"
      : forma === "camera"
      ? "Camera2D"
      : "Sprite2D"
  );
});

function removerObjeto() {
  if (objetoSelecionadoId === null) return;

  objetos = objetos.filter(obj => obj.id !== objetoSelecionadoId);
  objetoSelecionadoId = objetos.length ? objetos[0].id : null;

  atualizarArvore();
  atualizarInspetor();
  desenhar();
  salvarProjeto();

  output.textContent = "Objeto removido.";
}

function obterPosicaoPonteiro(evento) {
  const rect = canvas.getBoundingClientRect();
  const xTela = (evento.clientX - rect.left) * canvas.width / rect.width;
  const yTela = (evento.clientY - rect.top) * canvas.height / rect.height;

  return {
    x: xTela + editorOffsetX,
    y: yTela + editorOffsetY
  };
}

function encontrarAlca(obj, x, y) {
  for (const alca of obterAlcas(obj)) {
    if (Math.hypot(x - alca.x, y - alca.y) <= TAMANHO_ALCA) {
      return alca.nome;
    }
  }

  return null;
}

function encontrarObjeto(x, y) {
  const ordenados = ordenarPorCamada(objetos);

  for (let i = ordenados.length - 1; i >= 0; i--) {
    const obj = ordenados[i];

    if (
      x >= obj.x && x <= obj.x + obj.largura &&
      y >= obj.y && y <= obj.y + obj.altura
    ) {
      return obj;
    }
  }

  return null;
}

function iniciarRedimensionamento(obj, alca, x, y) {
  arrastando = true;
  modoArrasto = "redimensionar";
  alcaSelecionada = alca;
  inicioX = obj.x;
  inicioY = obj.y;
  inicioLargura = obj.largura;
  inicioAltura = obj.altura;
  deslocamentoX = x;
  deslocamentoY = y;
}

function selecionarFerramenta(novaFerramenta) {
  ferramenta = novaFerramenta;

  document.querySelectorAll("[data-tool]").forEach(botao => {
    botao.classList.toggle(
      "active",
      botao.dataset.tool === ferramenta
    );
  });

  canvas.style.cursor = ferramenta === "select" ? "default" : "crosshair";
  output.textContent = "Ferramenta ativa: " + ferramenta;
}

document.querySelectorAll("[data-tool]").forEach(botao => {
  botao.addEventListener("click", () => {
    selecionarFerramenta(botao.dataset.tool);
  });
});

document.getElementById("deleteTool")?.addEventListener("click", removerObjeto);
deleteObjectBtn?.addEventListener("click", removerObjeto);

canvas.addEventListener("pointerdown", evento => {
  if (evento.button !== undefined && evento.button !== 0) return;

  const pos = obterPosicaoPonteiro(evento);
  const selecionado = obterSelecionado();

  if (ferramenta === "rect" || ferramenta === "circle" || ferramenta === "triangle") {
    arrastando = true;
    modoArrasto = "desenhar";
    ponteiroId = evento.pointerId;

    inicioDesenho = {
      x: pos.x,
      y: pos.y,
      atualX: pos.x,
      atualY: pos.y
    };

    canvas.setPointerCapture(evento.pointerId);
    evento.preventDefault();
    desenhar();
    return;
  }

  if (selecionado) {
    const alca = encontrarAlca(selecionado, pos.x, pos.y);
    if (alca) {
      iniciarRedimensionamento(selecionado, alca, pos.x, pos.y);
      ponteiroId = evento.pointerId;
      canvas.setPointerCapture(evento.pointerId);
      evento.preventDefault();
      return;
    }
  }

  const objeto = encontrarObjeto(pos.x, pos.y);

  if (!objeto) {
    selecionarObjeto(null);
    arrastandoEditor = true;
    inicioPanX = evento.clientX;
    inicioPanY = evento.clientY;
    ponteiroId = evento.pointerId;
    canvas.setPointerCapture(evento.pointerId);
    evento.preventDefault();
    return;
  }

  selecionarObjeto(objeto.id);
  arrastando = true;
  modoArrasto = "mover";
  ponteiroId = evento.pointerId;
  deslocamentoX = pos.x - objeto.x;
  deslocamentoY = pos.y - objeto.y;

  canvas.setPointerCapture(evento.pointerId);
  evento.preventDefault();
});

canvas.addEventListener("pointermove", evento => {
  const pos = obterPosicaoPonteiro(evento);
  const selecionado = obterSelecionado();

  if (!arrastando && !arrastandoEditor) {
    if (ferramenta === "select" && selecionado) {
      const alca = encontrarAlca(selecionado, pos.x, pos.y);
      const cursores = {
        nw: "nwse-resize", se: "nwse-resize",
        ne: "nesw-resize", sw: "nesw-resize",
        n: "ns-resize", s: "ns-resize",
        e: "ew-resize", w: "ew-resize"
      };

      if (alca) {
        canvas.style.cursor = cursores[alca];
      } else if (encontrarObjeto(pos.x, pos.y)) {
        canvas.style.cursor = "grab";
      } else {
        canvas.style.cursor = "grab";
      }
    }
    return;
  }

  if (arrastandoEditor && evento.pointerId === ponteiroId) {
    const dx = evento.clientX - inicioPanX;
    const dy = evento.clientY - inicioPanY;
    editorOffsetX -= dx;
    editorOffsetY -= dy;
    inicioPanX = evento.clientX;
    inicioPanY = evento.clientY;
    desenhar();
    return;
  }

  if (modoArrasto === "desenhar" && inicioDesenho) {
    inicioDesenho.atualX = pos.x;
    inicioDesenho.atualY = pos.y;
    desenhar();
    return;
  }

  if (!selecionado) return;

  if (modoArrasto === "mover") {
    selecionado.x = Math.round(pos.x - deslocamentoX);
    selecionado.y = Math.round(pos.y - deslocamentoY);
  }

  if (modoArrasto === "redimensionar") {
    const dx = pos.x - deslocamentoX;
    const dy = pos.y - deslocamentoY;

    let esquerda = inicioX;
    let topo = inicioY;
    let direita = inicioX + inicioLargura;
    let baixo = inicioY + inicioAltura;

    if (alcaSelecionada.includes("w")) esquerda = Math.min(direita - TAMANHO_MINIMO, inicioX + dx);
    if (alcaSelecionada.includes("e")) direita = Math.max(esquerda + TAMANHO_MINIMO, inicioX + inicioLargura + dx);
    if (alcaSelecionada.includes("n")) topo = Math.min(baixo - TAMANHO_MINIMO, inicioY + dy);
    if (alcaSelecionada.includes("s")) baixo = Math.max(topo + TAMANHO_MINIMO, inicioY + inicioAltura + dy);

    selecionado.x = Math.round(esquerda);
    selecionado.y = Math.round(topo);
    selecionado.largura = Math.round(direita - esquerda);
    selecionado.altura = Math.round(baixo - topo);
  }

  desenhar();
  atualizarInspetor();
});

function finalizarArrastoInfinito(evento) {
  if (evento.pointerId !== ponteiroId) return;

  if (arrastandoEditor) {
    arrastandoEditor = false;
    ponteiroId = null;
    return;
  }

  if (modoArrasto === "desenhar" && inicioDesenho) {
    const x = Math.min(inicioDesenho.x, inicioDesenho.atualX);
    const y = Math.min(inicioDesenho.y, inicioDesenho.atualY);
    const largura = Math.abs(inicioDesenho.atualX - inicioDesenho.x);
    const altura = Math.abs(inicioDesenho.atualY - inicioDesenho.y);

    if (largura >= TAMANHO_MINIMO && altura >= TAMANHO_MINIMO) {
      adicionarObjeto(ferramenta, Math.round(x), Math.round(y), Math.round(largura), Math.round(altura));
    } else {
      output.textContent = "Desenho muito pequeno. Tente novamente.";
    }
  }

  arrastando = false;
  modoArrasto = "mover";
  alcaSelecionada = null;
  ponteiroId = null;
  inicioDesenho = null;

  salvarProjeto();
  desenhar();
}

canvas.addEventListener("pointerup", finalizarArrastoInfinito);
canvas.addEventListener("pointercancel", finalizarArrastoInfinito);

canvas.addEventListener("lostpointercapture", () => {
  arrastando = false;
  ponteiroId = null;
  inicioDesenho = null;
  desenhar();
});

/* =========================================================
   EXECUÇÃO / PRÉ-VISUALIZAÇÃO COM SISTEMA DE SCRIPTS
========================================================= */

let objetosJogo = [];
let scriptsJogo = [];
let animationFrameId = null;

let ultimoTempo = 0;
let ultimoDeltaTime = 0;
let tempoJogo = 0;

let teclasPressionadas = {};
let proximoIdJogo = 1;

const controlesTouch = {
  joysticks: new Map(),

  botao: {
    ativo: false,
    pointerId: null,
    pressionado: false,
    acabouDePressionar: false
  },

  botoes: new Map()
};

if (gameCanvas) {
  gameCanvas.style.touchAction = "none";
  gameCanvas.style.userSelect = "none";
  gameCanvas.style.webkitUserSelect = "none";
}

function resetarControlesTouch() {
  controlesTouch.joysticks.clear();

  controlesTouch.botao.ativo = false;
  controlesTouch.botao.pointerId = null;
  controlesTouch.botao.pressionado = false;
  controlesTouch.botao.acabouDePressionar = false;

  for (const obj of objetosJogo) {
    if (obj.forma === "button") {
      obj.pressionado = false;
      obj.acabouDePressionar = false;
    }
    if (obj.forma === "joystick") {
      obj.joystickX = 0;
      obj.joystickY = 0;
      obj.joystickAtivo = false;
      obj.pointerId = null;
    }
  }

  controlesTouch.botoes.clear();
}

function obterPosicaoGameCanvas(evento) {
  const rect = gameCanvas.getBoundingClientRect();
  const xTela = (evento.clientX - rect.left) * gameCanvas.width / rect.width;
  const yTela = (evento.clientY - rect.top) * gameCanvas.height / rect.height;

  let camX = 0;
  let camY = 0;
  let camLargura = gameCanvas.width;
  let camAltura = gameCanvas.height;

  const cameraAtiva = objetosJogo.find(obj => obj.forma === "camera" && obj.ativo);
  if (cameraAtiva) {
    if (cameraAtiva.cameraTipo === "seguir" && cameraAtiva.cameraAlvo) {
      const alvo = objetosJogo.find(item => item.nome === cameraAtiva.cameraAlvo);
      if (alvo) {
        const alvoX = Number(alvo.x) || 0;
        const alvoY = Number(alvo.y) || 0;
        const alvoL = Number(alvo.largura) || 50;
        const alvoA = Number(alvo.altura) || 50;
        camX = (alvoX + alvoL / 2) - camLargura / 2;
        camY = (alvoY + alvoA / 2) - camAltura / 2;
      } else {
        camX = Number(cameraAtiva.x) || 0;
        camY = Number(cameraAtiva.y) || 0;
      }
    } else {
      // Câmera Estática: O centro da seleção da câmara posiciona-se no centro do ecrã
      const camXCentro = (Number(cameraAtiva.x) || 0) + ((Number(cameraAtiva.largura) || 50) / 2);
      const camYCentro = (Number(cameraAtiva.y) || 0) + ((Number(cameraAtiva.altura) || 50) / 2);
      camX = camXCentro - camLargura / 2;
      camY = camYCentro - camAltura / 2;
    }
  }

  const escalaX = gameCanvas.width / camLargura;
  const escalaY = gameCanvas.height / camAltura;
  const escala = Math.min(escalaX, escalaY);

  const offsetX = (gameCanvas.width - camLargura * escala) / 2;
  const offsetY = (gameCanvas.height - camAltura * escala) / 2;

  return {
    x: ((xTela - offsetX) / escala) + camX,
    y: ((yTela - offsetY) / escala) + camY
  };
}


function pontoDentroObjeto(x, y, obj) {
  return (
    x >= obj.x &&
    x <= obj.x + obj.largura &&
    y >= obj.y &&
    y <= obj.y + obj.altura
  );
}

function encontrarControleTouch(x, y, forma) {
  const ordenados = ordenarPorCamada(objetosJogo);

  for (let i = ordenados.length - 1; i >= 0; i--) {
    const obj = ordenados[i];

    if (
      obj.ativo &&
      obj.visivel !== false &&
      obj.forma === forma &&
      pontoDentroObjeto(x, y, obj)
    ) {
      return obj;
    }
  }

  return null;
}

function atualizarJoystick(x, y, joystick) {
  if (!joystick) return;

  const centroX = joystick.x + joystick.largura / 2;
  const centroY = joystick.y + joystick.altura / 2;

  const raio = Math.min(
    joystick.largura,
    joystick.altura
  ) / 2;

  if (raio <= 0) return;

  let dx = x - centroX;
  let dy = y - centroY;

  const distancia = Math.hypot(dx, dy);

  if (distancia > raio && distancia > 0) {
    dx = (dx / distancia) * raio;
    dy = (dy / distancia) * raio;
  }

  joystick.joystickX = Math.max(-1, Math.min(1, dx / raio));
  joystick.joystickY = Math.max(-1, Math.min(1, dy / raio));
}

function atualizarEstadoGlobalBotoes() {
  controlesTouch.botao.ativo = controlesTouch.botoes.size > 0;
  controlesTouch.botao.pressionado = controlesTouch.botao.ativo;
  controlesTouch.botao.pointerId =
    controlesTouch.botoes.size > 0
      ? controlesTouch.botoes.keys().next().value
      : null;
}

function iniciarControleTouch(evento) {
  if (!executando) return;

  const pos = obterPosicaoGameCanvas(evento);

  const joystick = encontrarControleTouch(pos.x, pos.y, "joystick");

  if (joystick && !controlesTouch.joysticks.has(evento.pointerId) && !joystick.joystickAtivo) {
    joystick.joystickAtivo = true;
    joystick.pointerId = evento.pointerId;
    joystick.joystickX = 0;
    joystick.joystickY = 0;

    controlesTouch.joysticks.set(evento.pointerId, joystick.id);

    atualizarJoystick(pos.x, pos.y, joystick);

    try {
      gameCanvas.setPointerCapture(evento.pointerId);
    } catch (erro) {
      console.warn("Não foi possível capturar o ponteiro.", erro);
    }

    evento.preventDefault();
    return;
  }

  const botao = encontrarControleTouch(pos.x, pos.y, "button");

  if (botao && !controlesTouch.botoes.has(evento.pointerId)) {
    botao.pressionado = true;
    botao.acabouDePressionar = true;

    controlesTouch.botoes.set(evento.pointerId, botao.id);
    atualizarEstadoGlobalBotoes();

    try {
      gameCanvas.setPointerCapture(evento.pointerId);
    } catch (erro) {
      console.warn("Não foi possível capturar o ponteiro.", erro);
    }

    evento.preventDefault();
  }
}

function moverControleTouch(evento) {
  const joystickId = controlesTouch.joysticks.get(evento.pointerId);

  if (joystickId !== undefined) {
    const joystick = objetosJogo.find(obj => obj.id === joystickId);
    if (joystick && joystick.joystickAtivo) {
      const pos = obterPosicaoGameCanvas(evento);
      atualizarJoystick(pos.x, pos.y, joystick);
      evento.preventDefault();
    }
  }
}

function finalizarControleTouch(evento) {
  const joystickId = controlesTouch.joysticks.get(evento.pointerId);
  if (joystickId !== undefined) {
    const joystick = objetosJogo.find(obj => obj.id === joystickId);
    if (joystick) {
      joystick.joystickAtivo = false;
      joystick.pointerId = null;
      joystick.joystickX = 0;
      joystick.joystickY = 0;
    }
    controlesTouch.joysticks.delete(evento.pointerId);
  }

  const botaoId = controlesTouch.botoes.get(evento.pointerId);
  if (botaoId !== undefined) {
    const botao = objetosJogo.find(obj => obj.id === botaoId);
    if (botao) {
      botao.pressionado = false;
    }
    controlesTouch.botoes.delete(evento.pointerId);
  }

  atualizarEstadoGlobalBotoes();
}

gameCanvas.addEventListener("pointerdown", evento => {
  if (!executando) return;
  iniciarControleTouch(evento);
});

gameCanvas.addEventListener("pointermove", evento => {
  if (!executando) return;
  moverControleTouch(evento);
});

gameCanvas.addEventListener("pointerup", finalizarControleTouch);
gameCanvas.addEventListener("pointercancel", finalizarControleTouch);

gameCanvas.addEventListener("lostpointercapture", evento => {
  finalizarControleTouch(evento);
});

window.addEventListener("blur", () => {
  resetarControlesTouch();
});

/* =========================================================
   SISTEMA DE COLISÃO
========================================================= */

function resolverColisoesJogo() {
  const colliders = objetosJogo.filter(obj =>
    obj.ativo && (obj.tipo === "StaticBody2D" || obj.nome.toLowerCase().includes("colisao") || obj.nome.toLowerCase().includes("colisão"))
  );

  if (colliders.length === 0) return;

  const dinamicos = objetosJogo.filter(obj =>
    obj.ativo && obj.tipo !== "Control2D" && obj.forma !== "joystick" && obj.forma !== "button" &&
    !colliders.includes(obj)
  );

  for (const din of dinamicos) {
    for (const col of colliders) {
      if (
        din.x < col.x + col.largura &&
        din.x + din.largura > col.x &&
        din.y < col.y + col.altura &&
        din.y + din.altura > col.y
      ) {
        const overlapX1 = (din.x + din.largura) - col.x;
        const overlapX2 = (col.x + col.largura) - din.x;
        const overlapY1 = (din.y + din.altura) - col.y;
        const overlapY2 = (col.y + col.altura) - din.y;

        const minOverlapX = Math.min(overlapX1, overlapX2);
        const minOverlapY = Math.min(overlapY1, overlapY2);

        if (minOverlapX < minOverlapY) {
          if (overlapX1 < overlapX2) {
            din.x -= overlapX1;
          } else {
            din.x += overlapX2;
          }
        } else {
          if (overlapY1 < overlapY2) {
            din.y -= overlapY1;
          } else {
            din.y += overlapY2;
          }
        }
      }
    }
  }
}

function desenharJogo() {
  if (!gameCtx || !gameCanvas) return;

  gameCtx.clearRect(0, 0, gameCanvas.width, gameCanvas.height);
  gameCtx.fillStyle = "#252a35";
  gameCtx.fillRect(0, 0, gameCanvas.width, gameCanvas.height);

  let camX = 0;
  let camY = 0;
  let camLargura = gameCanvas.width;
  let camAltura = gameCanvas.height;

  const cameraAtiva = objetosJogo.find(obj => obj.forma === "camera" && obj.ativo);
  if (cameraAtiva) {
    if (cameraAtiva.cameraTipo === "seguir" && cameraAtiva.cameraAlvo) {
      const alvo = objetosJogo.find(item => item.nome === cameraAtiva.cameraAlvo);
      if (alvo) {
        const alvoX = Number(alvo.x) || 0;
        const alvoY = Number(alvo.y) || 0;
        const alvoL = Number(alvo.largura) || 50;
        const alvoA = Number(alvo.altura) || 50;
        camX = (alvoX + alvoL / 2) - camLargura / 2;
        camY = (alvoY + alvoA / 2) - camAltura / 2;
      } else {
        camX = Number(cameraAtiva.x) || 0;
        camY = Number(cameraAtiva.y) || 0;
      }
    } else {
      // Câmera Estática: O centro da seleção da câmara posiciona-se no centro do ecrã
      const camXCentro = (Number(cameraAtiva.x) || 0) + ((Number(cameraAtiva.largura) || 50) / 2);
      const camYCentro = (Number(cameraAtiva.y) || 0) + ((Number(cameraAtiva.altura) || 50) / 2);
      camX = camXCentro - camLargura / 2;
      camY = camYCentro - camAltura / 2;
    }
  }

  const escalaX = gameCanvas.width / camLargura;
  const escalaY = gameCanvas.height / camAltura;
  const escala = Math.min(escalaX, escalaY);

  const offsetX = (gameCanvas.width - camLargura * escala) / 2;
  const offsetY = (gameCanvas.height - camAltura * escala) / 2;

  gameCtx.save();
  gameCtx.translate(offsetX, offsetY);
  gameCtx.scale(escala, escala);
  gameCtx.translate(-camX, -camY);

  for (const obj of ordenarPorCamada(objetosJogo)) {
    if (obj.visivel === false || !obj.ativo) continue;
    if (obj.forma === "camera") continue;

    const x = Number(obj.x) || 0;
    const y = Number(obj.y) || 0;
    const largura = Math.max(1, Number(obj.largura) || 50);
    const altura = Math.max(1, Number(obj.altura) || 50);

    gameCtx.save();
    const opacidade = Math.max(0, Math.min(1, Number(obj.opacidade ?? 1)));
    gameCtx.globalAlpha = opacidade;
    gameCtx.fillStyle = obj.cor || "#2563eb";

    if (obj.forma === "joystick") {
      const centroX = x + largura / 2;
      const centroY = y + altura / 2;
      const raio = Math.min(largura, altura) / 2;

      gameCtx.globalAlpha = opacidade * 0.55;
      gameCtx.fillStyle = obj.cor || "#111827";
      gameCtx.beginPath();
      gameCtx.arc(centroX, centroY, raio, 0, Math.PI * 2);
      gameCtx.fill();

      gameCtx.strokeStyle = "#ffffff";
      gameCtx.lineWidth = 2;
      gameCtx.stroke();

      const deslocamentoX = (obj.joystickX || 0) * raio * 0.45;
      const deslocamentoY = (obj.joystickY || 0) * raio * 0.45;

      gameCtx.globalAlpha = opacidade * 0.9;
      gameCtx.fillStyle = "#ffffff";
      gameCtx.beginPath();
      gameCtx.arc(centroX + deslocamentoX, centroY + deslocamentoY, raio * 0.42, 0, Math.PI * 2);
      gameCtx.fill();
                    } else if (obj.forma === "button") {
      const pressionado = obj.pressionado === true;
      const corOriginal = obj.cor || "#2563eb";
      const corBotao = pressionado ? escurecerCor(corOriginal, 0.65) : corOriginal;
      const raio = Number(obj.arredondamento) || 0;

      gameCtx.globalAlpha = opacidade * (pressionado ? 0.55 : 0.75);
      gameCtx.fillStyle = corBotao;

      gameCtx.beginPath();
      if (typeof gameCtx.roundRect === "function") {
        gameCtx.roundRect(x, y, largura, altura, raio);
      } else {
        gameCtx.rect(x, y, largura, altura);
      }
      gameCtx.fill();

      gameCtx.strokeStyle = "#ffffff";
      gameCtx.lineWidth = 2;
      gameCtx.stroke();
      
      // Texto removido com sucesso: o botão ficará apenas com a forma e cor, sem o nome escrito por cima.
      
    } else if (obj.forma === "triangle") {
      gameCtx.beginPath();
      gameCtx.moveTo(x + largura / 2, y);
      gameCtx.lineTo(x + largura, y + altura);
      gameCtx.lineTo(x, y + altura);
      gameCtx.closePath();
      gameCtx.fill();
    } else if (obj.forma === "circle") {
      gameCtx.beginPath();
      gameCtx.ellipse(x + largura / 2, y + altura / 2, largura / 2, altura / 2, 0, 0, Math.PI * 2);
      gameCtx.fill();
    } else {
      gameCtx.fillRect(x, y, largura, altura);
    }

    gameCtx.restore();
  }

  gameCtx.restore();
}


function atualizarCamerasJogo() {
  for (const obj of objetosJogo) {
    if (obj.forma === "camera" && obj.ativo) {
      if (obj.cameraTipo === "seguir" && obj.cameraAlvo) {
        const alvo = objetosJogo.find(item => item.nome === obj.cameraAlvo);
        if (alvo) {
          obj.x = (Number(alvo.x) || 0) + ((Number(alvo.largura) || 50) / 2) - (gameCanvas.width / 2);
          obj.y = (Number(alvo.y) || 0) + ((Number(alvo.altura) || 50) / 2) - (gameCanvas.height / 2);
        }
      } else {
        // Câmera Estática: mantém exatamente a posição e área definidas pelo utilizador no editor
      }
    }
  }
}



function loopJogo(timestamp) {
  if (!executando) return;

  if (!ultimoTempo) ultimoTempo = timestamp;

  const deltaMs = Math.min(timestamp - ultimoTempo, 100);
  ultimoTempo = timestamp;

  ultimoDeltaTime = deltaMs / 1000;
  tempoJogo += ultimoDeltaTime;

  atualizarScriptsJogo(ultimoDeltaTime);
  atualizarCamerasJogo();
  resolverColisoesJogo();
  desenharJogo();

  for (const obj of objetosJogo) {
    if (obj.forma === "button") {
      obj.acabouDePressionar = false;
    }
  }

  controlesTouch.botao.acabouDePressionar = false;

  animationFrameId = requestAnimationFrame(loopJogo);
}

function iniciarJogo() {
  const projeto = obterProjetoAtivo();

  if (!projeto) {
    output.textContent = "Salve ou crie um projeto antes de executar.";
    return;
  }

  if (executando) return;

  salvarProjeto();

  objetosJogo = objetos.map(obj => ({
    ...obj,
    ativo: true,
    visivel: true,
    pressionado: false,
    acabouDePressionar: false,
    joystickX: 0,
    joystickY: 0,
    joystickAtivo: false,
    pointerId: null
  }));

  proximoIdJogo = Math.max(
    1,
    ...objetosJogo.map(obj => Number(obj.id) || 0)
  ) + 1;

  tempoJogo = 0;
  ultimoTempo = 0;
  ultimoDeltaTime = 0;
  teclasPressionadas = {};
  resetarControlesTouch();

  gamePreview.classList.remove("hidden");

  const gameContainer = gameCanvas.parentElement;
  gameCanvas.width = gameContainer ? gameContainer.clientWidth || window.innerWidth : window.innerWidth;
  gameCanvas.height = gameContainer ? gameContainer.clientHeight || window.innerHeight : window.innerHeight;
  gameCanvas.style.width = "100%";
  gameCanvas.style.height = "100%";
  gameCanvas.style.aspectRatio = "";

  executando = true;

  if (runBtn) runBtn.textContent = "■ Parar";

  iniciarScriptsJogo();
  atualizarCamerasJogo(); // Posiciona a câmera no centro da tela imediatamente ao executar
  desenharJogo();

  output.textContent = "Jogo iniciado!";
  animationFrameId = requestAnimationFrame(loopJogo);
}

function pararJogo() {
  if (executando) {
    executando = false;

    if (animationFrameId !== null) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }

    for (const runtime of scriptsJogo) {
      if (
        runtime.comErro ||
        !runtime.iniciado ||
        !runtime.stop
      ) {
        continue;
      }

      try {
        runtime.stop.call(
          runtime.objeto,
          runtime.contexto,
          runtime.api
        );
      } catch (erro) {
        console.error(
          `Erro em stop() de "${runtime.objeto.nome}":`,
          erro
        );
      }
    }
  }

  scriptsJogo = [];
  objetosJogo = [];
  teclasPressionadas = {};
  resetarControlesTouch();
  ultimoTempo = 0;
  ultimoDeltaTime = 0;

  if (runBtn) runBtn.textContent = "▶ Executar";
  gamePreview?.classList.add("hidden");

  if (output) output.textContent = "Execução parada.";
}

window.addEventListener("keydown", evento => {
  teclasPressionadas[evento.key.toLowerCase()] = true;
});

window.addEventListener("keyup", evento => {
  teclasPressionadas[evento.key.toLowerCase()] = false;
});

window.addEventListener("blur", () => {
  teclasPressionadas = {};
});

runBtn?.addEventListener("click", () => {
  if (executando) pararJogo();
  else iniciarJogo();
});

stopGameBtn?.addEventListener("click", pararJogo);

document.getElementById("saveBtn")?.addEventListener("click", salvarProjeto);

/* =========================================================
   REINICIAR PROJETO ATUAL
========================================================= */

document.getElementById("resetBtn")?.addEventListener("click", () => {
  const projeto = obterProjetoAtivo();
  if (!projeto) return;

  const confirmar = confirm(
    "Deseja restaurar este projeto? Os objetos e scripts atuais serão substituídos."
  );

  if (!confirmar) return;

  objetos = criarObjetosIniciais();
  objetoSelecionadoId = 1;
  proximoId = 5;

  projeto.objetos = objetos;
  projeto.objetoSelecionadoId = objetoSelecionadoId;
  projeto.proximoId = proximoId;
  projeto.atualizadoEm = Date.now();

  fecharEditorScript();
  pararJogo();
  atualizarArvore();
  atualizarInspetor();
  desenhar();
  salvarProjeto();

  output.textContent = "Projeto restaurado com sucesso.";
});

/* =========================================================
   EDITOR DE SCRIPT
========================================================= */

function abrirEditorScript() {
  const obj = obterSelecionado();

  if (!obj) {
    output.textContent = "Selecione um objeto primeiro.";
    return;
  }

  if (typeof obj.script !== "string") obj.script = "";

  scriptObjectName.textContent = obj.nome;
  scriptFileName.textContent = obj.nome + ".js";
  scriptCode.value = obj.script;

  scriptEditor.classList.remove("hidden");
  scriptCode.focus();
}

function fecharEditorScript() {
  scriptEditor?.classList.add("hidden");
}

scriptCode.addEventListener("input", () => {
  const obj = obterSelecionado();
  if (!obj) return;

  obj.script = scriptCode.value;
  scriptStatus.textContent = "Salvando...";

  salvarProjeto();
  scriptStatus.textContent = "Salvo";
});

document.getElementById("closeScriptBtn")
  ?.addEventListener("click", fecharEditorScript);

validateScriptBtn?.addEventListener("click", () => {
  const codigo = scriptCode.value;

  try {
    new Function(codigo);
    scriptStatus.textContent = "Código válido!";
    output.textContent = "Nenhum erro de sintaxe encontrado.";
  } catch (erro) {
    scriptStatus.textContent = "Erro no código";
    output.textContent = erro.message;
  }
});

function criarContexto(obj) {
  return {
    nome: obj.nome,
    x: obj.x,
    y: obj.y,
    largura: obj.largura,
    altura: obj.altura,
    cor: obj.cor,
    opacidade: obj.opacidade ?? 1,
    tipo: obj.tipo,
    forma: obj.forma,
    engine: criarAPIEngine(obj)
  };
}

/* =========================================================
   API DA ENGINE — CONTROLE DOS OBJETOS E SCRIPTS
========================================================= */

function criarAPIEngine(obj) {
  return {
    get tempo() {
      return tempoJogo;
    },

    get deltaTime() {
      return ultimoDeltaTime;
    },

    get executando() {
      return executando;
    },

    get objeto() {
      return obj;
    },

    get x() {
      return obj.x;
    },

    set x(valor) {
      if (Number.isFinite(Number(valor))) {
        obj.x = Number(valor);
      }
    },

    get y() {
      return obj.y;
    },

    set y(valor) {
      if (Number.isFinite(Number(valor))) {
        obj.y = Number(valor);
      }
    },

    get camada() {
      return obj.camada ?? 0;
    },

    set camada(valor) {
      if (Number.isFinite(Number(valor))) {
        obj.camada = Math.trunc(Number(valor));
      }
    },

    definirCamada(valor) {
      if (Number.isFinite(Number(valor))) {
        obj.camada = Math.trunc(Number(valor));
      }
    },

    get botaoPressionado() {
      return obj.forma === "button" && obj.pressionado === true;
    },

    get botaoAcionado() {
      return obj.forma === "button" && obj.acabouDePressionar === true;
    },

    mover(dx, dy) {
      obj.x += Number(dx) || 0;
      obj.y += Number(dy) || 0;
    },

    definirPosicao(x, y) {
      if (Number.isFinite(Number(x))) obj.x = Number(x);
      if (Number.isFinite(Number(y))) obj.y = Number(y);
    },

    definirCor(cor) {
      if (typeof cor === "string") obj.cor = cor;
    },

    get opacidade() {
      return obj.opacidade ?? 1;
    },

    set opacidade(valor) {
      if (Number.isFinite(Number(valor))) {
        obj.opacidade = Math.max(0, Math.min(1, Number(valor)));
      }
    },

    definirOpacidade(valor) {
      if (Number.isFinite(Number(valor))) {
        obj.opacidade = Math.max(0, Math.min(1, Number(valor)));
      }
    },

    definirTamanho(largura, altura) {
      if (Number.isFinite(Number(largura))) {
        obj.largura = Math.max(TAMANHO_MINIMO, Number(largura));
      }

      if (Number.isFinite(Number(altura))) {
        obj.altura = Math.max(TAMANHO_MINIMO, Number(altura));
      }
    },

    mostrar() {
      obj.visivel = true;
    },

    ocultar() {
      obj.visivel = false;
    },

    ativar() {
      obj.ativo = true;
    },

    desativar() {
      obj.ativo = false;
    },

    obterObjetoPorNome(nome) {
      return objetosJogo.find(item => item.nome === nome) || null;
    },

    obterObjetoPorId(id) {
      return objetosJogo.find(item => item.id === id) || null;
    },

    obterTodosObjetos() {
      return [...objetosJogo];
    },

    teclaPressionada(tecla) {
      return !!teclasPressionadas[String(tecla).toLowerCase()];
    },

    get joystick() {
      if (obj.forma === "joystick") {
        return {
          x: obj.joystickX || 0,
          y: obj.joystickY || 0,
          ativo: obj.joystickAtivo || false
        };
      }
      const ativo = objetosJogo.find(o => o.forma === "joystick" && o.joystickAtivo);
      if (ativo) {
        return { x: ativo.joystickX, y: ativo.joystickY, ativo: true };
      }
      const qualquer = objetosJogo.find(o => o.forma === "joystick");
      return {
        x: qualquer?.joystickX || 0,
        y: qualquer?.joystickY || 0,
        ativo: qualquer?.joystickAtivo || false
      };
    },

    get qualquerBotaoPressionado() {
      return controlesTouch.botao.pressionado;
    },

    get qualquerBotaoAcionado() {
      return controlesTouch.botao.acabouDePressionar;
    },

    criarObjeto(config = {}) {
      const novo = {
        id: proximoIdJogo++,
        nome: String(config.nome || `Objeto${proximoIdJogo - 1}`),
        tipo: String(config.tipo || "Sprite2D"),
        forma: ["rect", "circle", "triangle", "joystick", "button"].includes(config.forma)
          ? config.forma
          : "rect",
        x: Number(config.x) || 0,
        y: Number(config.y) || 0,
        largura: Math.max(TAMANHO_MINIMO, Number(config.largura) || 50),
        altura: Math.max(TAMANHO_MINIMO, Number(config.altura) || 50),
        cor: typeof config.cor === "string" ? config.cor : "#2563eb",
        pressionado: false,
        acabouDePressionar: false,
        opacidade: Number.isFinite(Number(config.opacidade))
          ? Math.max(0, Math.min(1, Number(config.opacidade)))
          : 1,
        camada: Number.isFinite(Number(config.camada))
          ? Math.trunc(Number(config.camada))
          : 0,
        script: "",
        ativo: true,
        visivel: true
      };

      objetosJogo.push(novo);
      return novo;
    },

    destruirObjeto(alvo = obj) {
      const id = typeof alvo === "object" ? alvo?.id : alvo;
      objetosJogo = objetosJogo.filter(item => item.id !== id);

      for (const [pointerId, botaoId] of controlesTouch.botoes) {
        if (botaoId === id) {
          controlesTouch.botoes.delete(pointerId);
        }
      }

      atualizarEstadoGlobalBotoes();
    },

    log(...mensagens) {
      console.log(`[EngineGame: ${obj.nome}]`, ...mensagens);
    }
  };
}

/* =========================================================
   CICLO DE VIDA DOS SCRIPTS
========================================================= */

function iniciarScriptsJogo() {
  scriptsJogo = [];

  for (const objeto of objetosJogo) {
    if (!objeto.script || !objeto.script.trim()) continue;

    const api = criarAPIEngine(objeto);
    const contexto = criarContexto(objeto);

    const runtime = {
      objeto,
      api,
      contexto,
      start: null,
      update: null,
      stop: null,
      iniciado: false,
      comErro: false
    };

    try {
      const criarFuncoes = new Function(
        "ctx",
        "engine",
        `${objeto.script}
         return {
           start: typeof start === "function" ? start : null,
           update: typeof update === "function" ? update : null,
           stop: typeof stop === "function" ? stop : null
         };`
      );

      const funcoes = criarFuncoes(contexto, api);

      runtime.start = funcoes.start;
      runtime.update = funcoes.update;
      runtime.stop = funcoes.stop;

      scriptsJogo.push(runtime);

      if (runtime.start) {
        runtime.start.call(objeto, contexto, api);
      }

      runtime.iniciado = true;

    } catch (erro) {
      console.error(`Erro no script de "${objeto.nome}":`, erro);

      runtime.comErro = true;
      runtime.iniciado = false;

      if (!scriptsJogo.includes(runtime)) {
        scriptsJogo.push(runtime);
      }

      if (output) {
        output.textContent =
          `Erro no script de "${objeto.nome}": ${erro.message}`;
      }
    }
  }
}

function atualizarScriptsJogo(deltaTime) {
  for (const runtime of scriptsJogo) {
    if (
      runtime.comErro ||
      !runtime.iniciado ||
      !runtime.update ||
      !runtime.objeto.ativo
    ) {
      continue;
    }

    try {
      runtime.update.call(
        runtime.objeto,
        runtime.contexto,
        runtime.api,
        deltaTime
      );
    } catch (erro) {
      runtime.comErro = true;
      runtime.iniciado = false;

      console.error(
        `Erro em update() de "${runtime.objeto.nome}":`,
        erro
      );

      if (runtime.stop) {
        try {
          runtime.stop.call(
            runtime.objeto,
            runtime.contexto,
            runtime.api
          );
        } catch (erroStop) {
          console.error(
            `Erro em stop() de "${runtime.objeto.nome}":`,
            erroStop
          );
        }
      }

      if (output) {
        output.textContent =
          `Erro em update() de "${runtime.objeto.nome}": ${erro.message}`;
      }
    }
  }
}

/* =========================================================
   INICIALIZAÇÃO
========================================================= */

function inicializarEngineGame() {
  if (!document.getElementById("engineHiddenStyle")) {
    const style = document.createElement("style");
    style.id = "engineHiddenStyle";
    style.textContent = ".hidden{display:none!important}";
    document.head.appendChild(style);
  }

  carregarListaProjetos();

  const projetoSalvo = obterProjetoAtivo();

  if (projetoSalvo) {
    carregarDadosProjeto(projetoSalvo);

    if (editorApp) {
      editorApp.style.display = "";
      editorApp.classList.remove("hidden");
    }

    if (projectManager) {
      projectManager.style.display = "none";
      projectManager.classList.add("hidden");
    }

    mostrarEditor();
    output.textContent = `Projeto "${projetoSalvo.nome}" restaurado.`;
    return;
  }

  if (editorApp) {
    editorApp.style.display = "none";
  }

  if (projectManager) {
    projectManager.style.display = "flex";
    projectManager.classList.remove("hidden");
  }

  atualizarListaProjetos();

  if (projetos.length === 0) {
    abrirModalProjeto();
  }
}

window.addEventListener("pagehide", () => {
  salvarProjeto();
});

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") {
    salvarProjeto();
  }
});

/* =========================================================
   AUXILIAR: CENTRO DO MAPA
========================================================= */

function obterCentroMapa() {
  const objetosMundo = objetosJogo.filter(item => 
    item.ativo && item.tipo !== "Control2D" && item.forma !== "joystick" && item.forma !== "button" && item.forma !== "camera"
  );
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const item of objetosMundo) {
    minX = Math.min(minX, Number(item.x) || 0);
    minY = Math.min(minY, Number(item.y) || 0);
    maxX = Math.max(maxX, (Number(item.x) || 0) + (Number(item.largura) || 50));
    maxY = Math.max(maxY, (Number(item.y) || 0) + (Number(item.altura) || 50));
  }
  return {
    x: objetosMundo.length > 0 ? (minX + maxX) / 2 : 0,
    y: objetosMundo.length > 0 ? (minY + maxY) / 2 : 0
  };
}


function escurecerCor(cor, fator = 0.65) {
  if (!cor || !cor.startsWith("#")) return cor;

  let hex = cor.slice(1);

  if (hex.length === 3) {
    hex = hex.split("").map(letra => letra + letra).join("");
  }

  if (hex.length !== 6) return cor;

  const numero = parseInt(hex, 16);

  const r = Math.round(((numero >> 16) & 255) * fator);
  const g = Math.round(((numero >> 8) & 255) * fator);
  const b = Math.round((numero & 255) * fator);

  return `rgb(${r}, ${g}, ${b})`;
}

inicializarEngineGame();
