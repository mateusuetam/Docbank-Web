package br.com.docbank.service;

import br.com.docbank.dto.CadastroRequest;
import br.com.docbank.exception.RegraNegocioException;
import br.com.docbank.model.Cargo;
import br.com.docbank.model.StatusUsuario;
import br.com.docbank.model.Usuario;
import br.com.docbank.repository.UsuarioRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import java.util.Locale;

@Service
public class UsuarioService {

    private final UsuarioRepository usuarioRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${docbank.cadastro.senha-autorizacao:}")
    private String senhaAutorizacao;

    public UsuarioService(UsuarioRepository usuarioRepository, PasswordEncoder passwordEncoder) {
        this.usuarioRepository = usuarioRepository;
        this.passwordEncoder = passwordEncoder;
    }

    public Usuario cadastrar(CadastroRequest request) {

        String nome = request.nome().trim();
        String email = request.email().trim().toLowerCase(Locale.ROOT);

        if (!request.senha().equals(request.confirmaSenha())) {
            throw new RegraNegocioException(HttpStatus.BAD_REQUEST, "As senhas informadas não coincidem.");
        }

        if (usuarioRepository.existePorEmail(email)) {
            throw new RegraNegocioException(HttpStatus.CONFLICT, "Este email já está cadastrado. Tente fazer login.");
        }

        Cargo cargo = converterCargo(request.nivel());

        if (cargo != Cargo.USUARIO) {
            validarSenhaAutorizacao(request.senhaAutorizacao());
        }

        String senhaHash = passwordEncoder.encode(request.senha());

        long id = usuarioRepository.inserir(nome, email, senhaHash, cargo, StatusUsuario.ATIVO);

        return new Usuario(id, nome, email, senhaHash, cargo, StatusUsuario.ATIVO);
    }

    public Usuario buscarPorEmail(String email) {
        return usuarioRepository.buscarPorEmail(email.trim().toLowerCase(Locale.ROOT)).orElseThrow(()
                -> new RegraNegocioException(HttpStatus.NOT_FOUND, "Usuário não encontrado."));
    }

    private Cargo converterCargo(String nivel) {

        if (nivel == null || nivel.isBlank()) {
            return Cargo.USUARIO;
        }

        try {
            return Cargo.valueOf(nivel.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException exception) {
            throw new RegraNegocioException(HttpStatus.BAD_REQUEST, "Nível de acesso inválido.");
        }
    }

    private void validarSenhaAutorizacao(String senhaInformada) {

        if (senhaAutorizacao == null || senhaAutorizacao.isBlank()) {
            throw new RegraNegocioException(HttpStatus.FORBIDDEN, "O cadastro para este nível de acesso não está disponível.");
        }

        if (!senhaAutorizacao.equals(senhaInformada)) {
            throw new RegraNegocioException(HttpStatus.FORBIDDEN, "Senha de autorização incorreta.");
        }
    }
}
