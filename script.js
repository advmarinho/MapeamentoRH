/********************************************************************
 *  SCRIPT COMPLETO – MAPA OPERACIONAL DE BENEFÍCIOS SONOVA
 *  V10 – CAIXAS (CARDS) EDITÁVEIS + INCLUSÃO DE NOVAS CAIXAS
 *        + SLA CONSOLIDADO NO BI GERAL (a partir do BI individual)
 *
 *  Mantido do projeto:
 *  - Exportar / Importar / Resetar
 *  - Editor AS IS / TO BE com autosave
 *  - BI geral
 *  - BI individual
 *  - Salvar TXT completo
 ********************************************************************/

const STORAGE_KEY = "beneficiosDB_final_V8";
const BI_INDICADORES_KEY = "biIndicadores_beneficiosV8";

let bancoGlobal = [];
let beneficioSelecionado = null;

function normalizarTexto(valor) {
    if (!valor) return "";
    if (Array.isArray(valor)) return valor.join("\n");
    if (typeof valor === "string") return valor;
    return "";
}

function contarAcoes(texto) {
    if (!texto) return 0;
    return texto.split("\n").map(l => l.trim()).filter(l => l !== "").length;
}

function safeIdFromNome(nome) {
    return (nome || "")
        .replace(/\s+/g, "_")
        .replace(/[^\w\-]/g, "")
        .slice(0, 80);
}

function gerarNomeUnico(base) {
    const b = (base || "Novas Ações").trim() || "Novas Ações";
    let nome = b;
    let i = 2;
    const nomes = new Set(bancoGlobal.map(x => (x.nome || "").toLowerCase()));
    while (nomes.has(nome.toLowerCase())) {
        nome = `${b} ${i}`;
        i += 1;
        if (i > 9999) break;
    }
    return nome;
}

async function carregarBanco() {
    let db = null;

    const salvo = localStorage.getItem(STORAGE_KEY);
    if (salvo) {
        try {
            db = JSON.parse(salvo);
            db.forEach(b => {
                if (Array.isArray(b.asis)) b.asis = b.asis.join("\n");
                if (Array.isArray(b.tobe)) b.tobe = b.tobe.join("\n");
            });
        } catch {
            db = null;
        }
    }

    if (!db) {
        try {
            const resp = await fetch("beneficios_db.txt");
            if (resp.ok) {
                db = await resp.json();
                db.forEach(b => {
                    if (Array.isArray(b.asis)) b.asis = b.asis.join("\n");
                    if (Array.isArray(b.tobe)) b.tobe = b.tobe.join("\n");
                });
            }
        } catch {
            // silencioso
        }
    }

    if (!db) {
        const embed = document.getElementById("beneficios-db");
        if (embed && embed.textContent.trim()) {
            try {
                db = JSON.parse(embed.textContent);
                db.forEach(b => {
                    if (Array.isArray(b.asis)) b.asis = b.asis.join("\n");
                    if (Array.isArray(b.tobe)) b.tobe = b.tobe.join("\n");
                });
            } catch {
                // silencioso
            }
        }
    }

    if (!db) db = [];

    db = db.map(b => ({
        nome: (b.nome || "").trim(),
        categoria: (b.categoria || "").trim(),
        asis: normalizarTexto(b.asis),
        tobe: normalizarTexto(b.tobe)
    })).filter(x => x.nome !== "");

    bancoGlobal = db;

    salvarBanco(bancoGlobal);

    montarCards(bancoGlobal);
    montarBIIndividual(bancoGlobal);
    atualizarBI();
    mostrarMensagemDefaultDetalhe();

    // Mantém o comportamento anterior
    salvarTXT();
}

function salvarBanco(db) {
    const salvar = db.map(b => ({
        nome: b.nome,
        categoria: b.categoria,
        asis: typeof b.asis === "string" ? b.asis : (b.asis || []).join("\n"),
        tobe: typeof b.tobe === "string" ? b.tobe : (b.tobe || []).join("\n")
    }));

    localStorage.setItem(STORAGE_KEY, JSON.stringify(salvar));
}

