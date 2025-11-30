/********************************************************************
 *  SCRIPT COMPLETO – MAPA OPERACIONAL DE BENEFÍCIOS SONOVA
 *  VERSÃO FINAL COM BOTÃO SALVAR TXT + SALVAMENTO CORRIGIDO
 ********************************************************************/

const STORAGE_KEY = "beneficiosDB_final_V8";
const BI_INDICADORES_KEY = "biIndicadores_beneficiosV8";

function normalizarTexto(valor) {
    if (!valor) return "";
    if (Array.isArray(valor)) return valor.join("\n");
    if (typeof valor === "string") return valor;
    return "";
}

function textoParaArray(texto) {
    if (!texto || !texto.trim()) return [];
    return texto.split("\n").map(l => l.trim()).filter(l => l !== "");
}

function contarAcoes(texto) {
    if (!texto) return 0;
    return texto.split("\n").map(l => l.trim()).filter(l => l !== "").length;
}

let bancoGlobal = [];

async function carregarBanco() {
    let db = null;

    const salvo = localStorage.getItem(STORAGE_KEY);
    if (salvo) {
        try {
            db = JSON.parse(salvo);

            // CORREÇÃO 1: arrays → string apenas aqui
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
        } catch {}
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

            } catch {}
        }
    }

    if (!db) db = [];

    bancoGlobal = db;

    salvarBanco(db);

    montarCards(db);
    montarBIIndividual(db);
    atualizarBI();
    mostrarMensagemDefaultDetalhe();
}

