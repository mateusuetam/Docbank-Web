package br.com.docbank.service;

import br.com.docbank.dto.DocumentoResponse;
import br.com.docbank.exception.RegraNegocioException;
import br.com.docbank.model.Documento;
import br.com.docbank.model.StatusDocumento;
import br.com.docbank.model.Usuario;
import br.com.docbank.repository.DocumentoRepository;
import br.com.docbank.repository.FavoritoRepository;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import java.util.List;

@Service
public class FavoritoService {

    private final FavoritoRepository favoritoRepository;
    private final DocumentoRepository documentoRepository;

    public FavoritoService(FavoritoRepository favoritoRepository, DocumentoRepository documentoRepository) {
        this.favoritoRepository = favoritoRepository;
        this.documentoRepository = documentoRepository;
    }

    public List<DocumentoResponse> listarFavoritos(Usuario usuario) {

        List<Long> ids = favoritoRepository.listarDocumentosFavoritos(usuario.getId());

        return ids.stream()
                .map(documentoRepository::buscarPorId)
                .filter(java.util.Optional::isPresent)
                .map(java.util.Optional::get)
                .filter(documento -> documento.getStatus() == StatusDocumento.APROVADO)
                .map(DocumentoResponse::from)
                .toList();
    }

    public void adicionarFavorito(Long documentoId, Usuario usuario) {

        Documento documento = buscarDocumento(documentoId);

        if (documento.getStatus() != StatusDocumento.APROVADO) {
            throw new RegraNegocioException(HttpStatus.CONFLICT, "Somente documentos aprovados podem ser adicionados aos favoritos.");
        }

        if (favoritoRepository.existe(usuario.getId(), documentoId)) {
            throw new RegraNegocioException(HttpStatus.CONFLICT, "Este documento já está nos seus favoritos.");
        }

        try {
            favoritoRepository.inserir(usuario.getId(), documentoId);
        } catch (DataIntegrityViolationException exception) {
            throw new RegraNegocioException(HttpStatus.CONFLICT, "Não foi possível adicionar o documento aos favoritos.");
        }
    }

    public void removerFavorito(Long documentoId, Usuario usuario) {

        int removidos = favoritoRepository.remover(usuario.getId(), documentoId);

        if (removidos == 0) {
            throw new RegraNegocioException(HttpStatus.NOT_FOUND, "Este documento não está nos seus favoritos.");
        }
    }

    private Documento buscarDocumento(Long documentoId) {
        return documentoRepository.buscarPorId(documentoId).orElseThrow(() -> new RegraNegocioException(HttpStatus.NOT_FOUND, "Documento não encontrado."));
    }
}
