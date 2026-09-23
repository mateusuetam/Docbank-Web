(function () {
    "use strict";

    const $ = (sel) => document.querySelector(sel);
    const usuario = JSON.parse(localStorage.getItem("docbank_usuario") || "null");
    const documentosSalvos = JSON.parse(localStorage.getItem("docbank_documentos_estado"));
    const documentos = documentosSalvos ? documentosSalvos : (window.DOCBANK_DOCUMENTOS || []);
    const chaveFavs = usuario ? "docbank_favoritos_" + usuario.email : null;

    let favoritos = chaveFavs ? JSON.parse(localStorage.getItem(chaveFavs) || "[]") : [];
    let docSelecionado = null;
    let ordenacao = { chave: null, dir: 1 };

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

    let toastTimer = null;
    function toast(mensagem, erro = false) {
        clearTimeout(toastTimer);
        el.toast.textContent = mensagem;
        el.toast.classList.toggle("erro", erro);
        el.toast.classList.add("visivel");
        toastTimer = setTimeout(() => el.toast.classList.remove("visivel"), 2600);
    }

    function escapeHtml(texto) {
        const div = document.createElement("div");
        div.textContent = texto;
        return div.innerHTML;
    }

    function ordenarLista(lista) {
        if (!ordenacao.chave) return lista;
        const dir = ordenacao.dir;
        return [...lista].sort((a, b) => {
            if (ordenacao.chave === "id") return (a.id - b.id) * dir;
            return String(a[ordenacao.chave]).localeCompare(String(b[ordenacao.chave]), "pt-BR") * dir;
        });
    }

    function atualizarTabela() {
        const termo = el.pesquisa.value.trim().toLowerCase();
        if (termo.length === 1) return;

        let lista = documentos.filter((d) => favoritos.includes(d.id));

        if (termo) {
            lista = lista.filter((d) =>
                d.titulo.toLowerCase().includes(termo) ||
                d.topico.toLowerCase().includes(termo) ||
                String(d.id).includes(termo)
            );
        }

        renderizarTabela(ordenarLista(lista));
        atualizarIndicadoresOrdem();
    }

    function renderizarTabela(lista) {
        el.tbody.innerHTML = "";

        if (lista.length === 0) {
            el.msgVazio.style.display = "block";
            el.msgVazio.textContent = favoritos.length === 0
                ? "Nenhum documento favoritado ainda. Favorite documentos na tela inicial."
                : "Nenhum favorito encontrado para a pesquisa.";
            return;
        }
        el.msgVazio.style.display = "none";

        lista.forEach((doc) => {
            const tr = document.createElement("tr");
            tr.dataset.id = doc.id;
            if (docSelecionado && docSelecionado.id === doc.id) tr.classList.add("selecionada");

            const ehPdfLocal = doc.link.startsWith("PDF_LOCAL:");
            const celulaLink = ehPdfLocal ? `<td> ${escapeHtml(doc.link.replace("PDF_LOCAL:", ""))} <em>(arquivo local)</em></td>` : (() => {
                const curto = doc.link.length > 28 ? doc.link.slice(0, 28) + "…" : doc.link;
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

    const COLUNAS = ["id", "titulo", "topico", "link"];
    document.querySelectorAll("#tabela-favoritos thead th").forEach((th, i) => {
        const chave = COLUNAS[i];
        th.dataset.chave = chave;
        th.title = "Clique para ordenar";
        const seta = document.createElement("span");
        seta.className = "seta-ord";
        seta.textContent = "↕";
        th.appendChild(seta);
        th.addEventListener("click", () => {
            if (ordenacao.chave === chave) {
                if (ordenacao.dir === 1) ordenacao.dir = -1;
                else ordenacao = { chave: null, dir: 1 };
            } else {
                ordenacao = { chave, dir: 1 };
            }
            atualizarTabela();
        });
    });

    function atualizarIndicadoresOrdem() {
        document.querySelectorAll("#tabela-favoritos thead th").forEach((th) => {
            const seta = th.querySelector(".seta-ord");
            const ativo = th.dataset.chave === ordenacao.chave;
            th.classList.toggle("ordenado", ativo);
            if (seta) seta.textContent = ativo ? (ordenacao.dir === 1 ? "▲" : "▼") : "↕";
        });
    }

    function abrirDocumento() {
        if (!docSelecionado) {
            toast("Selecione um documento na tabela primeiro.", true);
            return;
        }
        if (docSelecionado.link.startsWith("PDF_LOCAL:")) {
            toast("PDFs locais só podem ser abertos na sessão em que foram submetidos. Abra-o pela tela inicial.", true);
            return;
        }
        window.open(docSelecionado.link, "_blank", "noopener");
    }

    function removerDosFavoritos() {
        if (!docSelecionado) {
            toast("Selecione um documento para remover dos favoritos.", true);
            return;
        }
        favoritos = favoritos.filter((id) => id !== docSelecionado.id);
        localStorage.setItem(chaveFavs, JSON.stringify(favoritos));
        toast(`"${docSelecionado.titulo}" removido dos favoritos.`);
        docSelecionado = null;
        atualizarTabela();
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

    if (!usuario) {
        el.infoUsuario.textContent = "Usuário: Nenhum usuário logado";
        el.btnRemover.disabled = true;
        el.btnAbrir.disabled = true;
        el.msgVazio.style.display = "block";
        el.msgVazio.textContent = "A Biblioteca Pessoal é exclusiva de contas logadas. Redirecionando...";
        setTimeout(() => window.location.href = "index.html", 2500);
        return;
    }

    el.infoUsuario.textContent = "Usuário: " + usuario.nome;
    atualizarTabela();
})();
