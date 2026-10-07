(function () {
    "use strict";

    const $ = (sel) => document.querySelector(sel);

    let usuario = null;
    let pendentes = [];
    let docSelecionado = null;
    let usuarioSelecionado = null;
    let acaoConfirmada = null;
    let toastTimer = null;

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

    async function obterCsrfToken() {
        const resposta = await fetch("/api/auth/csrf", {
            method: "GET",
            credentials: "same-origin",
            cache: "no-store"
        });

        if (!resposta.ok) {
            throw new Error("Não foi possível obter o token de segurança.");
        }

        const dados = await resposta.json();
        return dados.token;
    }

    async function carregarSessao() {
        const resposta = await fetch("/api/auth/me", {
            method: "GET",
            credentials: "same-origin",
            cache: "no-store"
        });

        if (!resposta.ok) {
            usuario = null;
            return false;
        }

        usuario = await resposta.json();

        const autorizado = usuario.cargo === "MODERADOR" || usuario.cargo === "ADMINISTRADOR";

        if (!autorizado) {
            usuario = null;
            return false;
        }

        return true;
    }

    async function carregarPendentes() {
        const resposta = await fetch(
                "/api/documentos/pendentes",
                {
                    method: "GET",
                    credentials: "same-origin",
                    cache: "no-store"
                }
        );

        if (resposta.status === 403) {
            window.location.href = "index.html";
            return;
        }

        if (!resposta.ok) {
            throw new Error(`Falha ao carregar documentos pendentes. HTTP ${resposta.status}.`);
        }

        pendentes = await resposta.json();

        const idSelecionado = docSelecionado ? docSelecionado.id : null;

        docSelecionado = idSelecionado ? pendentes.find((doc) => doc.id === idSelecionado) || null : null;

        renderizarPendentes();
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

            if (docSelecionado && docSelecionado.id === doc.id) {
                tr.classList.add("selecionada");
            }

            const celulaLink = doc.tipo === "PDF" ? `<td>${escapeHtml(doc.nomeArquivo || "Arquivo PDF")} <em>(arquivo PDF)</em></td>` : (() => {

                const curto = doc.link.length > 32 ? doc.link.slice(0, 32) + "…" : doc.link;

                return `
                        <td>
                            <a
                                href="${escapeHtml(doc.link)}"
                                target="_blank"
                                rel="noopener"
                                >
                                ${escapeHtml(curto)}
                            </a>
                        </td>
                        `;
            })();

            tr.innerHTML =
                    `<td>${doc.id}</td>` +
                    `<td>${escapeHtml(doc.titulo)}</td>` +
                    `<td>${escapeHtml(doc.topico)}</td>` +
                    celulaLink;

            tr.addEventListener("click", () => {
                docSelecionado = doc;
                el.tbody.querySelectorAll("tr").forEach((row) => row.classList.remove("selecionada"));
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

        if (!docSelecionado.link) {
            toast("O documento não possui um endereço disponível.", true);
            return;
        }

        window.open(docSelecionado.link, "_blank", "noopener");
    }

    async function aprovarDocumento() {

        if (!docSelecionado) {
            toast("Selecione um documento para aprovar.", true);
            return;
        }

        const titulo = docSelecionado.titulo;
        const id = docSelecionado.id;

        try {

            const csrfToken = await obterCsrfToken();
            const resposta = await fetch(`/api/documentos/${id}/aprovar`,
                    {
                        method: "POST",
                        credentials: "same-origin",
                        headers: {
                            "X-XSRF-TOKEN": csrfToken
                        }
                    }
            );

            let dados = {};

            try {
                dados = await resposta.json();
            } catch {
                dados = {};
            }

            if (resposta.ok) {
                docSelecionado = null;
                await carregarPendentes();
                toast(`"${titulo}" aprovado! Agora visível na tela inicial.`);
                return;
            }

            if (resposta.status === 403) {
                toast(dados.mensagem || "Você não possui permissão para aprovar este documento.", true);
                return;
            }

            if (resposta.status === 404) {
                toast(dados.mensagem || "Documento não encontrado.", true);
                await carregarPendentes();
                return;
            }

            if (resposta.status === 409) {
                toast(dados.mensagem || "O documento não está mais pendente.", true);
                await carregarPendentes();
                return;
            }

            toast(dados.mensagem || "Não foi possível aprovar o documento.", true);

        } catch (erro) {
            console.error("Erro ao aprovar documento:", erro);
            toast("Não foi possível conectar ao servidor.", true);
        }
    }

    async function rejeitarDocumento() {

        if (!docSelecionado) {
            toast("Selecione um documento para rejeitar.", true);
            return;
        }

        const titulo = docSelecionado.titulo;
        const id = docSelecionado.id;

        try {
            const csrfToken = await obterCsrfToken();
            const resposta = await fetch(
                    `/api/documentos/${id}/rejeitar`,
                    {
                        method: "POST",
                        credentials: "same-origin",
                        headers: {
                            "X-XSRF-TOKEN": csrfToken
                        }
                    }
            );

            let dados = {};

            try {
                dados = await resposta.json();
            } catch {
                dados = {};
            }

            if (resposta.status === 204) {
                docSelecionado = null;
                await carregarPendentes();
                toast(`"${titulo}" rejeitado e removido da fila de espera.`);
                return;
            }

            if (resposta.status === 403) {
                toast(dados.mensagem || "Você não possui permissão para rejeitar este documento.", true);
                return;
            }

            if (resposta.status === 404) {
                toast(dados.mensagem || "Documento não encontrado.", true);
                await carregarPendentes();
                return;
            }

            if (resposta.status === 409) {
                toast(dados.mensagem || "O documento não está mais pendente.", true);
                await carregarPendentes();
                return;
            }

            toast(dados.mensagem || "Não foi possível rejeitar o documento.", true);

        } catch (erro) {
            console.error("Erro ao rejeitar documento:", erro);
            toast("Não foi possível conectar ao servidor.", true);
        }
    }

    async function carregarUsuarios() {

        const resposta = await fetch("/api/admin/usuarios",
                {
                    method: "GET",
                    credentials: "same-origin",
                    cache: "no-store"
                }
        );

        if (resposta.status === 403) {
            toast("A sessão atual não possui privilégios de administrador.", true);
            return;
        }

        if (!resposta.ok) {
            throw new Error(`Falha ao carregar usuários. HTTP ${resposta.status}.`);
        }

        const usuarios = await resposta.json();
        const idSelecionado = usuarioSelecionado ? usuarioSelecionado.id : null;

        usuarioSelecionado = idSelecionado ? usuarios.find((u) => u.id === idSelecionado) || null : null;

        renderizarUsuarios(usuarios);
    }

    function renderizarUsuarios(usuarios) {

        el.tbodyUsuarios.innerHTML = "";

        if (usuarios.length === 0) {
            el.msgVazioUsuarios.style.display = "block";
            return;
        }

        el.msgVazioUsuarios.style.display = "none";

        usuarios.forEach((conta) => {

            const tr = document.createElement("tr");

            if (usuarioSelecionado && usuarioSelecionado.id === conta.id) {
                tr.classList.add("selecionada");
            }

            const classeStatus = conta.status === "SUSPENSO" ? "status-suspenso" : "status-normal";
            const cargoExibicao = conta.cargo === "USUARIO" ? "Usuario" : conta.cargo === "MODERADOR" ? "Moderador" : "Administrador";
            const statusExibicao = conta.status === "SUSPENSO" ? "Suspenso" : cargoExibicao;

            tr.innerHTML =
                    `<td>${conta.id}</td>` +
                    `<td>${escapeHtml(conta.email)}</td>` +
                    `<td><span class="status ${classeStatus}">${escapeHtml(statusExibicao)}</span></td>`;

            tr.addEventListener("click", () => {
                usuarioSelecionado = conta;
                el.tbodyUsuarios.querySelectorAll("tr").forEach((row) => row.classList.remove("selecionada"));
                tr.classList.add("selecionada");
                atualizarBotaoSuspensao();
            });
            el.tbodyUsuarios.appendChild(tr);
        });
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

    async function deletarUsuario() {

        if (!usuarioSelecionado) {
            toast("Selecione um usuário na tabela primeiro.", true);
            return;
        }

        if (usuarioSelecionado.id === usuario.id) {
            toast("Você não pode deletar a própria conta.", true);
            return;
        }

        const alvo = usuarioSelecionado;

        abrirConfirmacao("Deletar usuário", `Deseja realmente DELETAR a conta "${alvo.email}"? Esta ação não pode ser desfeita.`, async () => {

            try {
                const csrfToken = await obterCsrfToken();

                const resposta = await fetch(`/api/admin/usuarios/${alvo.id}`,
                        {
                            method: "DELETE",
                            credentials: "same-origin",
                            headers: {
                                "X-XSRF-TOKEN": csrfToken
                            }
                        }
                );

                let dados = {};

                try {
                    dados = await resposta.json();
                } catch {
                    dados = {};
                }

                if (resposta.status === 204) {
                    usuarioSelecionado = null;
                    atualizarBotaoSuspensao();
                    await carregarUsuarios();
                    toast(`Conta "${alvo.email}" deletada.`);
                    return;
                }

                if (resposta.status === 409) {
                    toast(dados.mensagem || "Não é possível deletar este usuário.", true);
                    return;
                }

                if (resposta.status === 403) {
                    toast(dados.mensagem || "Você não possui permissão para deletar este usuário.", true);
                    return;
                }

                if (resposta.status === 404) {
                    toast(dados.mensagem || "Usuário não encontrado.", true);
                    await carregarUsuarios();
                    return;
                }

                toast(dados.mensagem || "Não foi possível deletar o usuário.", true);

            } catch (erro) {
                console.error("Erro ao deletar usuário:", erro);
                toast("Não foi possível conectar ao servidor.", true);
            }
        }
        );
    }

    function atualizarBotaoSuspensao() {
        if (!usuarioSelecionado) {
            el.btnSuspenderUsuario.textContent = "Suspender";
            return;
        }

        el.btnSuspenderUsuario.textContent = usuarioSelecionado.status === "SUSPENSO" ? "Levantar Suspensão" : "Suspender";
    }

    async function suspenderUsuario() {

        if (!usuarioSelecionado) {
            toast("Selecione um usuário na tabela primeiro.", true);
            return;
        }

        if (usuarioSelecionado.id === usuario.id) {
            toast("Você não pode suspender a própria conta.", true);
            return;
        }

        const alvo = usuarioSelecionado;
        const estaSuspenso = alvo.status === "SUSPENSO";
        const tituloConfirmacao = estaSuspenso ? "Levantar suspensão" : "Suspender usuário";
        const textoConfirmacao = estaSuspenso ? `Deseja realmente LEVANTAR A SUSPENSÃO da conta "${alvo.email}"?` : `Deseja realmente SUSPENDER a conta "${alvo.email}"? O usuário não conseguirá mais entrar.`;

        abrirConfirmacao(tituloConfirmacao, textoConfirmacao, async () => {

            try {

                const csrfToken = await obterCsrfToken();
                const resposta = await fetch(`/api/admin/usuarios/${alvo.id}/suspender`,
                        {
                            method: "PATCH",
                            credentials: "same-origin",
                            headers: {"X-XSRF-TOKEN": csrfToken}
                        }
                );

                let dados = {};

                try {
                    dados = await resposta.json();
                } catch {
                    dados = {};
                }

                if (resposta.ok) {
                    usuarioSelecionado = dados;
                    await carregarUsuarios();
                    atualizarBotaoSuspensao();
                    toast(dados.status === "SUSPENSO" ? `Conta "${alvo.email}" suspensa.` : `Suspensão da conta "${alvo.email}" levantada.`);
                    return;
                }

                if (resposta.status === 403) {
                    toast(dados.mensagem || "Você não possui permissão para alterar o status deste usuário.", true);
                    return;
                }

                if (resposta.status === 404) {
                    toast(dados.mensagem || "Usuário não encontrado.", true);
                    await carregarUsuarios();
                    return;
                }

                toast(dados.mensagem || "Não foi possível alterar o status do usuário.", true);

            } catch (erro) {
                console.error("Erro ao alterar status do usuário:", erro);
                toast("Não foi possível conectar ao servidor.", true);
            }
        }
        );
    }

    function abrirAlterarCargo() {

        if (!usuarioSelecionado) {
            toast("Selecione um usuário na tabela primeiro.", true);
            return;
        }

        el.modalCargo.classList.add("aberto");
    }

    async function alterarCargo(novoCargo) {

        if (!usuarioSelecionado) {
            el.modalCargo.classList.remove("aberto");
            return;
        }

        const alvo = usuarioSelecionado;

        try {

            const csrfToken = await obterCsrfToken();
            const resposta = await fetch(`/api/admin/usuarios/${alvo.id}/cargo`,
                    {
                        method: "PATCH",
                        credentials: "same-origin",
                        headers: {
                            "Content-Type": "application/json",
                            "X-XSRF-TOKEN": csrfToken
                        },
                        body: JSON.stringify({
                            cargo: novoCargo
                        })
                    }
            );

            let dados = {};

            try {
                dados = await resposta.json();
            } catch {
                dados = {};
            }

            if (resposta.ok) {

                el.modalCargo.classList.remove("aberto");

                if (alvo.id === usuario.id) {
                    usuario = dados;
                }

                usuarioSelecionado = dados;

                await carregarUsuarios();

                toast(`Cargo de "${alvo.email}" alterado para ${novoCargo}.`);

                return;
            }

            if (resposta.status === 403) {
                toast(dados.mensagem || "Você não possui permissão para alterar cargos.", true);
                return;
            }

            if (resposta.status === 404) {
                toast(dados.mensagem || "Usuário não encontrado.", true);
                await carregarUsuarios();
                return;
            }

            if (resposta.status === 400) {
                toast(dados.mensagem || "Cargo inválido.", true);
                return;
            }

            toast(dados.mensagem || "Não foi possível alterar o cargo.", true);

        } catch (erro) {
            console.error("Erro ao alterar cargo:", erro);
            toast("Não foi possível conectar ao servidor.", true);
        }
    }

    function configurarInterface() {
        el.btnAdmin.disabled = usuario.cargo !== "ADMINISTRADOR";
    }

    el.btnVoltar.addEventListener("click", () => {
        window.location.href = "index.html";
    });

    $("#logo-docbank").addEventListener("click", () => {
        window.location.href = "index.html";
    });

    el.btnAbrir.addEventListener("click", abrirDocumento);
    el.btnAprovar.addEventListener("click", aprovarDocumento);
    el.btnRejeitar.addEventListener("click", rejeitarDocumento);

    el.btnAdmin.addEventListener("click", async () => {

        if (usuario.cargo !== "ADMINISTRADOR")
            return;

        usuarioSelecionado = null;
        atualizarBotaoSuspensao();

        try {
            await carregarUsuarios();
            el.modalAdmin.classList.add("aberto");
        } catch (erro) {
            console.error("Erro ao abrir sessão do administrador:", erro);
            toast("Não foi possível carregar os usuários.", true);
        }
    });

    el.btnFecharAdmin.addEventListener("click", () => el.modalAdmin.classList.remove("aberto"));

    el.btnDeletarUsuario.addEventListener("click", deletarUsuario);
    el.btnSuspenderUsuario.addEventListener("click", suspenderUsuario);
    el.btnAlterarCargo.addEventListener("click", abrirAlterarCargo);

    el.btnConfirmSim.addEventListener("click", async () => {

        const acao = acaoConfirmada;

        fecharConfirmacao();

        if (acao) {
            await acao();
        }
    }
    );

    el.btnConfirmNao.addEventListener("click", fecharConfirmacao);

    document.querySelectorAll("#modal-cargo [data-cargo]").forEach((btn) => {
        btn.addEventListener("click", () => alterarCargo(btn.dataset.cargo));
    });

    el.btnCancelarCargo.addEventListener("click", () => el.modalCargo.classList.remove("aberto"));

    [el.modalAdmin, el.modalConfirm, el.modalCargo].forEach((modal) => {

        modal.addEventListener("click", (e) => {
            if (e.target === modal) {
                modal.classList.remove("aberto");
            }
        }
        );
    });

    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
            el.modalCargo.classList.remove("aberto");
            fecharConfirmacao();
        }
    }
    );

    async function inicializar() {
        try {
            const autorizado = await carregarSessao();

            if (!autorizado) {
                window.location.href = "index.html";
                return;
            }

            configurarInterface();

            await carregarPendentes();
        } catch (erro) {
            console.error("Erro ao inicializar painel:", erro);
            toast("Não foi possível carregar o Painel de Controle.", true);
        }
    }
    inicializar();
})();
