(function () {
    "use strict";

    const $ = (sel) => document.querySelector(sel);

    const form = $("#form-cadastro");
    const inpNome = $("#inp-nome");
    const inpEmail = $("#inp-email");
    const inpSenha = $("#inp-senha");
    const inpConfirma = $("#inp-confirma");

    const modalCancelamento = $("#modal-cancelamento");
    const modalNivel = $("#modal-nivel");
    const blocoSenhaNivel = $("#bloco-senha-nivel");
    const inpSenhaNivel = $("#inp-senha-nivel");
    const msgModal = $("#msg-modal-nivel");
    const toastEl = $("#toast");

    const SENHA_NIVEL = "123";
    let nivelEscolhido = null;
    let toastTimer = null;

    function toast(mensagem, erro = false) {
        clearTimeout(toastTimer);
        toastEl.textContent = mensagem;
        toastEl.classList.toggle("erro", erro);
        toastEl.classList.add("visivel");
        toastTimer = setTimeout(() => toastEl.classList.remove("visivel"), 2600);
    }

    function marcarErro(input, ativo) {
        input.closest(".campo").classList.toggle("invalido", ativo);
    }

    function limparErros() {
        form.querySelectorAll(".campo").forEach((c) => c.classList.remove("invalido"));
    }

    function emailValido(email) {
        return /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?)*$/.test(email);
    }

    function validarFormulario() {
        limparErros();
        let valido = true;

        const nome = inpNome.value.trim();
        const email = inpEmail.value.trim();
        const senha = inpSenha.value;
        const confirma = inpConfirma.value;

        if (!nome && !email && !senha && !confirma) {
            marcarErro(inpNome, true);
            marcarErro(inpEmail, true);
            marcarErro(inpSenha, true);
            marcarErro(inpConfirma, true);
            toast("Por favor, preencha todos os campos antes de continuar", true);
            return false;
        }

        if (!emailValido(email)) {
            marcarErro(inpEmail, true);
            toast("Um email válido é obrigatório (ex: usuario@exemplo.com)", true);
            valido = false;
        }

        if (senha.length < 8) {
            marcarErro(inpSenha, true);
            toast("A senha deve ter no mínimo 8 caracteres", true);
            valido = false;
        }

        if (!confirma) {
            marcarErro(inpConfirma, true);
            toast("Por favor, confirme sua senha", true);
            valido = false;
        } else if (senha !== confirma) {
            marcarErro(inpConfirma, true);
            toast("As senhas informadas não coincidem", true);
            valido = false;
        }

        if (!nome) {
            marcarErro(inpNome, true);
            toast("Por favor, preencha todos os campos antes de continuar", true);
            valido = false;
        }

        return valido;
    }

    function abrirModalNivel() {
        nivelEscolhido = null;
        msgModal.textContent = "";
        blocoSenhaNivel.classList.remove("visivel");
        inpSenhaNivel.value = "";
        modalNivel.classList.add("aberto");
    }

    function fecharModalNivel() {
        modalNivel.classList.remove("aberto");
    }

    function selecionarNivel(nivel) {
        msgModal.textContent = "";
        inpSenhaNivel.value = "";

        if (nivel === "Usuario") {
            criarConta(nivel);
            return;
        }

        nivelEscolhido = nivel;
        blocoSenhaNivel.classList.add("visivel");
        inpSenhaNivel.focus();
    }

    function confirmarSenhaNivel() {
        if (inpSenhaNivel.value === SENHA_NIVEL) {
            criarConta(nivelEscolhido);
        } else {
            msgModal.textContent = "Senha de autorização incorreta. Tente novamente.";
            inpSenhaNivel.value = "";
            inpSenhaNivel.focus();
        }
    }

    function criarConta(nivel) {
        const conta = {
            nome: inpNome.value.trim(),
            email: inpEmail.value.trim().toLowerCase(),
            senha: inpSenha.value,
            nivel: nivel
        };

        const contas = JSON.parse(localStorage.getItem("docbank_contas") || "[]");
        const existe = contas.some((c) => c.email === conta.email);
        if (existe) {
            fecharModalNivel();
            marcarErro(inpEmail, true);
            toast("Este email já está cadastrado. Tente fazer login.", true);
            return;
        }
        contas.push(conta);
        localStorage.setItem("docbank_contas", JSON.stringify(contas));

        localStorage.setItem(
            "docbank_usuario",
            JSON.stringify({ nome: conta.nome, email: conta.email, nivel: conta.nivel })
        );

        toast(`Conta ${nivel} criada! Entrando no Docbank...`);
        setTimeout(() => {
            window.location.href = "index.html";
        }, 900);
    }

    form.addEventListener("submit", (event) => {
        event.preventDefault();
        if (validarFormulario()) abrirModalNivel();
    });

    [inpNome, inpEmail, inpSenha, inpConfirma].forEach((input) => {
        input.addEventListener("input", () => marcarErro(input, false));
    });

    modalNivel.querySelectorAll("[data-nivel]").forEach((btn) => {
        btn.addEventListener("click", () => selecionarNivel(btn.dataset.nivel));
    });

    $("#btn-confirmar-nivel").addEventListener("click", confirmarSenhaNivel);
    inpSenhaNivel.addEventListener("keydown", (e) => {
        if (e.key === "Enter") confirmarSenhaNivel();
    });

    $("#btn-voltar-nivel").addEventListener("click", () => {
        nivelEscolhido = null;
        msgModal.textContent = "";
        inpSenhaNivel.value = "";
        blocoSenhaNivel.classList.remove("visivel");
    });

    $("#btn-cancelar").addEventListener("click", () => {
        modalCancelamento.classList.add("aberto");
    });

    $("#btn-cancelar-nao").addEventListener("click", () => {
        modalCancelamento.classList.remove("aberto");
    });

    $("#btn-cancelar-sim").addEventListener("click", () => {
        window.location.href = "index.html";
    });

    $("#logo-db").addEventListener("click", () => {
        window.location.href = "index.html";
    });

    modalCancelamento.addEventListener("click", (e) => {
        if (e.target === modalCancelamento) {
            modalCancelamento.classList.remove("aberto");
        }
    });

    document.addEventListener("keydown", (e) => {
        if (e.key !== "Escape") return;

        if (modalCancelamento.classList.contains("aberto")) {
            modalCancelamento.classList.remove("aberto");
            return;
        }

        if (!blocoSenhaNivel.classList.contains("visivel")) {
            fecharModalNivel();
        }
    });
})();
