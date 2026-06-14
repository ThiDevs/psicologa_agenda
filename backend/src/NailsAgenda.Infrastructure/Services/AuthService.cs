using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using NailsAgenda.Application.Auth;
using NailsAgenda.Application.Common;
using NailsAgenda.Domain.Entities;
using NailsAgenda.Domain.Enums;
using NailsAgenda.Infrastructure.Persistence;

namespace NailsAgenda.Infrastructure.Services;

public sealed class AuthService(
    NailsAgendaDbContext dbContext,
    IPasswordHasher passwordHasher,
    ITokenService tokenService,
    IConfiguration configuration)
    : IAuthService
{
    private readonly int _refreshTokenDays =
        int.TryParse(configuration["Jwt:RefreshTokenDays"], out var days) ? days : 30;

    public Task<AuthResponse> RegisterCustomerAsync(
        RegisterCustomerRequest request,
        CancellationToken cancellationToken)
    {
        return RegisterAsync(
            request.Name,
            request.Email,
            request.Phone,
            request.Password,
            UserRole.Customer,
            cancellationToken);
    }

    public Task<AuthResponse> RegisterSpaceAdminAsync(
        RegisterSpaceAdminRequest request,
        CancellationToken cancellationToken)
    {
        return RegisterAsync(
            request.Name,
            request.Email,
            request.Phone,
            request.Password,
            UserRole.SpaceAdmin,
            cancellationToken);
    }

    public Task<AuthResponse> RegisterProfessionalAsync(
        RegisterProfessionalRequest request,
        CancellationToken cancellationToken)
    {
        return RegisterAsync(
            request.Name,
            request.Email,
            request.Phone,
            request.Password,
            UserRole.Professional,
            cancellationToken);
    }

    public async Task<AuthResponse> LoginAsync(LoginRequest request, CancellationToken cancellationToken)
    {
        var email = NormalizeEmail(request.Email);
        var user = await dbContext.Users
            .FirstOrDefaultAsync(item => item.Email == email && item.Active, cancellationToken);

        if (user is null || !passwordHasher.Verify(request.Password, user.PasswordHash))
        {
            throw new UnauthorizedAccessException("E-mail ou senha inválidos.");
        }

        return await CreateSessionAsync(user, cancellationToken);
    }

    public async Task<AuthResponse> RefreshAsync(
        RefreshTokenRequest request,
        CancellationToken cancellationToken)
    {
        var refreshTokenHash = tokenService.HashRefreshToken(request.RefreshToken);
        var storedToken = await dbContext.RefreshTokens
            .Include(token => token.User)
            .FirstOrDefaultAsync(
                token => token.TokenHash == refreshTokenHash && token.RevokedAt == null,
                cancellationToken);

        if (storedToken?.User is null || !storedToken.IsActive || !storedToken.User.Active)
        {
            throw new UnauthorizedAccessException("Sessão expirada. Entre novamente.");
        }

        storedToken.RevokedAt = DateTimeOffset.UtcNow;

        return await CreateSessionAsync(storedToken.User, cancellationToken);
    }

    public async Task LogoutAsync(LogoutRequest request, CancellationToken cancellationToken)
    {
        var refreshTokenHash = tokenService.HashRefreshToken(request.RefreshToken);
        var storedToken = await dbContext.RefreshTokens
            .FirstOrDefaultAsync(token => token.TokenHash == refreshTokenHash, cancellationToken);

        if (storedToken is null)
        {
            return;
        }

        storedToken.RevokedAt ??= DateTimeOffset.UtcNow;
        await dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task<UserDto?> GetUserAsync(Guid userId, CancellationToken cancellationToken)
    {
        var user = await dbContext.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(item => item.Id == userId && item.Active, cancellationToken);

        return user is null ? null : ToDto(user);
    }

    private async Task<AuthResponse> RegisterAsync(
        string name,
        string email,
        string? phone,
        string password,
        UserRole role,
        CancellationToken cancellationToken)
    {
        var normalizedEmail = NormalizeEmail(email);
        ValidateRequired(name, "Nome");
        ValidateRequired(normalizedEmail, "E-mail");

        if (password.Trim().Length < 6)
        {
            throw new InvalidOperationException("A senha deve ter pelo menos 6 caracteres.");
        }

        var emailAlreadyExists = await dbContext.Users
            .AnyAsync(user => user.Email == normalizedEmail, cancellationToken);

        if (emailAlreadyExists)
        {
            throw new InvalidOperationException("Este e-mail já está cadastrado.");
        }

        var user = new User
        {
            Name = name.Trim(),
            Email = normalizedEmail,
            Phone = phone?.Trim(),
            PasswordHash = passwordHasher.Hash(password),
            Role = role
        };

        dbContext.Users.Add(user);

        return await CreateSessionAsync(user, cancellationToken);
    }

    private async Task<AuthResponse> CreateSessionAsync(User user, CancellationToken cancellationToken)
    {
        var accessToken = tokenService.CreateAccessToken(user);
        var refreshToken = tokenService.CreateRefreshToken();

        dbContext.RefreshTokens.Add(new RefreshToken
        {
            UserId = user.Id,
            TokenHash = tokenService.HashRefreshToken(refreshToken),
            ExpiresAt = DateTimeOffset.UtcNow.AddDays(_refreshTokenDays)
        });

        await dbContext.SaveChangesAsync(cancellationToken);

        return new AuthResponse(
            accessToken.AccessToken,
            refreshToken,
            accessToken.ExpiresAt,
            ToDto(user));
    }

    private static UserDto ToDto(User user)
    {
        return new UserDto(user.Id, user.Name, user.Email, user.Phone, user.Role);
    }

    private static string NormalizeEmail(string email)
    {
        return email.Trim().ToLowerInvariant();
    }

    private static void ValidateRequired(string value, string fieldName)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            throw new InvalidOperationException($"{fieldName} é obrigatório.");
        }
    }
}
