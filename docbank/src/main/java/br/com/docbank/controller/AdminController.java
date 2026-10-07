package br.com.docbank.controller;

import br.com.docbank.dto.AlterarCargoRequest;
import br.com.docbank.dto.UsuarioResponse;
import br.com.docbank.model.Usuario;
import br.com.docbank.service.AdminService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.util.List;

@RestController
@RequestMapping("/api/admin/usuarios")
public class AdminController {

    private final AdminService adminService;
    private final SecurityContextRepository securityContextRepository;

    public AdminController(AdminService adminService, SecurityContextRepository securityContextRepository) {
        this.adminService = adminService;
        this.securityContextRepository = securityContextRepository;
    }

    @GetMapping
    public ResponseEntity<List<UsuarioResponse>> listarUsuarios() {
        return ResponseEntity.ok(adminService.listarUsuarios());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletarUsuario(@PathVariable Long id, Authentication authentication) {
        Usuario usuarioAtual = (Usuario) authentication.getPrincipal();
        adminService.deletarUsuario(id, usuarioAtual);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/suspender")
    public ResponseEntity<UsuarioResponse> suspenderUsuario(@PathVariable Long id, Authentication authentication) {
        Usuario usuarioAtual = (Usuario) authentication.getPrincipal();
        UsuarioResponse resposta = adminService.suspenderUsuario(id, usuarioAtual);
        return ResponseEntity.ok(resposta);
    }

    @PatchMapping("/{id}/cargo")
    public ResponseEntity<UsuarioResponse> alterarCargo(
            @PathVariable Long id,
            @Valid @RequestBody AlterarCargoRequest request,
            Authentication authentication,
            HttpServletRequest httpRequest,
            HttpServletResponse httpResponse
    ) {

        Usuario usuarioAtual = (Usuario) authentication.getPrincipal();

        Usuario atualizado = adminService.alterarCargo(id, request, usuarioAtual);

        if (usuarioAtual.getId().equals(id)) {
            Authentication novaAuthentication = UsernamePasswordAuthenticationToken.authenticated(atualizado, null, atualizado.getAuthorities());
            SecurityContext context = SecurityContextHolder.createEmptyContext();
            context.setAuthentication(novaAuthentication);
            SecurityContextHolder.setContext(context);
            securityContextRepository.saveContext(context, httpRequest, httpResponse);
        }

        return ResponseEntity.ok(UsuarioResponse.from(atualizado));
    }
}
