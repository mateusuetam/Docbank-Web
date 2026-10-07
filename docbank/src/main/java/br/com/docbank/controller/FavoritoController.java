package br.com.docbank.controller;

import br.com.docbank.dto.DocumentoResponse;
import br.com.docbank.model.Usuario;
import br.com.docbank.service.FavoritoService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/favoritos")
public class FavoritoController {

    private final FavoritoService favoritoService;

    public FavoritoController(FavoritoService favoritoService) {
        this.favoritoService = favoritoService;
    }

    @GetMapping
    public ResponseEntity<List<DocumentoResponse>> listarFavoritos(@AuthenticationPrincipal Usuario usuario) {
        return ResponseEntity.ok(favoritoService.listarFavoritos(usuario));
    }

    @PostMapping("/{documentoId}")
    public ResponseEntity<Void> adicionarFavorito(@PathVariable Long documentoId, @AuthenticationPrincipal Usuario usuario) {
        favoritoService.adicionarFavorito(documentoId, usuario);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{documentoId}")
    public ResponseEntity<Void> removerFavorito(@PathVariable Long documentoId, @AuthenticationPrincipal Usuario usuario) {
        favoritoService.removerFavorito(documentoId, usuario);
        return ResponseEntity.noContent().build();
    }
}
