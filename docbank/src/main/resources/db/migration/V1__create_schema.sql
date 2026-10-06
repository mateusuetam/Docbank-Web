CREATE TABLE usuarios (
    id BIGINT NOT NULL AUTO_INCREMENT,

    nome VARCHAR(80) NOT NULL,
    email VARCHAR(120) NOT NULL,
    senha_hash VARCHAR(255) NOT NULL,
    cargo VARCHAR(20) NOT NULL DEFAULT 'USUARIO',
    status VARCHAR(20) NOT NULL DEFAULT 'ATIVO',
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT pk_usuarios PRIMARY KEY (id),
    CONSTRAINT uk_usuarios_email UNIQUE (email),
    CONSTRAINT chk_usuarios_cargo CHECK (cargo IN ('USUARIO', 'MODERADOR', 'ADMINISTRADOR')),
    CONSTRAINT chk_usuarios_status CHECK (status IN ('ATIVO', 'SUSPENSO'))
);


CREATE TABLE documentos (
    id BIGINT NOT NULL AUTO_INCREMENT,

    titulo VARCHAR(120) NOT NULL,
    topico VARCHAR(60) NOT NULL,
    tipo VARCHAR(10) NOT NULL,
    url VARCHAR(2048),
    nome_arquivo VARCHAR(255),
    mime_type VARCHAR(100),
    arquivo_pdf LONGBLOB,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDENTE',
    usuario_envio_id BIGINT NOT NULL,
    usuario_aprovacao_id BIGINT,
    enviado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    aprovado_em TIMESTAMP NULL,

    CONSTRAINT pk_documentos PRIMARY KEY (id),
    CONSTRAINT fk_documentos_usuario_envio FOREIGN KEY (usuario_envio_id) REFERENCES usuarios (id),
    CONSTRAINT fk_documentos_usuario_aprovacao FOREIGN KEY (usuario_aprovacao_id) REFERENCES usuarios (id),
    CONSTRAINT chk_documentos_tipo CHECK (tipo IN ('LINK', 'PDF')),
    CONSTRAINT chk_documentos_status CHECK (status IN ('PENDENTE', 'APROVADO', 'REJEITADO'))
);


CREATE TABLE favoritos (
    usuario_id BIGINT NOT NULL,
    documento_id BIGINT NOT NULL,
    adicionado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT pk_favoritos PRIMARY KEY (usuario_id , documento_id),
    CONSTRAINT fk_favoritos_usuario FOREIGN KEY (usuario_id)
        REFERENCES usuarios (id)
        ON DELETE CASCADE,
    CONSTRAINT fk_favoritos_documento FOREIGN KEY (documento_id)
        REFERENCES documentos (id)
        ON DELETE CASCADE
);

CREATE INDEX idx_documentos_status ON documentos(status);
CREATE INDEX idx_documentos_usuario_envio ON documentos(usuario_envio_id);
CREATE INDEX idx_documentos_usuario_aprovacao ON documentos(usuario_aprovacao_id);