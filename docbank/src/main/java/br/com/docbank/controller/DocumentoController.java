package br.com.docbank.controller;

import br.com.docbank.dto.DocumentoRequest;
import br.com.docbank.dto.DocumentoResponse;
import br.com.docbank.model.Documento;
import br.com.docbank.model.StatusDocumento;
import br.com.docbank.model.TipoDocumento;
import br.com.docbank.model.Usuario;
import br.com.docbank.service.DocumentoService;
import jakarta.validation.Valid;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.nio.charset.StandardCharsets;
import java.util.List;

@RestController
@RequestMapping("/api/documentos")
public class DocumentoController {

    private final DocumentoService documentoService;

    public DocumentoController(DocumentoService documentoService) {
        this.documentoService = documentoService;
    }

    @GetMapping
    public ResponseEntity<List<DocumentoResponse>> listarAprovados() {
        List<DocumentoResponse> resposta = documentoService.listarAprovados().stream().map(DocumentoResponse::from).toList();
        return ResponseEntity.ok(resposta);
    }

    @GetMapping("/pendentes")
    @PreAuthorize("hasAnyRole('MODERADOR', 'ADMINISTRADOR')")
    public ResponseEntity<List<DocumentoResponse>> listarPendentes() {
        List<DocumentoResponse> resposta = documentoService.listarPendentes().stream().map(DocumentoResponse::from).toList();
        return ResponseEntity.ok(resposta);
    }

    @GetMapping("/{id}/arquivo")
    public ResponseEntity<Resource> abrirArquivo(@PathVariable Long id, Authentication authentication) {

        Documento documento = documentoService.buscarPorIdComArquivo(id);

        if (documento.getTipo() != TipoDocumento.PDF) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }

        if (documento.getStatus() != StatusDocumento.APROVADO) {

            boolean podeGerenciar = authentication != null && authentication.getPrincipal() instanceof Usuario usuario
                    && (usuario.getCargo().name().equals("MODERADOR") || usuario.getCargo().name().equals("ADMINISTRADOR"));

            if (!podeGerenciar) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
            }
        }

        byte[] arquivo = documento.getArquivoPdf();

        if (arquivo == null || arquivo.length == 0) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }

        ByteArrayResource resource = new ByteArrayResource(arquivo);

        ContentDisposition disposition = ContentDisposition.inline().filename(documento.getNomeArquivo(), StandardCharsets.UTF_8).build();

        return ResponseEntity.ok().contentType(MediaType.APPLICATION_PDF).contentLength(arquivo.length)
                .header(HttpHeaders.CONTENT_DISPOSITION, disposition.toString()).body(resource);
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<DocumentoResponse> criar(
            @Valid @RequestPart("dados") DocumentoRequest request,
            @RequestPart(value = "arquivo", required = false) MultipartFile arquivo, Authentication authentication
    ) {
        Usuario usuario = (Usuario) authentication.getPrincipal();
        Documento documento = documentoService.criar(request, arquivo, usuario);
        return ResponseEntity.status(HttpStatus.CREATED).body(DocumentoResponse.from(documento));
    }

    @PutMapping(value = "/{id}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyRole('MODERADOR', 'ADMINISTRADOR')")
    public ResponseEntity<DocumentoResponse> editar(
            @PathVariable Long id,
            @Valid @RequestPart("dados") DocumentoRequest request,
            @RequestPart(value = "arquivo", required = false) MultipartFile arquivo
    ) {
        Documento documento = documentoService.editar(id, request, arquivo);
        return ResponseEntity.ok(DocumentoResponse.from(documento));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('MODERADOR', 'ADMINISTRADOR')")
    public ResponseEntity<Void> deletar(@PathVariable Long id) {
        documentoService.deletar(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/aprovar")
    @PreAuthorize("hasAnyRole('MODERADOR', 'ADMINISTRADOR')")
    public ResponseEntity<DocumentoResponse> aprovar(@PathVariable Long id, Authentication authentication) {
        Usuario usuario = (Usuario) authentication.getPrincipal();
        Documento documento = documentoService.aprovar(id, usuario);
        return ResponseEntity.ok(DocumentoResponse.from(documento));
    }

    @PostMapping("/{id}/rejeitar")
    @PreAuthorize("hasAnyRole('MODERADOR', 'ADMINISTRADOR')")
    public ResponseEntity<Void> rejeitar(@PathVariable Long id) {
        documentoService.rejeitar(id);
        return ResponseEntity.noContent().build();
    }
}
