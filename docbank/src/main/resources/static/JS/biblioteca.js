(function () {
    "use strict";

    const $ = (sel) => document.querySelector(sel);

    let usuario = null;
    let documentos = [];
    let docSelecionado = null;
    let ordenacao = {chave: null, dir: 1};
    let toastTimer = null;

    const el = {
        pesquisa: $("#pesquisa"),
        tbody: $("#tabela-favoritos tbody"),
        msgVazio: $("#msg-vazio"),
        infoUsuario: $("#info-usuario"),
        btnVoltar: $("#btn-voltar"),
        btnRemover: $("#btn-remover"),
        btnAbrir: $("#btn-abrir"),
        toast: $("#toast")
    };

    function toast(mensagem, erro = false) {
        clearTimeout(toastTimer);

        el.toast.textContent = mensagem;
        el.toast.classList.toggle("erro", erro);
        el.toast.classList.add("visivel");

        toastTimer = setTimeout(() => {
            el.toast.classList.remove("visivel");
        }, 2600);
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
        return true;
    }

    async function carregarFavoritos() {
        const resposta = await fetch("/api/favoritos", {
            method: "GET",
            credentials: "same-origin",
            cache: "no-store"
        });

        if (resposta.status === 401 || resposta.status === 403) {
            usuario = null;
            window.location.href = "index.html";
            return;
        }

        if (!resposta.ok) {
            throw new Error(`Falha ao carregar a Biblioteca Pessoal. HTTP ${resposta.status}.`);
        }

        documentos = await resposta.json();

        const idSelecionado = docSelecionado ? docSelecionado.id : null;

        docSelecionado = idSelecionado ? documentos.find((doc) => doc.id === idSelecionado) || null : null;

        atualizarTabela();
    }

    function ordenarLista(lista) {
        if (!ordenacao.chave) {
            return lista;
        }

        const dir = ordenacao.dir;

        return [...lista].sort((a, b) => {
            if (ordenacao.chave === "id") {
                return (a.id - b.id) * dir;
            }

            return String(a[ordenacao.chave] ?? "").localeCompare(String(b[ordenacao.chave] ?? ""), "pt-BR") * dir;
        });
    }

    function atualizarTabela() {
        const termo = el.pesquisa.value.trim().toLowerCase();

        if (termo.length === 1) {
            return;
        }

        let lista = [...documentos];

        if (termo) {
            lista = lista.filter((doc) =>
                String(doc.id).includes(termo) || String(doc.titulo).toLowerCase().includes(termo) || String(doc.topico).toLowerCase().includes(termo));
        }

        renderizarTabela(ordenarLista(lista));
        atualizarIndicadoresOrdem();
    }

    function renderizarTabela(lista) {
        el.tbody.innerHTML = "";

        if (lista.length === 0) {
            el.msgVazio.style.display = "block";

            el.msgVazio.textContent =
                    documentos.length === 0 ? "Nenhum documento favoritado ainda. Favorite documentos na tela inicial." : "Nenhum favorito encontrado para a pesquisa.";

            return;
        }

        el.msgVazio.style.display = "none";

        lista.forEach((doc) => {
            const tr = document.createElement("tr");

            tr.dataset.id = doc.id;

            if (docSelecionado && docSelecionado.id === doc.id) {
                tr.classList.add("selecionada");
            }

            let celulaLink;

            if (doc.tipo === "PDF") {
                celulaLink =
                        `<td>${escapeHtml(doc.nomeArquivo || "Arquivo PDF")} ` +
                        `<em>(arquivo PDF)</em></td>`;
            } else {
                const curto = doc.link.length > 28 ? doc.link.slice(0, 28) + "…" : doc.link;

                celulaLink =
                        `<td>` +
                        `<a href="${escapeHtml(doc.link)}" ` +
                        `target="_blank" rel="noopener">` +
                        `${escapeHtml(curto)}` +
                        `</a>` +
                        `</td>`;
            }

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

    function atualizarIndicadoresOrdem() {
        document.querySelectorAll("#tabela-favoritos thead th").forEach((th) => {

            const seta = th.querySelector(".seta-ord");
            const ativo = th.dataset.chave === ordenacao.chave;

            th.classList.toggle("ordenado", ativo);

            if (seta) {
                seta.textContent = ativo ? (ordenacao.dir === 1 ? "▲" : "▼") : "↕";
            }
        });
    }

    function configurarOrdenacao() {
        const colunas = ["id", "titulo", "topico", "link"];

        document.querySelectorAll("#tabela-favoritos thead th").forEach((th, i) => {

            const chave = colunas[i];

            th.dataset.chave = chave;
            th.title = "Clique para ordenar";

            const seta = document.createElement("span");

            seta.className = "seta-ord";
            seta.textContent = "↕";

            th.appendChild(seta);

            th.addEventListener("click", () => {

                if (ordenacao.chave === chave) {
                    if (ordenacao.dir === 1) {
                        ordenacao.dir = -1;
                    } else {
                        ordenacao = {
                            chave: null, dir: 1
                        };
                    }
                } else {
                    ordenacao = {
                        chave, dir: 1
                    };
                }

                atualizarTabela();
            });
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

    async function removerDosFavoritos() {
        if (!docSelecionado) {
            toast("Selecione um documento para remover dos favoritos.", true);
            return;
        }

        const alvo = docSelecionado;
        const id = alvo.id;
        const titulo = alvo.titulo;

        try {
            const csrfToken = await obterCsrfToken();

            const resposta = await fetch(`/api/favoritos/${id}`,
                    {
                        method: "DELETE",
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

            if (resposta.status === 204) {
                docSelecionado = null;
                await carregarFavoritos();
                toast(`"${titulo}" removido dos favoritos.`);
                return;
            }

            if (resposta.status === 403) {
                toast(dados.mensagem || "Você não possui permissão para remover este favorito.", true);
                return;
            }

            if (resposta.status === 404) {
                toast(dados.mensagem || "Este documento não está nos seus favoritos.", true);
                docSelecionado = null;
                await carregarFavoritos();
                return;
            }

            toast(dados.mensagem || "Não foi possível remover o documento dos favoritos.", true);

        } catch (erro) {
            console.error("Erro ao remover favorito:", erro);
            toast("Não foi possível conectar ao servidor.", true);
        }
    }

    el.pesquisa.addEventListener("input", atualizarTabela);

    el.btnAbrir.addEventListener("click", abrirDocumento);
    el.btnRemover.addEventListener("click", removerDosFavoritos);

    el.btnVoltar.addEventListener("click", () => {
        window.location.href = "index.html";
    });

    $("#logo-docbank").addEventListener("click", () => {
        window.location.href = "index.html";
    });

    async function inicializar() {
        el.btnRemover.disabled = true;
        el.btnAbrir.disabled = true;

        try {
            const autorizado = await carregarSessao();

            if (!autorizado) {
                el.infoUsuario.textContent = "Usuário: Nenhum usuário logado";

                el.msgVazio.style.display = "block";
                el.msgVazio.textContent = "A Biblioteca Pessoal é exclusiva de contas logadas. Redirecionando...";

                setTimeout(() => {
                    window.location.href = "index.html";
                }, 2500);

                return;
            }

            el.infoUsuario.textContent = "Usuário: " + usuario.nome;

            configurarOrdenacao();

            await carregarFavoritos();

            el.btnRemover.disabled = false;
            el.btnAbrir.disabled = false;

        } catch (erro) {
            console.error("Erro ao inicializar a Biblioteca Pessoal:", erro);

            documentos = [];
            docSelecionado = null;

            el.msgVazio.style.display = "block";
            el.msgVazio.textContent = "Não foi possível carregar sua Biblioteca Pessoal.";

            toast("Não foi possível carregar a Biblioteca Pessoal.", true);
        }
    }
    inicializar();
})();
