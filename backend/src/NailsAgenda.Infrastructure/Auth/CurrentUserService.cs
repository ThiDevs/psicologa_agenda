using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using NailsAgenda.Application.Common;
using NailsAgenda.Domain.Enums;

namespace NailsAgenda.Infrastructure.Auth;

public sealed class CurrentUserService(IHttpContextAccessor httpContextAccessor) : ICurrentUserService
{
    public CurrentUser? User
    {
        get
        {
            var principal = httpContextAccessor.HttpContext?.User;

            if (principal?.Identity?.IsAuthenticated != true)
            {
                return null;
            }

            var idClaim = principal.FindFirstValue(ClaimTypes.NameIdentifier) ??
                principal.FindFirstValue("sub");
            var email = principal.FindFirstValue(ClaimTypes.Email) ??
                principal.FindFirstValue("email") ??
                string.Empty;
            var roleClaim = principal.FindFirstValue(ClaimTypes.Role) ?? string.Empty;

            if (!Guid.TryParse(idClaim, out var userId) ||
                !Enum.TryParse<UserRole>(roleClaim, out var role))
            {
                return null;
            }

            return new CurrentUser(userId, email, role);
        }
    }

    public Guid UserIdOrThrow()
    {
        return User?.UserId ?? throw new UnauthorizedAccessException("Authenticated user is required.");
    }
}
