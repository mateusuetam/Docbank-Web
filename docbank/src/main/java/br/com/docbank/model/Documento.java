package br.com.docbank.model;

import java.time.LocalDateTime;

public class Documento {

    private final Long id;
    private final String titulo;
    private final String topico;
    private final TipoDocumento tipo;
    private final String url;
    private final String nomeArquivo;
    private final String mimeType;
    private final byte[] arquivoPdf;
    private final StatusDocumento status;
    private final Long usuarioEnvioId;
    private final Long usuarioAprovacaoId;
    private final LocalDateTime enviadoEm;
    private final LocalDateTime aprovadoEm;

    public Documento(
            Long id,
            String titulo,
            String topico,
            TipoDocumento tipo,
            String url,
            String nomeArquivo,
            String mimeType,
            byte[] arquivoPdf,
            StatusDocumento status,
            Long usuarioEnvioId,
            Long usuarioAprovacaoId,
            LocalDateTime enviadoEm,
            LocalDateTime aprovadoEm
    ) {
        this.id = id;
        this.titulo = titulo;
        this.topico = topico;
        this.tipo = tipo;
        this.url = url;
        this.nomeArquivo = nomeArquivo;
        this.mimeType = mimeType;
        this.arquivoPdf = arquivoPdf;
        this.status = status;
        this.usuarioEnvioId = usuarioEnvioId;
        this.usuarioAprovacaoId = usuarioAprovacaoId;
        this.enviadoEm = enviadoEm;
        this.aprovadoEm = aprovadoEm;
    }

    public Long getId() {
        return id;
    }

    public String getTitulo() {
        return titulo;
    }

    public String getTopico() {
        return topico;
    }

    public TipoDocumento getTipo() {
        return tipo;
    }

    public String getUrl() {
        return url;
    }

    public String getNomeArquivo() {
        return nomeArquivo;
    }

    public String getMimeType() {
        return mimeType;
    }

    public byte[] getArquivoPdf() {
        return arquivoPdf;
    }

    public StatusDocumento getStatus() {
        return status;
    }

    public Long getUsuarioEnvioId() {
        return usuarioEnvioId;
    }

    public Long getUsuarioAprovacaoId() {
        return usuarioAprovacaoId;
    }

    public LocalDateTime getEnviadoEm() {
        return enviadoEm;
    }

    public LocalDateTime getAprovadoEm() {
        return aprovadoEm;
    }
}
