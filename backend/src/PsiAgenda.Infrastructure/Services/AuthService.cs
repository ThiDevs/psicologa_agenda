using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using PsiAgenda.Application.Auth;
using PsiAgenda.Application.Common;
using PsiAgenda.Domain.Entities;
using PsiAgenda.Domain.Enums;
using PsiAgenda.Infrastructure.Persistence;

namespace PsiAgenda.Infrastructure.Services;

public sealed class AuthService(
    PsiAgendaDbContext dbContext,
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

    public async Task DeleteAccountAsync(Guid userId, CancellationToken cancellationToken)
    {
        await using var transaction = await dbContext.Database.BeginTransactionAsync(cancellationToken);

        var user = await dbContext.Users
            .Include(item => item.RefreshTokens)
            .FirstOrDefaultAsync(item => item.Id == userId, cancellationToken);

        if (user is null)
        {
            return;
        }

        var now = DateTimeOffset.UtcNow;
        var originalEmail = user.Email;
        var deletedAccountMarker = $"deleted-{user.Id:N}";

        user.Active = false;
        user.Name = "Conta excluida";
        user.Email = $"{deletedAccountMarker}@deleted.local";
        user.Phone = null;
        user.PasswordHash = deletedAccountMarker;
        user.UpdatedAt = now;

        foreach (var token in user.RefreshTokens.Where(token => token.RevokedAt is null))
        {
            token.RevokedAt = now;
        }

        var memberships = await dbContext.SpaceUsers
            .Where(item => item.UserId == userId)
            .ToListAsync(cancellationToken);

        foreach (var membership in memberships)
        {
            membership.Active = false;
        }

        var ownedSpaceIds = memberships
            .Where(membership => membership.Role is SpaceUserRole.SpaceAdmin or SpaceUserRole.SpaceManager)
            .Select(membership => membership.SpaceId)
            .Distinct()
            .ToArray();

        if (ownedSpaceIds.Length > 0)
        {
            var spaces = await dbContext.Spaces
                .Where(space => ownedSpaceIds.Contains(space.Id))
                .ToListAsync(cancellationToken);

            foreach (var space in spaces)
            {
                space.Active = false;
                space.Published = false;
                space.AllowOnlineBooking = false;
                space.UpdatedAt = now;
            }
        }

        var professionalProfiles = await dbContext.Professionals
            .Where(professional => professional.Email == originalEmail)
            .ToListAsync(cancellationToken);

        foreach (var professional in professionalProfiles)
        {
            professional.Email = null;
            professional.Active = false;
            professional.UpdatedAt = now;
        }

        var reviews = await dbContext.Reviews
            .Where(review => review.CustomerId == userId && review.Comment != null)
            .ToListAsync(cancellationToken);

        foreach (var review in reviews)
        {
            review.Comment = null;
        }

        var notifications = await dbContext.Notifications
            .Where(notification => notification.UserId == userId)
            .ToListAsync(cancellationToken);

        dbContext.Notifications.RemoveRange(notifications);

        var auditLogs = await dbContext.AuditLogs
            .Where(log => log.UserId == userId)
            .ToListAsync(cancellationToken);

        foreach (var log in auditLogs)
        {
            log.UserId = null;
        }

        await dbContext.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
    }

    private async Task<AuthResponse> RegisterAsync(
        string? name,
        string? email,
        string? phone,
        string? password,
        UserRole role,
        CancellationToken cancellationToken)
    {
        var normalizedName = NormalizeRequired(name, "Nome");
        var normalizedEmail = NormalizeEmail(NormalizeRequired(email, "E-mail"));
        var normalizedPassword = NormalizeRequired(password, "Senha");

        if (normalizedPassword.Length < 6)
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
            Name = normalizedName,
            Email = normalizedEmail,
            Phone = string.IsNullOrWhiteSpace(phone) ? null : phone.Trim(),
            PasswordHash = passwordHasher.Hash(normalizedPassword),
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

    private static string NormalizeRequired(string? value, string fieldName)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            throw new InvalidOperationException($"{fieldName} é obrigatório.");
        }

        return value.Trim();
    }
}
