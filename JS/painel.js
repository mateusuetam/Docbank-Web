(function () {
    "use strict";

    const $ = (sel) => document.querySelector(sel);
    const usuario = JSON.parse(localStorage.getItem("docbank_usuario") || "null");

    if (!usuario || (usuario.nivel !== "Moderador" && usuario.nivel !== "Administrador")) {
        window.location.href = "index.html";
        return;
    }

    let pendentes = JSON.parse(localStorage.getItem("docbank_pendentes") || "[]");
    let docSelecionado = null;
    let usuarioSelecionado = null;
    let acaoConfirmada = null;

    function salvarPendentes() {
        localStorage.setItem("docbank_pendentes", JSON.stringify(pendentes));
    }

    function getContas() {
        return JSON.parse(localStorage.getItem("docbank_contas") || "[]");
    }

    function salvarContas(contas) {
        localStorage.setItem("docbank_contas", JSON.stringify(contas));
    }

    const el = {
        tbody: $("#tabela-pendentes tbody"),
        msgVazio: $("#msg-vazio"),
        btnVoltar: $("#btn-voltar"),
        btnAdmin: $("#btn-admin"),
        btnRejeitar: $("#btn-rejeitar"),
        btnAprovar: $("#btn-aprovar"),
        btnAbrir: $("#btn-abrir"),
        modalAdmin: $("#modal-admin"),
        tbodyUsuarios: $("#tabela-usuarios tbody"),
        msgVazioUsuarios: $("#msg-vazio-usuarios"),
        btnFecharAdmin: $("#btn-fechar-admin"),
        btnDeletarUsuario: $("#btn-deletar-usuario"),
        btnSuspenderUsuario: $("#btn-suspender-usuario"),
        btnAlterarCargo: $("#btn-alterar-cargo"),
        modalConfirm: $("#modal-confirm"),
        confirmTitulo: $("#confirm-titulo"),
        confirmTexto: $("#confirm-texto"),
        btnConfirmSim: $("#confirm-sim"),
        btnConfirmNao: $("#confirm-nao"),
        modalCargo: $("#modal-cargo"),
        btnCancelarCargo: $("#btn-cancelar-cargo"),
        toast: $("#toast")
    };

    let toastTimer = null;
    function toast(mensagem, erro = false) {
        clearTimeout(toastTimer);
        el.toast.textContent = mensagem;
        el.toast.classList.toggle("erro", erro);
        el.toast.classList.add("visivel");
        toastTimer = setTimeout(() => el.toast.classList.remove("visivel"), 2800);
    }

    function escapeHtml(texto) {
        const div = document.createElement("div");
        div.textContent = texto;
        return div.innerHTML;
    }

    function renderizarPendentes() {
        el.tbody.innerHTML = "";
        if (pendentes.length === 0) {
            el.msgVazio.style.display = "block";
            el.msgVazio.textContent = "Nenhum documento aguardando aprovação.";
            return;
        }
        el.msgVazio.style.display = "none";
        pendentes.forEach((doc) => {
            const tr = document.createElement("tr");
            tr.dataset.id = doc.id;
            if (docSelecionado && docSelecionado.id === doc.id) tr.classList.add("selecionada");
            const ehPdfLocal = doc.link.startsWith("PDF_LOCAL:");
            const celulaLink = ehPdfLocal ? `<td> ${escapeHtml(doc.link.replace("PDF_LOCAL:", ""))} <em>(arquivo local)</em></td>` : (() => {
                const curto = doc.link.length > 32 ? doc.link.slice(0, 32) + "…" : doc.link;
                return `<td><a href="${escapeHtml(doc.link)}" target="_blank" rel="noopener">${escapeHtml(curto)}</a></td>`;
            })();
            tr.innerHTML =
                `<td>${doc.id}</td>` +
                `<td>${escapeHtml(doc.titulo)}</td>` +
                `<td>${escapeHtml(doc.topico)}</td>` +
                celulaLink;
            tr.addEventListener("click", () => {
                docSelecionado = doc;
                el.tbody.querySelectorAll("tr").forEach((r) => r.classList.remove("selecionada"));
                tr.classList.add("selecionada");
            });
            el.tbody.appendChild(tr);
        });
    }

    function abrirDocumento() {
        if (!docSelecionado) {
            toast("Selecione um documento na tabela primeiro.", true);
            return;
        }
        if (docSelecionado.link.startsWith("PDF_LOCAL:")) {
            const dataUrl = localStorage.getItem("docbank_pdfdata_" + docSelecionado.id);
            if (dataUrl) {
                window.open(dataUrl, "_blank", "noopener");
            } else {
                toast("O arquivo deste PDF não está disponível (excedeu o limite de persistência do protótipo).", true);
            }
            return;
        }
        window.open(docSelecionado.link, "_blank", "noopener");
    }

    function aprovarDocumento() {
        if (!docSelecionado) {
            toast("Selecione um documento para aprovar.", true);
            return;
        }

        const idAprovado = docSelecionado.id;

        pendentes = pendentes.filter((d) => d.id !== idAprovado);
        salvarPendentes();

        const aprovados = JSON.parse(localStorage.getItem("docbank_aprovados") || "[]");
        if (!aprovados.some((d) => d.id === idAprovado)) {
            aprovados.push(docSelecionado);
            localStorage.setItem("docbank_aprovados", JSON.stringify(aprovados));
        }

        const estadoDocs = JSON.parse(localStorage.getItem("docbank_documentos_estado") || "null");
        if (estadoDocs) {
            if (!estadoDocs.some((d) => d.id === idAprovado)) {
                estadoDocs.push(docSelecionado);
                localStorage.setItem("docbank_documentos_estado", JSON.stringify(estadoDocs));
            }
        }

        toast(`"${docSelecionado.titulo}" aprovado! Agora visível na tela inicial.`);
        docSelecionado = null;
        renderizarPendentes();
    }

    function rejeitarDocumento() {
        if (!docSelecionado) {
            toast("Selecione um documento para rejeitar.", true);
            return;
        }
        const idRejeitado = docSelecionado.id;
        pendentes = pendentes.filter((d) => d.id !== idRejeitado);
        salvarPendentes();
        localStorage.removeItem("docbank_pdfdata_" + idRejeitado);
        toast(`"${docSelecionado.titulo}" rejeitado e removido da fila de espera.`);
        docSelecionado = null;
        renderizarPendentes();
    }

    function abrirConfirmacao(titulo, texto, aoConfirmar) {
        el.confirmTitulo.textContent = titulo;
        el.confirmTexto.textContent = texto;
        acaoConfirmada = aoConfirmar;
        el.modalConfirm.classList.add("aberto");
    }

    function fecharConfirmacao() {
        el.modalConfirm.classList.remove("aberto");
        acaoConfirmada = null;
    }

    function renderizarUsuarios() {
        const contas = getContas();
        el.tbodyUsuarios.innerHTML = "";
        if (contas.length === 0) {
            el.msgVazioUsuarios.style.display = "block";
            return;
        }
        el.msgVazioUsuarios.style.display = "none";
        contas.forEach((conta, i) => {
            const tr = document.createElement("tr");
            tr.dataset.idx = i;
            if (usuarioSelecionado === i) tr.classList.add("selecionada");
            const classeStatus = conta.nivel === "Suspenso" ? "status-suspenso" : "status-normal";
            tr.innerHTML =
                `<td>${i + 1}</td>` +
                `<td>${escapeHtml(conta.email)}</td>` +
                `<td><span class="status ${classeStatus}">${escapeHtml(conta.nivel)}</span></td>`;
            tr.addEventListener("click", () => {
                usuarioSelecionado = i;
                el.tbodyUsuarios.querySelectorAll("tr").forEach((r) => r.classList.remove("selecionada"));
                tr.classList.add("selecionada");
            });
            el.tbodyUsuarios.appendChild(tr);
        });
    }

    function contaSelecionada() {
        if (usuarioSelecionado === null) {
            toast("Selecione um usuário na tabela primeiro.", true);
            return null;
        }
        const contas = getContas();
        return contas[usuarioSelecionado] || null;
    }

    function deletarUsuario() {
        const alvo = contaSelecionada();
        if (!alvo) return;
        if (alvo.email === usuario.email) {
            toast("Você não pode deletar a própria conta.", true);
            return;
        }
        abrirConfirmacao(
            "Deletar usuário",
            `Deseja realmente DELETAR a conta "${alvo.email}"? Esta ação não pode ser desfeita.`,
            () => {
                let contas = getContas().filter((c) => c.email !== alvo.email);
                salvarContas(contas);
                localStorage.removeItem("docbank_favoritos_" + alvo.email);
                usuarioSelecionado = null;
                toast(`Conta "${alvo.email}" deletada.`);
                renderizarUsuarios();
            }
        );
    }

    function suspenderUsuario() {
        const alvo = contaSelecionada();
        if (!alvo) return;
        if (alvo.email === usuario.email) {
            toast("Você não pode suspender a própria conta.", true);
            return;
        }
        if (alvo.nivel === "Suspenso") {
            toast("Esta conta já está suspensa.", true);
            return;
        }
        abrirConfirmacao(
            "Suspender usuário",
            `Deseja realmente SUSPENDER a conta "${alvo.email}"? O usuário não conseguirá mais entrar.`,
            () => {
                const contas = getContas();
                const conta = contas.find((c) => c.email === alvo.email);
                conta.nivel = "Suspenso";
                salvarContas(contas);
                toast(`Conta "${alvo.email}" suspensa.`);
                renderizarUsuarios();
            }
        );
    }

    function abrirAlterarCargo() {
        const alvo = contaSelecionada();
        if (!alvo) return;
        el.modalCargo.classList.add("aberto");
    }

    function alterarCargo(novoCargo) {
        const alvo = contaSelecionada();
        if (!alvo) { el.modalCargo.classList.remove("aberto"); return; }
        const contas = getContas();
        const conta = contas.find((c) => c.email === alvo.email);
        conta.nivel = novoCargo;
        salvarContas(contas);
        if (alvo.email === usuario.email) {
            usuario.nivel = novoCargo;
            localStorage.setItem("docbank_usuario", JSON.stringify(usuario));
        }
        el.modalCargo.classList.remove("aberto");
        toast(`Cargo de "${alvo.email}" alterado para ${novoCargo}.`);
        renderizarUsuarios();
    }

    el.btnVoltar.addEventListener("click", () => window.location.href = "index.html");
    $("#logo-docbank").addEventListener("click", () => window.location.href = "index.html");
    el.btnAbrir.addEventListener("click", abrirDocumento);
    el.btnAprovar.addEventListener("click", aprovarDocumento);
    el.btnRejeitar.addEventListener("click", rejeitarDocumento);
    el.btnAdmin.disabled = usuario.nivel !== "Administrador";
    el.btnAdmin.addEventListener("click", () => {
        if (usuario.nivel !== "Administrador") return;
        usuarioSelecionado = null;
        renderizarUsuarios();
        el.modalAdmin.classList.add("aberto");
    });
    el.btnFecharAdmin.addEventListener("click", () => el.modalAdmin.classList.remove("aberto"));
    el.btnDeletarUsuario.addEventListener("click", deletarUsuario);
    el.btnSuspenderUsuario.addEventListener("click", suspenderUsuario);
    el.btnAlterarCargo.addEventListener("click", abrirAlterarCargo);
    el.btnConfirmSim.addEventListener("click", () => {
        if (acaoConfirmada) acaoConfirmada();
        fecharConfirmacao();
    });
    el.btnConfirmNao.addEventListener("click", fecharConfirmacao);
    document.querySelectorAll("#modal-cargo [data-cargo]").forEach((btn) => {
        btn.addEventListener("click", () => alterarCargo(btn.dataset.cargo));
    });
    el.btnCancelarCargo.addEventListener("click", () => el.modalCargo.classList.remove("aberto"));
    [el.modalAdmin, el.modalConfirm, el.modalCargo].forEach((modal) => {
        modal.addEventListener("click", (e) => {
            if (e.target === modal) modal.classList.remove("aberto");
        });
    });
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
            el.modalCargo.classList.remove("aberto");
            fecharConfirmacao();
        }
    });

    renderizarPendentes();
})();