package br.com.docbank.service;

import br.com.docbank.dto.AlterarCargoRequest;
import br.com.docbank.dto.UsuarioResponse;
import br.com.docbank.exception.RegraNegocioException;
import br.com.docbank.model.Cargo;
import br.com.docbank.model.StatusUsuario;
import br.com.docbank.model.Usuario;
import br.com.docbank.repository.UsuarioRepository;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import java.util.List;

@Service
public class AdminService {

    private final UsuarioRepository usuarioRepository;

    public AdminService(UsuarioRepository usuarioRepository) {
        this.usuarioRepository = usuarioRepository;
    }

    @PreAuthorize("hasRole('ADMINISTRADOR')")
    public List<UsuarioResponse> listarUsuarios() {
        return usuarioRepository.listarTodos().stream().map(UsuarioResponse::from).toList();
    }

    @PreAuthorize("hasRole('ADMINISTRADOR')")
    public void deletarUsuario(Long id, Usuario usuarioAtual) {

        Usuario alvo = buscarUsuario(id);

        impedirAutoOperacao(alvo, usuarioAtual);

        try {
            int removidos = usuarioRepository.deletar(id);
            if (removidos == 0) {
                throw new RegraNegocioException(HttpStatus.NOT_FOUND, "Usuário não encontrado.");
            }
        } catch (DataIntegrityViolationException exception) {
            throw new RegraNegocioException(HttpStatus.CONFLICT, "Não é possível deletar este usuário porque existem documentos associados à conta.");
        }
    }

    @PreAuthorize("hasRole('ADMINISTRADOR')")
    public UsuarioResponse suspenderUsuario(Long id, Usuario usuarioAtual) {

        Usuario alvo = buscarUsuario(id);

        impedirAutoOperacao(alvo, usuarioAtual);

        StatusUsuario novoStatus = alvo.getStatus() == StatusUsuario.SUSPENSO ? StatusUsuario.ATIVO : StatusUsuario.SUSPENSO;

        int atualizados = usuarioRepository.atualizarStatus(id, novoStatus);

        if (atualizados == 0) {
            throw new RegraNegocioException(HttpStatus.NOT_FOUND, "Usuário não encontrado.");
        }

        Usuario atualizado = buscarUsuario(id);

        return UsuarioResponse.from(atualizado);
    }

    @PreAuthorize("hasRole('ADMINISTRADOR')")
    public Usuario alterarCargo(Long id, AlterarCargoRequest request, Usuario usuarioAtual) {

        Usuario alvo = buscarUsuario(id);

        Cargo novoCargo = request.cargo();

        if (novoCargo == null) {
            throw new RegraNegocioException(HttpStatus.BAD_REQUEST, "O cargo é obrigatório.");
        }

        int atualizados = usuarioRepository.atualizarCargo(id, novoCargo);

        if (atualizados == 0) {
            throw new RegraNegocioException(HttpStatus.NOT_FOUND, "Usuário não encontrado.");
        }

        return usuarioRepository.buscarPorId(id).orElseThrow(() -> new RegraNegocioException(HttpStatus.NOT_FOUND, "Usuário não encontrado após a atualização."));
    }

    public Usuario buscarUsuario(Long id) {
        return usuarioRepository.buscarPorId(id).orElseThrow(() -> new RegraNegocioException(HttpStatus.NOT_FOUND, "Usuário não encontrado."));
    }

    private void impedirAutoOperacao(Usuario alvo, Usuario usuarioAtual) {
        if (alvo.getId().equals(usuarioAtual.getId())) {
            throw new RegraNegocioException(HttpStatus.CONFLICT, "Você não pode realizar esta operação na própria conta.");
        }
    }
}
