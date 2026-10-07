package br.com.docbank.service;

import br.com.docbank.dto.DocumentoRequest;
import br.com.docbank.exception.RegraNegocioException;
import br.com.docbank.model.Documento;
import br.com.docbank.model.StatusDocumento;
import br.com.docbank.model.TipoDocumento;
import br.com.docbank.model.Usuario;
import br.com.docbank.repository.DocumentoRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import java.net.URI;
import java.net.URISyntaxException;
import java.util.List;

@Service
public class DocumentoService {

    private static final long TAMANHO_MAXIMO_PDF = 20L * 1024 * 1024;

    private final DocumentoRepository documentoRepository;

    public DocumentoService(DocumentoRepository documentoRepository) {
        this.documentoRepository = documentoRepository;
    }

    public List<Documento> listarAprovados() {
        return documentoRepository.listarAprovados();
    }

    public List<Documento> listarPendentes() {
        return documentoRepository.listarPendentes();
    }

    public Documento buscarPorId(Long id) {
        return documentoRepository.buscarPorId(id).orElseThrow(() -> new RegraNegocioException(HttpStatus.NOT_FOUND, "Documento não encontrado."));
    }

    public Documento buscarPorIdComArquivo(Long id) {
        return documentoRepository.buscarPorIdComArquivo(id).orElseThrow(() -> new RegraNegocioException(HttpStatus.NOT_FOUND, "Documento não encontrado."));
    }

    public Documento criar(DocumentoRequest request, MultipartFile arquivo, Usuario usuario) {

        validarDocumento(request, arquivo);

        String titulo = request.titulo().trim();
        String topico = request.topico().trim();

        TipoDocumento tipo = request.tipo();

        String url = null;
        String nomeArquivo = null;
        String mimeType = null;
        byte[] arquivoPdf = null;

        if (tipo == TipoDocumento.LINK) {
            url = request.url().trim();
        } else {
            nomeArquivo = arquivo.getOriginalFilename();
            mimeType = "application/pdf";

            try {
                arquivoPdf = arquivo.getBytes();
            } catch (Exception exception) {
                throw new RegraNegocioException(HttpStatus.INTERNAL_SERVER_ERROR, "Não foi possível ler o arquivo PDF.");
            }
        }

        long id = documentoRepository.inserir(
                titulo,
                topico,
                tipo,
                url,
                nomeArquivo,
                mimeType,
                arquivoPdf,
                StatusDocumento.PENDENTE,
                usuario.getId()
        );

        return buscarPorId(id);
    }

    public Documento editar(Long id, DocumentoRequest request, MultipartFile arquivo) {

        Documento atual = buscarPorId(id);

        if (atual.getStatus() != StatusDocumento.APROVADO) {
            throw new RegraNegocioException(HttpStatus.CONFLICT, "Somente documentos aprovados podem ser editados.");
        }

        validarDocumento(request, arquivo, true);

        String titulo = request.titulo().trim();
        String topico = request.topico().trim();

        TipoDocumento tipo = request.tipo();

        String url = null;
        String nomeArquivo = null;
        String mimeType = null;
        byte[] arquivoPdf = null;

        if (tipo == TipoDocumento.LINK) {
            url = request.url().trim();
        } else {

            if (arquivo != null && !arquivo.isEmpty()) {
                nomeArquivo = arquivo.getOriginalFilename();
                mimeType = "application/pdf";
                try {
                    arquivoPdf = arquivo.getBytes();
                } catch (Exception exception) {
                    throw new RegraNegocioException(HttpStatus.INTERNAL_SERVER_ERROR, "Não foi possível ler o arquivo PDF.");
                }
            } else {
                Documento atualComArquivo = buscarPorIdComArquivo(id);
                nomeArquivo = atualComArquivo.getNomeArquivo();
                mimeType = atualComArquivo.getMimeType();
                arquivoPdf = atualComArquivo.getArquivoPdf();
            }
        }

        int atualizados = documentoRepository.atualizar(
                id,
                titulo,
                topico,
                tipo,
                url,
                nomeArquivo,
                mimeType,
                arquivoPdf
        );

        if (atualizados == 0) {
            throw new RegraNegocioException(HttpStatus.NOT_FOUND, "Documento não encontrado.");
        }

        return buscarPorId(id);
    }

