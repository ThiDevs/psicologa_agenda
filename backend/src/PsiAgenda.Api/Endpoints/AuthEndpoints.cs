using Microsoft.AspNetCore.RateLimiting;
using PsiAgenda.Application.Auth;
using PsiAgenda.Application.Common;

namespace PsiAgenda.Api.Endpoints;

public static class AuthEndpoints
{
    public static IEndpointRouteBuilder MapAuthEndpoints(this IEndpointRouteBuilder app)
    {
        foreach (var prefix in new[] { string.Empty, "/api" })
        {
            var group = app.MapGroup($"{prefix}/auth").WithTags("Auth");

            group.MapPost("/register/customer", RegisterCustomerAsync).RequireRateLimiting("Sensitive");
            group.MapPost("/register/space-admin", RegisterSpaceAdminAsync).RequireRateLimiting("Sensitive");
            group.MapPost("/register/professional", RegisterProfessionalAsync).RequireRateLimiting("Sensitive");
            group.MapPost("/login", LoginAsync).RequireRateLimiting("Sensitive");
            group.MapPost("/refresh-token", RefreshAsync).RequireRateLimiting("Sensitive");
            group.MapPost("/logout", LogoutAsync);
            group.MapGet("/me", GetMeAsync).RequireAuthorization();
            group.MapDelete("/me", DeleteMeAsync).RequireAuthorization().RequireRateLimiting("Sensitive");
        }

        return app;
    }

    private static async Task<IResult> RegisterCustomerAsync(
        RegisterCustomerRequest request,
        IAuthService authService,
        CancellationToken cancellationToken)
    {
        return await ExecuteAsync(
            () => authService.RegisterCustomerAsync(request, cancellationToken),
            response => Results.Created("/auth/me", response));
    }

    private static async Task<IResult> RegisterSpaceAdminAsync(
        RegisterSpaceAdminRequest request,
        IAuthService authService,
        CancellationToken cancellationToken)
    {
        return await ExecuteAsync(
            () => authService.RegisterSpaceAdminAsync(request, cancellationToken),
            response => Results.Created("/auth/me", response));
    }

    private static async Task<IResult> RegisterProfessionalAsync(
        RegisterProfessionalRequest request,
        IAuthService authService,
        CancellationToken cancellationToken)
    {
        return await ExecuteAsync(
            () => authService.RegisterProfessionalAsync(request, cancellationToken),
            response => Results.Created("/auth/me", response));
    }

    private static async Task<IResult> LoginAsync(
        LoginRequest request,
        IAuthService authService,
        CancellationToken cancellationToken)
    {
        return await ExecuteAsync(
            () => authService.LoginAsync(request, cancellationToken),
            Results.Ok);
    }

    private static async Task<IResult> RefreshAsync(
        RefreshTokenRequest request,
        IAuthService authService,
        CancellationToken cancellationToken)
    {
        return await ExecuteAsync(
            () => authService.RefreshAsync(request, cancellationToken),
            Results.Ok);
    }

    private static async Task<IResult> LogoutAsync(
        LogoutRequest request,
        IAuthService authService,
        CancellationToken cancellationToken)
    {
        await authService.LogoutAsync(request, cancellationToken);

        return Results.NoContent();
    }

    private static async Task<IResult> GetMeAsync(
        ICurrentUserService currentUser,
        IAuthService authService,
        CancellationToken cancellationToken)
    {
        var user = await authService.GetUserAsync(currentUser.UserIdOrThrow(), cancellationToken);

        return user is null ? Results.NotFound() : Results.Ok(user);
    }

    private static async Task<IResult> DeleteMeAsync(
        ICurrentUserService currentUser,
        IAuthService authService,
        CancellationToken cancellationToken)
    {
        await authService.DeleteAccountAsync(currentUser.UserIdOrThrow(), cancellationToken);

        return Results.NoContent();
    }

    private static async Task<IResult> ExecuteAsync<T>(
        Func<Task<T>> action,
        Func<T, IResult> success)
    {
        try
        {
            return success(await action());
        }
        catch (InvalidOperationException exception)
        {
            return Results.BadRequest(new { message = exception.Message });
        }
        catch (UnauthorizedAccessException)
        {
            return Results.Unauthorized();
        }
    }
}
