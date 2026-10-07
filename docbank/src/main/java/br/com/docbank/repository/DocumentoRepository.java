package br.com.docbank.repository;

import br.com.docbank.model.Documento;
import br.com.docbank.model.StatusDocumento;
import br.com.docbank.model.TipoDocumento;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;
import java.sql.PreparedStatement;
import java.sql.Statement;
import java.sql.Timestamp;
import java.util.List;
import java.util.Optional;

@Repository
public class DocumentoRepository {

    private final JdbcTemplate jdbcTemplate;

    public DocumentoRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public List<Documento> listarAprovados() {

        String sql = """
                SELECT
                    id,
                    titulo,
                    topico,
                    tipo,
                    url,
                    nome_arquivo,
                    mime_type,
                    status,
                    usuario_envio_id,
                    usuario_aprovacao_id,
                    enviado_em,
                    aprovado_em
                FROM documentos
                WHERE status = 'APROVADO'
                ORDER BY id
                """;

        return jdbcTemplate.query(sql, (rs, rowNum) -> mapear(rs, null));
    }

    public List<Documento> listarPendentes() {

        String sql = """
                SELECT
                    id,
                    titulo,
                    topico,
                    tipo,
                    url,
                    nome_arquivo,
                    mime_type,
                    status,
                    usuario_envio_id,
                    usuario_aprovacao_id,
                    enviado_em,
                    aprovado_em
                FROM documentos
                WHERE status = 'PENDENTE'
                ORDER BY id
                """;

        return jdbcTemplate.query(sql, (rs, rowNum) -> mapear(rs, null));
    }

    public Optional<Documento> buscarPorId(Long id) {

        String sql = """
                SELECT
                    id,
                    titulo,
                    topico,
                    tipo,
                    url,
                    nome_arquivo,
                    mime_type,
                    status,
                    usuario_envio_id,
                    usuario_aprovacao_id,
                    enviado_em,
                    aprovado_em
                FROM documentos
                WHERE id = ?
                """;

        List<Documento> documentos = jdbcTemplate.query(sql, (rs, rowNum) -> mapear(rs, null), id);

        return documentos.stream().findFirst();
    }

    public Optional<Documento> buscarPorIdComArquivo(Long id) {

        String sql = """
                SELECT
                    id,
                    titulo,
                    topico,
                    tipo,
                    url,
                    nome_arquivo,
                    mime_type,
                    arquivo_pdf,
                    status,
                    usuario_envio_id,
                    usuario_aprovacao_id,
                    enviado_em,
                    aprovado_em
                FROM documentos
                WHERE id = ?
                """;

        List<Documento> documentos = jdbcTemplate.query(sql, (rs, rowNum) -> mapear(rs, rs.getBytes("arquivo_pdf")), id);

        return documentos.stream().findFirst();
    }

    public long inserir(
            String titulo,
            String topico,
            TipoDocumento tipo,
            String url,
            String nomeArquivo,
            String mimeType,
            byte[] arquivoPdf,
            StatusDocumento status,
            Long usuarioEnvioId
    ) {

        String sql = """
                INSERT INTO documentos (
                    titulo,
                    topico,
                    tipo,
                    url,
                    nome_arquivo,
                    mime_type,
                    arquivo_pdf,
                    status,
                    usuario_envio_id
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """;

        KeyHolder keyHolder = new GeneratedKeyHolder();

        jdbcTemplate.update(connection -> {

            PreparedStatement statement = connection.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS);

            statement.setString(1, titulo);
            statement.setString(2, topico);
            statement.setString(3, tipo.name());

            if (url == null) {
                statement.setNull(4, java.sql.Types.VARCHAR);
            } else {
                statement.setString(4, url);
            }

            if (nomeArquivo == null) {
                statement.setNull(5, java.sql.Types.VARCHAR);
            } else {
                statement.setString(5, nomeArquivo);
            }

            if (mimeType == null) {
                statement.setNull(6, java.sql.Types.VARCHAR);
            } else {
                statement.setString(6, mimeType);
            }

            if (arquivoPdf == null) {
                statement.setNull(7, java.sql.Types.LONGVARBINARY);
            } else {
                statement.setBytes(7, arquivoPdf);
            }

            statement.setString(8, status.name());
            statement.setLong(9, usuarioEnvioId);

            return statement;
        }, keyHolder);

