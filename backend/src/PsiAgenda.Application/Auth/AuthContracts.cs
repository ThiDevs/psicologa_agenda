using PsiAgenda.Domain.Enums;

namespace PsiAgenda.Application.Auth;

public sealed record RegisterCustomerRequest(
    string Name,
    string Email,
    string? Phone,
    string Password);

public sealed record RegisterSpaceAdminRequest(
    string Name,
    string Email,
    string? Phone,
    string Password);

public sealed record RegisterProfessionalRequest(
    string Name,
    string Email,
    string? Phone,
    string Password);

public sealed record LoginRequest(
    string Email,
    string Password);

public sealed record RefreshTokenRequest(string RefreshToken);

public sealed record LogoutRequest(string RefreshToken);

public sealed record UserDto(
    Guid Id,
    string Name,
    string Email,
    string? Phone,
    UserRole Role);

public sealed record AuthResponse(
    string AccessToken,
    string RefreshToken,
    DateTimeOffset ExpiresAt,
    UserDto User);

public interface IAuthService
{
    Task<AuthResponse> RegisterCustomerAsync(RegisterCustomerRequest request, CancellationToken cancellationToken);
    Task<AuthResponse> RegisterSpaceAdminAsync(RegisterSpaceAdminRequest request, CancellationToken cancellationToken);
    Task<AuthResponse> RegisterProfessionalAsync(RegisterProfessionalRequest request, CancellationToken cancellationToken);
    Task<AuthResponse> LoginAsync(LoginRequest request, CancellationToken cancellationToken);
    Task<AuthResponse> RefreshAsync(RefreshTokenRequest request, CancellationToken cancellationToken);
    Task LogoutAsync(LogoutRequest request, CancellationToken cancellationToken);
    Task<UserDto?> GetUserAsync(Guid userId, CancellationToken cancellationToken);
}
