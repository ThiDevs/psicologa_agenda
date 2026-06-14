using NailsAgenda.Domain.Entities;

namespace NailsAgenda.Application.Auth;

public sealed record TokenResult(string AccessToken, DateTimeOffset ExpiresAt);

public interface ITokenService
{
    TokenResult CreateAccessToken(User user);
    string CreateRefreshToken();
    string HashRefreshToken(string refreshToken);
}
