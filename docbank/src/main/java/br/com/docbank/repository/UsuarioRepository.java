package br.com.docbank.repository;

import br.com.docbank.model.Cargo;
import br.com.docbank.model.StatusUsuario;
import br.com.docbank.model.Usuario;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;
import java.sql.PreparedStatement;
import java.sql.Statement;
import java.util.List;
import java.util.Optional;

@Repository
public class UsuarioRepository {

    private final JdbcTemplate jdbcTemplate;

    public UsuarioRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public Optional<Usuario> buscarPorEmail(String email) {
        String sql = """
                SELECT id, nome, email, senha_hash, cargo, status FROM usuarios WHERE email = ?
                """;

        List<Usuario> usuarios = jdbcTemplate.query(
                sql,
                (rs, rowNum) -> new Usuario(
                        rs.getLong("id"),
                        rs.getString("nome"),
                        rs.getString("email"),
                        rs.getString("senha_hash"),
                        Cargo.valueOf(rs.getString("cargo")),
                        StatusUsuario.valueOf(rs.getString("status"))
                ),
                email
        );

        return usuarios.stream().findFirst();
    }

    public boolean existePorEmail(String email) {
        String sql = """
                SELECT COUNT(*) FROM usuarios WHERE email = ?
                """;

        Integer quantidade = jdbcTemplate.queryForObject(sql, Integer.class, email);

        return quantidade != null && quantidade > 0;
    }

    public long inserir(String nome, String email, String senhaHash, Cargo cargo, StatusUsuario status) {
        String sql = """
                INSERT INTO usuarios (nome, email, senha_hash, cargo, status) VALUES (?, ?, ?, ?, ?)
                """;

        KeyHolder keyHolder = new GeneratedKeyHolder();

        jdbcTemplate.update(connection -> {
            PreparedStatement statement = connection.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS);

            statement.setString(1, nome);
            statement.setString(2, email);
            statement.setString(3, senhaHash);
            statement.setString(4, cargo.name());
            statement.setString(5, status.name());

            return statement;
        }, keyHolder);

        Number key = keyHolder.getKey();

        if (key == null) {
            throw new IllegalStateException("Não foi possível obter o ID do usuário criado.");
        }

        return key.longValue();
    }

    public List<Usuario> listarTodos() {

        String sql = """
            SELECT id, nome, email, senha_hash, cargo, status FROM usuarios ORDER BY id
            """;

        return jdbcTemplate.query(
                sql,
                (rs, rowNum) -> new Usuario(
                        rs.getLong("id"),
                        rs.getString("nome"),
                        rs.getString("email"),
                        rs.getString("senha_hash"),
                        Cargo.valueOf(rs.getString("cargo")),
                        StatusUsuario.valueOf(rs.getString("status"))
                )
        );
    }

    public Optional<Usuario> buscarPorId(Long id) {

        String sql = """
            SELECT id, nome, email, senha_hash, cargo, status FROM usuarios WHERE id = ?
            """;

        List<Usuario> usuarios = jdbcTemplate.query(
                sql,
                (rs, rowNum) -> new Usuario(
                        rs.getLong("id"),
                        rs.getString("nome"),
                        rs.getString("email"),
                        rs.getString("senha_hash"),
                        Cargo.valueOf(rs.getString("cargo")),
                        StatusUsuario.valueOf(rs.getString("status"))
                ),
                id
        );

        return usuarios.stream().findFirst();
    }

    public int atualizarStatus(Long id, StatusUsuario status) {

        String sql = """
            UPDATE usuarios SET status = ? WHERE id = ?
            """;

        return jdbcTemplate.update(sql, status.name(), id);
    }

    public int atualizarCargo(Long id, Cargo cargo) {

        String sql = """
            UPDATE usuarios SET cargo = ? WHERE id = ?
            """;

        return jdbcTemplate.update(sql, cargo.name(), id);
    }

    public int deletar(Long id) {

        String sql = """
            DELETE FROM usuarios WHERE id = ?
            """;

        return jdbcTemplate.update(sql, id);
    }
}
