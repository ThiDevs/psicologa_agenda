using PsiAgenda.Domain.Enums;

namespace PsiAgenda.Application.Common;

public sealed record CurrentUser(Guid UserId, string Email, UserRole Role);

public interface ICurrentUserService
{
    CurrentUser? User { get; }
    Guid UserIdOrThrow();
}
