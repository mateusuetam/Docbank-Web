package br.com.docbank.dto;

import br.com.docbank.model.TipoDocumento;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record DocumentoRequest(
        @NotBlank(message = "O título é obrigatório.")
        @Size(min = 3, max = 120, message = "O título deve possuir entre 3 e 120 caracteres.")
        String titulo,
        @NotBlank(message = "O tópico é obrigatório.")
        @Size(min = 3, max = 60, message = "O tópico deve possuir entre 3 e 60 caracteres.")
        String topico,
        @NotNull(message = "O tipo do documento é obrigatório.")
        TipoDocumento tipo,
        String url
        ) {

}
