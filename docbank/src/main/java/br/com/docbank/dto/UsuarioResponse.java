package br.com.docbank.dto;

import br.com.docbank.model.Usuario;

public record UsuarioResponse(Long id, String nome, String email, String cargo, String status) {

    public static UsuarioResponse from(Usuario usuario) {
        return new UsuarioResponse(usuario.getId(), usuario.getNome(), usuario.getEmail(), usuario.getCargo().name(), usuario.getStatus().name());
    }
}
