package br.com.docbank.dto;

import br.com.docbank.model.Documento;

public record DocumentoResponse(
        Long id,
        String titulo,
        String topico,
        String tipo,
        String link,
        String nomeArquivo,
        String status
        ) {

    public static DocumentoResponse from(Documento documento) {

        String link;

        if (documento.getTipo() == br.com.docbank.model.TipoDocumento.PDF) {
            link = "/api/documentos/" + documento.getId() + "/arquivo";
        } else {
            link = documento.getUrl();
        }

        return new DocumentoResponse(
                documento.getId(),
                documento.getTitulo(),
                documento.getTopico(),
                documento.getTipo().name(),
                link,
                documento.getNomeArquivo(),
                documento.getStatus().name()
        );
    }
}