    public void deletar(Long id) {

        Documento documento = buscarPorId(id);

        int removidos = documentoRepository.deletar(documento.getId());

        if (removidos == 0) {
            throw new RegraNegocioException(HttpStatus.NOT_FOUND, "Documento não encontrado.");
        }
    }

    public Documento aprovar(Long id, Usuario usuario) {

        Documento documento = buscarPorId(id);

        if (documento.getStatus() != StatusDocumento.PENDENTE) {
            throw new RegraNegocioException(HttpStatus.CONFLICT, "Somente documentos pendentes podem ser aprovados.");
        }

        int atualizados = documentoRepository.aprovar(id, usuario.getId());

        if (atualizados == 0) {
            throw new RegraNegocioException(HttpStatus.CONFLICT, "O documento não está mais pendente.");
        }

        return buscarPorId(id);
    }

    public void rejeitar(Long id) {

        Documento documento = buscarPorId(id);

        if (documento.getStatus() != StatusDocumento.PENDENTE) {
            throw new RegraNegocioException(HttpStatus.CONFLICT, "Somente documentos pendentes podem ser rejeitados.");
        }

        int atualizados = documentoRepository.rejeitar(id);

        if (atualizados == 0) {
            throw new RegraNegocioException(HttpStatus.CONFLICT, "O documento não está mais pendente.");
        }
    }

    private void validarDocumento(DocumentoRequest request, MultipartFile arquivo) {
        validarDocumento(request, arquivo, false);
    }

    private void validarDocumento(DocumentoRequest request, MultipartFile arquivo, boolean permitirPdfExistente) {

        if (request.tipo() == TipoDocumento.LINK) {
            if (request.url() == null || request.url().isBlank()) {
                throw new RegraNegocioException(HttpStatus.BAD_REQUEST, "Informe o link do documento.");
            }
            validarUrl(request.url());
            return;
        }

        if (permitirPdfExistente && (arquivo == null || arquivo.isEmpty())) {
            return;
        }

        if (arquivo == null || arquivo.isEmpty()) {
            throw new RegraNegocioException(HttpStatus.BAD_REQUEST, "Selecione um arquivo PDF.");
        }

        if (arquivo.getSize() > TAMANHO_MAXIMO_PDF) {
            throw new RegraNegocioException(HttpStatus.PAYLOAD_TOO_LARGE, "O arquivo PDF excede o limite de 20 MB.");
        }

        String nome = arquivo.getOriginalFilename() == null ? "" : arquivo.getOriginalFilename().toLowerCase();

        boolean ehPdf = "application/pdf".equalsIgnoreCase(arquivo.getContentType()) || nome.endsWith(".pdf");

        if (!ehPdf) {
            throw new RegraNegocioException(HttpStatus.BAD_REQUEST, "O arquivo enviado deve ser um PDF.");
        }
    }

    private void validarUrl(String valor) {

        try {
            URI uri = new URI(valor.trim());
            String esquema = uri.getScheme();

            if (esquema == null || (!esquema.equalsIgnoreCase("http") && !esquema.equalsIgnoreCase("https"))) {
                throw new IllegalArgumentException();
            }

            if (uri.getHost() == null || uri.getHost().isBlank()) {
                throw new IllegalArgumentException();
            }
        } catch (URISyntaxException | IllegalArgumentException exception) {
            throw new RegraNegocioException(HttpStatus.BAD_REQUEST, "Informe um link que comece com http:// ou https://.");
        }
    }
}
