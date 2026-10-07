package br.com.docbank.repository;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public class FavoritoRepository {

    private final JdbcTemplate jdbcTemplate;

    public FavoritoRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public List<Long> listarDocumentosFavoritos(Long usuarioId) {
        String sql = """
                SELECT documento_id FROM favoritos WHERE usuario_id = ? ORDER BY adicionado_em DESC
                """;

        return jdbcTemplate.query(sql, (rs, rowNum) -> rs.getLong("documento_id"), usuarioId);
    }

    public boolean existe(Long usuarioId, Long documentoId) {
        String sql = """
                SELECT EXISTS(SELECT 1 FROM favoritos WHERE usuario_id = ? AND documento_id = ?)
                """;

        Boolean resultado = jdbcTemplate.queryForObject(sql, Boolean.class, usuarioId, documentoId);

        return Boolean.TRUE.equals(resultado);
    }

    public int inserir(Long usuarioId, Long documentoId) {
        String sql = """
                INSERT INTO favoritos (usuario_id, documento_id) VALUES (?, ?)
                """;

        return jdbcTemplate.update(sql, usuarioId, documentoId);
    }

    public int remover(Long usuarioId, Long documentoId) {
        String sql = """
                DELETE FROM favoritos WHERE usuario_id = ? AND documento_id = ?
                """;

        return jdbcTemplate.update(sql, usuarioId, documentoId);
    }
}
