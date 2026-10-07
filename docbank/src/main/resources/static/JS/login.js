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

    async function obterCsrfToken() {
        const resposta = await fetch("/api/auth/csrf", {
            method: "GET",
            credentials: "same-origin"
        });

        if (!resposta.ok) {
            throw new Error("Não foi possível obter o token de segurança.");
        }

        const dados = await resposta.json();
        return dados.token;
    }

    async function autenticar(event) {
        event.preventDefault();

        if (!validarFormulario())
            return;

        const email = inpEmail.value.trim().toLowerCase();
        const senha = inpSenha.value;

        try {
            const csrfToken = await obterCsrfToken();

            const resposta = await fetch("/api/auth/login", {
                method: "POST",
                credentials: "same-origin",
                headers: {
                    "Content-Type": "application/json",
                    "X-XSRF-TOKEN": csrfToken
                },
                body: JSON.stringify({
                    email: email,
                    senha: senha
                })
            });

            let dados = {};

            try {
                dados = await resposta.json();
            } catch {
                dados = {};
            }

            if (resposta.ok) {
                const nome = dados.usuario?.nome || "usuário";

                toast(`Bem-vindo(a) de volta, ${nome}!`);

                setTimeout(() => {
                    window.location.href = "index.html";
                }, 800);

                return;
            }

            if (resposta.status === 403) {
                toast(dados.mensagem || "Esta conta está suspensa. Entre em contato com um administrador.", true);
                return;
            }

            if (resposta.status === 401) {
                marcarErro(inpEmail, true);
                marcarErro(inpSenha, true);
                toast(dados.mensagem || "Falha na autenticação. Verifique se suas credenciais estão corretas", true);
                return;
            }

            toast(dados.mensagem || "Não foi possível realizar o login.", true);

        } catch (erro) {
            console.error("Erro ao realizar login:", erro);
            toast("Não foi possível conectar ao servidor. Tente novamente.", true);
        }
    }

    form.addEventListener("submit", autenticar);

    $("#btn-cancelar").addEventListener("click", () => {
        window.location.href = "index.html";
    });

    $("#logo-db").addEventListener("click", () => {
        window.location.href = "index.html";
    });
})();
