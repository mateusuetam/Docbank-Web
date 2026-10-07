(function () {
    "use strict";

    const Sessao = {
        usuario: null,
        carregada: false,

        async carregar() {
            try {
                const resposta = await fetch("/api/auth/me", {
                    method: "GET",
                    credentials: "same-origin",
                    cache: "no-store"
                });

                if (resposta.ok) {
                    this.usuario = await resposta.json();
                } else if (resposta.status === 401 || resposta.status === 403) {
                    this.usuario = null;
                } else {
                    throw new Error(`Falha ao verificar a sessão. HTTP ${resposta.status}.`);
                }
            } catch (erro) {
                console.error("Erro ao verificar sessão:", erro);
                this.usuario = null;
                toast("Não foi possível verificar a sessão com o servidor.", true);
            } finally {
                this.carregada = true;
                atualizarInterface();
                atualizarTabela();
            }
        },

        async logout() {
            const csrfToken = await obterCsrfToken();

            const resposta = await fetch("/api/auth/logout", {
                method: "POST",
                credentials: "same-origin",
                headers: {
                    "X-XSRF-TOKEN": csrfToken
                }
            });

            if (!resposta.ok) {
                throw new Error(`Falha ao encerrar sessão. HTTP ${resposta.status}.`);
            }
            this.usuario = null;
        }
    };

    const pendentes = JSON.parse(localStorage.getItem("docbank_pendentes") || "[]");

    let documentos = JSON.parse(localStorage.getItem("docbank_documentos_estado"));
    if (!documentos) {
        documentos = [...window.DOCBANK_DOCUMENTOS];
    }

    const aprovadosSalvos = JSON.parse(localStorage.getItem("docbank_aprovados") || "[]");
    aprovadosSalvos.forEach((d) => {
        if (!documentos.some((x) => x.id === d.id))
            documentos.push(d);
    });

    function salvarEstadoDocumentos() {
        localStorage.setItem("docbank_documentos_estado", JSON.stringify(documentos));
    }
    salvarEstadoDocumentos();

    function proximoIdDocumento() {
        const ids = documentos.map((d) => d.id).concat(pendentes.map((d) => d.id));
        return ids.length ? Math.max(...ids) + 1 : 1;
    }

    function persistirPdfLocal(id, arquivo) {
        pdfsEmMemoria[id] = arquivo;
        if (arquivo && arquivo.size <= 1.5 * 1024 * 1024) {
            const reader = new FileReader();
            reader.onload = () => localStorage.setItem("docbank_pdfdata_" + id, reader.result);
            reader.readAsDataURL(arquivo);
        }
    }
    let documentoSelecionado = null;

    let ordenacao = {chave: null, dir: 1};

    const pdfsEmMemoria = {};
    const $ = (sel) => document.querySelector(sel);
    const formDocumento = $("#form-documento");
    const el = {
        infoUsuario: $("#info-usuario"),
        btnPainel: $("#btn-painel"),
        btnSubmeter: $("#btn-submeter"),
        btnBiblioteca: $("#btn-biblioteca"),
        btnSair: $("#btn-sair"),
        btnDeletar: $("#btn-deletar"),
        btnEditar: $("#btn-editar"),
        btnFavoritos: $("#btn-favoritos"),
        btnAbrir: $("#btn-abrir"),
        btnCadastrar: $("#btn-cadastrar"),
        btnEntrar: $("#btn-entrar"),
        pesquisa: $("#pesquisa"),
        tbody: $("#tabela-documentos tbody"),
        msgVazio: $("#msg-vazio"),
        modalFundo: $("#modal-fundo"),
        modalTitulo: $("#modal-titulo"),
        formDocumento: formDocumento,
        campoId: $("#campo-id"),
        inpTitulo: $("#inp-titulo"),
        inpTopico: $("#inp-topico"),
        inpLink: $("#inp-link"),
        inpArquivo: $("#inp-arquivo"),
        campoArquivo: $("#campo-arquivo"),
        campoLink: $("#campo-link"),
        radiosTipo: formDocumento.querySelectorAll('input[name="tipo-doc"]'),
        toast: $("#toast")
    };

    let toastTimer = null;
    function toast(mensagem, erro = false) {
        clearTimeout(toastTimer);
        el.toast.textContent = mensagem;
        el.toast.classList.toggle("erro", erro);
        el.toast.classList.add("visivel");
        toastTimer = setTimeout(() => el.toast.classList.remove("visivel"), 2600);
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

    function atualizarInterface() {
        const carregando = !Sessao.carregada;
        const logado = Sessao.usuario !== null;

        el.btnAbrir.disabled = false;
        el.btnCadastrar.disabled = carregando || logado;
        el.btnEntrar.disabled = carregando || logado;

        const cargo = logado ? Sessao.usuario.cargo : null;
        const podeGerenciar = logado && (cargo === "MODERADOR" || cargo === "ADMINISTRADOR");

        el.btnSubmeter.disabled = carregando || !logado;
        el.btnBiblioteca.disabled = carregando || !logado;
        el.btnSair.disabled = carregando || !logado;
        el.btnFavoritos.disabled = carregando || !logado;

        el.btnPainel.disabled = carregando || !podeGerenciar;
        el.btnDeletar.disabled = carregando || !podeGerenciar;
        el.btnEditar.disabled = carregando || !podeGerenciar;

        el.infoUsuario.textContent = logado ? "Usuário: " + Sessao.usuario.nome : "Usuário: Nenhum usuário logado";
        el.tbody.classList.toggle("modo-visitante", !logado);
    }

    function exigirLogin(acao) {
        if (!Sessao.carregada) {
            toast("Aguarde enquanto sua sessão é verificada.", true);
            return false;
        }

        if (!Sessao.usuario) {
            toast(`Ação "${acao}" disponível apenas para contas logadas.`, true);
            return false;
        }

        return true;
    }

    function renderizarTabela(lista) {
        el.tbody.innerHTML = "";

        if (lista.length === 0) {
            el.msgVazio.style.display = "block";
            el.msgVazio.textContent = "Nenhum documento encontrado.";
            return;
        }
        el.msgVazio.style.display = "none";

        lista.forEach((doc) => {
            const tr = document.createElement("tr");
            tr.dataset.id = doc.id;
            if (documentoSelecionado && documentoSelecionado.id === doc.id) {
                tr.classList.add("selecionada");
            }

            const ehPdfLocal = doc.link.startsWith("PDF_LOCAL:");
            const celulaLink = ehPdfLocal ? `<td> ${escapeHtml(doc.link.replace("PDF_LOCAL:", ""))} <em>(arquivo local)</em></td>` : (() => {
                const linkExtenso = doc.link.length > 28 ? doc.link.slice(0, 28) + "…" : doc.link;
                return `<td><a href="${escapeHtml(doc.link)}" target="_blank" rel="noopener">${escapeHtml(linkExtenso)}</a></td>`;
            })();

            tr.innerHTML =
                    `<td>${doc.id}</td>` +
                    `<td>${escapeHtml(doc.titulo)}</td>` +
                    `<td>${escapeHtml(doc.topico)}</td>` +
                    celulaLink;

            tr.addEventListener("click", () => selecionarDocumento(doc, tr));
            el.tbody.appendChild(tr);
        });
    }

    function escapeHtml(texto) {
        const div = document.createElement("div");
        div.textContent = texto;
        return div.innerHTML;
    }

    function selecionarDocumento(doc, tr) {
        documentoSelecionado = doc;
        el.tbody.querySelectorAll("tr").forEach((r) => r.classList.remove("selecionada"));
        tr.classList.add("selecionada");
    }

    function ordenarLista(lista) {
        if (!ordenacao.chave)
            return lista;
        const dir = ordenacao.dir;
        return [...lista].sort((a, b) => {
            if (ordenacao.chave === "id")
                return (a.id - b.id) * dir;
            return String(a[ordenacao.chave]).localeCompare(String(b[ordenacao.chave]), "pt-BR") * dir;
        });
    }

    function atualizarTabela() {
        const termo = el.pesquisa.value.trim().toLowerCase();

        if (termo.length > 0 && termo.length < 2) {
            return;
        }

        const filtrados = documentos.filter((d) =>
            d.titulo.toLowerCase().includes(termo) ||
                    d.topico.toLowerCase().includes(termo) ||
                    String(d.id).includes(termo)
        );
        renderizarTabela(ordenarLista(filtrados));
        atualizarIndicadoresOrdem();
    }

    function alternarOrdenacao(chave) {
        if (ordenacao.chave === chave) {
            if (ordenacao.dir === 1)
                ordenacao.dir = -1;
            else
                ordenacao = {chave: null, dir: 1};
        } else {
            ordenacao = {chave, dir: 1};
        }
        atualizarTabela();
    }

    function atualizarIndicadoresOrdem() {
        document.querySelectorAll("#tabela-documentos thead th").forEach((th) => {
            const seta = th.querySelector(".seta-ord");
            const ativo = th.dataset.chave === ordenacao.chave;
            th.classList.toggle("ordenado", ativo);
            if (seta)
                seta.textContent = ativo ? (ordenacao.dir === 1 ? "▲" : "▼") : "↕";
        });
    }

    function abrirModal(modo, doc = null) {
        el.formDocumento.reset();
        limparErros();

        formDocumento.querySelector('input[name="tipo-doc"][value="link"]').checked = true;
        alternarTipoDocumento();

        if (modo === "editar" && doc) {
            el.modalTitulo.textContent = "Editar documento #" + doc.id;
            el.campoId.value = doc.id;
            el.inpTitulo.value = doc.titulo;
            el.inpTopico.value = doc.topico;

            if (doc.link.startsWith("PDF_LOCAL:")) {
                formDocumento.querySelector('input[name="tipo-doc"][value="pdf"]').checked = true;
                alternarTipoDocumento();
            } else {
                el.inpLink.value = doc.link;
            }
        } else {
            el.modalTitulo.textContent = "Submeter documento";
            el.campoId.value = "";
        }

        el.modalFundo.classList.add("aberto");
        el.inpTitulo.focus();
    }

    function fecharModal() {
        el.modalFundo.classList.remove("aberto");
    }

    function marcarErro(input, ativo) {
        input.closest(".campo").classList.toggle("invalido", ativo);
    }

    function limparErros() {
        el.formDocumento.querySelectorAll(".campo").forEach((c) => c.classList.remove("invalido"));
    }

    function validarFormulario() {
        limparErros();
        let valido = true;

        const titulo = el.inpTitulo.value.trim();
        if (titulo.length < 3) {
            marcarErro(el.inpTitulo, true);
            valido = false;
        }

        const topico = el.inpTopico.value.trim();
        if (topico.length < 3) {
            marcarErro(el.inpTopico, true);
            valido = false;
        }

        const tipo = formDocumento.querySelector('input[name="tipo-doc"]:checked').value;

        if (tipo === "link") {
            const link = el.inpLink.value.trim();
            const prefixoOk = /^https?:\/\//i.test(link);
            let urlOk = false;
            if (prefixoOk) {
                try {
                    new URL(link);
                    urlOk = true;
                } catch {
                    urlOk = false;
                }
            }
            if (!prefixoOk || !urlOk) {
                marcarErro(el.inpLink, true);
                valido = false;
            }
        } else {
            const arquivo = el.inpArquivo.files[0];
            const ehPdf = arquivo && (arquivo.type === "application/pdf" || arquivo.name.toLowerCase().endsWith(".pdf"));
            if (!ehPdf) {
                marcarErro(el.inpArquivo, true);
                valido = false;
            }
        }

        if (!valido)
            toast("Corrija os campos destacados antes de salvar.", true);
        return valido;
    }

    function alternarTipoDocumento() {
        const tipo = formDocumento.querySelector('input[name="tipo-doc"]:checked').value;
        el.campoLink.style.display = tipo === "link" ? "" : "none";
        el.campoArquivo.style.display = tipo === "pdf" ? "" : "none";
        if (tipo === "link")
            el.inpArquivo.value = "";
        else
            el.inpLink.value = "";
        marcarErro(el.inpLink, false);
        marcarErro(el.inpArquivo, false);
    }

    function salvarDocumento(event) {
        event.preventDefault();
        if (!validarFormulario())
            return;

        const tipo = formDocumento.querySelector('input[name="tipo-doc"]:checked').value;
        const idEdicao = el.campoId.value;
        const dados = {
            titulo: el.inpTitulo.value.trim(),
            topico: el.inpTopico.value.trim()
        };

        if (tipo === "link") {
            dados.link = el.inpLink.value.trim();
        } else {
            const arquivo = el.inpArquivo.files[0];
            if (arquivo) {
                dados.link = "PDF_LOCAL:" + arquivo.name;
            } else if (idEdicao) {
                const alvo = documentos.find((d) => d.id === Number(idEdicao));
                dados.link = alvo ? alvo.link : "";
            } else {
                dados.link = "";
            }
        }

        if (idEdicao) {
            const alvo = documentos.find((d) => d.id === Number(idEdicao));
            if (alvo) {
                const arquivo = tipo === "pdf" ? el.inpArquivo.files[0] : null;
                if (arquivo)
                    persistirPdfLocal(alvo.id, arquivo);
                Object.assign(alvo, dados);
                salvarEstadoDocumentos();
            }
            toast("Documento atualizado com sucesso.");
        } else {
            const novoId = proximoIdDocumento();
            if (tipo === "pdf")
                persistirPdfLocal(novoId, el.inpArquivo.files[0]);
            pendentes.push({id: novoId, ...dados});
            localStorage.setItem("docbank_pendentes", JSON.stringify(pendentes));
            toast("Documento enviado para aprovação. Ele aparecerá na tela inicial quando aprovado.");
        }

        fecharModal();
        atualizarTabela();
    }

    function abrirDocumento() {
        if (!documentoSelecionado) {
            toast("Selecione um documento na tabela primeiro.", true);
            return;
        }

        if (documentoSelecionado.link.startsWith("PDF_LOCAL:")) {
            const arquivo = pdfsEmMemoria[documentoSelecionado.id];
            if (arquivo) {
                const urlTemporaria = URL.createObjectURL(arquivo);
                window.open(urlTemporaria, "_blank", "noopener");
                setTimeout(() => URL.revokeObjectURL(urlTemporaria), 60000);
                return;
            }
            const dataUrl = localStorage.getItem("docbank_pdfdata_" + documentoSelecionado.id);
            if (dataUrl) {
                window.open(dataUrl, "_blank", "noopener");
                return;
            }
            toast("O arquivo deste PDF não está mais disponível (excedeu o limite de persistência do protótipo).", true);
            return;
        }

        window.open(documentoSelecionado.link, "_blank", "noopener");
    }

    function exigirGerenciamento(acao) {
        if (!exigirLogin(acao))
            return false;

        const cargo = Sessao.usuario.cargo;

        if (cargo !== "MODERADOR" && cargo !== "ADMINISTRADOR") {
            toast(`Ação "${acao}" é exclusiva de Moderadores e Administradores.`, true);
            return false;
        }

        return true;
    }

    function deletarDocumento() {
        if (!exigirGerenciamento("Deletar"))
            return;
        if (!documentoSelecionado) {
            toast("Selecione um documento para deletar.", true);
            return;
        }

        const idParaDeletar = documentoSelecionado.id;

        const idx = documentos.findIndex((d) => d.id === idParaDeletar);
        if (idx > -1) {
            documentos.splice(idx, 1);
            salvarEstadoDocumentos();
        }

        const aprovadosLocal = JSON.parse(localStorage.getItem("docbank_aprovados") || "[]");
        const idxAprovado = aprovadosLocal.findIndex((d) => d.id === idParaDeletar);
        if (idxAprovado > -1) {
            aprovadosLocal.splice(idxAprovado, 1);
            localStorage.setItem("docbank_aprovados", JSON.stringify(aprovadosLocal));
        }

        localStorage.removeItem("docbank_pdfdata_" + idParaDeletar);
        delete pdfsEmMemoria[idParaDeletar];

        toast(`Documento #${idParaDeletar} deletado.`);
        documentoSelecionado = null;
        atualizarTabela();
    }

    function editarDocumento() {
        if (!exigirGerenciamento("Editar"))
            return;
        if (!documentoSelecionado) {
            toast("Selecione um documento para editar.", true);
            return;
        }
        abrirModal("editar", documentoSelecionado);
    }

    function adicionarFavoritos() {
        if (!exigirLogin("Adicionar aos favoritos"))
            return;
        if (!documentoSelecionado) {
            toast("Selecione um documento para favoritar.", true);
            return;
        }
        const chave = "docbank_favoritos_" + Sessao.usuario.email;
        const favs = JSON.parse(localStorage.getItem(chave) || "[]");

        if (!favs.includes(documentoSelecionado.id)) {
            favs.push(documentoSelecionado.id);
            localStorage.setItem(chave, JSON.stringify(favs));
        }
        toast(`"${documentoSelecionado.titulo}" adicionado aos favoritos.`);
    }

    el.btnAbrir.addEventListener("click", abrirDocumento);
    el.btnDeletar.addEventListener("click", deletarDocumento);
    el.btnEditar.addEventListener("click", editarDocumento);
    el.btnFavoritos.addEventListener("click", adicionarFavoritos);

    el.btnSubmeter.addEventListener("click", () => {
        if (exigirLogin("Submeter documento"))
            abrirModal("submeter");
    });

    el.btnPainel.addEventListener("click", () => {
        if (exigirGerenciamento("Painel de Controle"))
            window.location.href = "painel.html";
    });

    el.btnBiblioteca.addEventListener("click", () => {
        if (exigirLogin("Biblioteca Pessoal"))
            window.location.href = "biblioteca.html";
    });

    el.btnSair.addEventListener("click", async () => {
        if (!exigirLogin("Sair"))
            return;

        try {
            el.btnSair.disabled = true;
            await Sessao.logout();
            documentoSelecionado = null;

            for (let key in pdfsEmMemoria) {
                delete pdfsEmMemoria[key];
            }

            atualizarInterface();
            atualizarTabela();
            toast("Sessão encerrada. Até logo!");
        } catch (erro) {
            console.error("Erro ao encerrar sessão:", erro);
            atualizarInterface();
            toast("Não foi possível encerrar a sessão. Tente novamente.", true);
        }
    });

    el.btnEntrar.addEventListener("click", () => {
        window.location.href = "login.html";
    });
    el.btnCadastrar.addEventListener("click", () => {
        window.location.href = "cadastro.html";
    });

    el.pesquisa.addEventListener("input", atualizarTabela);

    el.radiosTipo.forEach((radio) => radio.addEventListener("change", alternarTipoDocumento));
    el.inpArquivo.addEventListener("change", () => marcarErro(el.inpArquivo, false));

    el.formDocumento.addEventListener("submit", salvarDocumento);
    $("#modal-cancelar").addEventListener("click", fecharModal);
    el.modalFundo.addEventListener("click", (e) => {
        if (e.target === el.modalFundo)
            fecharModal();
    });
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape")
            fecharModal();
    });

    $(".logo").addEventListener("click", () => {
        documentoSelecionado = null;
        el.pesquisa.value = "";
        atualizarTabela();
        toast("Bem-vindo(a) ao Docbank.");
    });

    const COLUNAS_ORDENAVEIS = ["id", "titulo", "topico", "link"];
    document.querySelectorAll("#tabela-documentos thead th").forEach((th, i) => {
        const chave = COLUNAS_ORDENAVEIS[i];
        th.dataset.chave = chave;
        th.title = "Clique para ordenar";
        const seta = document.createElement("span");
        seta.className = "seta-ord";
        seta.textContent = "↕";
        th.appendChild(seta);
        th.addEventListener("click", () => alternarOrdenacao(chave));
    });

    atualizarInterface();
    atualizarTabela();
    Sessao.carregar();
})();