function exportarBanco() {
    const db = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");

    const blob = new Blob([JSON.stringify(db, null, 4)], {
        type: "application/json;charset=utf-8"
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");

    a.href = url;
    a.download = "beneficios_db_exportado.txt";
    a.click();

    URL.revokeObjectURL(url);
    alert("Base exportada com sucesso.");
}

function importarBanco(arquivo) {
    const reader = new FileReader();

    reader.onload = (e) => {
        try {
            const conteudo = JSON.parse(e.target.result);

            let novosBeneficios = [];
            let novosIndicadores = {};

            if (conteudo && conteudo.beneficios && conteudo.indicadores) {
                novosBeneficios = conteudo.beneficios;
                novosIndicadores = conteudo.indicadores;
            } else if (Array.isArray(conteudo)) {
                novosBeneficios = conteudo;
            } else {
                throw new Error("Formato inválido");
            }

            novosBeneficios = novosBeneficios.map(b => ({
                nome: (b.nome || "").trim(),
                categoria: (b.categoria || "").trim(),
                asis: normalizarTexto(b.asis),
                tobe: normalizarTexto(b.tobe)
            })).filter(x => x.nome !== "");

            bancoGlobal = novosBeneficios;

            salvarBanco(novosBeneficios);
            localStorage.setItem(BI_INDICADORES_KEY, JSON.stringify(novosIndicadores || {}));

            montarCards(novosBeneficios);
            montarBIIndividual(novosBeneficios);
            atualizarBI();
            mostrarMensagemDefaultDetalhe();

            alert("Base importada com sucesso.");
        } catch {
            alert("Erro ao importar TXT!");
        }
    };

    reader.readAsText(arquivo);
}

function resetarBase() {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(BI_INDICADORES_KEY);
    beneficioSelecionado = null;
    carregarBanco();
    alert("Base resetada.");
}

/* IMPACTO */
function classificarImpacto(qtd) {
    if (qtd >= 23) return { classe: "impacto-vermelho", rotulo: "Impacto muito alto" };
    if (qtd >= 15) return { classe: "impacto-laranja", rotulo: "Impacto alto" };
    if (qtd >= 8)  return { classe: "impacto-medio", rotulo: "Impacto moderado" };
    if (qtd >= 1)  return { classe: "impacto-baixo", rotulo: "Impacto leve" };
    return { classe: "impacto-zero", rotulo: "Sem mapeamento" };
}

function montarCards(db) {
    const container = document.getElementById("lista-beneficios");
    container.innerHTML = "";

    db.forEach(b => {
        const qtd = contarAcoes(b.asis);
        const impacto = classificarImpacto(qtd);

        const card = document.createElement("div");
        card.className = "card";
        card.dataset.nome = b.nome;

        card.innerHTML = `
            <div class="card-titulo">${b.nome}</div>
            <div class="card-categoria">${b.categoria || ""}</div>
            <div class="impacto ${impacto.classe}">
                ${qtd} ações AS IS – ${impacto.rotulo}
            </div>
        `;

        card.addEventListener("click", () => {
            abrirEditor(b.nome);
        });

        container.appendChild(card);
    });

    if (beneficioSelecionado) {
        marcarCardAtivo(beneficioSelecionado);
    }
}

function marcarCardAtivo(nome) {
    const todos = document.querySelectorAll(".card");
    todos.forEach(c => c.classList.remove("card-ativo"));

    const ativo = document.querySelector(`.card[data-nome="${cssEscape(nome)}"]`);
    if (ativo) ativo.classList.add("card-ativo");
}

function cssEscape(valor) {
    if (window.CSS && typeof window.CSS.escape === "function") {
        return window.CSS.escape(valor);
    }
    return (valor || "").replace(/"/g, "\\\"");
}

function mostrarMensagemDefaultDetalhe() {
    document.getElementById("conteudo-detalhes").innerHTML = `
        <div class="bloco">
            Selecione um benefício acima para editar suas atividades AS IS e TO BE.
        </div>
    `;
}

function abrirEditor(nome) {
    beneficioSelecionado = nome;
    marcarCardAtivo(nome);

    const det = document.getElementById("conteudo-detalhes");
    const item = bancoGlobal.find(x => x.nome === nome);

    if (!item) {
        mostrarMensagemDefaultDetalhe();
        return;
    }

    const asisText = normalizarTexto(item.asis);
    const tobeText = normalizarTexto(item.tobe);

    det.innerHTML = `
        <div class="bloco">
            <div class="titulo-bloco">Dados do Benefício</div>
            <div class="form-row">
                <div class="form-field">
                    <label>Nome do benefício</label>
                    <input class="input-text" type="text" id="nomeBeneficio" value="${escapeHtml(item.nome)}">
                </div>
                <div class="form-field">
                    <label>Categoria</label>
                    <input class="input-text" type="text" id="categoriaBeneficio" value="${escapeHtml(item.categoria || "")}">
                </div>
            </div>
            <div class="form-row" style="margin-top:12px;">
                <button id="btn-excluir-beneficio" class="btn-perigo" type="button">Excluir benefício</button>
            </div>
        </div>

        <div class="bloco">
            <div class="titulo-bloco">Impacto Operacional</div>
            <p>${contarAcoes(item.asis)} ações AS IS para ${escapeHtml(item.nome)}.</p>
        </div>

        <div class="bloco">
            <div class="titulo-bloco">AS IS – Como funciona hoje</div>
            <textarea id="asisText">${escapeTextarea(asisText)}</textarea>
        </div>

        <div class="bloco">
            <div class="titulo-bloco">TO BE – Como deve funcionar</div>
            <textarea id="tobeText">${escapeTextarea(tobeText)}</textarea>
        </div>
    `;

    const inpNome = document.getElementById("nomeBeneficio");
    const inpCat = document.getElementById("categoriaBeneficio");

    // Renomeia quando sair do campo (mais seguro do que renomear a cada tecla)
    inpNome.addEventListener("change", () => {
        // salva textos antes de renomear
        autosaveEditor(item.nome, { reRender: false });

        const novoNome = (inpNome.value || "").trim();
        if (!novoNome) {
            inpNome.value = item.nome;
            return;
        }
        if (novoNome === item.nome) return;

        const ok = renomearBeneficio(item.nome, novoNome);
        if (!ok) {
            inpNome.value = item.nome;
        }
    });

    // Categoria pode atualizar em tempo real
    inpCat.addEventListener("input", () => {
        const atual = bancoGlobal.find(x => x.nome === beneficioSelecionado);
        if (!atual) return;
        atual.categoria = (inpCat.value || "").trim();
        salvarBanco(bancoGlobal);
        montarCards(bancoGlobal);
    });

    document.getElementById("asisText").addEventListener("input", () => autosaveEditor(beneficioSelecionado));
    document.getElementById("tobeText").addEventListener("input", () => autosaveEditor(beneficioSelecionado));

    document.getElementById("btn-excluir-beneficio").addEventListener("click", () => {
        excluirBeneficio(beneficioSelecionado);
    });
}

function autosaveEditor(nome, opts) {
    const options = opts || { reRender: true };

    const item = bancoGlobal.find(x => x.nome === nome);
    if (!item) return;

    const asisEl = document.getElementById("asisText");
    const tobeEl = document.getElementById("tobeText");

    if (asisEl) item.asis = asisEl.value;
    if (tobeEl) item.tobe = tobeEl.value;

    salvarBanco(bancoGlobal);
    atualizarBI();

    if (options.reRender !== false) {
        montarCards(bancoGlobal);
        marcarCardAtivo(nome);

        // atualiza a linha do impacto sem reabrir editor
        const det = document.getElementById("conteudo-detalhes");
        const p = det ? det.querySelector(".bloco p") : null;
        if (p) {
            p.textContent = `${contarAcoes(item.asis)} ações AS IS para ${item.nome}.`;
        }
    }
}

function renomearBeneficio(nomeAntigo, nomeNovo) {
    const antigo = (nomeAntigo || "").trim();
    const novo = (nomeNovo || "").trim();

    if (!antigo || !novo) return false;

    const existe = bancoGlobal.some(x => (x.nome || "").toLowerCase() === novo.toLowerCase());
    if (existe) {
        alert("Já existe um benefício com esse nome.");
        return false;
    }

    const item = bancoGlobal.find(x => x.nome === antigo);
    if (!item) return false;

    // Renomeia no BI individual
    let bi = {};
    try {
        bi = JSON.parse(localStorage.getItem(BI_INDICADORES_KEY) || "{}");
    } catch {
        bi = {};
    }

    if (bi[antigo] && !bi[novo]) {
        bi[novo] = bi[antigo];
        delete bi[antigo];
        localStorage.setItem(BI_INDICADORES_KEY, JSON.stringify(bi));
    } else if (!bi[novo]) {
        // garante que exista
        bi[novo] = { tempo: 0, retrabalho: 0, sla: 0, confiabilidade: 0 };
        if (bi[antigo]) delete bi[antigo];
        localStorage.setItem(BI_INDICADORES_KEY, JSON.stringify(bi));
    }

    item.nome = novo;
    beneficioSelecionado = novo;

    salvarBanco(bancoGlobal);

    montarCards(bancoGlobal);
    montarBIIndividual(bancoGlobal);
    atualizarBI();

    abrirEditor(novo);

    return true;
}

function excluirBeneficio(nome) {
    const alvo = (nome || "").trim();
    if (!alvo) return;

    const ok = confirm(`Excluir o benefício "${alvo}"?`);
    if (!ok) return;

    bancoGlobal = bancoGlobal.filter(x => x.nome !== alvo);
    beneficioSelecionado = null;

    salvarBanco(bancoGlobal);

    // remove do BI individual
    let bi = {};
    try {
        bi = JSON.parse(localStorage.getItem(BI_INDICADORES_KEY) || "{}");
    } catch {
        bi = {};
    }

    if (bi[alvo]) {
        delete bi[alvo];
        localStorage.setItem(BI_INDICADORES_KEY, JSON.stringify(bi));
    }

    montarCards(bancoGlobal);
    montarBIIndividual(bancoGlobal);
    atualizarBI();
    mostrarMensagemDefaultDetalhe();
}

function criarNovoBeneficio() {
    const nomeBase = prompt("Nome do benefício:", "Novas Ações");
    if (nomeBase === null) return;

    const categoria = prompt("Categoria (ex: Alimentação, Mobilidade, Saúde):", "");
    if (categoria === null) return;

    const nomeFinal = gerarNomeUnico(nomeBase);

    const novo = {
        nome: nomeFinal,
        categoria: (categoria || "").trim(),
        asis: "",
        tobe: ""
    };

    bancoGlobal.push(novo);
    salvarBanco(bancoGlobal);

    // Garante BI individual para o novo
    let bi = {};
    try {
        bi = JSON.parse(localStorage.getItem(BI_INDICADORES_KEY) || "{}");
    } catch {
        bi = {};
    }

    if (!bi[nomeFinal]) {
        bi[nomeFinal] = { tempo: 0, retrabalho: 0, sla: 0, confiabilidade: 0 };
        localStorage.setItem(BI_INDICADORES_KEY, JSON.stringify(bi));
    }

    montarCards(bancoGlobal);
    montarBIIndividual(bancoGlobal);
    atualizarBI();

    abrirEditor(nomeFinal);
}

/* =========================
   BI GERAL (AJUSTE SLA)
   - SLA agora consolida o BI individual
   - fallback: mantém totalTOBE * 0.5 se não houver SLA preenchido
========================= */

function lerIndicadoresBI() {
    try {
        return JSON.parse(localStorage.getItem(BI_INDICADORES_KEY) || "{}");
    } catch {
        return {};
    }
}

function calcularSlaGeralConsolidado(db, totalTOBE) {
    const bi = lerIndicadoresBI();

    let somaSla = 0;
    let qtdSla = 0;

    db.forEach(b => {
        const nome = b.nome;
        const val = bi && bi[nome] ? Number(bi[nome].sla || 0) : 0;
        if (val > 0) {
            somaSla += val;
            qtdSla += 1;
        }
    });

    if (qtdSla > 0) {
        return Math.round(somaSla / qtdSla);
    }

    // fallback: mantém a regra original
    return Math.round(totalTOBE * 0.5);
}

function atualizarBI() {
    let totalASIS = 0;
    let totalTOBE = 0;

    bancoGlobal.forEach(b => {
        totalASIS += contarAcoes(b.asis);
        totalTOBE += contarAcoes(b.tobe);
    });

    document.getElementById("bi-retrabalho").textContent = totalASIS;
    document.getElementById("bi-tempo").textContent      = Math.round(totalASIS * 0.75);
    document.getElementById("bi-base").textContent       = Math.round(totalTOBE * 0.3);

    // Ajuste: SLA consolidado a partir do BI individual (média dos SLAs preenchidos)
    document.getElementById("bi-sla").textContent = calcularSlaGeralConsolidado(bancoGlobal, totalTOBE);

    document.getElementById("bi-compare").textContent    = totalTOBE - totalASIS;
}

/* BI INDIVIDUAL */
function carregarBIIndividual(db) {
    let biData = {};

    const salvo = localStorage.getItem(BI_INDICADORES_KEY);
    if (salvo) {
        try {
            biData = JSON.parse(salvo);
        } catch {
            biData = {};
        }
    }

    db.forEach(b => {
        if (!biData[b.nome]) {
            biData[b.nome] = {
                tempo: 0,
                retrabalho: 0,
                sla: 0,
                confiabilidade: 0
            };
        }
    });

    localStorage.setItem(BI_INDICADORES_KEY, JSON.stringify(biData));
    return biData;
}

function salvarBIIndividual(data) {
    localStorage.setItem(BI_INDICADORES_KEY, JSON.stringify(data));
}

function montarBIIndividual(db) {
    const grid = document.getElementById("bi-beneficio-grid");
    grid.innerHTML = "";

    const bi = carregarBIIndividual(db);

    db.forEach(b => {
        const safeId = safeIdFromNome(b.nome);
        const dados = bi[b.nome] || { tempo: 0, retrabalho: 0, sla: 0, confiabilidade: 0 };

        const card = document.createElement("div");
        card.className = "bi-card-individual";

        card.innerHTML = `
            <div class="bi-beneficio-titulo">${escapeHtml(b.nome)}</div>

            <label>Tempo Operacional (h/mês)</label>
            <input type="number" id="tempo_${safeId}" value="${Number(dados.tempo || 0)}">

            <label>Retrabalho (%)</label>
            <input type="number" id="retrabalho_${safeId}" value="${Number(dados.retrabalho || 0)}">

            <label>SLA (dias)</label>
            <input type="number" id="sla_${safeId}" value="${Number(dados.sla || 0)}">

            <label>Confiabilidade da Base (%)</label>
            <input type="number" id="confi_${safeId}" value="${Number(dados.confiabilidade || 0)}">

            <button class="bi-salvar" type="button">Salvar indicadores</button>
        `;

        card.querySelector(".bi-salvar").onclick = () => {
            bi[b.nome] = {
                tempo: Number(document.getElementById(`tempo_${safeId}`).value || 0),
                retrabalho: Number(document.getElementById(`retrabalho_${safeId}`).value || 0),
                sla: Number(document.getElementById(`sla_${safeId}`).value || 0),
                confiabilidade: Number(document.getElementById(`confi_${safeId}`).value || 0)
            };
            salvarBIIndividual(bi);

            // Ajuste: reflete imediatamente no BI Geral
            atualizarBI();

            alert("Indicadores salvos para " + b.nome);
        };

        grid.appendChild(card);
    });
}

/* SALVAR TXT */
function salvarTXT() {
    const beneficios = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    const indicadores = JSON.parse(localStorage.getItem(BI_INDICADORES_KEY) || "{}");

    const pacoteCompleto = {
        beneficios: beneficios,
        indicadores: indicadores
    };

    const blob = new Blob([JSON.stringify(pacoteCompleto, null, 4)], {
        type: "application/json;charset=utf-8"
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");

    a.href = url;
    a.download = "beneficios_completo_autosalvo.txt";
    a.click();

    URL.revokeObjectURL(url);
}

function escapeHtml(texto) {
    const t = String(texto ?? "");
    return t
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function escapeTextarea(texto) {
    // em <textarea> precisa escapar só o suficiente para não quebrar HTML
    return String(texto ?? "").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/* EVENTOS */
window.addEventListener("load", () => {
    carregarBanco();

    document.getElementById("btn-exportar").onclick = exportarBanco;

    document.getElementById("btn-importar").onclick = () =>
        document.getElementById("input-importar").click();

    document.getElementById("input-importar").addEventListener("change", e => {
        if (e.target.files.length > 0) importarBanco(e.target.files[0]);
    });

    document.getElementById("btn-resetar").onclick = resetarBase;

    document.getElementById("btn-salvar-txt").onclick = salvarTXT;

    // Compatibilidade: caso você tenha renomeado o id do botão "Novo/Novas Ações"
    const btnNovo =
        document.getElementById("btn-novo-beneficio") ||
        document.getElementById("btn-Novas-beneficio") ||
        document.getElementById("btn-novas-beneficio");

    if (btnNovo) btnNovo.onclick = criarNovoBeneficio;
});

