(function () {
    "use strict";

    const $ = (sel) => document.querySelector(sel);

    const form = $("#form-login");
    const inpEmail = $("#inp-email");
    const inpSenha = $("#inp-senha");
    const toastEl = $("#toast");
    let toastTimer = null;

    function toast(mensagem, erro = false) {
        clearTimeout(toastTimer);
        toastEl.textContent = mensagem;
        toastEl.classList.toggle("erro", erro);
        toastEl.classList.add("visivel");
        toastTimer = setTimeout(() => toastEl.classList.remove("visivel"), 2800);
    }

    function marcarErro(input, ativo) {
        input.closest(".campo").classList.toggle("invalido", ativo);
    }

    [inpEmail, inpSenha].forEach((input) => {
        input.addEventListener("input", () => marcarErro(input, false));
    });

    function validarFormulario() {
        let valido = true;

        const email = inpEmail.value.trim();
        const senha = inpSenha.value;

        if (!email) {
            marcarErro(inpEmail, true);
            valido = false;
        } else if (!/^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?)*$/.test(email)) {
            marcarErro(inpEmail, true);
            valido = false;
        }

        if (!senha) {
            marcarErro(inpSenha, true);
            valido = false;
        }

        if (!valido) {
            toast("Preencha email e senha para continuar.", true);
        }
        return valido;
    }

    function autenticar(event) {
        event.preventDefault();
        if (!validarFormulario()) return;

        const email = inpEmail.value.trim().toLowerCase();
        const senha = inpSenha.value;

        const contas = JSON.parse(localStorage.getItem("docbank_contas") || "[]");
        const conta = contas.find((c) => c.email === email && c.senha === senha);

        if (!conta) {
            marcarErro(inpEmail, true);
            marcarErro(inpSenha, true);
            toast("Falha na autenticação. Verifique se suas credenciais estão corretas", true);
            return;
        }

        if (conta.nivel === "Suspenso") {
            toast("Esta conta está suspensa. Entre em contato com um administrador.", true);
            return;
        }

        localStorage.setItem(
            "docbank_usuario",
            JSON.stringify({ nome: conta.nome, email: conta.email, nivel: conta.nivel })
        );

        toast(`Bem-vindo(a) de volta, ${conta.nome}!`);
        setTimeout(() => {
            window.location.href = "index.html";
        }, 800);
    }

    form.addEventListener("submit", autenticar);

    $("#btn-cancelar").addEventListener("click", () => {
        window.location.href = "index.html";
    });

    $("#logo-db").addEventListener("click", () => {
        window.location.href = "index.html";
    });
})();