/* CORREÇÃO 2: salvar sempre STRING */
function salvarBanco(db) {
    const salvar = db.map(b => ({
        nome: b.nome,
        categoria: b.categoria,
        // se vier array, converte para string; se vier string, mantém
        asis: typeof b.asis === "string" ? b.asis : b.asis.join("\n"),
        tobe: typeof b.tobe === "string" ? b.tobe : b.tobe.join("\n")
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
            const novoDB = JSON.parse(e.target.result);

            novoDB.forEach(b => {
                if (Array.isArray(b.asis)) b.asis = b.asis.join("\n");
                if (Array.isArray(b.tobe)) b.tobe = b.tobe.join("\n");
            });

            bancoGlobal = novoDB;
            salvarBanco(novoDB);

            montarCards(novoDB);
            montarBIIndividual(novoDB);
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

        card.innerHTML = `
            <div class="card-titulo">${b.nome}</div>
            <div class="card-categoria">${b.categoria}</div>
            <div class="impacto ${impacto.classe}">
                ${qtd} ações AS IS – ${impacto.rotulo}
            </div>
        `;

        card.addEventListener("click", () => abrirEditor(b.nome));
        container.appendChild(card);
    });
}

function mostrarMensagemDefaultDetalhe() {
    document.getElementById("conteudo-detalhes").innerHTML = `
        <div class="bloco">
            Selecione um benefício acima para editar suas atividades AS IS e TO BE.
        </div>
    `;
}

function abrirEditor(nome) {
    marcarCardAtivo(nome); // NOVO
    const det = document.getElementById("conteudo-detalhes");
    const item = bancoGlobal.find(x => x.nome === nome);

    const asisText = normalizarTexto(item.asis);
    const tobeText = normalizarTexto(item.tobe);

    det.innerHTML = `
        <div class="bloco">
            <div class="titulo-bloco">Impacto Operacional</div>
            <p>${contarAcoes(item.asis)} ações AS IS para ${item.nome}.</p>
        </div>

        <div class="bloco">
            <div class="titulo-bloco">AS IS – Como funciona hoje</div>
            <textarea id="asisText">${asisText}</textarea>
        </div>

        <div class="bloco">
            <div class="titulo-bloco">TO BE – Como deve funcionar</div>
            <textarea id="tobeText">${tobeText}</textarea>
        </div>
    `;

    document.getElementById("asisText").addEventListener("input", () => autosaveEditor(nome));
    document.getElementById("tobeText").addEventListener("input", () => autosaveEditor(nome));
}

/* CORREÇÃO 3: salvar AS IS / TO BE como STRING */
function autosaveEditor(nome) {
    const item = bancoGlobal.find(x => x.nome === nome);
    if (!item) return;

    item.asis = document.getElementById("asisText").value;  // STRING
    item.tobe = document.getElementById("tobeText").value;  // STRING

    salvarBanco(bancoGlobal);
    atualizarBI();
}

/* BI */
function atualizarBI() {
    let totalASIS = 0;
    let totalTOBE = 0;

    bancoGlobal.forEach(b => {
        totalASIS += contarAcoes(b.asis);
        totalTOBE += contarAcoes(b.tobe);
    });

    document.getElementById("bi-retrabalho").textContent = totalASIS;
    document.getElementById("bi-tempo").textContent      = Math.round(totalASIS * 0.6);
    document.getElementById("bi-base").textContent       = Math.round(totalTOBE * 0.3);
    document.getElementById("bi-sla").textContent        = Math.round(totalTOBE * 0.5);
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
        const safeId = b.nome.replace(/\s+/g, "_");
        const dados = bi[b.nome];

        const card = document.createElement("div");
        card.className = "bi-card-individual";

        card.innerHTML = `
            <div class="bi-beneficio-titulo">${b.nome}</div>

            <label>Tempo Operacional (h/mês)</label>
            <input type="number" id="tempo_${safeId}" value="${dados.tempo}">

            <label>Retrabalho (%)</label>
            <input type="number" id="retrabalho_${safeId}" value="${dados.retrabalho}">

            <label>SLA (dias)</label>
            <input type="number" id="sla_${safeId}" value="${dados.sla}">

            <label>Confiabilidade da Base (%)</label>
            <input type="number" id="confi_${safeId}" value="${dados.confiabilidade}">

            <button class="bi-salvar">Salvar indicadores</button>
        `;

        card.querySelector(".bi-salvar").onclick = () => {
            bi[b.nome] = {
                tempo: Number(document.getElementById(`tempo_${safeId}`).value || 0),
                retrabalho: Number(document.getElementById(`retrabalho_${safeId}`).value || 0),
                sla: Number(document.getElementById(`sla_${safeId}`).value || 0),
                confiabilidade: Number(document.getElementById(`confi_${safeId}`).value || 0)
            };
            salvarBIIndividual(bi);
            alert("Indicadores salvos para " + b.nome);
        };

        grid.appendChild(card);
    });
}

/* SALVAR TXT */
function salvarTXT() {
    const db = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");

    const blob = new Blob([JSON.stringify(db, null, 4)], {
        type: "application/json;charset=utf-8"
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");

    a.href = url;
    a.download = "beneficios_db_autosalvo.txt";
    a.click();

    URL.revokeObjectURL(url);
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

    salvarTXT(); // salva automaticamente ao carregar
});

function montarCards(db) {
    const container = document.getElementById("lista-beneficios");
    container.innerHTML = "";

    db.forEach(b => {
        const qtd = contarAcoes(b.asis);
        const impacto = classificarImpacto(qtd);

        const card = document.createElement("div");
        card.className = "card";
        card.dataset.nome = b.nome;  // identificar card

        card.innerHTML = `
            <div class="card-titulo">${b.nome}</div>
            <div class="card-categoria">${b.categoria}</div>
            <div class="impacto ${impacto.classe}">
                ${qtd} ações AS IS – ${impacto.rotulo}
            </div>
        `;

        card.addEventListener("click", () => {
            marcarCardAtivo(b.nome);
            abrirEditor(b.nome);
        });

        container.appendChild(card);
    });
}
function marcarCardAtivo(nome) {
    const todos = document.querySelectorAll(".card");
    todos.forEach(c => c.classList.remove("card-ativo"));

    const ativo = document.querySelector(`.card[data-nome="${nome}"]`);
    if (ativo) ativo.classList.add("card-ativo");
}