        Number key = keyHolder.getKey();

        if (key == null) {
            throw new IllegalStateException("Não foi possível obter o ID do documento criado.");
        }

        return key.longValue();
    }

    public int atualizar(
            Long id,
            String titulo,
            String topico,
            TipoDocumento tipo,
            String url,
            String nomeArquivo,
            String mimeType,
            byte[] arquivoPdf
    ) {

        String sql = """
                UPDATE documentos
                SET
                    titulo = ?,
                    topico = ?,
                    tipo = ?,
                    url = ?,
                    nome_arquivo = ?,
                    mime_type = ?,
                    arquivo_pdf = ?
                WHERE id = ?
                """;

        return jdbcTemplate.update(connection -> {

            PreparedStatement statement = connection.prepareStatement(sql);

            statement.setString(1, titulo);
            statement.setString(2, topico);
            statement.setString(3, tipo.name());

            if (url == null) {
                statement.setNull(4, java.sql.Types.VARCHAR);
            } else {
                statement.setString(4, url);
            }

            if (nomeArquivo == null) {
                statement.setNull(5, java.sql.Types.VARCHAR);
            } else {
                statement.setString(5, nomeArquivo);
            }

            if (mimeType == null) {
                statement.setNull(6, java.sql.Types.VARCHAR);
            } else {
                statement.setString(6, mimeType);
            }

            if (arquivoPdf == null) {
                statement.setNull(7, java.sql.Types.LONGVARBINARY);
            } else {
                statement.setBytes(7, arquivoPdf);
            }

            statement.setLong(8, id);

            return statement;
        });
    }

    public int aprovar(Long id, Long usuarioAprovacaoId) {

        String sql = """
                UPDATE documentos
                SET status = 'APROVADO', usuario_aprovacao_id = ?, aprovado_em = CURRENT_TIMESTAMP
                WHERE id = ? AND status = 'PENDENTE'
                """;

        return jdbcTemplate.update(sql, usuarioAprovacaoId, id);
    }

    public int rejeitar(Long id) {

        String sql = """
                UPDATE documentos
                SET status = 'REJEITADO', nome_arquivo = NULL, mime_type = NULL, arquivo_pdf = NULL
                WHERE id = ? AND status = 'PENDENTE'
                """;

        return jdbcTemplate.update(sql, id);
    }

    public int deletar(Long id) {

        String sql = """
                DELETE FROM documentos
                WHERE id = ?
                """;

        return jdbcTemplate.update(sql, id);
    }

    private Documento mapear(java.sql.ResultSet rs, byte[] arquivoPdf) throws java.sql.SQLException {

        Timestamp enviado = rs.getTimestamp("enviado_em");
        Timestamp aprovado = rs.getTimestamp("aprovado_em");

        return new Documento(
                rs.getLong("id"),
                rs.getString("titulo"),
                rs.getString("topico"),
                TipoDocumento.valueOf(rs.getString("tipo")),
                rs.getString("url"),
                rs.getString("nome_arquivo"),
                rs.getString("mime_type"),
                arquivoPdf,
                StatusDocumento.valueOf(rs.getString("status")),
                rs.getLong("usuario_envio_id"),
                obterLongNullable(rs, "usuario_aprovacao_id"),
                enviado != null ? enviado.toLocalDateTime() : null,
                aprovado != null ? aprovado.toLocalDateTime() : null
        );
    }

    private Long obterLongNullable(java.sql.ResultSet rs, String coluna) throws java.sql.SQLException {
        long valor = rs.getLong(coluna);
        return rs.wasNull() ? null : valor;
    }
}
