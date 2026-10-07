package br.com.docbank.controller;

import br.com.docbank.dto.AuthResponse;
import br.com.docbank.dto.CadastroRequest;
import br.com.docbank.dto.LoginRequest;
import br.com.docbank.dto.UsuarioResponse;
import br.com.docbank.model.Usuario;
import br.com.docbank.service.AuthService;
import br.com.docbank.service.UsuarioService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final UsuarioService usuarioService;
    private final AuthService authService;

    public AuthController(UsuarioService usuarioService, AuthService authService) {
        this.usuarioService = usuarioService;
        this.authService = authService;
    }

    @GetMapping("/csrf")
    public CsrfToken csrf(CsrfToken csrfToken) {
        return csrfToken;
    }

    @PostMapping("/cadastro")
    public ResponseEntity<AuthResponse> cadastrar(@Valid @RequestBody CadastroRequest request, HttpServletRequest httpRequest, HttpServletResponse httpResponse) {
        Usuario criado = usuarioService.cadastrar(request);
        Usuario autenticado = authService.autenticar(criado.getEmail(), request.senha(), httpRequest, httpResponse);
        return ResponseEntity.status(HttpStatus.CREATED).body(new AuthResponse("Conta criada com sucesso.", UsuarioResponse.from(autenticado)));
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest request, HttpServletRequest httpRequest, HttpServletResponse httpResponse) {
        try {
            Usuario usuario = authService.autenticar(request.email(), request.senha(), httpRequest, httpResponse);
            return ResponseEntity.ok(new AuthResponse("Login realizado com sucesso.", UsuarioResponse.from(usuario)));
        } catch (DisabledException exception) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("mensagem", "Esta conta está suspensa. Entre em contato com um administrador."));
        } catch (AuthenticationException exception) {
            String mensagem = "Falha na autenticação. Verifique se suas credenciais estão corretas.";
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("mensagem", mensagem));
        }
    }

    @GetMapping("/me")
    public ResponseEntity<UsuarioResponse> me(Authentication authentication) {
        Usuario usuario = (Usuario) authentication.getPrincipal();
        return ResponseEntity.ok(UsuarioResponse.from(usuario));
    }
}
