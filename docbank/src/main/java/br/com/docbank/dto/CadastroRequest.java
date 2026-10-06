package br.com.docbank.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CadastroRequest(
        @NotBlank(message = "O nome é obrigatório.")
        @Size(max = 80, message = "O nome deve possuir no máximo 80 caracteres.")
        String nome,
        @NotBlank(message = "O email é obrigatório.")
        @Email(message = "Informe um email válido.")
        @Size(max = 120, message = "O email deve possuir no máximo 120 caracteres.")
        String email,
        @NotBlank(message = "A senha é obrigatória.")
        @Size(min = 8, max = 60, message = "A senha deve possuir entre 8 e 60 caracteres.")
        String senha,
        @NotBlank(message = "A confirmação da senha é obrigatória.")
        String confirmaSenha,
        String nivel,
        String senhaAutorizacao
        ) {

}
