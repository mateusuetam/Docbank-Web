package br.com.docbank.dto;

import br.com.docbank.model.Cargo;
import jakarta.validation.constraints.NotNull;

public record AlterarCargoRequest(
        @NotNull(message = "O cargo é obrigatório.")
        Cargo cargo
        ) {

}
